import React, { useState } from 'react';
import { parseRawLogText, analyzeLogs } from '../utils/logParser';
import { LogEntry, AnalysisSummary } from '../types';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogsLoaded: (logs: LogEntry[], summary: AnalysisSummary) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onLogsLoaded
}) => {
  const [pasteText, setPasteText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleProcessLogs = (rawText: string) => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const parsed = parseRawLogText(rawText);
      if (parsed.length === 0) {
        setErrorMsg('Could not parse any valid Apache/Nginx or JSON log lines. Please check the log format.');
        setIsProcessing(false);
        return;
      }

      const summary = analyzeLogs(parsed, 15);
      onLogsLoaded(parsed, summary);
      onClose();
    } catch (e: any) {
      setErrorMsg(`Parsing failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleProcessLogs(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xl max-w-xl w-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-start justify-between gap-4 bg-stone-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Upload className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 font-mono">
                Upload or Paste Custom Logs
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Supports Apache Combined, Nginx (with $request_time), and JSON formats
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-800 p-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs text-stone-700">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* File input (Soft dashed pastel) */}
          <div className="p-5 border-2 border-dashed border-stone-300 hover:border-emerald-400 rounded-xl text-center transition-colors bg-stone-50/50">
            <input
              type="file"
              accept=".log,.txt,.json"
              onChange={handleFileUpload}
              className="hidden"
              id="log-file-input"
            />
            <label
              htmlFor="log-file-input"
              className="cursor-pointer flex flex-col items-center gap-2 text-stone-600 hover:text-stone-900"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
                <FileText className="w-5 h-5" />
              </div>
              <span className="font-semibold text-stone-900">
                Select .log or .txt file from your computer
              </span>
              <span className="text-[11px] text-stone-500 font-mono">
                Evaluated entirely in-browser with zero server uploads
              </span>
            </label>
          </div>

          {/* Paste Textarea */}
          <div className="space-y-1.5 font-mono">
            <span className="text-stone-600 font-medium block text-xs">Or Paste Raw Log Lines:</span>
            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder='192.168.1.1 - - [01/Oct/2026:14:20:00 +0000] "POST /api/v2/checkout/pay HTTP/1.1" 504 182 "-" "Mozilla/5.0" 12.450'
              className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 font-mono shadow-2xs"
            />
          </div>

          {/* Submit */}
          <button
            onClick={() => handleProcessLogs(pasteText)}
            disabled={!pasteText.trim() || isProcessing}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-200 hover:bg-emerald-300 border border-emerald-300 text-emerald-950 font-bold font-mono transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isProcessing ? 'Analyzing logs...' : 'Parse and Analyze Logs'}
          </button>
        </div>
      </div>
    </div>
  );
};
