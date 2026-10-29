import React from 'react';
import { CircuitDefinition, Bit } from '../../circuits/gateEngine';
import { GateSvg } from './GateSvg';

interface CircuitDiagramViewProps {
  circuit: CircuitDefinition;
  nodeValues: Record<string, Bit>;
  activeGateIds: string[];
  evaluatedGateIds: string[];
}

export const CircuitDiagramView: React.FC<CircuitDiagramViewProps> = ({
  circuit,
  nodeValues,
  activeGateIds,
  evaluatedGateIds,
}) => {
  const getSignalColor = (val: Bit | undefined) => (val === 1 ? '#22c55e' : '#64748b');

  return (
    <div className="w-full overflow-x-auto bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
      <svg viewBox="0 0 950 500" className="w-full h-auto min-w-[800px]">
        {/* Background Grid Accent */}
        <defs>
          <pattern id="circuitGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuitGrid)" rx="8" />

        {/* INPUT PINS */}
        <g id="input-pins">
          {circuit.inputs.map((inp, idx) => {
            const yPos = 60 + idx * 80;
            const val = nodeValues[inp.id] ?? inp.defaultValue;
            const color = getSignalColor(val);

            return (
              <g key={inp.id}>
                {/* Wire from Pin to Layer 1 */}
                <line x1="80" y1={yPos} x2="180" y2={yPos} stroke={color} strokeWidth="3" />
                <rect
                  x="15"
                  y={yPos - 16}
                  width="65"
                  height="32"
                  rx="6"
                  fill="#1e293b"
                  stroke={color}
                  strokeWidth="2"
                />
                <text x="32" y={yPos + 5} fill="#f1f5f9" fontSize="12" fontWeight="bold">
                  {inp.id}
                </text>
                <text x="62" y={yPos + 5} fill={color} fontSize="14" fontWeight="extrabold">
                  {val}
                </text>
              </g>
            );
          })}
        </g>

        {/* GATES & WIRES */}
        <g id="circuit-gates">
          {circuit.gates.map((gate) => {
            const gx = gate.x || 200;
            const gy = gate.y || 100;
            const isActive = activeGateIds.includes(gate.id);
            const isEvaluated = evaluatedGateIds.includes(gate.id);
            const outVal = nodeValues[gate.output];
            const outColor = getSignalColor(outVal);

            return (
              <g key={gate.id}>
                {/* Render Gate Output Wire */}
                <line
                  x1={gx + 60}
                  y1={gy + 20}
                  x2={gx + 120}
                  y2={gy + 20}
                  stroke={outColor}
                  strokeWidth="3"
                  strokeDasharray={isActive ? '4' : 'none'}
                />

                {/* Render Gate Component */}
                <GateSvg
                  type={gate.type}
                  x={gx}
                  y={gy}
                  label={gate.label}
                  isActive={isActive}
                  isEvaluated={isEvaluated}
                />
              </g>
            );
          })}
        </g>

        {/* OUTPUT PINS */}
        <g id="output-pins">
          {circuit.outputs.map((out, idx) => {
            const yPos = 110 + idx * 120;
            const val = nodeValues[out.id] ?? 0;
            const color = getSignalColor(val);

            return (
              <g key={out.id}>
                <line x1="840" y1={yPos} x2="890" y2={yPos} stroke={color} strokeWidth="3" />
                <circle cx="890" cy={yPos} r="16" fill="#1e293b" stroke={color} strokeWidth="2.5" />
                <text x="890" y={yPos + 5} textAnchor="middle" fill={color} fontSize="14" fontWeight="bold">
                  {val}
                </text>
                <text x="890" y={yPos - 22} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">
                  {out.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
