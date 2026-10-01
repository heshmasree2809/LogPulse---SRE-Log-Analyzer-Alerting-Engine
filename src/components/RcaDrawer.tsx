import React, { useState } from 'react';
import { IncidentRCA } from '../types';
import { Zap, ShieldCheck, Clock, Check, Copy, Sparkles, X } from 'lucide-react';

interface RcaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rca: IncidentRCA;
}

export const RcaDrawer: React.FC<RcaDrawerProps> = ({ isOpen, onClose, rca }) => {
  const [copiedRunbook, setCopiedRunbook] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiDiagnosisText, setAiDiagnosisText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyRunbook = () => {
    navigator.clipboard.writeText(rca.remediationRunbook.join('\n'));
    setCopiedRunbook(true);
    setTimeout(() => setCopiedRunbook(false), 2000);
  };

  const handleRunAiSynthesis = () => {
    setAiGenerating(true);
    setTimeout(() => {
      setAiDiagnosisText(
        `Gemini SRE Audit:\nBased on multi-dimensional log correlation, upstream partner timeout is causing TCP socket starvation in the Nginx reverse proxy layer. Thread pool queue saturation (100% capacity) triggered the cascade 504 Gateway Timeouts. Recommend applying Envoy/Kong active circuit breaking immediately and lowering proxy_connect_timeout to 2s.`
      );
      setAiGenerating(false);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden font-sans">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-start justify-between gap-4 bg-stone-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Zap className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 font-mono">
                Automated Root-Cause Analysis (RCA)
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-stone-500 font-mono">
              <span className="text-emerald-700 font-semibold">{rca.timeSavedText}</span>
              <span aria-hidden="true">·</span>
              <span>Severity: <strong className={rca.severity === 'CRITICAL' ? 'text-rose-700' : 'text-amber-700'}>{rca.severity}</strong></span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-800 p-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-stone-700">
          {/* Primary Culprit Hero Box (Pastel Rose) */}
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
            <span className="text-rose-800 font-mono font-bold uppercase tracking-wider text-[10px] block mb-1">
              Primary Incident Culprit &amp; Mechanism
            </span>
            <div className="text-sm font-mono font-bold text-rose-950">
              {rca.primaryCulprit}
            </div>
            <p className="mt-2 text-stone-700 leading-relaxed font-sans text-xs">
              {rca.rootCause}
            </p>
          </div>

          {/* Incident Timeline */}
          <div>
            <h3 className="text-xs font-semibold text-stone-800 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              Incident Timeline &amp; Cascade Progression
            </h3>
            <div className="border-l-2 border-stone-200 ml-2 pl-4 space-y-3 font-mono">
              {rca.timeline.map((step, idx) => (
                <div key={idx} className="relative">
                  <div
                    className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                      step.type === 'trigger'
                        ? 'bg-amber-400'
                        : step.type === 'cascade'
                        ? 'bg-rose-400'
                        : step.type === 'peak'
                        ? 'bg-rose-500'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <div className="flex items-baseline gap-2">
                    <span className="text-stone-500 font-semibold">{step.time}</span>
                    <span className="text-stone-800 font-sans">{step.event}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blast Radius */}
          <div>
            <h3 className="text-xs font-semibold text-stone-800 uppercase tracking-wider font-mono mb-2">
              Impacted Blast Radius ({rca.blastRadius.length} Endpoints)
            </h3>
            <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
              {rca.blastRadius.map((uri, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded-md bg-stone-100 border border-stone-200 text-stone-800"
                >
                  {uri}
                </span>
              ))}
            </div>
          </div>

          {/* Remediation Runbook */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-stone-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                SRE Remediation Runbook
              </h3>
              <button
                onClick={handleCopyRunbook}
                className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 font-mono transition-colors cursor-pointer"
              >
                {copiedRunbook ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-emerald-700 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Playbook</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FCFAF7] border border-stone-200 space-y-1.5 font-mono text-[11px] text-stone-800">
              {rca.remediationRunbook.map((step, idx) => (
                <div key={idx}>
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* AI Root Cause Assistant Synthesis */}
          <div className="pt-2 border-t border-stone-100">
            {aiDiagnosisText ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                {aiDiagnosisText}
              </div>
            ) : (
              <button
                onClick={handleRunAiSynthesis}
                disabled={aiGenerating}
                className="w-full py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-800 text-xs font-mono font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                <span>{aiGenerating ? 'Correlating log patterns...' : 'Generate AI Root Cause Synthesis'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/70 flex items-center justify-between text-xs text-stone-500 font-mono">
          <span>LogPulse Automated SRE Heuristics</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 rounded-lg font-sans font-medium transition-colors shadow-2xs cursor-pointer"
          >
            Close RCA Report
          </button>
        </div>
      </div>
    </div>
  );
};
