import React, { useState } from 'react';

interface CouplingMapProps {
  title: string;
  architectureId: string;
  numQubits: number;
  edges: number[][];
  activeQubits?: number[];
  colorTheme?: 'cyan' | 'purple';
}

export const CouplingMapVisualizer: React.FC<CouplingMapProps> = ({
  title,
  architectureId,
  numQubits,
  edges,
  activeQubits,
  colorTheme = 'cyan',
}) => {
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  // Layout node positions in SVG coordinates (viewBox 0 0 400 240)
  const getNodeCoordinates = (id: number): { x: number; y: number } => {
    if (numQubits === 5) {
      // 5-qubit Linear Chain layout
      const startX = 60;
      const stepX = 70;
      return { x: startX + id * stepX, y: 120 };
    } else {
      // 9-qubit Sparse Heavy-Hex Inspired layout
      // Qubits: 0..8
      const positions: Record<number, { x: number; y: number }> = {
        0: { x: 70, y: 70 },
        1: { x: 150, y: 70 },
        2: { x: 230, y: 70 },
        3: { x: 310, y: 70 },
        4: { x: 310, y: 170 },
        5: { x: 230, y: 170 },
        6: { x: 150, y: 170 },
        7: { x: 70, y: 170 },
        8: { x: 110, y: 120 }, // Central routing hub bridge
      };
      return positions[id] || { x: 200, y: 120 };
    }
  };

  const isEdgeConnectedToHovered = (u: number, v: number) => {
    if (hoveredNode === null) return false;
    return u === hoveredNode || v === hoveredNode;
  };

  const primaryColor = colorTheme === 'cyan' ? '#06b6d4' : '#a855f7';
  const glowColor = colorTheme === 'cyan' ? 'rgba(6, 182, 212, 0.4)' : 'rgba(168, 85, 247, 0.4)';

  return (
    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
          {numQubits} Qubits · {edges.length} Couplings
        </span>
      </div>

      <div className="relative w-full aspect-[16/10] bg-[#080d1a] rounded-lg border border-slate-800/80 flex items-center justify-center p-2">
        <svg viewBox="0 0 400 240" className="w-full h-full select-none">
          <defs>
            <filter id={`glow-${architectureId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Coupling Edges */}
          {edges.map(([u, v], idx) => {
            const posU = getNodeCoordinates(u);
            const posV = getNodeCoordinates(v);
            const isHighlighted = isEdgeConnectedToHovered(u, v);

            return (
              <line
                key={`edge-${idx}`}
                x1={posU.x}
                y1={posU.y}
                x2={posV.x}
                y2={posV.y}
                stroke={isHighlighted ? primaryColor : '#334155'}
                strokeWidth={isHighlighted ? 3 : 1.5}
                strokeDasharray={isHighlighted ? 'none' : '4 2'}
                className="transition-all duration-200"
              />
            );
          })}

          {/* Qubit Nodes */}
          {Array.from({ length: numQubits }).map((_, id) => {
            const pos = getNodeCoordinates(id);
            const isHovered = hoveredNode === id;
            const isRunning = activeQubits ? activeQubits.includes(id) : true;

            return (
              <g
                key={`node-${id}`}
                className="cursor-pointer transition-transform duration-150"
                onMouseEnter={() => setHoveredNode(id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Outer Glow on hover */}
                {isHovered && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={20}
                    fill={glowColor}
                    filter={`url(#glow-${architectureId})`}
                  />
                )}

                {/* Main Node Circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={14}
                  fill="#0f172a"
                  stroke={isHovered ? '#ffffff' : isRunning ? primaryColor : '#475569'}
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="transition-colors duration-200"
                />

                {/* Qubit Label */}
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fill={isHovered ? '#ffffff' : '#e2e8f0'}
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
                  pointerEvents="none"
                >
                  q{id}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredNode !== null && (
          <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-slate-800/90 border border-slate-700 text-[11px] font-mono text-cyan-300">
            Node q{hoveredNode}: degree{' '}
            {edges.filter(([u, v]) => u === hoveredNode || v === hoveredNode).length}
          </div>
        )}
      </div>

      <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Basis Gates: <code className="text-slate-300">rz, sx, x, cx</code></span>
        <span>{numQubits === 5 ? 'Linear Topology' : 'Heavy-Hex-Inspired Topology'}</span>
      </div>
    </div>
  );
};
