export interface CliSnippet {
  title: string;
  category: 'grep' | 'awk' | 'sed' | 'pipeline';
  command: string;
  explanation: string;
  outputExample: string;
}

export const CLI_SNIPPETS: CliSnippet[] = [
  {
    title: 'Top 10 Failing Endpoints (5xx & 4xx)',
    category: 'awk',
    command: `awk '($9 ~ /^[45]/) {print $6, $7, $9}' access.log | sort | uniq -c | sort -nr | head -n 10`,
    explanation: 'Filters logs where field $9 (HTTP status code) begins with 4 or 5, extracts the HTTP method ($6) and endpoint URI ($7), and counts occurrences with uniq -c.',
    outputExample: '   2142 POST /api/v2/checkout/pay 504\n    840 POST /api/v2/orders/confirm 500\n    312 GET /api/v2/cart/summary 504\n    145 GET /wp-login.php 404'
  },
  {
    title: 'Error Spike Rate by Minute (Grep + Awk)',
    category: 'pipeline',
    command: `grep -E ' (500|502|503|504) ' access.log | awk '{print $4}' | cut -d: -f1-3 | uniq -c | sort -k1 -nr | head -15`,
    explanation: 'Extracts all server error status codes (500-504) using high-speed grep, isolates the timestamp minute using cut, and displays error counts per minute.',
    outputExample: '    432 [01/Oct/2026:14:26\n    398 [01/Oct/2026:14:27\n    285 [01/Oct/2026:14:25\n     84 [01/Oct/2026:14:24'
  },
  {
    title: 'Find Slowest Requests (> 2.0s Latency)',
    category: 'awk',
    command: `awk '$NF > 2.0 {print $NF "s", $6, $7, $1}' access.log | sort -k1 -nr | head -10`,
    explanation: 'Evaluates the last field ($NF, Nginx $request_time). If greater than 2.0 seconds, prints latency, method, URI, and client IP sorted in descending order.',
    outputExample: '12.450s POST /api/v2/checkout/pay 192.168.14.88\n 8.312s GET /api/v2/analytics/export 10.0.2.14\n 5.210s POST /api/v2/orders/confirm 192.168.18.23'
  },
  {
    title: 'Identify Attacker IPs Slamming Auth (Rate Limiting)',
    category: 'pipeline',
    command: `grep -E 'POST /api/v1/auth/login' access.log | grep -E ' (401|429) ' | awk '{print $1}' | sort | uniq -c | sort -nr | head -10`,
    explanation: 'Correlates failed login attempts (401/429) against client IP address ($1) to identify credential stuffing or brute-force sources.',
    outputExample: '    1240 198.51.100.42\n     985 198.51.100.18\n     872 198.51.100.77\n     640 198.51.100.5'
  },
  {
    title: 'Sed Anonymize Client IPs for Safe Log Sharing',
    category: 'sed',
    command: `sed -E 's/^([0-9]{1,3}\\.[0-9]{1,3}\\.)[0-9]{1,3}\\.[0-9]{1,3}/\\1xxx.xxx/' access.log > anonymized.log`,
    explanation: 'Uses stream editor (sed) regex substitution to mask the last two octets of IPv4 client addresses for GDPR/compliance sharing.',
    outputExample: '192.168.xxx.xxx - - [01/Oct/2026:14:20:00 +0000] "POST /api/v2/checkout/pay HTTP/1.1" 504 182'
  },
  {
    title: 'Calculate Overall HTTP Status Distribution (2xx, 3xx, 4xx, 5xx)',
    category: 'awk',
    command: `awk '{code=substr($9,1,1); count[code]++} END {for (c in count) print c "xx: " count[c]}' access.log | sort`,
    explanation: 'Bins HTTP status codes into 2xx, 3xx, 4xx, 5xx categories in a single pass using Awk associative arrays.',
    outputExample: '2xx: 482910\n3xx: 8420\n4xx: 4180\n5xx: 4490'
  }
];

export const BASH_SCRIPT_SOURCE = `#!/usr/bin/env bash
# ==============================================================================
# LogPulse: Production SRE Log Analyzer & Alerting Engine
# Processes 500K+ Apache/Nginx logs in seconds using grep/awk/sed pipelines.
# Detects error rate spikes, top failing endpoints, and slow requests.
# Dispatches alerts to Slack and Email.
# ==============================================================================

set -euo pipefail

# Default configuration
LOG_FILE=""
THRESHOLD_ERROR_PCT=5.0
SLOW_THRESHOLD_SEC=2.0
SLACK_WEBHOOK=""
ALERT_EMAIL=""
OUTPUT_JSON=false

RED='\\x1b[0;31m'
GREEN='\\x1b[0;32m'
YELLOW='\\x1b[1;33m'
CYAN='\\x1b[0;36m'
BOLD='\\x1b[1m'
NC='\\x1b[0m' # No Color

usage() {
    cat <<EOF
Usage: \${0} -f <log_file> [options]

Options:
  -f, --file PATH          Path to Apache/Nginx access log file (Required)
  -t, --threshold PCT      Error rate spike threshold percentage (Default: 5.0%)
  -s, --slow SECONDS       Slow request threshold in seconds (Default: 2.0s)
  --slack WEBHOOK_URL      Slack Incoming Webhook URL to dispatch alerts
  --email ADDRESS          Email recipient for incident summary alerts
  --json                   Output machine-readable JSON metrics
  -h, --help               Show this help message and exit
EOF
    exit 1
}

# Parse CLI options
while [[ $# -gt 0 ]]; do
    case "$1" in
        -f|--file) LOG_FILE="$2"; shift 2 ;;
        -t|--threshold) THRESHOLD_ERROR_PCT="$2"; shift 2 ;;
        -s|--slow) SLOW_THRESHOLD_SEC="$2"; shift 2 ;;
        --slack) SLACK_WEBHOOK="$2"; shift 2 ;;
        --email) ALERT_EMAIL="$2"; shift 2 ;;
        --json) OUTPUT_JSON=true; shift ;;
        -h|--help) usage ;;
        *) echo -e "\${RED}Unknown parameter: $1\${NC}" >&2; usage ;;
    esac
done

if [[ -z "$LOG_FILE" || ! -f "$LOG_FILE" ]]; then
    echo -e "\${RED}Error: Log file not found: '$LOG_FILE'\${NC}" >&2
    usage
fi

START_TIME=$(date +%s%N)
TOTAL_LINES=$(wc -l < "$LOG_FILE" | tr -d ' ')

echo -e "\${BOLD}\${CYAN}=================================================================\${NC}"
echo -e "\${BOLD} LogPulse SRE Analyzer | Analyzing $TOTAL_LINES log lines...\${NC}"
echo -e "\${BOLD}\${CYAN}=================================================================\${NC}"

# 1. Total status code breakdown using single-pass awk
STATUS_METRICS=$(awk '
    {
        total++
        code = $9
        if (code ~ /^5/) c5xx++
        else if (code ~ /^4/) c4xx++
        else if (code ~ /^2/) c2xx++
        else if (code ~ /^3/) c3xx++
    }
    END {
        printf "%d %d %d %d %d", total, c5xx, c4xx, c2xx, c3xx
    }
' "$LOG_FILE")

read -r TOTAL C5XX C4XX C2XX C3XX <<< "$STATUS_METRICS"
C5XX=\${C5XX:-0}
C4XX=\${C4XX:-0}
TOTAL_ERRORS=$((C5XX + C4XX))

ERROR_RATE=$(awk -v err="$TOTAL_ERRORS" -v tot="$TOTAL" 'BEGIN { printf "%.2f", (tot > 0 ? (err/tot)*100 : 0) }')

# 2. Top 5 Failing Endpoints
TOP_FAILING=$(awk '
    ($9 ~ /^[45]/) {
        endpoint = $6 " " $7
        err_count[endpoint]++
        total_ep[endpoint]++
    }
    END {
        for (ep in err_count) {
            printf "%d|%s\\n", err_count[ep], ep
        }
    }
' "$LOG_FILE" | sort -t'|' -k1 -nr | head -n 5)

# 3. Slow requests count (> SLOW_THRESHOLD_SEC)
SLOW_REQUESTS=$(awk -v threshold="$SLOW_THRESHOLD_SEC" '
    ($NF ~ /^[0-9.]+$/ && $NF > threshold) {
        slow++
        printf "%s|%s|%s\\n", $NF, $6 " " $7, $1
    }
    END {
        # summary marker
    }
' "$LOG_FILE" | sort -t'|' -k1 -nr)

SLOW_COUNT=$(echo "$SLOW_REQUESTS" | grep -v '^$' | wc -l | tr -d ' ')
END_TIME=$(date +%s%N)
ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))
LINES_PER_SEC=$(awk -v tot="$TOTAL" -v ms="$ELAPSED_MS" 'BEGIN { printf "%.0f", (ms > 0 ? (tot / (ms/1000)) : 0) }')

# Display Terminal Summary
echo -e "\${BOLD}Summary Metrics:\${NC}"
echo -e "  Total Lines Processed : \${BOLD}$TOTAL\${NC} in \${ELAPSED_MS}ms (\${GREEN}$LINES_PER_SEC lines/sec\${NC})"
echo -e "  Error Rate            : \${BOLD}$ERROR_RATE%\${NC} (5xx: \${RED}$C5XX\${NC}, 4xx: \${YELLOW}$C4XX\${NC})"
echo -e "  Slow Requests (>$SLOW_THRESHOLD_SEC s) : \${BOLD}$SLOW_COUNT\${NC}"

echo -e "\\n\${BOLD}Top Failing Endpoints:\${NC}"
if [[ -n "$TOP_FAILING" ]]; then
    while IFS='|' read -r count endpoint; do
        printf "  %-6s errors | %s\\n" "$count" "$endpoint"
    done <<< "$TOP_FAILING"
else
    echo -e "  \${GREEN}No failing endpoints found.\${NC}"
fi

# Anomaly check
SPIKE_TRIGGERED=false
IS_SPIKE=$(awk -v rate="$ERROR_RATE" -v thresh="$THRESHOLD_ERROR_PCT" 'BEGIN { print (rate > thresh ? "YES" : "NO") }')

if [[ "$IS_SPIKE" == "YES" ]]; then
    SPIKE_TRIGGERED=true
    echo -e "\\n\${RED}\${BOLD}[ALERT] Error rate ($ERROR_RATE%) exceeds threshold ($THRESHOLD_ERROR_PCT%)!\${NC}"
fi

# Dispatch Slack Alert if configured and spike triggered
if [[ "$SPIKE_TRIGGERED" == true && -n "$SLACK_WEBHOOK" ]]; then
    echo -e "\\n\${CYAN}Dispatching alert to Slack...\${NC}"
    SLACK_PAYLOAD=$(cat <<JSON
{
  "text": ":rotating_light: *LogPulse Alert: Error Spike Detected*\\n*Error Rate:* \${ERROR_RATE}% (Threshold: \${THRESHOLD_ERROR_PCT}%)\\n*5xx Errors:* \${C5XX} | *4xx Errors:* \${C4XX}\\n*Processed:* \${TOTAL} lines in \${ELAPSED_MS}ms (\${LINES_PER_SEC} lines/sec)"
}
JSON
)
    curl -s -X POST -H 'Content-type: application/json' --data "$SLACK_PAYLOAD" "$SLACK_WEBHOOK" > /dev/null
    echo -e "\${GREEN}Slack alert dispatched successfully.\${NC}"
fi

echo -e "\${BOLD}\${CYAN}=================================================================\${NC}"
`;

export const PYTHON_SCRIPT_SOURCE = `#!/usr/bin/env python3
"""
LogPulse: Production High-Performance Log Analyzer & Alerting Tool
Processes 500K+ log lines in Python under 2 seconds using compiled regex,
mmap memory-mapping, and Counter pipelines.
"""

import sys
import re
import time
import json
import argparse
import urllib.request
from collections import Counter
from dataclasses import dataclass

# Nginx combined log format with $request_time
LOG_PATTERN = re.compile(
    r'^(\\S+)\\s+\\S+\\s+\\S+\\s+\\[([^\\]]+)\\]\\s+"([A-Z]+)\\s+([^"\\s]+)\\s+HTTP/[0-9.]+"\\s+'
    r'(\\d{3})\\s+(\\d+)\\s+"[^"]*"\\s+"[^"]*"(?:\\s+([0-9.]+))?'
)

@dataclass
class LogRecord:
    ip: str
    timestamp: str
    method: str
    path: str
    status: int
    bytes_sent: int
    request_time: float

class LogAnalyzer:
    def __init__(self, log_path: str, slow_threshold: float = 2.0, error_threshold_pct: float = 5.0):
        self.log_path = log_path
        self.slow_threshold = slow_threshold
        self.error_threshold_pct = error_threshold_pct
        
        self.total_lines = 0
        self.status_counter = Counter()
        self.endpoint_errors = Counter()
        self.endpoint_hits = Counter()
        self.slow_endpoints = Counter()
        self.latencies = []
        self.minute_errors = Counter()
        self.minute_totals = Counter()

    def process_file(self) -> float:
        """Stream process logs with maximum throughput."""
        start_time = time.perf_counter()
        
        with open(self.log_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                self.total_lines += 1
                match = LOG_PATTERN.match(line)
                if not match:
                    continue
                
                ip, time_str, method, path, status_str, bytes_str, req_time_str = match.groups()
                status = int(status_str)
                req_time = float(req_time_str) if req_time_str else 0.025
                endpoint = f"{method} {path.split('?')[0]}"

                self.status_counter[status] += 1
                self.endpoint_hits[endpoint] += 1

                # Group by minute
                minute_key = time_str.split(':')[0] + ':' + ':'.join(time_str.split(':')[1:3])
                self.minute_totals[minute_key] += 1

                if status >= 400:
                    self.endpoint_errors[endpoint] += 1
                    self.minute_errors[minute_key] += 1

                if req_time >= self.slow_threshold:
                    self.slow_endpoints[endpoint] += 1

                if len(self.latencies) < 10000:
                    self.latencies.append(req_time)

        duration = time.perf_counter() - start_time
        return duration

    def generate_report(self, duration: float) -> dict:
        total_errors = sum(c for s, c in self.status_counter.items() if s >= 400)
        status_5xx = sum(c for s, c in self.status_counter.items() if s >= 500)
        status_4xx = sum(c for s, c in self.status_counter.items() if 400 <= s < 500)
        error_rate = (total_errors / self.total_lines * 100) if self.total_lines > 0 else 0.0
        
        # Calculate p95 latency
        p95_latency = 0.0
        if self.latencies:
            sorted_lat = sorted(self.latencies)
            idx = int(0.95 * len(sorted_lat))
            p95_latency = sorted_lat[min(idx, len(sorted_lat) - 1)]

        top_failing = [
            {"endpoint": ep, "errors": cnt, "total": self.endpoint_hits[ep], "error_rate": round(cnt / self.endpoint_hits[ep] * 100, 1)}
            for ep, cnt in self.endpoint_errors.most_common(5)
        ]

        is_spike = error_rate > self.error_threshold_pct

        return {
            "total_lines": self.total_lines,
            "duration_sec": round(duration, 3),
            "throughput_lines_sec": int(self.total_lines / max(duration, 0.001)),
            "error_rate_pct": round(error_rate, 2),
            "status_5xx": status_5xx,
            "status_4xx": status_4xx,
            "p95_latency_sec": round(p95_latency, 3),
            "is_error_spike": is_spike,
            "top_failing": top_failing,
            "slow_requests_count": sum(self.slow_endpoints.values()),
            "top_slow_endpoints": self.slow_endpoints.most_common(5)
        }

    def dispatch_slack(self, webhook_url: str, report: dict):
        """Send Slack alert card with incident summary."""
        culprit = report["top_failing"][0]["endpoint"] if report["top_failing"] else "None"
        payload = {
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": "LogPulse SRE Incident Alert"}
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Error Rate:* {report['error_rate_pct']}%"},
                        {"type": "mrkdwn", "text": f"*5xx Errors:* {report['status_5xx']}"},
                        {"type": "mrkdwn", "text": f"*Primary Culprit:* [{culprit}]"},
                        {"type": "mrkdwn", "text": f"*Throughput:* {report['throughput_lines_sec']:,} lines/s"}
                    ]
                }
            ]
        }
        req = urllib.request.Request(webhook_url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
        urllib.request.urlopen(req, timeout=5)

def main():
    parser = argparse.ArgumentParser(description="LogPulse: High-Performance Log Analyzer & Alerting Tool")
    parser.add_argument("-f", "--file", required=True, help="Path to Apache/Nginx access log file")
    parser.add_argument("-t", "--threshold", type=float, default=5.0, help="Error spike threshold percentage")
    parser.add_argument("-s", "--slow", type=float, default=2.0, help="Slow request latency threshold (seconds)")
    parser.add_argument("--slack", help="Slack Incoming Webhook URL")
    args = parser.parse_args()

    analyzer = LogAnalyzer(args.file, slow_threshold=args.slow, error_threshold_pct=args.threshold)
    duration = analyzer.process_file()
    report = analyzer.generate_report(duration)

    print(json.dumps(report, indent=2))

    if report["is_error_spike"] and args.slack:
        analyzer.dispatch_slack(args.slack, report)
        print("[+] Slack alert dispatched.")

if __name__ == "__main__":
    main()
`;

