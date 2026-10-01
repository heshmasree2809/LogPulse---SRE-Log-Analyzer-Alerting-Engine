import React, { useState } from 'react';
import { EndpointMetric, LogEntry } from '../types';
import { AlertOctagon, Search, Eye, X } from 'lucide-react';

interface TopFailingEndpointsProps {
  endpoints: EndpointMetric[];
  onSelectTrace?: (log: LogEntry) => void;
}

export const TopFailingEndpoints: React.FC<TopFailingEndpointsProps> = ({
  endpoints,
  onSelectTrace
}) => {
  const [search, setSearch] = useState('');
  const [selectedTrace, setSelectedTrace] = useState<LogEntry | null>(null);

  const filtered = endpoints.filter((ep) =>
    ep.path.toLowerCase().includes(search.toLowerCase()) ||
    ep.method.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-xl bg-white border border-stone-200 shadow-xs overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <span className="p-1 rounded-md bg-rose-100 text-rose-700">
              <AlertOctagon className="w-3.5 h-3.5" />
            </span>
            <span>Top Failing Endpoints (5xx &amp; 4xx)</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Ranked by total error volume and failure rate
          </p>
        </div>

        {/* Live Filter Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Filter endpoint..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 sm:w-56 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-400 font-mono shadow-xs"
          />
          <Search className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-2 pointer-events-none" />
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone-100 text-stone-500 font-mono bg-stone-50/80 uppercase text-[10px]">
              <th className="py-2.5 px-4 font-semibold">Method &amp; URI Endpoint</th>
              <th className="py-2.5 px-3 font-semibold text-right">Errors</th>
              <th className="py-2.5 px-3 font-semibold text-right">Total Hits</th>
              <th className="py-2.5 px-3 font-semibold text-right">Error %</th>
              <th className="py-2.5 px-3 font-semibold">Status Breakdown</th>
              <th className="py-2.5 px-4 font-semibold text-right">p95 Latency</th>
              <th className="py-2.5 px-3 font-semibold text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 font-mono">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-stone-500 font-sans">
                  No failing endpoints detected matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map((ep) => {
                const isCritical = ep.errorRate > 50 || ep.errorCount > 100;
                return (
                  <tr
                    key={ep.method + ep.path}
                    className="hover:bg-stone-50/80 transition-colors"
                  >
                    {/* Method & Path */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            ep.method === 'POST'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : ep.method === 'GET'
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : ep.method === 'DELETE'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {ep.method}
                        </span>
                        <span className="text-stone-800 font-medium truncate max-w-xs sm:max-w-md">
                          {ep.path}
                        </span>
                      </div>
                    </td>

                    {/* Error Count */}
                    <td className="py-2.5 px-3 text-right font-bold text-rose-700 tabular-nums">
                      {ep.errorCount.toLocaleString()}
                    </td>

                    {/* Total Hits */}
                    <td className="py-2.5 px-3 text-right text-stone-500 tabular-nums">
                      {ep.totalHits.toLocaleString()}
                    </td>

                    {/* Error Rate % */}
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <span
                        className={`font-semibold ${
                          isCritical
                            ? 'text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200'
                            : ep.errorRate > 10
                            ? 'text-amber-700'
                            : 'text-stone-700'
                        }`}
                      >
                        {ep.errorRate.toFixed(1)}%
                      </span>
                    </td>

                    {/* Status Code Breakdown */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] tabular-nums">
                        {Object.entries(ep.statusCounts)
                          .filter(([code]) => parseInt(code, 10) >= 400)
                          .map(([code, count]) => {
                            const c = parseInt(code, 10);
                            return (
                              <span
                                key={code}
                                className={`text-[10px] px-1 py-0.2 rounded ${
                                  c >= 500
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {code}: {count}
                              </span>
                            );
                          })}
                      </div>
                    </td>

                    {/* Latency p95 */}
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      <span
                        className={
                          ep.p95LatencyMs > 2000
                            ? 'text-rose-700 font-semibold'
                            : ep.p95LatencyMs > 500
                            ? 'text-amber-700'
                            : 'text-stone-500'
                        }
                      >
                        {ep.p95LatencyMs}ms
                      </span>
                    </td>

                    {/* Action Trace */}
                    <td className="py-2.5 px-3 text-center">
                      {ep.recentSample ? (
                        <button
                          onClick={() => {
                            setSelectedTrace(ep.recentSample || null);
                            if (onSelectTrace && ep.recentSample) onSelectTrace(ep.recentSample);
                          }}
                          className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-[11px] transition-colors inline-flex items-center gap-1 border border-stone-200 shadow-2xs cursor-pointer"
                          title="Inspect raw log trace"
                        >
                          <Eye className="w-3 h-3 text-stone-600" />
                          <span>Trace</span>
                        </button>
                      ) : (
                        <span className="text-stone-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Trace Drawer / Modal if selected */}
      {selectedTrace && (
        <div className="p-4 border-t border-stone-200 bg-stone-50 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200">
            <span className="text-stone-800 font-semibold flex items-center gap-1.5">
              <span className="text-emerald-700">Sample Error Trace</span>
              <span className="text-stone-500 font-normal">· {selectedTrace.timestamp}</span>
            </span>
            <button
              onClick={() => setSelectedTrace(null)}
              className="text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-stone-800 break-all select-all shadow-2xs">
            {selectedTrace.raw}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px] text-stone-600">
            <div>Client IP: <strong className="text-stone-900">{selectedTrace.ip}</strong></div>
            <div>Status: <strong className="text-rose-700">{selectedTrace.statusCode}</strong></div>
            <div>Latency: <strong className="text-stone-900">{selectedTrace.responseTimeMs}ms</strong></div>
            <div>Payload: <strong className="text-stone-900">{selectedTrace.responseBytes} bytes</strong></div>
          </div>
        </div>
      )}
    </div>
  );
};
