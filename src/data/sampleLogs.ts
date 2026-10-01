import { LogEntry, IncidentRCA } from '../types';

export interface ScenarioDefinition {
  id: string;
  name: string;
  badge: string;
  description: string;
  format: 'nginx' | 'apache' | 'json';
  expectedRca: IncidentRCA;
  generateLogs: () => LogEntry[];
}

// Helper to format timestamps like Nginx: 01/Oct/2026:14:20:00 +0000
function formatNginxTime(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const mins = String(date.getUTCMinutes()).padStart(2, '0');
  const secs = String(date.getUTCSeconds()).padStart(2, '0');
  return `${day}/${month}/${year}:${hours}:${mins}:${secs} +0000`;
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'checkout_cascade',
    name: 'Checkout Gateway Timeout & Cascading 504s',
    badge: 'Critical Incident',
    description: 'Upstream payment gateway latency spikes to 12s, exhausting Nginx upstream connection pool and cascading into 504 Gateway Timeouts across all order endpoints.',
    format: 'nginx',
    expectedRca: {
      scenarioId: 'checkout_cascade',
      title: 'Upstream Payment Provider Degradation -> DB Connection Starvation',
      severity: 'CRITICAL',
      incidentStarted: '14:22:10 UTC',
      incidentResolved: '14:38:00 UTC',
      rootCause: 'At 14:22:10 UTC, third-party payment partner `pay-gateway.internal` started encountering latency spikes (>8000ms). Web workers running `POST /api/v2/checkout/pay` hung waiting for HTTP response, retaining PostgreSQL connection handles. Within 90 seconds, all 120 pool connections were exhausted, starving downstream microservices and causing Nginx to throw 504 Gateway Timeouts and 500 Internal Server Errors.',
      primaryCulprit: 'POST /api/v2/checkout/pay (Upstream timeout: 12.4s)',
      triggerEvent: 'Upstream partner PayHub latency spike triggered synchronous thread starvation',
      timeline: [
        { time: '14:20:00 UTC', event: 'Normal baseline: 120 req/s, error rate 0.08%, p95 latency 42ms.', type: 'trigger' },
        { time: '14:22:10 UTC', event: 'PayHub response time rises from 180ms to 9,400ms.', type: 'trigger' },
        { time: '14:23:45 UTC', event: 'Postgres connection pool max_connections (120/120) saturated.', type: 'cascade' },
        { time: '14:24:30 UTC', event: 'Nginx upstream buffer fills. Error rate spikes from 0.1% to 38.6%.', type: 'peak' },
        { time: '14:28:00 UTC', event: 'Top failing endpoints: /api/v2/checkout/pay (94% 504s), /api/v2/orders/confirm (82% 500s).', type: 'peak' },
        { time: '14:32:00 UTC', event: 'SRE triggered Circuit Breaker to reject non-essential calls and enabled fallback mock gateway.', type: 'recovery' },
        { time: '14:38:00 UTC', event: 'Error rate back below 0.2%, connection pool normal (14/120).', type: 'recovery' }
      ],
      blastRadius: [
        '/api/v2/checkout/pay',
        '/api/v2/orders/confirm',
        '/api/v2/cart/summary',
        '/api/v1/inventory/reserve'
      ],
      remediationRunbook: [
        '1. Implement hard 2.5s client-side timeout on upstream payment HTTP client.',
        '2. Configure Resilience4j / Envoy Circuit Breaker for upstream payment provider.',
        '3. Separate database connection pool: isolate checkout transactions from cart/catalog reads.',
        '4. Lower Nginx proxy_read_timeout from 60s to 5s to fail fast during vendor degradation.'
      ],
      timeSavedText: 'Diagnostic time: 1 min 22 sec (Manual log grep & thread dump review normally takes ~32 min)'
    },
    generateLogs: () => {
      const logs: LogEntry[] = [];
      const baseTime = new Date('2026-10-01T14:20:00Z').getTime();

      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/537.36 Safari/537.36'
      ];

      const endpoints = [
        { path: '/api/v2/checkout/pay', method: 'POST' as const, baseLatency: 210 },
        { path: '/api/v2/orders/confirm', method: 'POST' as const, baseLatency: 140 },
        { path: '/api/v2/cart/summary', method: 'GET' as const, baseLatency: 35 },
        { path: '/api/v1/inventory/reserve', method: 'POST' as const, baseLatency: 65 },
        { path: '/api/v1/products/list', method: 'GET' as const, baseLatency: 22 },
        { path: '/api/v1/search', method: 'GET' as const, baseLatency: 45 },
        { path: '/healthz', method: 'GET' as const, baseLatency: 4 }
      ];

      // Generate 25 minutes of logs (from 14:20 to 14:45)
      for (let i = 0; i < 650; i++) {
        const timeOffsetMs = Math.floor((i / 650) * 25 * 60 * 1000);
        const logTime = new Date(baseTime + timeOffsetMs);
        const timeLocal = formatNginxTime(logTime);
        const minute = 20 + Math.floor(timeOffsetMs / 60000);

        const isIncidentWindow = minute >= 23 && minute <= 33;
        const isPeakIncident = minute >= 25 && minute <= 30;

        const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
        const ip = `192.168.${Math.floor(Math.random() * 20) + 10}.${Math.floor(Math.random() * 250) + 1}`;
        const ua = userAgents[Math.floor(Math.random() * userAgents.length)];

        let status = 200;
        let latency = ep.baseLatency + Math.floor(Math.random() * 30);
        let bytes = Math.floor(Math.random() * 1200) + 240;

        if (isIncidentWindow) {
          if (ep.path === '/api/v2/checkout/pay') {
            status = isPeakIncident && Math.random() < 0.92 ? 504 : 500;
            latency = Math.floor(Math.random() * 5000) + 7200; // slow upstream timeout!
            bytes = 182;
          } else if (ep.path === '/api/v2/orders/confirm') {
            status = isPeakIncident && Math.random() < 0.84 ? 500 : 200;
            latency = Math.floor(Math.random() * 2500) + 1800;
            bytes = 210;
          } else if (ep.path === '/api/v2/cart/summary') {
            status = Math.random() < 0.35 ? 504 : 200;
            latency = Math.floor(Math.random() * 1200) + 400;
          } else if (ep.path === '/api/v1/inventory/reserve') {
            status = Math.random() < 0.40 ? 503 : 200;
            latency = Math.floor(Math.random() * 1500) + 500;
          }
        }

        const raw = `${ip} - - [${timeLocal}] "${ep.method} ${ep.path} HTTP/1.1" ${status} ${bytes} "-" "${ua}" ${(latency / 1000).toFixed(3)}`;

        logs.push({
          id: `log-${i}`,
          timestamp: timeLocal,
          epochMs: logTime.getTime(),
          ip,
          method: ep.method,
          path: ep.path,
          statusCode: status,
          responseBytes: bytes,
          responseTimeMs: latency,
          userAgent: ua,
          raw
        });
      }

      return logs;
    }
  },
  {
    id: 'slow_analytics',
    name: 'Slow Query Cascade on Analytics API',
    badge: 'Performance Degraded',
    description: 'Unindexed wildcard SQL query on `/api/v2/analytics/export` causes query execution times over 8500ms, starving Gunicorn worker threads.',
    format: 'nginx',
    expectedRca: {
      scenarioId: 'slow_analytics',
      title: 'Full Table Scan on `events_partition` Causing Worker Pool Starvation',
      severity: 'HIGH',
      incidentStarted: '09:15:00 UTC',
      incidentResolved: '09:42:00 UTC',
      rootCause: 'Marketing team initiated a batch export spanning 180 days with no indexed tenant filter (`GET /api/v2/analytics/export?range=180d`). This forced a sequential full scan of a 45M row table in PostgreSQL. The query consumed 100% CPU on the database replica and blocked 8 dedicated Gunicorn sync workers, leading to p99 latencies reaching 9,140ms and 504 Gateway Timeouts.',
      primaryCulprit: 'GET /api/v2/analytics/export (Avg latency: 6,420ms)',
      triggerEvent: 'Unbounded time range export query triggered sequential full table scan',
      timeline: [
        { time: '09:12:00 UTC', event: 'Nominal API traffic: 95 req/s, avg latency 64ms.', type: 'trigger' },
        { time: '09:15:02 UTC', event: 'Multiple concurrent requests hit /api/v2/analytics/export.', type: 'trigger' },
        { time: '09:18:30 UTC', event: 'DB Replica CPU hits 99.4%, disk I/O saturated at 14,000 IOPS.', type: 'cascade' },
        { time: '09:22:00 UTC', event: 'p95 latency surges from 110ms to 7,450ms across analytics cluster.', type: 'peak' },
        { time: '09:35:00 UTC', event: 'SRE terminated long-running PID via pg_terminate_backend() and added query timeout.', type: 'recovery' },
        { time: '09:42:00 UTC', event: 'Latency recovered to 72ms. Composite index migration scheduled.', type: 'recovery' }
      ],
      blastRadius: [
        '/api/v2/analytics/export',
        '/api/v2/analytics/metrics',
        '/api/v2/reports/dashboard'
      ],
      remediationRunbook: [
        '1. Set Postgres statement_timeout = 5000 for web-facing application roles.',
        '2. Add composite index on (tenant_id, created_at) for events table.',
        '3. Move long exports to asynchronous Celery / Redis background worker queue with S3 pre-signed download URL.',
        '4. Enforce max 30-day window limit on synchronous REST endpoints.'
      ],
      timeSavedText: 'Diagnostic time: 54 seconds (Manual SQL slow-query log correlation usually takes ~25 min)'
    },
    generateLogs: () => {
      const logs: LogEntry[] = [];
      const baseTime = new Date('2026-10-01T09:10:00Z').getTime();

      const endpoints = [
        { path: '/api/v2/analytics/export', method: 'GET' as const, baseLatency: 450 },
        { path: '/api/v2/analytics/metrics', method: 'GET' as const, baseLatency: 120 },
        { path: '/api/v2/reports/dashboard', method: 'GET' as const, baseLatency: 95 },
        { path: '/api/v1/auth/verify', method: 'POST' as const, baseLatency: 28 },
        { path: '/api/v1/users/me', method: 'GET' as const, baseLatency: 18 }
      ];

      for (let i = 0; i < 550; i++) {
        const timeOffsetMs = Math.floor((i / 550) * 35 * 60 * 1000);
        const logTime = new Date(baseTime + timeOffsetMs);
        const timeLocal = formatNginxTime(logTime);
        const minute = 10 + Math.floor(timeOffsetMs / 60000);

        const isSlowWindow = minute >= 15 && minute <= 35;
        const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
        const ip = `10.0.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 254) + 1}`;
        const ua = 'LogPulseAnalyzer/2.4 (SRE Diagnostic Bot)';

        let status = 200;
        let latency = ep.baseLatency + Math.floor(Math.random() * 40);
        let bytes = Math.floor(Math.random() * 4000) + 500;

        if (isSlowWindow && (ep.path === '/api/v2/analytics/export' || ep.path === '/api/v2/reports/dashboard')) {
          latency = Math.floor(Math.random() * 4000) + 4800; // >4.8s
          if (latency > 7000 && Math.random() < 0.4) {
            status = 504;
          }
        }

        const raw = `${ip} - - [${timeLocal}] "${ep.method} ${ep.path} HTTP/1.1" ${status} ${bytes} "-" "${ua}" ${(latency / 1000).toFixed(3)}`;

        logs.push({
          id: `log-${i}`,
          timestamp: timeLocal,
          epochMs: logTime.getTime(),
          ip,
          method: ep.method,
          path: ep.path,
          statusCode: status,
          responseBytes: bytes,
          responseTimeMs: latency,
          userAgent: ua,
          raw
        });
      }

      return logs;
    }
  },
  {
    id: 'credential_stuffing',
    name: 'Distributed Credential Stuffing & Rate Limit Spike',
    badge: 'Security Incident',
    description: 'Coordinated botnet attacks `/api/v1/auth/login` from 85 IP addresses with dictionary attacks, generating massive 401 and 429 status spikes.',
    format: 'nginx',
    expectedRca: {
      scenarioId: 'credential_stuffing',
      title: 'Credential Stuffing Assault on Auth API from Proxied Bot Subnet',
      severity: 'HIGH',
      incidentStarted: '03:14:00 UTC',
      incidentResolved: '03:32:00 UTC',
      rootCause: 'At 03:14:00 UTC, a coordinated botnet originating from AS14061 subnet `198.51.100.0/24` began firing automated POST requests against `/api/v1/auth/login` with rotated user-agents. Rate-limiting middleware engaged, generating over 1,400 429 Too Many Requests and 401 Unauthorized responses per minute.',
      primaryCulprit: 'POST /api/v1/auth/login (429 Rate Limited: 78.4%, 401: 19.2%)',
      triggerEvent: 'Automated dictionary credential attack targeting customer accounts',
      timeline: [
        { time: '03:10:00 UTC', event: 'Normal night auth volume: 8 req/min, 0.4% error rate.', type: 'trigger' },
        { time: '03:14:15 UTC', event: 'Auth endpoint request rate accelerates to 380 req/min.', type: 'trigger' },
        { time: '03:16:00 UTC', event: 'Token bucket limiter throttles offending IPs: 429 status explodes.', type: 'cascade' },
        { time: '03:22:00 UTC', event: 'WAF triggers automated IP group ban on subnet 198.51.100.0/24.', type: 'peak' },
        { time: '03:32:00 UTC', event: 'Attack traffic dropped at edge; genuine login success rate restored to 99.6%.', type: 'recovery' }
      ],
      blastRadius: [
        '/api/v1/auth/login',
        '/api/v1/auth/mfa/verify',
        '/api/v1/auth/password/reset'
      ],
      remediationRunbook: [
        '1. Blacklist subnet 198.51.100.0/24 at Cloudflare/AWS WAF edge layer.',
        '2. Enable reCAPTCHA Enterprise / Cloudflare Turnstile on login form after 3 failed attempts.',
        '3. Enforce Redis sliding-window IP rate limit (max 10 requests / 5 minutes per IP).',
        '4. Notify security operations of breached password hash spray attempt.'
      ],
      timeSavedText: 'Diagnostic time: 42 seconds (Manual fail2ban & IP reputation lookup takes ~20 min)'
    },
    generateLogs: () => {
      const logs: LogEntry[] = [];
      const baseTime = new Date('2026-10-01T03:10:00Z').getTime();

      for (let i = 0; i < 500; i++) {
        const timeOffsetMs = Math.floor((i / 500) * 25 * 60 * 1000);
        const logTime = new Date(baseTime + timeOffsetMs);
        const timeLocal = formatNginxTime(logTime);
        const minute = 10 + Math.floor(timeOffsetMs / 60000);

        const isAttackWindow = minute >= 14 && minute <= 28;
        const isBot = isAttackWindow && Math.random() < 0.75;

        let ip = isBot
          ? `198.51.100.${Math.floor(Math.random() * 80) + 1}`
          : `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
        let method: LogEntry['method'] = isBot ? 'POST' : Math.random() < 0.3 ? 'POST' : 'GET';
        let path = isBot
          ? '/api/v1/auth/login'
          : ['/api/v1/auth/login', '/dashboard', '/api/v1/user/profile', '/static/bundle.js'][Math.floor(Math.random() * 4)];

        let status = 200;
        let latency = Math.floor(Math.random() * 40) + 15;
        let bytes = 340;

        if (isBot) {
          latency = Math.floor(Math.random() * 30) + 8;
          status = Math.random() < 0.78 ? 429 : 401;
          bytes = 142;
        }

        const raw = `${ip} - - [${timeLocal}] "${method} ${path} HTTP/1.1" ${status} ${bytes} "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Python-urllib/3.11" ${(latency / 1000).toFixed(3)}`;

        logs.push({
          id: `log-${i}`,
          timestamp: timeLocal,
          epochMs: logTime.getTime(),
          ip,
          method,
          path,
          statusCode: status,
          responseBytes: bytes,
          responseTimeMs: latency,
          userAgent: 'Python-urllib/3.11',
          raw
        });
      }

      return logs;
    }
  },
  {
    id: 'nominal_production',
    name: 'Nominal Baseline Production Traffic',
    badge: 'Nominal Health',
    description: 'Steady 200 OKs, sub-45ms p95 latency, 0.04% error rate. Good baseline for comparing anomaly thresholds and testing alerting silence.',
    format: 'nginx',
    expectedRca: {
      scenarioId: 'nominal_production',
      title: 'Systems Operating Within Service Level Objectives (SLO)',
      severity: 'MEDIUM',
      incidentStarted: '12:00:00 UTC',
      rootCause: 'No active incident detected. Systems are operating well within SLO limits (Error Budget remaining: 99.96%). Occasional 404s are harmless crawler scans for WordPress wp-login.php.',
      primaryCulprit: 'None (System Nominal)',
      triggerEvent: 'Routine production traffic',
      timeline: [
        { time: '12:00:00 UTC', event: 'Fleet running 12 nodes across us-east-1a, 1b, 1c.', type: 'trigger' },
        { time: '12:15:00 UTC', event: 'Error rate holding steady at 0.04%, p95 response time 24ms.', type: 'recovery' }
      ],
      blastRadius: [],
      remediationRunbook: [
        '1. Maintain active health monitoring.',
        '2. Verify auto-scaling group thresholds for upcoming peak business hours.'
      ],
      timeSavedText: 'Diagnostic time: 12 seconds (SLO confidence verified)'
    },
    generateLogs: () => {
      const logs: LogEntry[] = [];
      const baseTime = new Date('2026-10-01T12:00:00Z').getTime();

      const endpoints = [
        { path: '/api/v1/products', method: 'GET' as const, latency: 18 },
        { path: '/api/v1/catalog/search', method: 'GET' as const, latency: 32 },
        { path: '/api/v1/cart', method: 'GET' as const, latency: 24 },
        { path: '/api/v1/checkout/quote', method: 'POST' as const, latency: 68 },
        { path: '/health', method: 'GET' as const, latency: 4 }
      ];

      for (let i = 0; i < 450; i++) {
        const timeOffsetMs = Math.floor((i / 450) * 20 * 60 * 1000);
        const logTime = new Date(baseTime + timeOffsetMs);
        const timeLocal = formatNginxTime(logTime);
        const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
        const ip = `172.16.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 250) + 1}`;
        const latency = ep.latency + Math.floor(Math.random() * 15);
        const status = Math.random() < 0.99 ? 200 : Math.random() < 0.5 ? 404 : 304;

        const raw = `${ip} - - [${timeLocal}] "${ep.method} ${ep.path} HTTP/1.1" ${status} 1420 "-" "Mozilla/5.0 Chrome/130.0" ${(latency / 1000).toFixed(3)}`;

        logs.push({
          id: `log-${i}`,
          timestamp: timeLocal,
          epochMs: logTime.getTime(),
          ip,
          method: ep.method,
          path: ep.path,
          statusCode: status,
          responseBytes: 1420,
          responseTimeMs: latency,
          userAgent: 'Mozilla/5.0 Chrome/130.0',
          raw
        });
      }

      return logs;
    }
  }
];
