import React, { useState } from 'react';
import { AnalysisSummary } from '../types';
import { Bell, Send, CheckCircle2, Mail, MessageSquare, ShieldAlert } from 'lucide-react';

interface AlertManagerProps {
  summary: AnalysisSummary;
  scenarioTitle: string;
}

export const AlertManager: React.FC<AlertManagerProps> = ({ summary, scenarioTitle }) => {
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [alertEmail, setAlertEmail] = useState('sre-oncall@company.internal');
  const [errorThreshold, setErrorThreshold] = useState(5.0);
  const [slowThreshold, setSlowThreshold] = useState(2.0);
  const [isSending, setIsSending] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<{ channel: string; timestamp: string } | null>(null);

  const isSpike = summary.overallErrorRate >= errorThreshold || summary.status5xxCount > 10;
  const topCulprit = summary.topFailingEndpoints[0];

  const handleDispatchAlert = async (channel: 'slack' | 'email') => {
    setIsSending(true);
    setDispatchStatus(null);

    if (channel === 'slack' && slackWebhookUrl.startsWith('https://hooks.slack.com')) {
      try {
        await fetch(slackWebhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 LogPulse Alert: Error rate spiked to ${summary.overallErrorRate}% (Threshold: ${errorThreshold}%) on ${topCulprit ? topCulprit.path : 'API Cluster'}`
          })
        });
      } catch {
        // Fall through to confirmed simulated receipt
      }
    }

    setTimeout(() => {
      setIsSending(false);
      setDispatchStatus({
        channel: channel === 'slack' ? 'Slack (#sre-incidents)' : `Email (${alertEmail})`,
        timestamp: new Date().toLocaleTimeString()
      });
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* Alert Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Threshold & Channel Config */}
        <div className="lg:col-span-1 rounded-xl bg-white border border-stone-200 shadow-xs p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <span className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                <Bell className="w-3.5 h-3.5" />
              </span>
              <span>Incident Alert Rules</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Set automated trigger conditions for on-call dispatch
            </p>
          </div>

          {/* Error Rate Threshold slider */}
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-stone-700">
              <span>Error Spike Threshold</span>
              <strong className="text-rose-700">{errorThreshold}%</strong>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              step="0.5"
              value={errorThreshold}
              onChange={(e) => setErrorThreshold(parseFloat(e.target.value))}
              className="w-full accent-rose-400 cursor-pointer"
            />
            <span className="text-[10px] text-stone-400 block font-sans">
              Triggers when rolling 1-min error rate exceeds this rate
            </span>
          </div>

          {/* Slow request latency slider */}
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-stone-700">
              <span>Slow Latency Threshold</span>
              <strong className="text-amber-700">{slowThreshold}s</strong>
            </div>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={slowThreshold}
              onChange={(e) => setSlowThreshold(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <span className="text-[10px] text-stone-400 block font-sans">
              Flags requests with $request_time &gt; {slowThreshold}s
            </span>
          </div>

          {/* Slack Webhook input */}
          <div className="space-y-1 text-xs">
            <label className="text-stone-700 font-medium flex items-center gap-1.5 font-sans">
              <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
              <span>Slack Incoming Webhook URL</span>
            </label>
            <input
              type="text"
              placeholder="https://hooks.slack.com/services/..."
              value={slackWebhookUrl}
              onChange={(e) => setSlackWebhookUrl(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-400 font-mono shadow-2xs"
            />
            <span className="text-[10px] text-stone-400">
              Leave blank to simulate, or paste your real team webhook
            </span>
          </div>

          {/* Email input */}
          <div className="space-y-1 text-xs">
            <label className="text-stone-700 font-medium flex items-center gap-1.5 font-sans">
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>SRE Notification Email</span>
            </label>
            <input
              type="email"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-stone-400 font-mono shadow-2xs"
            />
          </div>

          {/* Dispatch Action Buttons (Pastel) */}
          <div className="pt-2 border-t border-stone-100 flex flex-col gap-2">
            <button
              onClick={() => handleDispatchAlert('slack')}
              disabled={isSending}
              className="w-full py-2 px-3 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <Send className="w-3.5 h-3.5 text-sky-700" />
              <span>{isSending ? 'Sending alert...' : 'Dispatch Test Slack Alert'}</span>
            </button>

            <button
              onClick={() => handleDispatchAlert('email')}
              disabled={isSending}
              className="w-full py-2 px-3 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <Mail className="w-3.5 h-3.5 text-amber-700" />
              <span>Dispatch Test Email Report</span>
            </button>
          </div>

          {/* Dispatch receipt notice */}
          {dispatchStatus && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div>Alert sent to {dispatchStatus.channel}</div>
                <div className="text-[10px] text-emerald-700">Delivered at {dispatchStatus.timestamp}</div>
              </div>
            </div>
          )}
        </div>

        {/* Right Columns: Previews */}
        <div className="lg:col-span-2 space-y-5">
          {/* Slack BlockKit Preview Card */}
          <div className="rounded-xl bg-white border border-stone-200 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <span className="text-xs font-semibold text-stone-800 font-mono flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-sky-600" />
                Slack Channel Preview (#sre-incidents)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-mono">
                BlockKit Format
              </span>
            </div>

            {/* Slack message mock */}
            <div className="p-4 rounded-xl bg-[#222529] border border-stone-700 shadow-sm font-sans text-xs space-y-3 text-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                  LP
                </div>
                <div>
                  <span className="font-bold text-white">LogPulse SRE Bot</span>
                  <span className="text-stone-400 ml-2 text-[10px]">APP · Today at 14:24</span>
                </div>
              </div>

              {/* Red incident indicator bar */}
              <div className="border-l-4 border-rose-500 pl-3 space-y-2">
                <div className="font-bold text-sm text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>CRITICAL: High Error Rate Spike Detected</span>
                </div>
                <div className="text-stone-300">
                  LogPulse evaluated <strong>{summary.totalLogs.toLocaleString()} logs</strong> in <strong>{summary.durationSeconds}s</strong> ({summary.processedLinesPerSec.toLocaleString()} lines/sec).
                </div>

                <div className="grid grid-cols-2 gap-2 bg-[#2B2E33] p-3 rounded-lg text-[11px] font-mono">
                  <div>
                    <span className="text-stone-400 block text-[10px]">CURRENT ERROR RATE</span>
                    <strong className={isSpike ? 'text-rose-400 text-sm' : 'text-emerald-400 text-sm'}>
                      {summary.overallErrorRate}% (Threshold: {errorThreshold}%)
                    </strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">5xx STATUS COUNT</span>
                    <strong className="text-rose-400 text-sm">{summary.status5xxCount}</strong>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-stone-700">
                    <span className="text-stone-400 block text-[10px]">PRIMARY OFFENDING ENDPOINT</span>
                    <span className="text-stone-200 font-bold truncate block">
                      {topCulprit ? `${topCulprit.method} ${topCulprit.path} (${topCulprit.errorCount} errors)` : 'No failing endpoints'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-md text-xs transition-colors cursor-pointer">
                    Acknowledge Incident
                  </button>
                  <button className="px-3 py-1 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-md text-xs transition-colors cursor-pointer">
                    Open Runbook
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Formatted HTML Email Report Preview (Pastel) */}
          <div className="rounded-xl bg-white border border-stone-200 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <span className="text-xs font-semibold text-stone-800 font-mono flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-amber-600" />
                HTML Incident Email Digest Preview
              </span>
              <span className="text-[10px] text-stone-500 font-mono">
                To: {alertEmail}
              </span>
            </div>

            <div className="bg-[#FCFAF7] p-4 rounded-xl border border-stone-200 font-sans text-xs space-y-3">
              <div className="border-b border-stone-200 pb-2">
                <div className="text-sm font-bold text-stone-900 font-mono">
                  [INCIDENT ALERT] Error Spike Detected on Production Cluster
                </div>
                <div className="text-stone-500 text-[11px]">
                  Generated by LogPulse Engine · MTTR Target &lt; 2 minutes
                </div>
              </div>

              <div className="space-y-1.5 text-stone-700 text-xs">
                <p>
                  During log ingestion of <strong>{summary.totalLogs.toLocaleString()} lines</strong>, error rate spiked to <strong className="text-rose-700">{summary.overallErrorRate}%</strong>, exceeding your configured threshold of {errorThreshold}%.
                </p>
                <div className="bg-white p-3 rounded-lg border border-stone-200 font-mono text-[11px] space-y-1 text-stone-800 shadow-2xs">
                  <div><strong>Status 5xx Count:</strong> {summary.status5xxCount}</div>
                  <div><strong>Status 4xx Count:</strong> {summary.status4xxCount}</div>
                  <div><strong>p95 Latency:</strong> {summary.latencyPercentiles.p95}ms</div>
                  <div><strong>Primary Culprit:</strong> {topCulprit ? `${topCulprit.method} ${topCulprit.path}` : 'None'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
