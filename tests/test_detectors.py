from datetime import datetime, timedelta, timezone
from statistics import mean, pstdev

from analyzer.detectors import (
    abusive_ips, aggregate, detect_spikes, latency_summary,
    percentile, spike_top_endpoint, top_failing_endpoints,
)
from analyzer.parser import LogEntry

T0 = datetime(2026, 10, 1, 14, 0, tzinfo=timezone.utc)


def minute(i: int) -> datetime:
    return T0 + timedelta(minutes=i)


def entry(m=0, ip="1.1.1.1", path="/a", status=200, ms=50.0) -> LogEntry:
    return LogEntry(ip=ip, timestamp=minute(m), method="GET",
                    path=path, status=status, response_time_ms=ms)


def test_percentile_nearest_rank():
    v = list(range(1, 101))
    assert percentile(v, 50) == 50
    assert percentile(v, 95) == 95
    assert percentile(v, 99) == 99
    assert percentile(v, 100) == 100


def test_percentile_single_value_and_empty():
    assert percentile([7.0], 99) == 7.0
    try:
        percentile([], 50)
        assert False, "Should have raised ValueError"
    except ValueError:
        pass


def test_latency_summary_skips_small_samples():
    out = latency_summary({"/a": [float(x) for x in range(1, 101)], "/b": [5.0]},
                          min_samples=30)
    assert set(out) == {"/a"}
    assert (out["/a"].n, out["/a"].p50, out["/a"].p95, out["/a"].p99) == (100, 50.0, 95.0, 99.0)


def test_detects_burst_as_one_spike():
    counts = {minute(i): 3 for i in range(60)}
    for i in range(30, 40):
        counts[minute(i)] = 300
    spikes = detect_spikes(counts)
    assert len(spikes) == 1
    s = spikes[0]
    assert s.start == minute(30) and s.end == minute(39)
    assert s.peak == 300 and s.baseline == 3 and s.total == 3000


def test_flat_traffic_has_no_spike():
    counts = {minute(i): 3 + (i % 3) for i in range(60)}
    assert detect_spikes(counts) == []


def test_plain_mean_3sigma_misses_large_burst_but_detector_finds_it():
    values = [300] * 12 + [3] * 48
    assert 300 <= mean(values) + 3 * pstdev(values)      # naive rule misses it
    counts = {minute(i): v for i, v in enumerate(values)}
    assert len(detect_spikes(counts)) == 1               # median/MAD finds it


def test_abusive_ip_over_threshold():
    auth = {("9.9.9.9", minute(0)): 150, ("9.9.9.9", minute(1)): 10,
            ("2.2.2.2", minute(0)): 5}
    found = abusive_ips(auth, threshold_per_minute=100)
    assert [(a.ip, a.total, a.peak_per_minute) for a in found] == [("9.9.9.9", 160, 150)]


def test_aggregate_zero_fills_quiet_minutes():
    agg = aggregate([entry(0, status=502), entry(3, status=200)])
    assert agg.per_minute_5xx() == {minute(0): 1, minute(1): 0, minute(2): 0, minute(3): 0}


def test_top_failing_endpoints_and_spike_endpoint():
    entries = [entry(0, path="/pay", status=502)] * 5 + \
              [entry(1, path="/pay", status=502)] * 5 + \
              [entry(1, path="/cart", status=502), entry(2, path="/login", status=401)]
    agg = aggregate(entries)
    assert top_failing_endpoints(agg)[0] == ("/pay", 0, 10)
    counts = {minute(0): 5, minute(1): 6}
    spike = detect_spikes({**{minute(i): 0 for i in range(2, 30)}, **counts}, min_count=4)[0]
    assert spike_top_endpoint(agg, spike) == "/pay"
