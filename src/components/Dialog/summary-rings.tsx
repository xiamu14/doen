"use client";

import { useRef, useState } from "react";
import { Portal } from "@headlessui/react";

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours ? `${hours}h` : ""}${remainder ? `${remainder}m` : ""}` || "0";
}

export default function SummaryRings({ planned, completed, total }: {
  planned: number;
  completed: number;
  total: number;
}) {
  const [tooltip, setTooltip] = useState<{ index: number | null; x: number; y: number }>({ index: null, x: 0, y: 0 });
  const tooltipRefs = useRef<Array<HTMLDivElement | null>>([]);
  const showTooltip = (index: number, x: number, y: number) => setTooltip({
    index,
    x: Math.max(8, Math.min(x + 12, window.innerWidth - (tooltipRefs.current[index]?.getBoundingClientRect().width ?? 0) - 8)),
    y: Math.max(8, Math.min(y + 12, window.innerHeight - 64)),
  });
  const hideTooltip = () => setTooltip((previous) => ({ ...previous, index: null }));
  const rings = [
    { label: "Planned", value: planned, total, color: "var(--primary-blue-300)", radius: 64 },
    { label: "Done", value: completed, total, color: "#69D571", radius: 47 },
    { label: "Focus", value: completed, total: planned, color: "#a4de6c", radius: 30 },
  ];

  return (
    <div className="flex flex-col items-center gap-3 px-[10px]">
      <svg viewBox="0 0 148 148" className="size-32" aria-label="Daily duration summary">
        {rings.map((ring, index) => {
          const share = ring.total > 0 ? Math.min(1, Math.max(0, ring.value / ring.total)) : 0;
          const description = `${ring.label}: ${formatDuration(ring.value)} / ${formatDuration(ring.total)}`;
          return (
            <g
              key={ring.label}
              tabIndex={0}
              role="img"
              aria-label={description}
              className="rounded-full outline-none focus:opacity-70"
              onPointerEnter={(event) => showTooltip(index, event.clientX, event.clientY)}
              onPointerMove={(event) => showTooltip(index, event.clientX, event.clientY)}
              onPointerLeave={hideTooltip}
              onFocus={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                showTooltip(index, rect.right, rect.top);
              }}
              onBlur={hideTooltip}
            >
              <circle cx="74" cy="74" r={ring.radius} fill="none" stroke="#eee" strokeWidth="12" />
              {share > 0 && (
                <circle
                  cx="74" cy="74" r={ring.radius}
                  fill="none" stroke={ring.color} strokeWidth="12"
                  strokeLinecap="round" pathLength="100"
                  strokeDasharray={`${share * 100} 100`}
                  transform="rotate(-90 74 74)"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex min-h-12 w-full items-center justify-center text-[12px] text-content">
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {rings.slice().reverse().map((ring) => (
            <span key={ring.label} className="inline-flex items-center gap-1">
              <i className="size-2 rounded-full" style={{ background: ring.color }} />
              {ring.label}
            </span>
          ))}
        </div>
      </div>
      <Portal>
        {rings.map((ring, index) => (
          <div
            key={ring.label}
            ref={(element) => { tooltipRefs.current[index] = element; }}
            role="tooltip"
            aria-hidden={tooltip.index !== index}
            style={{ left: tooltip.x, top: tooltip.y }}
            className={`pointer-events-none fixed z-[60] w-max max-w-[calc(100vw-16px)] rounded-lg border border-[#eee] bg-white px-3 py-1 text-[12px] font-semibold text-content shadow-sm transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${tooltip.index === index ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
          >
            <div>{ring.label}</div>
            <div>{formatDuration(ring.value)} / {formatDuration(ring.total)}</div>
          </div>
        ))}
      </Portal>
    </div>
  );
}
