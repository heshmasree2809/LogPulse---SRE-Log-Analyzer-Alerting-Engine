import React from 'react';
import { AnalysisSummary } from '../types';
import { AlertTriangle, Clock, Activity, Zap, CheckCircle2, ChevronRight } from 'lucide-react';

interface MetricCardsProps {
  summary: AnalysisSummary;
  onOpenRca: () => void;
  scenarioTitle: string;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ summary, onOpenRca, scenarioTitle }) => {
  const isSpike = summary.overallErrorRate > 5.0 || summary.status5xxCount > 10;
  const isWarning = summary.overallErrorRate > 1.0 && !isSpike;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {/* 1. Total Volume & Throughput (Soft Pastel Sky) */}
      <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1 font-medium">
            <span>Ingested Volume</span>
            <span className="p-1 rounded-md bg-sky-100 text-sky-700">
              <Activity className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-stone-900 tabular-nums">
            {summary.totalLogs.toLocaleString()}
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600 font-mono tabular-nums">
          <span>{summary.durationSeconds}s duration</span>
          <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
            {summary.processedLinesPerSec.toLocaleString()} l/s
          </span>
        </div>
      </div>

      {/* 2. Error Rate & 5xx / 4xx breakdown (Soft Pastel Rose / Mint) */}
      <div className={`p-4 rounded-xl border shadow-xs flex flex-col justify-between transition-colors ${
        isSpike
          ? 'bg-rose-50/70 border-rose-200 text-rose-950'
          : isWarning
          ? 'bg-amber-50/70 border-amber-200 text-amber-950'
          : 'bg-white border-stone-200 text-stone-900'
      }`}>
        <div>
          <div className="flex items-center justify-between text-xs mb-1 font-medium">
            <span className={isSpike ? 'text-rose-700' : isWarning ? 'text-amber-700' : 'text-stone-500'}>
              Overall Error Rate
            </span>
            {isSpike ? (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 text-[11px] font-semibold">
                <AlertTriangle className="w-3 h-3" /> Spike Alert
              </span>
            ) : isWarning ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-medium">
                Elevated
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 text-[11px] font-medium">
                <CheckCircle2 className="w-3 h-3" /> Nominal
              </span>
            )}
          </div>
          <div className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${
            isSpike ? 'text-rose-700' : isWarning ? 'text-amber-700' : 'text-stone-900'
          }`}>
            {summary.overallErrorRate}%
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-stone-200/60 flex items-center justify-between text-xs text-stone-600 font-mono tabular-nums">
          <span>5xx: <strong className="text-rose-700">{summary.status5xxCount}</strong></span>
          <span aria-hidden="true">·</span>
          <span>4xx: <strong className="text-amber-700">{summary.status4xxCount}</strong></span>
          <span aria-hidden="true">·</span>
          <span>2xx: <strong className="text-emerald-700">{summary.status2xxCount}</strong></span>
        </div>
      </div>

      {/* 3. Latency Percentiles (Soft Pastel Peach) */}
      <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1 font-medium">
            <span>Latency (p95)</span>
            <span className="p-1 rounded-md bg-amber-100 text-amber-700">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${
            summary.latencyPercentiles.p95 > 2000 ? 'text-rose-700' : summary.latencyPercentiles.p95 > 500 ? 'text-amber-700' : 'text-stone-900'
          }`}>
            {summary.latencyPercentiles.p95}ms
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600 font-mono tabular-nums">
          <span>p50: {summary.latencyPercentiles.p50}ms</span>
          <span aria-hidden="true">·</span>
          <span>p99: {summary.latencyPercentiles.p99}ms</span>
          <span aria-hidden="true">·</span>
          <span>max: {summary.latencyPercentiles.max}ms</span>
        </div>
      </div>

      {/* 4. Automated Root Cause Status Card (Soft Pastel Lilac / Lavender) */}
      <div 
        onClick={onOpenRca}
        className="p-4 rounded-xl bg-violet-50/60 border border-violet-200/90 hover:bg-violet-100/60 transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
      >
        <div>
          <div className="flex items-center justify-between text-xs text-violet-800 mb-1 font-medium">
            <span className="flex items-center gap-1 font-semibold">
              <Zap className="w-3.5 h-3.5 text-violet-600" /> RCA Diagnosis
            </span>
            <span className="text-[11px] text-violet-700 group-hover:text-violet-900 flex items-center transition-colors">
              Inspect <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <div className="text-sm font-semibold text-stone-900 line-clamp-1">
            {isSpike ? 'Root Cause Identified' : 'Baseline Healthy'}
          </div>
          <div className="text-xs text-stone-600 mt-1 line-clamp-1 font-mono">
            {summary.topFailingEndpoints[0] ? summary.topFailingEndpoints[0].path : 'Cluster nominal'}
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-violet-200/60 flex items-center justify-between text-xs text-violet-900 font-mono">
          <span className="font-semibold text-violet-700">Triage: &lt; 2 min</span>
          <span className="text-stone-500">vs ~30m manual</span>
        </div>
      </div>
    </div>
  );
};
