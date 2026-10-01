export interface LogEntry {
  id: string;
  timestamp: string; // ISO or raw string
  epochMs: number;
  ip: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  path: string;
  statusCode: number;
  responseBytes: number;
  responseTimeMs: number; // Latency in ms (from $request_time or duration)
  userAgent: string;
  referer?: string;
  raw: string;
}

export type LogFormat = 'nginx' | 'apache' | 'json';

export interface EndpointMetric {
  path: string;
  method: string;
  totalHits: number;
  errorCount: number;
  errorRate: number; // percentage
  statusCounts: Record<number, number>;
  avgLatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
  recentSample?: LogEntry;
}

export interface LatencyPercentiles {
  min: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
  avg: number;
}

export interface ErrorSpikeBucket {
  timestamp: string;
  timeLabel: string;
  totalRequests: number;
  errorRequests: number;
  errorRate: number; // percentage
  status5xx: number;
  status4xx: number;
  avgLatencyMs: number;
  isSpike: boolean;
}

export interface AnalysisSummary {
  totalLogs: number;
  totalErrors: number;
  overallErrorRate: number;
  status5xxCount: number;
  status4xxCount: number;
  status2xxCount: number;
  status3xxCount: number;
  latencyPercentiles: LatencyPercentiles;
  topFailingEndpoints: EndpointMetric[];
  slowestEndpoints: EndpointMetric[];
  errorBuckets: ErrorSpikeBucket[];
  spikesDetected: number;
  durationSeconds: number;
  processedLinesPerSec: number;
}

export interface IncidentRCA {
  scenarioId: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  incidentStarted: string;
  incidentResolved?: string;
  rootCause: string;
  primaryCulprit: string;
  triggerEvent: string;
  timeline: { time: string; event: string; type: 'trigger' | 'cascade' | 'peak' | 'recovery' }[];
  blastRadius: string[];
  remediationRunbook: string[];
  timeSavedText: string;
}

export interface AlertRule {
  id: string;
  name: string;
  type: 'error_spike' | 'slow_request' | '5xx_threshold';
  thresholdValue: number;
  timeWindowMin: number;
  enabled: boolean;
  channel: 'slack' | 'email' | 'both';
  severity: 'critical' | 'warning' | 'info';
}

export interface BenchmarkMetrics {
  totalLines: number;
  durationMs: number;
  linesPerSec: number;
  totalErrorsFound: number;
  slowRequestsFound: number;
  heapMemoryUsedMb: number;
  status: 'idle' | 'running' | 'completed';
}
