import React from 'react';
import { Cpu, CheckCircle2 } from 'lucide-react';
import { PROCESSOR_A_QUANTUM_CIRCUIT, PROCESSOR_B_QUANTUM_CIRCUIT } from '../../circuits/quantumCircuits';
import { verifyQuantumAdderCircuit } from '../../circuits/quantumEngine';

export const ProcessorComparisonCard: React.FC = () => {
  const verifiedA = React.useMemo(() => verifyQuantumAdderCircuit(PROCESSOR_A_QUANTUM_CIRCUIT), []);
  const verifiedB = React.useMemo(() => verifyQuantumAdderCircuit(PROCESSOR_B_QUANTUM_CIRCUIT), []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
        <Cpu size={16} className="text-cyan-400" />
        <span>Quantum Circuit Architecture Comparison (Reversible Ripple-Carry Adder (CNOT + Toffoli))</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        {/* Processor A Overview */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-cyan-400 text-sm">Processor A (5Q)</span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold">2-Bit Adder</span>
          </div>

          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Qubit Count:</span>
              <span className="font-bold text-slate-200">5 Qubits</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Gates:</span>
              <span className="font-bold text-slate-200">
                8 Gates ({PROCESSOR_A_QUANTUM_CIRCUIT.gateCounts.cx} CX, {PROCESSOR_A_QUANTUM_CIRCUIT.gateCounts.ccx} CCX)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Circuit Depth:</span>
              <span className="font-bold text-slate-200">{PROCESSOR_A_QUANTUM_CIRCUIT.totalColumns} Steps</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 text-emerald-400 font-bold">
            <CheckCircle2 size={14} />
            <span>Verified: {verifiedA.correctCount} / {verifiedA.totalTested} correct</span>
          </div>
        </div>

        {/* Processor B Overview */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-purple-400 text-sm">Processor B (9Q)</span>
            <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-bold">4-Bit Adder</span>
          </div>

          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Qubit Count:</span>
              <span className="font-bold text-slate-200">9 Qubits</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Gates:</span>
              <span className="font-bold text-slate-200">
                22 Gates ({PROCESSOR_B_QUANTUM_CIRCUIT.gateCounts.cx} CX, {PROCESSOR_B_QUANTUM_CIRCUIT.gateCounts.ccx} CCX)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Circuit Depth:</span>
              <span className="font-bold text-slate-200">{PROCESSOR_B_QUANTUM_CIRCUIT.totalColumns} Steps</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 text-emerald-400 font-bold">
            <CheckCircle2 size={14} />
            <span>Verified: {verifiedB.correctCount} / {verifiedB.totalTested} correct</span>
          </div>
        </div>
      </div>
    </div>
  );
};
