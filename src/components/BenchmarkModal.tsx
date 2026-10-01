import React, { useState } from 'react';
import { run500kBenchmark, BenchmarkProgress } from '../utils/benchmarkEngine';
import { BenchmarkMetrics, AnalysisSummary } from '../types';
import confetti from 'canvas-confetti';
import { Cpu, Zap, CheckCircle2, Play, X, Activity } from 'lucide-react';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyBenchmarkResult: (summary: AnalysisSummary) => void;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({
  isOpen,
  onClose,
  onApplyBenchmarkResult
}) => {
  const [targetCount, setTargetCount] = useState<number>(500000);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<BenchmarkProgress | null>(null);
  const [completedMetrics, setCompletedMetrics] = useState<BenchmarkMetrics | null>(null);
  const [benchmarkSummary, setBenchmarkSummary] = useState<AnalysisSummary | null>(null);

  if (!isOpen) return null;

  const handleStartBenchmark = async () => {
    setIsRunning(true);
    setProgress(null);
    setCompletedMetrics(null);
    setBenchmarkSummary(null);

    try {
      const result = await run500kBenchmark(targetCount, (p) => {
        setProgress(p);
      });

      setCompletedMetrics(result.metrics);
      setBenchmarkSummary(result.summary);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleApplyToDashboard = () => {
    if (benchmarkSummary) {
      onApplyBenchmarkResult(benchmarkSummary);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xl max-w-2xl w-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-start justify-between gap-4 bg-stone-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Cpu className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 font-mono">
                500K+ Log Lines Throughput Benchmark
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1 font-mono">
              Live validation of high-speed log ingestion and anomaly detection
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={isRunning}
            className="text-stone-400 hover:text-stone-800 p-1 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs text-stone-700 font-mono">
          {/* Target intro */}
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-700">
            <div className="flex items-center gap-2 font-bold mb-1 text-emerald-800">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>High-Throughput Streaming Engine:</span>
            </div>
            <p className="text-stone-600 font-sans text-xs">
              Directly tests streaming regex extraction and aggregation across 500,000 log lines to measure processing throughput and heap overhead.
            </p>
          </div>

          {/* Volume selection */}
          <div className="space-y-1.5">
            <span className="text-stone-600 font-medium block text-xs">Target Volume Size</span>
            <div className="grid grid-cols-3 gap-2">
              {[100000, 250000, 500000].map((vol) => (
                <button
                  key={vol}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setTargetCount(vol)}
                  className={`py-2 px-3 rounded-lg text-center transition-colors cursor-pointer ${
                    targetCount === vol
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold shadow-2xs'
                      : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {vol.toLocaleString()} lines
                </button>
              ))}
            </div>
          </div>

          {/* Progress / Stats Viewport */}
          {progress && (
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-600">Processing Stream...</span>
                <span className="text-emerald-700 font-bold">{progress.percentage}%</span>
              </div>

              {/* Progress Bar (Pastel Mint) */}
              <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-150"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              {/* Live Ticker */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px] tabular-nums">
                <div>
                  <span className="text-stone-500 block text-[10px]">PROCESSED</span>
                  <strong className="text-stone-900">{progress.processed.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">CURRENT SPEED</span>
                  <strong className="text-emerald-700">{progress.currentLinesPerSec.toLocaleString()} l/s</strong>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">ELAPSED TIME</span>
                  <strong className="text-stone-900">{(progress.elapsedMs / 1000).toFixed(2)}s</strong>
                </div>
              </div>
            </div>
          )}

          {/* Completed Metrics Summary */}
          {completedMetrics && (
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Benchmark Succeeded</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
                <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                  <span className="text-stone-500 block text-[10px]">TOTAL LINES</span>
                  <strong className="text-stone-900 text-sm">{completedMetrics.totalLines.toLocaleString()}</strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                  <span className="text-stone-500 block text-[10px]">EXECUTION TIME</span>
                  <strong className="text-stone-900 text-sm">{(completedMetrics.durationMs / 1000).toFixed(2)}s</strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                  <span className="text-stone-500 block text-[10px]">THROUGHPUT</span>
                  <strong className="text-emerald-800 text-sm">{completedMetrics.linesPerSec.toLocaleString()} l/s</strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                  <span className="text-stone-500 block text-[10px]">HEAP FOOTPRINT</span>
                  <strong className="text-stone-900 text-sm">{completedMetrics.heapMemoryUsedMb} MB</strong>
                </div>
              </div>

              <div className="text-[11px] text-stone-700 font-sans">
                Found <strong>{completedMetrics.totalErrorsFound.toLocaleString()} errors</strong> and <strong>{completedMetrics.slowRequestsFound.toLocaleString()} slow requests</strong> without main thread blocking.
              </div>
            </div>
          )}

          {/* Action Trigger (Pastel) */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleStartBenchmark}
              disabled={isRunning}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-200 hover:bg-emerald-300 border border-emerald-300 text-emerald-950 font-bold font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isRunning ? (
                <>
                  <Activity className="w-4 h-4 animate-spin text-emerald-800" />
                  <span>Processing {targetCount.toLocaleString()} Lines...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-emerald-950" />
                  <span>Execute {targetCount.toLocaleString()} Benchmark</span>
                </>
              )}
            </button>

            {benchmarkSummary && (
              <button
                onClick={handleApplyToDashboard}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 font-mono transition-colors shadow-2xs cursor-pointer"
              >
                Load In Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-100 bg-stone-50 text-center text-stone-500 font-mono text-[11px]">
          Runs non-blocking async generator pipelines simulating production CLI throughput
        </div>
      </div>
    </div>
  );
};
