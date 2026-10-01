import React, { useState } from 'react';
import { ErrorSpikeBucket } from '../types';
import { AlertCircle } from 'lucide-react';

interface ErrorSpikeChartProps {
  buckets: ErrorSpikeBucket[];
  spikeThresholdPct?: number;
}

export const ErrorSpikeChart: React.FC<ErrorSpikeChartProps> = ({
  buckets,
  spikeThresholdPct = 5.0
}) => {
  const [hoveredBucket, setHoveredBucket] = useState<ErrorSpikeBucket | null>(null);

  if (!buckets || buckets.length === 0) {
    return (
      <div className="p-8 rounded-xl bg-white border border-stone-200 text-center text-stone-500 text-sm">
        No chronological time buckets available.
      </div>
    );
  }

  // Calculate scales
  const maxRequests = Math.max(...buckets.map((b) => b.totalRequests), 1);
  const maxErrorRate = Math.max(...buckets.map((b) => b.errorRate), spikeThresholdPct * 1.5, 10);
  const chartHeight = 160;

  return (
    <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">
            Error Spike Timeline &amp; Traffic Volume
          </h2>
          <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5 font-mono">
            <span>1-min windows</span>
            <span aria-hidden="true">·</span>
            <span>Threshold: <strong className="text-rose-700">{spikeThresholdPct}%</strong></span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 font-medium">Buckets: {buckets.length}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-stone-600 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-stone-300 inline-block" />
            <span>Requests</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 rounded-xs bg-rose-400 inline-block" />
            <span>Error Rate %</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-100 border border-rose-300 inline-block" />
            <span>Spike Alert</span>
          </div>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${buckets.length * 28 + 40} ${chartHeight + 40}`}
          className="w-full h-48 overflow-visible select-none"
        >
          <defs>
            <linearGradient id="pastelSpikeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FDA4AF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#FFF1F2" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Background grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - ratio * chartHeight + 10;
            const rateVal = Math.round(ratio * maxErrorRate);
            return (
              <g key={ratio}>
                <line
                  x1="30"
                  y1={y}
                  x2={buckets.length * 28 + 30}
                  y2={y}
                  stroke="#F3F4F6"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x="24"
                  y={y + 3}
                  textAnchor="end"
                  className="fill-stone-400 text-[9px] font-mono tabular-nums"
                >
                  {rateVal}%
                </text>
              </g>
            );
          })}

          {/* Threshold line */}
          {(() => {
            const thresholdY = chartHeight - (spikeThresholdPct / maxErrorRate) * chartHeight + 10;
            return (
              <g>
                <line
                  x1="30"
                  y1={thresholdY}
                  x2={buckets.length * 28 + 30}
                  y2={thresholdY}
                  stroke="#FB7185"
                  strokeDasharray="4 2"
                  strokeWidth="1.5"
                  opacity="0.85"
                />
                <text
                  x={buckets.length * 28 + 32}
                  y={thresholdY + 3}
                  className="fill-rose-500 text-[9px] font-mono font-semibold"
                >
                  5% Alert Line
                </text>
              </g>
            );
          })()}

          {/* Bars: Request Volume & Spike highlights */}
          {buckets.map((b, idx) => {
            const x = 35 + idx * 28;
            const barHeight = Math.max((b.totalRequests / maxRequests) * (chartHeight - 20), 4);
            const barY = chartHeight - barHeight + 10;
            const isHovered = hoveredBucket === b;

            return (
              <g
                key={b.timeLabel + idx}
                onMouseEnter={() => setHoveredBucket(b)}
                onMouseLeave={() => setHoveredBucket(null)}
                className="cursor-pointer"
              >
                {/* Spike background zone */}
                {b.isSpike && (
                  <rect
                    x={x - 4}
                    y="10"
                    width="24"
                    height={chartHeight}
                    fill="url(#pastelSpikeGrad)"
                    rx="3"
                  />
                )}

                {/* Request Bar (Soft Pastel Slate/Lavender) */}
                <rect
                  x={x}
                  y={barY}
                  width="16"
                  height={barHeight}
                  rx="3"
                  fill={b.isSpike ? '#FECDD3' : isHovered ? '#CBD5E1' : '#E2E8F0'}
                  className="transition-colors"
                />

                {/* Error segment on bar (Soft Pastel Rose) */}
                {b.errorRequests > 0 && (
                  <rect
                    x={x}
                    y={chartHeight - (b.errorRequests / maxRequests) * (chartHeight - 20) + 10}
                    width="16"
                    height={Math.max((b.errorRequests / maxRequests) * (chartHeight - 20), 2)}
                    rx="2"
                    fill="#F43F5E"
                  />
                )}

                {/* X Axis label every 3 bars */}
                {idx % 3 === 0 && (
                  <text
                    x={x + 8}
                    y={chartHeight + 28}
                    textAnchor="middle"
                    className="fill-stone-500 text-[10px] font-mono tabular-nums"
                  >
                    {b.timeLabel}
                  </text>
                )}
              </g>
            );
          })}

          {/* Polyline: Error Rate % */}
          {(() => {
            const points = buckets.map((b, idx) => {
              const x = 35 + idx * 28 + 8;
              const y = chartHeight - (b.errorRate / maxErrorRate) * chartHeight + 10;
              return `${x},${y}`;
            }).join(' ');

            return (
              <>
                <polyline
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                />
                {buckets.map((b, idx) => {
                  const cx = 35 + idx * 28 + 8;
                  const cy = chartHeight - (b.errorRate / maxErrorRate) * chartHeight + 10;
                  return (
                    <circle
                      key={idx}
                      cx={cx}
                      cy={cy}
                      r={b.isSpike ? 4.5 : 2.5}
                      fill={b.isSpike ? '#E11D48' : '#FDA4AF'}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  );
                })}
              </>
            );
          })()}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredBucket && (
          <div className="absolute top-2 right-4 bg-white/95 border border-stone-200 p-3 rounded-lg shadow-lg text-xs font-mono tabular-nums pointer-events-none z-20 max-w-xs text-stone-800 backdrop-blur-xs">
            <div className="flex items-center justify-between font-semibold mb-1 pb-1 border-b border-stone-100">
              <span className="text-stone-900">Time: {hoveredBucket.timeLabel}</span>
              {hoveredBucket.isSpike && (
                <span className="text-rose-700 font-bold flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                  <AlertCircle className="w-3 h-3" /> SPIKE
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-stone-600 mt-1">
              <div>Total Requests: <strong className="text-stone-900">{hoveredBucket.totalRequests}</strong></div>
              <div>Error Rate: <strong className={hoveredBucket.errorRate > 5 ? 'text-rose-600' : 'text-stone-900'}>{hoveredBucket.errorRate}%</strong></div>
              <div>5xx Errors: <strong className="text-rose-600">{hoveredBucket.status5xx}</strong></div>
              <div>4xx Errors: <strong className="text-amber-600">{hoveredBucket.status4xx}</strong></div>
              <div className="col-span-2">Avg Latency: <strong className="text-stone-900">{hoveredBucket.avgLatencyMs}ms</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
