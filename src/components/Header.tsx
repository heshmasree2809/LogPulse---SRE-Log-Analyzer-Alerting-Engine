import React from 'react';
import { SCENARIOS } from '../data/sampleLogs';
import { Play, Upload, Zap, Terminal, ShieldAlert, Cpu } from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'logs' | 'scripts' | 'alerts';
  setActiveTab: (tab: 'dashboard' | 'logs' | 'scripts' | 'alerts') => void;
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  onOpenBenchmark: () => void;
  onOpenUpload: () => void;
  isBenchmarkRunning?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedScenarioId,
  onSelectScenario,
  onOpenBenchmark,
  onOpenUpload,
  isBenchmarkRunning
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F5]/95 backdrop-blur border-b border-stone-200/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-100/90 border border-emerald-300/80 flex items-center justify-center text-emerald-800 shadow-xs">
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-stone-900 font-mono">
            LogPulse
          </span>
          <span className="hidden sm:inline-block text-xs text-stone-500 font-mono">
            · SRE Anomaly &amp; Alerting
          </span>
        </div>

        {/* Zone 2: Navigation Links (Pastel Segmented) */}
        <nav className="hidden md:flex items-center gap-1.5 p-1 bg-stone-200/50 rounded-lg border border-stone-200/70">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
            }`}
          >
            Dashboard &amp; RCA
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
            }`}
          >
            Log Stream
          </button>
          <button
            onClick={() => setActiveTab('scripts')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === 'scripts'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
            }`}
          >
            Bash &amp; Python CLI
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
            }`}
          >
            Slack / Email Alerts
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2">
          {/* Scenario selector */}
          <div className="relative">
            <select
              value={selectedScenarioId}
              onChange={(e) => onSelectScenario(e.target.value)}
              className="bg-white border border-stone-300/80 text-stone-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-stone-500 transition-colors pr-6 appearance-none cursor-pointer font-sans shadow-xs"
              aria-label="Select incident scenario"
            >
              {SCENARIOS.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-300/80 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Upload or paste custom logs"
          >
            <Upload className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">Upload Logs</span>
          </button>

          {/* 500K Benchmark Action CTA (Soft Pastel Mint) */}
          <button
            onClick={onOpenBenchmark}
            disabled={isBenchmarkRunning}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-950 bg-emerald-200 hover:bg-emerald-300 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs active:scale-98 cursor-pointer whitespace-nowrap"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-800" />
            <span>Benchmark 500K+</span>
          </button>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="md:hidden flex items-center gap-1 mt-2.5 pt-2 border-t border-stone-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap font-medium ${
            activeTab === 'dashboard' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap font-medium ${
            activeTab === 'logs' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
          }`}
        >
          Logs
        </button>
        <button
          onClick={() => setActiveTab('scripts')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap font-medium ${
            activeTab === 'scripts' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
          }`}
        >
          Bash/Python
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap font-medium ${
            activeTab === 'alerts' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
          }`}
        >
          Alerts
        </button>
      </div>
    </header>
  );
};
