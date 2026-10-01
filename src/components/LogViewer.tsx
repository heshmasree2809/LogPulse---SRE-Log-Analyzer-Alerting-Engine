import React, { useState } from 'react';
import { LogEntry } from '../types';
import { Terminal, Download, Search, Copy, Check } from 'lucide-react';

interface LogViewerProps {
  logs: LogEntry[];
  highlightTrace?: LogEntry | null;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, highlightTrace }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | '5xx' | '4xx' | '2xx'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter logs
  const filtered = logs.filter((log) => {
    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const match =
        log.path.toLowerCase().includes(term) ||
        log.ip.toLowerCase().includes(term) ||
        log.userAgent.toLowerCase().includes(term) ||
        log.raw.toLowerCase().includes(term);
      if (!match) return false;
    }

    // Status filter
    if (statusFilter === '5xx' && log.statusCode < 500) return false;
    if (statusFilter === '4xx' && (log.statusCode < 400 || log.statusCode >= 500)) return false;
    if (statusFilter === '2xx' && (log.statusCode < 200 || log.statusCode >= 300)) return false;

    // Method filter
    if (methodFilter !== 'all' && log.method !== methodFilter) return false;

    return true;
  });

  const handleCopyRaw = (log: LogEntry) => {
    navigator.clipboard.writeText(log.raw);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportLogs = () => {
    const content = filtered.map((l) => l.raw).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logpulse_export_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl bg-white border border-stone-200 shadow-xs flex flex-col h-[650px] overflow-hidden">
      {/* Terminal Toolbar */}
      <div className="p-3 border-b border-stone-200 bg-stone-50/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-stone-700 font-mono">
            <span className="p-1 rounded bg-stone-200/80 text-stone-700">
              <Terminal className="w-3.5 h-3.5" />
            </span>
            <span className="font-semibold text-stone-900">Raw Access Stream</span>
            <span className="text-stone-500">· {filtered.length.toLocaleString()} matching</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search IP, URI, UA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-44 sm:w-56 bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-400 font-mono shadow-2xs"
            />
            <Search className="w-3 h-3 text-stone-400 absolute right-2 top-2 pointer-events-none" />
          </div>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white border border-stone-200 text-stone-800 text-xs rounded-lg px-2 py-1 font-mono focus:outline-none focus:border-stone-400 shadow-2xs cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="5xx">5xx Errors Only</option>
            <option value="4xx">4xx Client Errors</option>
            <option value="2xx">2xx OK Only</option>
          </select>

          {/* Method selector */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-white border border-stone-200 text-stone-800 text-xs rounded-lg px-2 py-1 font-mono focus:outline-none focus:border-stone-400 shadow-2xs cursor-pointer"
          >
            <option value="all">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>

          {/* Export Button */}
          <button
            onClick={handleExportLogs}
            className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-lg font-mono flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Download matching logs"
          >
            <Download className="w-3 h-3 text-stone-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Viewport with Soft Pastel Styling */}
      <div className="flex-1 overflow-y-auto p-2 bg-[#FCFAF7] font-mono text-[11px] leading-relaxed select-text divide-y divide-stone-100">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-stone-500 font-sans">
            No logs matched your search or status filter.
          </div>
        ) : (
          filtered.slice(0, 1000).map((log, index) => {
            const isHighlighted = highlightTrace && highlightTrace.id === log.id;
            const is5xx = log.statusCode >= 500;
            const is4xx = log.statusCode >= 400 && log.statusCode < 500;
            const isSlow = log.responseTimeMs > 2000;

            return (
              <div
                key={log.id}
                className={`py-1.5 px-2 rounded-md hover:bg-stone-100/60 flex items-start gap-2 group transition-colors ${
                  isHighlighted ? 'bg-amber-100/60 border border-amber-300' : ''
                }`}
              >
                {/* Index / Line */}
                <span className="text-stone-400 select-none w-10 text-right shrink-0">
                  {index + 1}
                </span>

                {/* Status Code badge (Pastel) */}
                <span
                  className={`px-1 rounded text-[10px] font-bold shrink-0 ${
                    is5xx
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : is4xx
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {log.statusCode}
                </span>

                {/* Method */}
                <span
                  className={`font-semibold shrink-0 ${
                    log.method === 'POST' ? 'text-amber-700' : 'text-sky-700'
                  }`}
                >
                  {log.method}
                </span>

                {/* Path */}
                <span className="text-stone-800 font-medium truncate shrink-0 max-w-[280px]">
                  {log.path}
                </span>

                {/* Latency */}
                <span
                  className={`shrink-0 tabular-nums ${
                    isSlow ? 'text-rose-700 font-bold' : log.responseTimeMs > 500 ? 'text-amber-700' : 'text-stone-500'
                  }`}
                >
                  {log.responseTimeMs}ms
                </span>

                {/* Client IP */}
                <span className="text-stone-500 shrink-0 hidden sm:inline">
                  {log.ip}
                </span>

                {/* Timestamp */}
                <span className="text-stone-400 shrink-0 hidden md:inline truncate max-w-[140px]">
                  {log.timestamp}
                </span>

                {/* Copy button on hover */}
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0">
                  <button
                    onClick={() => handleCopyRaw(log)}
                    className="p-1 hover:text-stone-900 text-stone-400 cursor-pointer"
                    title="Copy full raw log line"
                  >
                    {copiedId === log.id ? (
                      <Check className="w-3 h-3 text-emerald-700" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer bar */}
      <div className="p-2 border-t border-stone-200 bg-stone-50 text-stone-500 flex items-center justify-between text-xs font-mono">
        <span>Showing up to 1,000 lines in viewport</span>
        <span>Format: Nginx / Apache Standard</span>
      </div>
    </div>
  );
};
