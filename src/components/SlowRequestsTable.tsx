import React, { useState } from 'react';
import { EndpointMetric, LatencyPercentiles } from '../types';
import { Gauge } from 'lucide-react';

interface SlowRequestsTableProps {
  endpoints: EndpointMetric[];
  percentiles: LatencyPercentiles;
}

export const SlowRequestsTable: React.FC<SlowRequestsTableProps> = ({
  endpoints,
  percentiles
}) => {
  const [minLatencyThreshold, setMinLatencyThreshold] = useState<number>(500);

  // Filter endpoints by minimum latency threshold
  const filtered = endpoints
    .filter((ep) => ep.p95LatencyMs >= minLatencyThreshold)
    .sort((a, b) => b.p95LatencyMs - a.p95LatencyMs)
    .slice(0, 10);

  const maxObservedLatency = Math.max(...endpoints.map((e) => e.maxLatencyMs), 2000);

  return (
    <div className="rounded-xl bg-white border border-stone-200 shadow-xs overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-100 text-amber-800">
              <Gauge className="w-3.5 h-3.5" />
            </span>
            <span>Slow Requests &amp; Latency Distribution</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5 font-mono">
            Percentile Analysis &amp; Response Time Profiler
          </p>
        </div>

        {/* Latency Threshold filter buttons (Pastel Segmented) */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs font-mono">
          <button
            onClick={() => setMinLatencyThreshold(0)}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              minLatencyThreshold === 0 ? 'bg-white text-stone-900 font-semibold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setMinLatencyThreshold(500)}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              minLatencyThreshold === 500 ? 'bg-white text-stone-900 font-semibold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            &gt;500ms
          </button>
          <button
            onClick={() => setMinLatencyThreshold(2000)}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              minLatencyThreshold === 2000 ? 'bg-white text-stone-900 font-semibold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            &gt;2.0s
          </button>
          <button
            onClick={() => setMinLatencyThreshold(5000)}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              minLatencyThreshold === 5000 ? 'bg-white text-stone-900 font-semibold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            &gt;5.0s
          </button>
        </div>
      </div>

      {/* Percentiles Bar with Soft Pastel Tints */}
      <div className="grid grid-cols-2 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-stone-100 bg-stone-50/70 border-b border-stone-100 text-xs font-mono tabular-nums">
        <div className="p-3 text-center">
          <span className="text-stone-500 block text-[10px] uppercase font-semibold">Min</span>
          <span className="text-stone-700 font-bold text-sm">{percentiles.min}ms</span>
        </div>
        <div className="p-3 text-center">
          <span className="text-stone-500 block text-[10px] uppercase font-semibold">p50 (Median)</span>
          <span className="text-stone-800 font-bold text-sm">{percentiles.p50}ms</span>
        </div>
        <div className="p-3 text-center">
          <span className="text-stone-500 block text-[10px] uppercase font-semibold">p90</span>
          <span className="text-stone-800 font-bold text-sm">{percentiles.p90}ms</span>
        </div>
        <div className="p-3 text-center bg-amber-50/60">
          <span className="text-amber-700 block text-[10px] uppercase font-semibold">p95</span>
          <span className="text-amber-800 font-bold text-sm">{percentiles.p95}ms</span>
        </div>
        <div className="p-3 text-center bg-rose-50/60">
          <span className="text-rose-700 block text-[10px] uppercase font-semibold">p99</span>
          <span className="text-rose-800 font-bold text-sm">{percentiles.p99}ms</span>
        </div>
        <div className="p-3 text-center">
          <span className="text-stone-500 block text-[10px] uppercase font-semibold">Max</span>
          <span className="text-rose-700 font-bold text-sm">{percentiles.max}ms</span>
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone-100 text-stone-500 font-mono bg-stone-50/80 uppercase text-[10px]">
              <th className="py-2.5 px-4 font-semibold">Method &amp; URI Endpoint</th>
              <th className="py-2.5 px-3 font-semibold text-right">p95 Latency</th>
              <th className="py-2.5 px-3 font-semibold text-right">Max Latency</th>
              <th className="py-2.5 px-3 font-semibold text-right">Avg Latency</th>
              <th className="py-2.5 px-4 font-semibold">Latency Visual Profile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 font-mono">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-stone-500 font-sans">
                  No slow endpoints exceeding {minLatencyThreshold}ms threshold.
                </td>
              </tr>
            ) : (
              filtered.map((ep) => {
                const isCriticallySlow = ep.p95LatencyMs > 2000;
                const ratio = Math.min((ep.p95LatencyMs / maxObservedLatency) * 100, 100);

                return (
                  <tr key={ep.method + ep.path} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            ep.method === 'POST' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-sky-100 text-sky-800 border border-sky-200'
                          }`}
                        >
                          {ep.method}
                        </span>
                        <span className="text-stone-800 font-medium truncate max-w-xs sm:max-w-md">
                          {ep.path}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                      <span className={isCriticallySlow ? 'text-rose-700 font-bold' : ep.p95LatencyMs > 500 ? 'text-amber-700' : 'text-stone-700'}>
                        {ep.p95LatencyMs}ms
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right text-stone-500 tabular-nums">
                      {ep.maxLatencyMs}ms
                    </td>

                    <td className="py-2.5 px-3 text-right text-stone-500 tabular-nums">
                      {ep.avgLatencyMs}ms
                    </td>

                    <td className="py-2.5 px-4 w-44">
                      <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden flex items-center border border-stone-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCriticallySlow ? 'bg-rose-400' : ep.p95LatencyMs > 500 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.max(ratio, 4)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
