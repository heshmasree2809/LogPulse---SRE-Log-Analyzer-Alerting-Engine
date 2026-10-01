from analyzer.parser import parse_line, parse_lines, ParseStats

GOOD = ('198.51.100.42 - - [01/Oct/2026:14:46:40 +0000] '
        '"POST /api/v1/checkout HTTP/1.1" 502 166 "-" "Mozilla/5.0 (X11; Linux)" 12.450')

def test_parses_valid_line():
    e = parse_line(GOOD)
    assert e is not None
    assert e.ip == "198.51.100.42"
    assert e.method == "POST" and e.path == "/api/v1/checkout"
    assert e.status == 502
    assert e.response_time_ms == 12450.0
    assert e.timestamp.hour == 14 and e.timestamp.minute == 46

def test_strips_query_string_from_path():
    e = parse_line(GOOD.replace("/api/v1/checkout", "/api/v1/search?q=a"))
    assert e is not None
    assert e.path == "/api/v1/search"

def test_user_agent_with_spaces_does_not_break_response_time():
    e = parse_line(GOOD)
    assert e is not None
    assert e.response_time_ms == 12450.0

def test_malformed_lines_return_none():
    assert parse_line("garbage") is None
    assert parse_line(GOOD[:60]) is None                # truncated
    assert parse_line(GOOD.replace("502", "5x2")) is None

def test_stats_count_malformed_without_crashing():
    stats = ParseStats()
    entries = list(parse_lines([GOOD, "garbage", GOOD, ""], stats))
    assert len(entries) == 2
    assert stats.total == 4 and stats.malformed == 2
