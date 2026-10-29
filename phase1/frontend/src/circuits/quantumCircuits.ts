/**
 * Verified Quantum Ripple-Carry Adder Circuit Definitions
 * Generates exact Reversible Ripple-Carry Adder (CNOT + Toffoli) gates in exact loop order for n-bit numbers.
 *
 * Qubit Register Mapping:
 * a0..a(n-1) -> indices 0 .. n-1
 * b0..b(n-1) -> indices n .. 2n-1
 * z (carry out) -> index 2n
 */

import { QuantumCircuitDefinition, QuantumGate, QubitRegister } from './quantumEngine';

export const createVerifiedCuccaroAdder = (
  id: string,
  name: string,
  n: number
): QuantumCircuitDefinition => {
  const qubitCount = 2 * n + 1;
  const qubits: QubitRegister[] = [];

  // Register A (qubits 0..n-1)
  for (let i = 0; i < n; i++) {
    qubits.push({ index: i, name: `a${i}`, role: 'a', bitIndex: i });
  }

  // Register B (qubits n..2n-1)
  for (let i = 0; i < n; i++) {
    qubits.push({ index: n + i, name: `b${i}`, role: 'b', bitIndex: i });
  }

  // Carry Out Z (qubit 2n)
  qubits.push({ index: 2 * n, name: 'z', role: 'z' });

  // Gate indices
  const a = (i: number) => i;
  const b = (i: number) => n + i;
  const z = 2 * n;

  const rawGates: Array<{ type: 'CX' | 'CCX'; controls: number[]; target: number; label: string }> = [];

  // 1. for i in 1..n-1: CNOT(a[i] -> b[i])
  for (let i = 1; i < n; i++) {
    rawGates.push({ type: 'CX', controls: [a(i)], target: b(i), label: `CNOT a${i}→b${i}` });
  }

  // 2. CNOT(a[n-1] -> z)
  rawGates.push({ type: 'CX', controls: [a(n - 1)], target: z, label: `CNOT a${n - 1}→z` });

  // 3. for i in n-2 down to 1: CNOT(a[i] -> a[i+1])
  for (let i = n - 2; i >= 1; i--) {
    rawGates.push({ type: 'CX', controls: [a(i)], target: a(i + 1), label: `CNOT a${i}→a${i + 1}` });
  }

  // 4. for i in 0..n-2: TOFFOLI(b[i], a[i] -> a[i+1])
  for (let i = 0; i <= n - 2; i++) {
    rawGates.push({ type: 'CCX', controls: [b(i), a(i)], target: a(i + 1), label: `CCX (b${i},a${i})→a${i + 1}` });
  }

  // 5. TOFFOLI(b[n-1], a[n-1] -> z)
  rawGates.push({ type: 'CCX', controls: [b(n - 1), a(n - 1)], target: z, label: `CCX (b${n - 1},a${n - 1})→z` });

  // 6. for i in n-1 down to 1: CNOT(a[i] -> b[i]); TOFFOLI(b[i-1], a[i-1] -> a[i])
  for (let i = n - 1; i >= 1; i--) {
    rawGates.push({ type: 'CX', controls: [a(i)], target: b(i), label: `CNOT a${i}→b${i}` });
    rawGates.push({ type: 'CCX', controls: [b(i - 1), a(i - 1)], target: a(i), label: `CCX (b${i - 1},a${i - 1})→a${i}` });
  }

  // 7. for i in 1..n-2: CNOT(a[i] -> a[i+1])
  for (let i = 1; i <= n - 2; i++) {
    rawGates.push({ type: 'CX', controls: [a(i)], target: a(i + 1), label: `CNOT a${i}→a${i + 1}` });
  }

  // 8. for i in 0..n-1: CNOT(a[i] -> b[i])
  for (let i = 0; i < n; i++) {
    rawGates.push({ type: 'CX', controls: [a(i)], target: b(i), label: `CNOT a${i}→b${i}` });
  }

  // Time-step column layering: schedule non-overlapping gates into columns
  const gates: QuantumGate[] = [];
  const qubitBusyColumn: number[] = new Array(qubitCount).fill(0);
  let cxCount = 0;
  let ccxCount = 0;

  rawGates.forEach((g, idx) => {
    if (g.type === 'CX') cxCount++;
    if (g.type === 'CCX') ccxCount++;

    const involvedQubits = [...g.controls, g.target];
    let maxPrevCol = 0;
    involvedQubits.forEach((qIdx) => {
      maxPrevCol = Math.max(maxPrevCol, qubitBusyColumn[qIdx]);
    });

    const assignedCol = maxPrevCol + 1;
    involvedQubits.forEach((qIdx) => {
      qubitBusyColumn[qIdx] = assignedCol;
    });

    gates.push({
      id: `gate_${idx + 1}`,
      type: g.type,
      controls: g.controls,
      target: g.target,
      column: assignedCol,
      label: g.label,
    });
  });

  const totalColumns = Math.max(...qubitBusyColumn, 1);

  // Append measurement step at totalColumns + 1
  for (let i = 0; i < qubitCount; i++) {
    gates.push({
      id: `meas_${i}`,
      type: 'MEASURE',
      target: i,
      column: totalColumns + 1,
    });
  }

  return {
    id,
    name,
    qubitCount,
    numBits: n,
    qubits,
    gates,
    totalColumns: totalColumns + 1,
    gateCounts: {
      cx: cxCount,
      ccx: ccxCount,
      x: 0,
    },
  };
};

export const PROCESSOR_A_QUANTUM_CIRCUIT = createVerifiedCuccaroAdder(
  'processor-a-quantum',
  'Processor A Quantum Adder (5-Qubit Reversible Ripple-Carry)',
  2
);

export const PROCESSOR_B_QUANTUM_CIRCUIT = createVerifiedCuccaroAdder(
  'processor-b-quantum',
  'Processor B Quantum Adder (9-Qubit Reversible Ripple-Carry)',
  4
);
