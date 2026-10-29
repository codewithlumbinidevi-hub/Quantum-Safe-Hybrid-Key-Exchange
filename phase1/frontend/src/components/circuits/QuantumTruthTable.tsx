import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { QuantumCircuitDefinition, QubitState, evaluateQuantumStep, extractAdderValues } from '../../circuits/quantumEngine';

interface QuantumTruthTableProps {
  circuit: QuantumCircuitDefinition;
  currentA: number;
  currentB: number;
}

interface TruthTableRowData {
  a: number;
  b: number;
  sum: number;
  binaryA: string;
  binaryB: string;
  binarySum: string;
  aBits: QubitState[];
  bBits: QubitState[];
}

export const QuantumTruthTable: React.FC<QuantumTruthTableProps> = ({
  circuit,
  currentA,
  currentB,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Generate full Truth Table dynamically from quantum circuit simulation
  const tableRows: TruthTableRowData[] = useMemo(() => {
    const maxVal = 1 << circuit.numBits;
    const rows: TruthTableRowData[] = [];

    for (let a = 0; a < maxVal; a++) {
      for (let b = 0; b < maxVal; b++) {
        const initStates: QubitState[] = new Array(circuit.qubitCount).fill(0);
        const aBits: QubitState[] = [];
        const bBits: QubitState[] = [];

        circuit.qubits.filter((q) => q.role === 'a').forEach((q) => {
          if (q.bitIndex !== undefined) {
            const bit = ((a >> q.bitIndex) & 1) as QubitState;
            initStates[q.index] = bit;
            aBits[q.bitIndex] = bit;
          }
        });

        circuit.qubits.filter((q) => q.role === 'b').forEach((q) => {
          if (q.bitIndex !== undefined) {
            const bit = ((b >> q.bitIndex) & 1) as QubitState;
            initStates[q.index] = bit;
            bBits[q.bitIndex] = bit;
          }
        });

        // z bit starts at 0
        initStates[2 * circuit.numBits] = 0;

        const { qubitStates } = evaluateQuantumStep(circuit, initStates, circuit.totalColumns);
        const { sumVal, binarySumStr } = extractAdderValues(circuit, qubitStates);

        rows.push({
          a,
          b,
          sum: sumVal,
          binaryA: a.toString(2).padStart(circuit.numBits, '0'),
          binaryB: b.toString(2).padStart(circuit.numBits, '0'),
          binarySum: binarySumStr,
          aBits,
          bBits,
        });
      }
    }

    return rows;
  }, [circuit]);

  // Filter rows if user types in search
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return tableRows;
    const term = searchTerm.toLowerCase();
    return tableRows.filter(
      (r) =>
        r.a.toString() === term ||
        r.b.toString() === term ||
        r.sum.toString() === term ||
        r.binaryA.includes(term) ||
        r.binaryB.includes(term) ||
        r.binarySum.includes(term)
    );
  }, [tableRows, searchTerm]);

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-200">
            Quantum Circuit Truth Table ({tableRows.length} States)
          </h3>
          <p className="text-xs text-slate-400">
            Full state map simulated using {circuit.qubitCount}-qubit Reversible Ripple-Carry Adder (CNOT + Toffoli) gates.
          </p>
        </div>

        {/* Search / Filter Box for Processor B 256 rows */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search inputs/sum..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono w-48"
          />
        </div>
      </div>

      <div className="overflow-x-auto max-h-64 overflow-y-auto mt-3">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 sticky top-0">
              <th className="py-2 px-3">#</th>
              <th className="py-2 px-3 text-cyan-400">Input A (Dec)</th>
              <th className="py-2 px-3 text-cyan-400">Input A (Bin)</th>
              <th className="py-2 px-3 text-emerald-400">Input B (Dec)</th>
              <th className="py-2 px-3 text-emerald-400">Input B (Bin)</th>
              <th className="py-2 px-2 text-slate-600">|</th>
              <th className="py-2 px-3 text-amber-400">Output Sum (Dec)</th>
              <th className="py-2 px-3 text-amber-400">Output Sum (Bin)</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => {
              const isActive = row.a === currentA && row.b === currentB;
              return (
                <tr
                  key={`${row.a}-${row.b}`}
                  className={`border-b border-slate-800/50 transition-colors ${
                    isActive
                      ? 'bg-emerald-500/20 font-bold text-emerald-300 border-l-4 border-l-emerald-500'
                      : 'hover:bg-slate-900/60 text-slate-400'
                  }`}
                >
                  <td className="py-1.5 px-3 text-slate-600">{idx + 1}</td>
                  <td className="py-1.5 px-3">{row.a}</td>
                  <td className="py-1.5 px-3 text-cyan-400">{row.binaryA}</td>
                  <td className="py-1.5 px-3">{row.b}</td>
                  <td className="py-1.5 px-3 text-emerald-400">{row.binaryB}</td>
                  <td className="py-1.5 px-2 text-slate-700">|</td>
                  <td className="py-1.5 px-3 text-amber-300 font-bold">{row.sum}</td>
                  <td className="py-1.5 px-3 text-amber-400">{row.binarySum}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
