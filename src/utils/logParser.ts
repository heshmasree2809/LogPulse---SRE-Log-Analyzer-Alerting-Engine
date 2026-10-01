import { LogEntry, AnalysisSummary, EndpointMetric, LatencyPercentiles, ErrorSpikeBucket } from '../types';

// Regex patterns for Apache & Nginx access logs
export const NGINX_COMBINED_WITH_TIME_REGEX =
  /^(\S+)\s+\S+\s+(\S+)\s+\[([^\]]+)\]\s+"([A-Z]+)\s+([^"\s]+)\s+HTTP\/[0-9.]+"\s+(\d{3})\s+(\d+)\s+"([^"]*)"\s+"([^"]*)"(?:\s+([0-9.]+))?/;

export const APACHE_COMBINED_REGEX =
  /^(\S+)\s+\S+\s+(\S+)\s+\[([^\]]+)\]\s+"([A-Z]+)\s+([^"\s]+)\s+HTTP\/[0-9.]+"\s+(\d{3})\s+(\d+)(?:\s+"([^"]*)"\s+"([^"]*)")?/;

export function parseRawLine(line: string, index: number): LogEntry | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  // 1. Try JSON log format
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      const statusCode = Number(obj.status || obj.statusCode || obj.status_code || 200);
      const responseTimeMs = Number(obj.responseTimeMs || (obj.request_time ? obj.request_time * 1000 : 0) || obj.latency || 20);
      const timestamp = obj.time || obj.timestamp || obj['@timestamp'] || new Date().toISOString();
      const epochMs = new Date(timestamp).getTime() || Date.now();

      return {
        id: `json-${index}`,
        timestamp,
        epochMs,
        ip: obj.ip || obj.client_ip || obj.remote_addr || '127.0.0.1',
        method: (obj.method || 'GET').toUpperCase() as LogEntry['method'],
        path: obj.path || obj.uri || obj.url || '/',
        statusCode,
        responseBytes: Number(obj.bytes || obj.response_size || 0),
        responseTimeMs,
        userAgent: obj.user_agent || obj.userAgent || 'Unknown',
        raw: trimmed
      };
    } catch {
      // Fall through to regex
    }
  }

  // 2. Try Nginx format with response time
  let match = trimmed.match(NGINX_COMBINED_WITH_TIME_REGEX);
  if (match) {
    const [, ip, , timeStr, method, path, status, bytes, , ua, reqTimeSec] = match;
    const epochMs = parseNginxDate(timeStr);
    const latencyMs = reqTimeSec ? Math.round(parseFloat(reqTimeSec) * 1000) : 25;

    return {
      id: `nginx-${index}`,
      timestamp: timeStr,
      epochMs,
      ip,
      method: (method as LogEntry['method']) || 'GET',
      path,
      statusCode: parseInt(status, 10),
      responseBytes: parseInt(bytes, 10) || 0,
      responseTimeMs: latencyMs,
      userAgent: ua || 'Unknown',
      raw: trimmed
    };
  }

  // 3. Try Apache Combined format
  match = trimmed.match(APACHE_COMBINED_REGEX);
  if (match) {
    const [, ip, , timeStr, method, path, status, bytes, , ua] = match;
    const epochMs = parseNginxDate(timeStr);

    return {
      id: `apache-${index}`,
      timestamp: timeStr,
      epochMs,
      ip,
      method: (method as LogEntry['method']) || 'GET',
      path,
      statusCode: parseInt(status, 10),
      responseBytes: parseInt(bytes, 10) || 0,
      responseTimeMs: 35, // default simulated if not recorded
      userAgent: ua || 'Unknown',
      raw: trimmed
    };
  }

  // 4. Loose fallback regex for simple server logs: "IP - - [date] "METHOD /path" STATUS BYTES"
  const looseMatch = trimmed.match(/^(\S+).*?"([A-Z]+)\s+([^\s"]+).*?"\s+(\d{3})\s+(\d+)/);
  if (looseMatch) {
    const [, ip, method, path, status, bytes] = looseMatch;
    return {
      id: `loose-${index}`,
      timestamp: new Date().toISOString(),
      epochMs: Date.now(),
      ip,
      method: (method as LogEntry['method']) || 'GET',
      path,
      statusCode: parseInt(status, 10),
      responseBytes: parseInt(bytes, 10) || 0,
      responseTimeMs: 30,
      userAgent: 'Unknown',
      raw: trimmed
    };
  }

  return null;
}

function parseNginxDate(str: string): number {
  // Format: "01/Oct/2026:14:20:00 +0000"
  try {
    const parts = str.match(/(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/);
    if (!parts) return Date.now();
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
    };
    const [, d, m, y, h, min, s] = parts;
    return Date.UTC(parseInt(y, 10), months[m] ?? 0, parseInt(d, 10), parseInt(h, 10), parseInt(min, 10), parseInt(s, 10));
  } catch {
    return Date.now();
  }
}

export function parseRawLogText(text: string): LogEntry[] {
  const lines = text.split('\n');
  const results: LogEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const entry = parseRawLine(lines[i], i);
    if (entry) results.push(entry);
  }
  return results;
}

export function calculatePercentiles(latencies: number[]): LatencyPercentiles {
  if (latencies.length === 0) {
    return { min: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0, avg: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const n = sorted.length;
  const getP = (p: number) => {
    const idx = Math.min(Math.floor((p / 100) * n), n - 1);
    return sorted[idx];
  };

  const sum = sorted.reduce((acc, v) => acc + v, 0);

  return {
    min: sorted[0],
    p50: getP(50),
    p90: getP(90),
    p95: getP(95),
    p99: getP(99),
    max: sorted[n - 1],
    avg: Math.round(sum / n)
  };
}

export function analyzeLogs(logs: LogEntry[], durationMs: number = 20): AnalysisSummary {
  const totalLogs = logs.length;
  if (totalLogs === 0) {
    return {
      totalLogs: 0,
      totalErrors: 0,
      overallErrorRate: 0,
      status5xxCount: 0,
      status4xxCount: 0,
      status2xxCount: 0,
      status3xxCount: 0,
      latencyPercentiles: { min: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0, avg: 0 },
      topFailingEndpoints: [],
      slowestEndpoints: [],
      errorBuckets: [],
      spikesDetected: 0,
      durationSeconds: durationMs / 1000,
      processedLinesPerSec: 0
    };
  }

  let status5xxCount = 0;
  let status4xxCount = 0;
  let status2xxCount = 0;
  let status3xxCount = 0;
  const allLatencies: number[] = [];

  const endpointMap = new Map<string, {
    path: string;
    method: string;
    totalHits: number;
    errorCount: number;
    statusCounts: Record<number, number>;
    latencies: number[];
    recentSample?: LogEntry;
  }>();

  // Bucket by 1-minute window
  const bucketMap = new Map<number, {
    total: number;
    errors: number;
    status5xx: number;
    status4xx: number;
    latencies: number[];
    sampleEpoch: number;
  }>();

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const code = log.statusCode;

    if (code >= 500) status5xxCount++;
    else if (code >= 400) status4xxCount++;
    else if (code >= 300) status3xxCount++;
    else if (code >= 200) status2xxCount++;

    allLatencies.push(log.responseTimeMs);

    // Group endpoint (normalize query strings for grouping)
    const normalizedPath = log.path.split('?')[0];
    const key = `${log.method} ${normalizedPath}`;
    let ep = endpointMap.get(key);
    if (!ep) {
      ep = {
        path: normalizedPath,
        method: log.method,
        totalHits: 0,
        errorCount: 0,
        statusCounts: {},
        latencies: [],
        recentSample: log
      };
      endpointMap.set(key, ep);
    }
    ep.totalHits++;
    ep.statusCounts[code] = (ep.statusCounts[code] || 0) + 1;
    ep.latencies.push(log.responseTimeMs);
    if (code >= 400) {
      ep.errorCount++;
      ep.recentSample = log;
    }

    // Bucket by 60 seconds
    const minuteBucketKey = Math.floor(log.epochMs / (60 * 1000)) * (60 * 1000);
    let b = bucketMap.get(minuteBucketKey);
    if (!b) {
      b = {
        total: 0,
        errors: 0,
        status5xx: 0,
        status4xx: 0,
        latencies: [],
        sampleEpoch: minuteBucketKey
      };
      bucketMap.set(minuteBucketKey, b);
    }
    b.total++;
    b.latencies.push(log.responseTimeMs);
    if (code >= 400) {
      b.errors++;
      if (code >= 500) b.status5xx++;
      else b.status4xx++;
    }
  }

  const totalErrors = status5xxCount + status4xxCount;
  const overallErrorRate = totalLogs > 0 ? (totalErrors / totalLogs) * 100 : 0;
  const latencyPercentiles = calculatePercentiles(allLatencies);

  // Compile endpoint metrics
  const endpointMetrics: EndpointMetric[] = [];
  endpointMap.forEach((val) => {
    const latP = calculatePercentiles(val.latencies);
    endpointMetrics.push({
      path: val.path,
      method: val.method,
      totalHits: val.totalHits,
      errorCount: val.errorCount,
      errorRate: val.totalHits > 0 ? (val.errorCount / val.totalHits) * 100 : 0,
      statusCounts: val.statusCounts,
      avgLatencyMs: latP.avg,
      p95LatencyMs: latP.p95,
      maxLatencyMs: latP.max,
      recentSample: val.recentSample
    });
  });

  // Top failing endpoints (sorted by error count desc, then error rate)
  const topFailingEndpoints = [...endpointMetrics]
    .filter((ep) => ep.errorCount > 0)
    .sort((a, b) => b.errorCount - a.errorCount || b.errorRate - a.errorRate);

  // Slowest endpoints (sorted by p95 latency desc)
  const slowestEndpoints = [...endpointMetrics]
    .sort((a, b) => b.p95LatencyMs - a.p95LatencyMs);

  // Build time buckets sorted chronologically
  const sortedBucketKeys = Array.from(bucketMap.keys()).sort((a, b) => a - b);
  const errorBuckets: ErrorSpikeBucket[] = [];
  let spikesDetected = 0;

  sortedBucketKeys.forEach((epoch) => {
    const b = bucketMap.get(epoch)!;
    const rate = b.total > 0 ? (b.errors / b.total) * 100 : 0;
    const latSum = b.latencies.reduce((acc, v) => acc + v, 0);
    const avgLat = b.latencies.length > 0 ? Math.round(latSum / b.latencies.length) : 0;
    const dateObj = new Date(epoch);
    const timeLabel = `${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')}`;

    // Anomaly condition: error rate > 5% or 5xx > 10
    const isSpike = rate > 5.0 || b.status5xx >= 10;
    if (isSpike) spikesDetected++;

    errorBuckets.push({
      timestamp: dateObj.toISOString(),
      timeLabel,
      totalRequests: b.total,
      errorRequests: b.errors,
      errorRate: parseFloat(rate.toFixed(1)),
      status5xx: b.status5xx,
      status4xx: b.status4xx,
      avgLatencyMs: avgLat,
      isSpike
    });
  });

  const durationSeconds = Math.max(durationMs / 1000, 0.001);
  const processedLinesPerSec = Math.round(totalLogs / durationSeconds);

  return {
    totalLogs,
    totalErrors,
    overallErrorRate: parseFloat(overallErrorRate.toFixed(2)),
    status5xxCount,
    status4xxCount,
    status2xxCount,
    status3xxCount,
    latencyPercentiles,
    topFailingEndpoints,
    slowestEndpoints,
    errorBuckets,
    spikesDetected,
    durationSeconds: parseFloat(durationSeconds.toFixed(3)),
    processedLinesPerSec
  };
}
