"""Single-pass aggregation plus spike, latency and abusive-IP detectors."""
from __future__ import annotations

import math
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from statistics import median
from typing import Iterable, Mapping, Optional

from analyzer.parser import LogEntry

ONE_MINUTE = timedelta(minutes=1)


def minute_floor(ts: datetime) -> datetime:
    return ts.replace(second=0, microsecond=0)


@dataclass
class Aggregates:
    """Everything the detectors need, built in one streaming pass."""
    errors_by_minute_path: Counter = field(default_factory=Counter)  # (minute, path) -> 5xx
    auth_failures: Counter = field(default_factory=Counter)          # (ip, minute) -> 401
    latencies_ms: dict = field(default_factory=lambda: defaultdict(list))  # status < 400 only
    failures_4xx: Counter = field(default_factory=Counter)
    failures_5xx: Counter = field(default_factory=Counter)
    first_minute: Optional[datetime] = None
    last_minute: Optional[datetime] = None

    def per_minute_5xx(self) -> dict[datetime, int]:
        """5xx count for every minute in the file, with quiet minutes as 0."""
        if self.first_minute is None or self.last_minute is None:
            return {}
        by_minute: Counter = Counter()
        for (m, _), n in self.errors_by_minute_path.items():
            by_minute[m] += n
        out, m = {}, self.first_minute
        while m <= self.last_minute:
            out[m] = by_minute.get(m, 0)
            m += ONE_MINUTE
        return out


def aggregate(entries: Iterable[LogEntry]) -> Aggregates:
    agg = Aggregates()
    for e in entries:
        m = minute_floor(e.timestamp)
        if agg.first_minute is None or m < agg.first_minute:
            agg.first_minute = m
        if agg.last_minute is None or m > agg.last_minute:
            agg.last_minute = m
        if e.status >= 500:
            agg.errors_by_minute_path[(m, e.path)] += 1
            agg.failures_5xx[e.path] += 1
        elif e.status >= 400:
            agg.failures_4xx[e.path] += 1
        if e.status == 401:
            agg.auth_failures[(e.ip, m)] += 1
        if e.status < 400:   # failed requests would skew latency (a 12 s 502 is a timeout)
            agg.latencies_ms[e.path].append(e.response_time_ms)
    return agg


def top_failing_endpoints(agg: Aggregates, n: int = 10) -> list[tuple[str, int, int]]:
    """(path, count_4xx, count_5xx), worst first."""
    paths = set(agg.failures_4xx) | set(agg.failures_5xx)
    rows = [(p, agg.failures_4xx[p], agg.failures_5xx[p]) for p in paths]
    return sorted(rows, key=lambda r: r[1] + r[2], reverse=True)[:n]


# ---------- error spikes ----------

@dataclass(frozen=True)
class Spike:
    start: datetime
    end: datetime        # last flagged minute, inclusive
    peak: int
    baseline: float
    total: int


def detect_spikes(per_minute: Mapping[datetime, int], k: float = 3.0,
                  min_count: int = 10) -> list[Spike]:
    """Flag minutes above median + k * robust sigma, merged into windows.

    Median/MAD is used instead of mean/std because a large burst inflates
    its own mean and std and hides itself. min_count stops tiny absolute
    numbers (3 errors vs a baseline of 0) from alerting.
    """
    if not per_minute:
        return []
    values = list(per_minute.values())
    med = median(values)
    sigma = max(1.4826 * median(abs(v - med) for v in values), 1.0)
    threshold = max(med + k * sigma, min_count)

    spikes: list[Spike] = []
    run: list[tuple[datetime, int]] = []

    def close() -> None:
        if run:
            spikes.append(Spike(run[0][0], run[-1][0], max(v for _, v in run),
                                med, sum(v for _, v in run)))
            run.clear()

    for m in sorted(per_minute):
        if per_minute[m] > threshold:
            if run and m - run[-1][0] != ONE_MINUTE:
                close()
            run.append((m, per_minute[m]))
        else:
            close()
    close()
    return spikes


def spike_top_endpoint(agg: Aggregates, spike: Spike) -> Optional[str]:
    """Endpoint with the most 5xx inside the spike window."""
    c: Counter = Counter()
    for (m, path), n in agg.errors_by_minute_path.items():
        if spike.start <= m <= spike.end:
            c[path] += n
    return c.most_common(1)[0][0] if c else None


# ---------- latency ----------

@dataclass(frozen=True)
class LatencyStats:
    n: int
    p50: float
    p95: float
    p99: float


def percentile(sorted_values: list[float], p: float) -> float:
    """Nearest-rank percentile of an already sorted list."""
    if not sorted_values:
        raise ValueError("no values")
    rank = math.ceil(p / 100 * len(sorted_values))
    return sorted_values[max(rank, 1) - 1]


def latency_summary(latencies: Mapping[str, list[float]],
                    min_samples: int = 30) -> dict[str, LatencyStats]:
    out = {}
    for path, vals in latencies.items():
        if len(vals) < min_samples:
            continue
        s = sorted(vals)
        out[path] = LatencyStats(len(s), percentile(s, 50), percentile(s, 95), percentile(s, 99))
    return out


# ---------- abusive IPs ----------

@dataclass(frozen=True)
class AbusiveIP:
    ip: str
    total: int
    peak_per_minute: int
    peak_minute: datetime


def abusive_ips(auth_failures: Mapping[tuple[str, datetime], int],
                threshold_per_minute: int = 100) -> list[AbusiveIP]:
    per_ip: dict[str, list[tuple[datetime, int]]] = defaultdict(list)
    for (ip, m), n in auth_failures.items():
        per_ip[ip].append((m, n))
    found = []
    for ip, rows in per_ip.items():
        peak_m, peak = max(rows, key=lambda r: r[1])
        if peak >= threshold_per_minute:
            found.append(AbusiveIP(ip, sum(n for _, n in rows), peak, peak_m))
    return sorted(found, key=lambda a: a.total, reverse=True)
