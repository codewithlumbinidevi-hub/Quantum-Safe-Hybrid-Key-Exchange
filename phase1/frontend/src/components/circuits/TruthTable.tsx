import React from 'react';
import { CircuitDefinition, Bit, TruthTableRow, generateTruthTable } from '../../circuits/gateEngine';

interface TruthTableProps {
  circuit: CircuitDefinition;
  currentInputs: Record<string, Bit>;
}

export const TruthTable: React.FC<TruthTableProps> = ({ circuit, currentInputs }) => {
  const tableRows: TruthTableRow[] = React.useMemo(() => generateTruthTable(circuit), [circuit]);

  const isCurrentRow = (rowInputs: Record<string, Bit>) => {
    return circuit.inputs.every((inp) => rowInputs[inp.id] === (currentInputs[inp.id] ?? inp.defaultValue));
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center justify-between">
        <span>Circuit Truth Table</span>
        <span className="text-xs font-normal text-slate-500">
          Highlighting active input state
        </span>
      </h3>

      <div className="overflow-x-auto max-h-60 overflow-y-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
              <th className="py-2 px-3">#</th>
              {circuit.inputs.map((inp) => (
                <th key={inp.id} className="py-2 px-3 text-cyan-400">
                  {inp.id}
                </th>
              ))}
              <th className="py-2 px-2 text-slate-600">|</th>
              {circuit.outputs.map((out) => (
                <th key={out.id} className="py-2 px-3 text-emerald-400">
                  {out.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, idx) => {
              const active = isCurrentRow(row.inputs);
              return (
                <tr
                  key={idx}
                  className={`border-b border-slate-800/50 transition-colors ${
                    active
                      ? 'bg-emerald-500/15 font-bold text-emerald-300 border-l-4 border-l-emerald-500'
                      : 'hover:bg-slate-800/40 text-slate-400'
                  }`}
                >
                  <td className="py-1.5 px-3 text-slate-600">{idx + 1}</td>
                  {circuit.inputs.map((inp) => (
                    <td key={inp.id} className="py-1.5 px-3">
                      {row.inputs[inp.id]}
                    </td>
                  ))}
                  <td className="py-1.5 px-2 text-slate-700">|</td>
                  {circuit.outputs.map((out) => (
                    <td key={out.id} className="py-1.5 px-3">
                      {row.outputs[out.id]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
