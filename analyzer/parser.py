"""Streaming parser for Nginx combined logs with $request_time appended."""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, Iterator, Optional

LOG_RE = re.compile(
    r'^(?P<ip>\S+) \S+ \S+ \[(?P<ts>[^\]]+)\] '
    r'"(?P<method>[A-Z]+) (?P<url>\S+) [^"]*" '
    r'(?P<status>\d{3}) (?P<bytes>\d+|-) '
    r'"[^"]*" "(?P<ua>[^"]*)" (?P<rt>\d+(?:\.\d+)?)$'
)
TS_FORMAT = "%d/%b/%Y:%H:%M:%S %z"


@dataclass(frozen=True, slots=True)
class LogEntry:
    ip: str
    timestamp: datetime
    method: str
    path: str                 # query string removed
    status: int
    response_time_ms: float   # converted from seconds once, here


@dataclass
class ParseStats:
    total: int = 0
    malformed: int = 0


def parse_line(line: str) -> Optional[LogEntry]:
    """Return a LogEntry, or None if the line is malformed."""
    m = LOG_RE.match(line.rstrip("\n"))
    if not m:
        return None
    try:
        ts = datetime.strptime(m["ts"], TS_FORMAT)
    except ValueError:
        return None
    return LogEntry(
        ip=m["ip"],
        timestamp=ts,
        method=m["method"],
        path=m["url"].split("?", 1)[0],
        status=int(m["status"]),
        response_time_ms=float(m["rt"]) * 1000,
    )


def parse_lines(lines: Iterable[str], stats: ParseStats) -> Iterator[LogEntry]:
    """Stream entries lazily; count malformed lines instead of raising."""
    for line in lines:
        stats.total += 1
        entry = parse_line(line)
        if entry is None:
            stats.malformed += 1
            continue
        yield entry
