import React, { useState } from 'react';
import { CLI_SNIPPETS, BASH_SCRIPT_SOURCE, PYTHON_SCRIPT_SOURCE, CliSnippet } from '../utils/scriptTemplates';
import { Terminal, Copy, Check, Download, Play, Code2, FileCode } from 'lucide-react';
import { AnalysisSummary } from '../types';

interface BashPythonLabProps {
  summary: AnalysisSummary;
}

export const BashPythonLab: React.FC<BashPythonLabProps> = ({ summary }) => {
  const [activeSubTab, setActiveSubTab] = useState<'snippets' | 'bash_script' | 'python_script'>('snippets');
  const [copiedSnippetIdx, setCopiedSnippetIdx] = useState<number | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [testedSnippetIdx, setTestedSnippetIdx] = useState<number | null>(null);
  const [executedOutput, setExecutedOutput] = useState<string | null>(null);

  const handleCopySnippet = (snippet: CliSnippet, idx: number) => {
    navigator.clipboard.writeText(snippet.command);
    setCopiedSnippetIdx(idx);
    setTimeout(() => setCopiedSnippetIdx(null), 1500);
  };

  const handleCopyScript = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 1500);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSimulateCliExecution = (snippet: CliSnippet, idx: number) => {
    setTestedSnippetIdx(idx);

    if (snippet.category === 'awk' && snippet.title.includes('Top 10')) {
      const lines = summary.topFailingEndpoints.slice(0, 5).map((ep) =>
        `   ${ep.errorCount.toString().padStart(5, ' ')} ${ep.method} ${ep.path} (${ep.errorRate.toFixed(1)}% err)`
      ).join('\n');
      setExecutedOutput(lines || '   No failing endpoints found in current dataset.');
    } else if (snippet.title.includes('Error Spike')) {
      const lines = summary.errorBuckets.filter(b => b.isSpike).slice(0, 5).map((b) =>
        `    ${b.errorRequests.toString().padStart(4, ' ')} [${b.timeLabel}] -> ${b.errorRate}% error rate`
      ).join('\n');
      setExecutedOutput(lines || '    0 [Nominal Baseline - No error spikes detected]');
    } else if (snippet.title.includes('Slowest')) {
      const lines = summary.slowestEndpoints.slice(0, 5).map((ep) =>
        `${(ep.p95LatencyMs / 1000).toFixed(3)}s ${ep.method} ${ep.path}`
      ).join('\n');
      setExecutedOutput(lines || 'No slow requests exceeding threshold.');
    } else {
      setExecutedOutput(snippet.outputExample);
    }
  };

  return (
    <div className="space-y-4">
      {/* Subtab Navigation (Pastel Segmented) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-stone-200/50 rounded-lg border border-stone-200/70">
          <button
            onClick={() => setActiveSubTab('snippets')}
            className={`px-3 py-1.5 text-xs font-mono rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'snippets'
                ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-stone-700" />
            <span>Bash One-Liners (Grep/Awk/Sed)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('bash_script')}
            className={`px-3 py-1.5 text-xs font-mono rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'bash_script'
                ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-stone-700" />
            <span>log_analyzer.sh</span>
          </button>
          <button
            onClick={() => setActiveSubTab('python_script')}
            className={`px-3 py-1.5 text-xs font-mono rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'python_script'
                ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-stone-700" />
            <span>log_analyzer.py</span>
          </button>
        </div>

        <div className="text-xs text-stone-500 font-mono">
          Zero-dependency UNIX &amp; Python Pipelines
        </div>
      </div>

      {/* View 1: Interactive Snippets */}
      {activeSubTab === 'snippets' && (
        <div className="grid grid-cols-1 gap-4">
          {CLI_SNIPPETS.map((snippet, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2 font-mono text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-stone-900 font-bold">{snippet.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 uppercase font-semibold">
                    {snippet.category}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSimulateCliExecution(snippet, idx)}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs font-semibold"
                    title="Simulate executing this command on current logs"
                  >
                    <Play className="w-3 h-3 fill-emerald-700" />
                    <span>Test on Loaded Logs</span>
                  </button>
                  <button
                    onClick={() => handleCopySnippet(snippet, idx)}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  >
                    {copiedSnippetIdx === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-700" />
                        <span className="text-emerald-700 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Command Code Box (Pastel Cream Background) */}
              <div className="p-3 rounded-lg bg-[#FCFAF7] border border-stone-200/90 text-stone-900 font-medium select-all overflow-x-auto whitespace-pre">
                $ {snippet.command}
              </div>

              {/* Explanation */}
              <p className="text-stone-600 font-sans text-xs">
                {snippet.explanation}
              </p>

              {/* Simulated Output if active */}
              {testedSnippetIdx === idx && executedOutput && (
                <div className="mt-2 p-3 rounded-lg bg-stone-900 text-stone-200 border border-stone-800 text-[11px]">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase block mb-1">
                    Terminal Output (Simulated from current dataset):
                  </span>
                  <pre className="whitespace-pre font-mono text-stone-300">
                    {executedOutput}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* View 2: Production Bash Script */}
      {activeSubTab === 'bash_script' && (
        <div className="rounded-xl bg-white border border-stone-200 shadow-xs overflow-hidden font-mono text-xs">
          <div className="p-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
            <span className="text-stone-900 font-semibold">log_analyzer.sh</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyScript(BASH_SCRIPT_SOURCE)}
                className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                {copiedScript ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                <span>{copiedScript ? 'Copied!' : 'Copy Script'}</span>
              </button>
              <button
                onClick={() => handleDownload('log_analyzer.sh', BASH_SCRIPT_SOURCE)}
                className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer font-semibold"
              >
                <Download className="w-3 h-3" />
                <span>Download .sh</span>
              </button>
            </div>
          </div>
          <div className="p-4 bg-[#FCFAF7] overflow-x-auto max-h-[600px] text-stone-800 border-t border-stone-100">
            <pre className="leading-relaxed">{BASH_SCRIPT_SOURCE}</pre>
          </div>
        </div>
      )}

      {/* View 3: Production Python Script */}
      {activeSubTab === 'python_script' && (
        <div className="rounded-xl bg-white border border-stone-200 shadow-xs overflow-hidden font-mono text-xs">
          <div className="p-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
            <span className="text-stone-900 font-semibold">log_analyzer.py</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyScript(PYTHON_SCRIPT_SOURCE)}
                className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                {copiedScript ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                <span>{copiedScript ? 'Copied!' : 'Copy Script'}</span>
              </button>
              <button
                onClick={() => handleDownload('log_analyzer.py', PYTHON_SCRIPT_SOURCE)}
                className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer font-semibold"
              >
                <Download className="w-3 h-3" />
                <span>Download .py</span>
              </button>
            </div>
          </div>
          <div className="p-4 bg-[#FCFAF7] overflow-x-auto max-h-[600px] text-stone-800 border-t border-stone-100">
            <pre className="leading-relaxed">{PYTHON_SCRIPT_SOURCE}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
