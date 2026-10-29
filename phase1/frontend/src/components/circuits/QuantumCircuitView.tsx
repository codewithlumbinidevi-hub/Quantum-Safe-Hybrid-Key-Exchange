import React from 'react';
import { QuantumCircuitDefinition, QubitState, QuantumGate } from '../../circuits/quantumEngine';

interface QuantumCircuitViewProps {
  circuit: QuantumCircuitDefinition;
  qubitStates: QubitState[];
  initialStates: QubitState[];
  activeColumn: number;
}

export const QuantumCircuitView: React.FC<QuantumCircuitViewProps> = ({
  circuit,
  qubitStates,
  initialStates,
  activeColumn,
}) => {
  const colWidth = 65;
  const rowHeight = 45;
  const startX = 110;
  const startY = 50;

  const totalWidth = startX + (circuit.totalColumns + 1) * colWidth + 40;
  const totalHeight = startY + circuit.qubitCount * rowHeight + 30;

  const renderGateGlyph = (gate: QuantumGate) => {
    const gx = startX + gate.column * colWidth;
    const ty = startY + gate.target * rowHeight;
    const isActive = gate.column === activeColumn;
    const strokeColor = isActive ? '#22c55e' : '#38bdf8';
    const fillColor = isActive ? '#22c55e' : '#0284c7';

    if (gate.type === 'MEASURE') {
      return (
        <g key={gate.id} className="transition-all duration-150">
          <rect
            x={gx - 14}
            y={ty - 14}
            width="28"
            height="28"
            rx="4"
            fill="#1e293b"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <path
            d={`M ${gx - 8} ${ty + 6} A 10 10 0 0 1 ${gx + 8} ${ty + 6}`}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="2"
          />
          <line
            x1={gx}
            y1={ty + 6}
            x2={gx + 6}
            y2={ty - 6}
            stroke="#38bdf8"
            strokeWidth="2"
          />
        </g>
      );
    }

    // Render vertical control lines for CX / CCX
    const controlYPositions = (gate.controls || []).map((cIdx) => startY + cIdx * rowHeight);
    const minY = Math.min(ty, ...controlYPositions);
    const maxY = Math.max(ty, ...controlYPositions);

    return (
      <g key={gate.id} className="transition-all duration-150">
        {/* Vertical Connector Line */}
        {gate.controls && gate.controls.length > 0 && (
          <line
            x1={gx}
            y1={minY}
            x2={gx}
            y2={maxY}
            stroke={strokeColor}
            strokeWidth="2.5"
          />
        )}

        {/* Control Dots */}
        {(gate.controls || []).map((cIdx, idx) => {
          const cy = startY + cIdx * rowHeight;
          return (
            <circle
              key={`${gate.id}-ctrl-${idx}`}
              cx={gx}
              cy={cy}
              r="5"
              fill={fillColor}
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Target Symbol (⊕) */}
        <circle
          cx={gx}
          cy={ty}
          r="12"
          fill="#0f172a"
          stroke={strokeColor}
          strokeWidth="2.5"
        />
        <line
          x1={gx - 8}
          y1={ty}
          x2={gx + 8}
          y2={ty}
          stroke={strokeColor}
          strokeWidth="2"
        />
        <line
          x1={gx}
          y1={ty - 8}
          x2={gx}
          y2={ty + 8}
          stroke={strokeColor}
          strokeWidth="2"
        />
      </g>
    );
  };

  return (
    <div className="w-full overflow-x-auto bg-slate-950/90 border border-slate-800 rounded-xl p-4 shadow-xl">
      <svg viewBox={`0 0 ${totalWidth} ${totalHeight}`} className="w-full h-auto min-w-[750px]">
        {/* Active Column Step Indicator Highlight */}
        {activeColumn > 0 && activeColumn <= circuit.totalColumns && (
          <rect
            x={startX + activeColumn * colWidth - colWidth / 2 + 5}
            y={20}
            width={colWidth - 10}
            height={totalHeight - 40}
            rx="6"
            fill="rgba(34, 197, 94, 0.12)"
            stroke="#22c55e"
            strokeWidth="1.5"
            strokeDasharray="4"
          />
        )}

        {/* QUBIT WIRES & INITIAL STATE TAGS */}
        {circuit.qubits.map((q) => {
          const y = startY + q.index * rowHeight;
          const initialVal = initialStates[q.index] ?? 0;
          const currentVal = qubitStates[q.index] ?? 0;
          const isHighCurrent = currentVal === 1;
          const isHighInit = initialVal === 1;

          return (
            <g key={q.name}>
              {/* Qubit Wire Rail - Color derived dynamically from SIMULATOR state */}
              <line
                x1={startX - 20}
                y1={y}
                x2={startX + (circuit.totalColumns + 0.6) * colWidth}
                y2={y}
                stroke={isHighCurrent ? '#22c55e' : '#475569'}
                strokeWidth="2"
              />

              {/* Wire Register Label (a0, b0, z) */}
              <text
                x={startX - 65}
                y={y + 4}
                fill="#f8fafc"
                fontSize="13"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {q.name}
              </text>

              {/* Initial Basis State (|0⟩ / |1⟩) - FIX 1: z starts as |0⟩ */}
              <rect
                x={startX - 38}
                y={y - 12}
                width="28"
                height="24"
                rx="4"
                fill="#1e293b"
                stroke={isHighInit ? '#22c55e' : '#64748b'}
                strokeWidth="1.5"
              />
              <text
                x={startX - 24}
                y={y + 4}
                textAnchor="middle"
                fill={isHighInit ? '#22c55e' : '#94a3b8'}
                fontSize="12"
                fontWeight="bold"
                fontFamily="monospace"
              >
                |{initialVal}⟩
              </text>

              {/* Current Live Qubit State Badge at end of wire - FIX 2: Calculated from SIMULATOR step */}
              <circle
                cx={startX + (circuit.totalColumns + 0.6) * colWidth + 15}
                cy={y}
                r="11"
                fill={isHighCurrent ? '#22c55e' : '#334155'}
                stroke={isHighCurrent ? '#4ade80' : '#64748b'}
                strokeWidth="2"
              />
              <text
                x={startX + (circuit.totalColumns + 0.6) * colWidth + 15}
                y={y + 4}
                textAnchor="middle"
                fill={isHighCurrent ? '#022c22' : '#f8fafc'}
                fontSize="11"
                fontWeight="extrabold"
                fontFamily="monospace"
              >
                {currentVal}
              </text>
            </g>
          );
        })}

        {/* TIME STEP COLUMN LABELS */}
        {Array.from({ length: circuit.totalColumns }).map((_, idx) => {
          const colNum = idx + 1;
          const cx = startX + colNum * colWidth;
          const isActive = colNum === activeColumn;

          return (
            <text
              key={`col-${colNum}`}
              x={cx}
              y={28}
              textAnchor="middle"
              fill={isActive ? '#22c55e' : '#64748b'}
              fontSize="11"
              fontWeight={isActive ? 'bold' : 'normal'}
              fontFamily="monospace"
            >
              Step {colNum}
            </text>
          );
        })}

        {/* GATES */}
        <g id="quantum-gates">{circuit.gates.map(renderGateGlyph)}</g>
      </svg>
    </div>
  );
};
