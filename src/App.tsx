import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { ErrorSpikeChart } from './components/ErrorSpikeChart';
import { TopFailingEndpoints } from './components/TopFailingEndpoints';
import { SlowRequestsTable } from './components/SlowRequestsTable';
import { LogViewer } from './components/LogViewer';
import { RcaDrawer } from './components/RcaDrawer';
import { BashPythonLab } from './components/BashPythonLab';
import { AlertManager } from './components/AlertManager';
import { BenchmarkModal } from './components/BenchmarkModal';
import { UploadModal } from './components/UploadModal';

import { SCENARIOS } from './data/sampleLogs';
import { analyzeLogs } from './utils/logParser';
import { diagnoseIncidentHeuristic } from './utils/rcaEngine';
import { LogEntry, AnalysisSummary } from './types';
import { AlertTriangle, Zap } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'scripts' | 'alerts'>('dashboard');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('checkout_cascade');
  
  // Modals state
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRcaOpen, setIsRcaOpen] = useState(false);
  const [highlightTrace, setHighlightTrace] = useState<LogEntry | null>(null);

  // Active scenario definition
  const activeScenario = useMemo(() => {
    return SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];
  }, [selectedScenarioId]);

  // Current loaded logs
  const [logs, setLogs] = useState<LogEntry[]>(() => activeScenario.generateLogs());

  // Compute summary whenever logs change
  const [summary, setSummary] = useState<AnalysisSummary>(() => analyzeLogs(logs, 18));

  // Whenever scenario changes, reload logs
  const handleSelectScenario = (id: string) => {
    setSelectedScenarioId(id);
    const sc = SCENARIOS.find((s) => s.id === id);
    if (sc) {
      const newLogs = sc.generateLogs();
      setLogs(newLogs);
      setSummary(analyzeLogs(newLogs, 22));
    }
  };

  // RCA computation
  const activeRca = useMemo(() => {
    return diagnoseIncidentHeuristic(summary, selectedScenarioId);
  }, [summary, selectedScenarioId]);

  // Handle benchmark result loaded
  const handleApplyBenchmarkResult = (benchSummary: AnalysisSummary) => {
    setSummary(benchSummary);
  };

  // Handle custom logs uploaded
  const handleLogsLoaded = (customLogs: LogEntry[], customSummary: AnalysisSummary) => {
    setLogs(customLogs);
    setSummary(customSummary);
    setSelectedScenarioId('custom_upload');
  };

  const handleSelectTrace = (log: LogEntry) => {
    setHighlightTrace(log);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-800 flex flex-col font-sans selection:bg-rose-100 selection:text-rose-900 transition-colors">
      {/* Top Bar with pastel styling */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={handleSelectScenario}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* Scenario Alert Banner if Error Spike Detected (Pastel Rose) */}
        {summary.spikesDetected > 0 && activeTab === 'dashboard' && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-rose-900">
              <span className="p-1 rounded-md bg-rose-100 text-rose-700">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
              <span>
                <strong>Incident Active:</strong> {activeScenario.name} · {summary.spikesDetected} minute windows exceeding threshold.
              </span>
            </div>

            <button
              onClick={() => setIsRcaOpen(true)}
              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300/80 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Zap className="w-3.5 h-3.5 text-rose-700" />
              <span>Inspect Root Cause (&lt; 2 min)</span>
            </button>
          </div>
        )}

        {/* Tab 1: Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <MetricCards
              summary={summary}
              onOpenRca={() => setIsRcaOpen(true)}
              scenarioTitle={activeScenario.name}
            />

            {/* Error Spike Timeline Chart */}
            <ErrorSpikeChart
              buckets={summary.errorBuckets}
              spikeThresholdPct={5.0}
            />

            {/* Split Grid: Top Failing Endpoints & Slow Requests */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopFailingEndpoints
                endpoints={summary.topFailingEndpoints}
                onSelectTrace={handleSelectTrace}
              />
              <SlowRequestsTable
                endpoints={summary.slowestEndpoints}
                percentiles={summary.latencyPercentiles}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Raw Log Stream Explorer */}
        {activeTab === 'logs' && (
          <LogViewer
            logs={logs}
            highlightTrace={highlightTrace}
          />
        )}

        {/* Tab 3: Bash & Python Lab */}
        {activeTab === 'scripts' && (
          <BashPythonLab
            summary={summary}
          />
        )}

        {/* Tab 4: Slack & Email Alerts */}
        {activeTab === 'alerts' && (
          <AlertManager
            summary={summary}
            scenarioTitle={activeScenario.name}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <RcaDrawer
        isOpen={isRcaOpen}
        onClose={() => setIsRcaOpen(false)}
        rca={activeRca}
      />

      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
        onApplyBenchmarkResult={handleApplyBenchmarkResult}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onLogsLoaded={handleLogsLoaded}
      />

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-[#FAF9F5] py-4 px-6 text-center text-xs text-stone-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>LogPulse · SRE Production Log Analyzer &amp; Anomaly Engine</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsBenchmarkOpen(true)}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              Run 500K Benchmark
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
