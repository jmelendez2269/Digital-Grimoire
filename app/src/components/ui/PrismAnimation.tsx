import type { CSSProperties } from "react";

import { LENSES } from "@/lib/parallax/lenses";
import { cn } from "@/lib/utils";
import { getLensColorStyle } from "@/lib/utils/lens-colors";

const sevenLenses = Object.values(LENSES);

const PRISM_APEX = { x: 200, y: 52 };
const PRISM_BASE_LEFT = { x: 56, y: 348 };
const PRISM_BASE_RIGHT = { x: 344, y: 348 };
const PRISM_EXIT = { x: 276, y: 208 };
const RAY_LENGTH = 110;
const RAY_SPREAD_DEG = 100;

function getRayGeometry(index: number, total: number) {
  const angleDeg = -RAY_SPREAD_DEG / 2 + (index * RAY_SPREAD_DEG) / (total - 1);
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = PRISM_EXIT.x + RAY_LENGTH * Math.cos(angleRad);
  const y = PRISM_EXIT.y + RAY_LENGTH * Math.sin(angleRad);

  return { x, y, leftPct: (x / 400) * 100, topPct: (y / 400) * 100 };
}

function getWigglyRayFrames(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const perpendicularX = -uy;
  const perpendicularY = ux;
  const amplitude = 14;
  const firstControlPoint = {
    x: x1 + (ux * length) / 3,
    y: y1 + (uy * length) / 3,
  };
  const secondControlPoint = {
    x: x1 + (ux * length * 2) / 3,
    y: y1 + (uy * length * 2) / 3,
  };

  return [0, 90, 180, 270, 360]
    .map((degrees) => {
      const swing = Math.sin((degrees * Math.PI) / 180);
      const firstX = firstControlPoint.x + perpendicularX * amplitude * swing;
      const firstY = firstControlPoint.y + perpendicularY * amplitude * swing;
      const secondX = secondControlPoint.x - perpendicularX * amplitude * swing;
      const secondY = secondControlPoint.y - perpendicularY * amplitude * swing;

      return `M${x1},${y1} C${firstX.toFixed(1)},${firstY.toFixed(1)} ${secondX.toFixed(1)},${secondY.toFixed(1)} ${x2},${y2}`;
    })
    .join(";");
}

const lensRays = sevenLenses.map((lens, index) => {
  const geometry = getRayGeometry(index, sevenLenses.length);

  return {
    lens,
    color: getLensColorStyle(lens.id),
    geometry,
    wiggleFrames: getWigglyRayFrames(
      PRISM_EXIT.x,
      PRISM_EXIT.y,
      geometry.x,
      geometry.y
    ),
  };
});

interface PrismAnimationProps {
  className?: string;
}

export default function PrismAnimation({ className }: PrismAnimationProps) {
  return (
    <div
      className={cn(
        "relative aspect-square w-full [perspective:1200px]",
        className
      )}
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute inset-[8%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, rgba(34,211,238,0.14), transparent 62%)",
        }}
      />

      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 h-full w-full"
        fill="none"
      >
        <line
          x1="20"
          y1={PRISM_EXIT.y}
          x2="124"
          y2={PRISM_EXIT.y}
          stroke="rgba(253,230,190,0.35)"
          strokeWidth="1.5"
        />
      </svg>
      <div
        className="animate-prism-beam-photon absolute h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-100"
        style={{
          top: `${(PRISM_EXIT.y / 400) * 100}%`,
          boxShadow: "0 0 8px 2px rgba(253,230,190,0.65)",
        }}
      />

      <div className="animate-prism-spin absolute inset-0">
        <svg
          viewBox="0 0 400 400"
          className="absolute inset-0 h-full w-full"
          fill="none"
        >
          <polygon
            points={`${PRISM_APEX.x},${PRISM_APEX.y} ${PRISM_BASE_RIGHT.x},${PRISM_BASE_RIGHT.y} ${PRISM_BASE_LEFT.x},${PRISM_BASE_LEFT.y}`}
            fill="#22D3EE"
            className="animate-prism-glass-glow"
            fillOpacity="0.55"
            stroke="#67E8F9"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 hidden h-full w-full motion-safe:block"
        fill="none"
      >
        {lensRays.map(({ lens, color, wiggleFrames }, index) => (
          <path
            key={lens.id}
            d={wiggleFrames.split(";")[0]}
            fill="none"
            stroke={color.hex}
            strokeOpacity="0.3"
            strokeWidth="1.25"
            strokeLinecap="round"
          >
            <animate
              attributeName="d"
              values={wiggleFrames}
              dur="2.2s"
              begin={`${-index * 0.25}s`}
              repeatCount="indefinite"
            />
          </path>
        ))}
      </svg>
      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 hidden h-full w-full motion-reduce:block"
        fill="none"
      >
        {lensRays.map(({ lens, color, wiggleFrames }) => (
          <path
            key={lens.id}
            d={wiggleFrames.split(";")[0]}
            fill="none"
            stroke={color.hex}
            strokeOpacity="0.3"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        ))}
      </svg>

      {lensRays.map(({ lens, color, geometry }, index) => (
        <div
          key={`photon-${lens.id}`}
          className="animate-prism-ray-photon absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={
            {
              backgroundColor: color.hex,
              boxShadow: `0 0 8px 2px ${color.glow}`,
              animationDelay: `${1.3 + index * 0.08}s`,
              "--ray-left": `${geometry.leftPct}%`,
              "--ray-top": `${geometry.topPct}%`,
            } as CSSProperties
          }
        />
      ))}
      {lensRays.map(({ lens, color, geometry }, index) => (
        <div
          key={`point-${lens.id}`}
          className="animate-lens-point-pulse absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${geometry.leftPct}%`,
            top: `${geometry.topPct}%`,
            backgroundColor: color.hex,
            boxShadow: `0 0 10px 2px ${color.glow}`,
            animationDelay: `${index * 0.32}s`,
          }}
        />
      ))}
    </div>
  );
}
