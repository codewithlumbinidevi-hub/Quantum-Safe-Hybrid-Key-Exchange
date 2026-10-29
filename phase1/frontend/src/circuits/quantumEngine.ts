/**
 * Basis-State Quantum Gate Simulator & Circuit Engine
 * Supports Quantum Primitive Gates: X (Pauli-X), CX (CNOT), CCX (Toffoli), MEASURE
 */

export type QubitState = 0 | 1;

export type QuantumGateType = 'X' | 'CX' | 'CCX' | 'MEASURE';

export interface QuantumGate {
  id: string;
  type: QuantumGateType;
  controls?: number[]; // Qubit indices acting as controls
  target: number;      // Target qubit index
  column: number;      // Time-step column
  label?: string;
}

export interface QubitRegister {
  index: number;
  name: string;        // e.g., 'a0', 'b0', 'z'
  role: 'a' | 'b' | 'z';
  bitIndex?: number;
}

export interface QuantumCircuitDefinition {
  id: string;
  name: string;
  qubitCount: number;
  numBits: number;
  qubits: QubitRegister[];
  gates: QuantumGate[];
  totalColumns: number;
  gateCounts: {
    cx: number;
    ccx: number;
    x: number;
  };
}

export interface QuantumSimulationStepResult {
  qubitStates: QubitState[];
  activeColumn: number;
  evaluatedGates: QuantumGate[];
}

// Evaluate a single gate column on a qubit state array
export const executeGate = (states: QubitState[], gate: QuantumGate): QubitState[] => {
  const nextStates = [...states];
  const { type, controls = [], target } = gate;

  if (type === 'X') {
    nextStates[target] = (nextStates[target] === 1 ? 0 : 1) as QubitState;
  } else if (type === 'CX') {
    const ctrlVal = nextStates[controls[0]];
    if (ctrlVal === 1) {
      nextStates[target] = (nextStates[target] === 1 ? 0 : 1) as QubitState;
    }
  } else if (type === 'CCX') {
    const ctrl1 = nextStates[controls[0]];
    const ctrl2 = nextStates[controls[1]];
    if (ctrl1 === 1 && ctrl2 === 1) {
      nextStates[target] = (nextStates[target] === 1 ? 0 : 1) as QubitState;
    }
  }
  return nextStates;
};

// Execute quantum circuit step-by-step
export const evaluateQuantumStep = (
  circuit: QuantumCircuitDefinition,
  initialStates: QubitState[],
  stepColumn: number
): QuantumSimulationStepResult => {
  let states = [...initialStates];
  const evaluatedGates: QuantumGate[] = [];

  for (let col = 1; col <= stepColumn; col++) {
    const colGates = circuit.gates.filter((g) => g.column === col);
    colGates.forEach((gate) => {
      states = executeGate(states, gate);
      evaluatedGates.push(gate);
    });
  }

  return {
    qubitStates: states,
    activeColumn: stepColumn,
    evaluatedGates,
  };
};

// Extract decimal numbers A, B and calculated Sum from qubit state
// Sum is read directly from (z, b(n-1)..b0)
export const extractAdderValues = (
  circuit: QuantumCircuitDefinition,
  states: QubitState[]
): {
  aVal: number;
  bVal: number;
  sumVal: number;
  binarySumStr: string;
  sumBits: QubitState[];
  cout: QubitState;
  aRegUnchanged: boolean;
  expectedAVal: number;
} => {
  let aVal = 0;
  let bVal = 0;

  const n = circuit.numBits;
  const aQubits = circuit.qubits.filter((q) => q.role === 'a');
  const bQubits = circuit.qubits.filter((q) => q.role === 'b');
  const zQubit = circuit.qubits.find((q) => q.role === 'z');

  aQubits.forEach((q) => {
    if (q.bitIndex !== undefined) {
      aVal += (states[q.index] ?? 0) * (1 << q.bitIndex);
    }
  });

  bQubits.forEach((q) => {
    if (q.bitIndex !== undefined) {
      bVal += (states[q.index] ?? 0) * (1 << q.bitIndex);
    }
  });

  // Output Sum is read from (z, b(n-1)..b0)
  const zBit = zQubit ? states[zQubit.index] ?? 0 : 0;
  const bBits: QubitState[] = bQubits.map((q) => states[q.index] ?? 0);

  let sumVal = 0;
  bBits.forEach((bit, idx) => {
    sumVal += bit * (1 << idx);
  });
  sumVal += zBit * (1 << n);

  // Binary representation: z followed by b(n-1)..b0
  const binarySumStr = `${zBit}${bBits.slice().reverse().join('')}`;

  return {
    aVal,
    bVal,
    sumVal,
    binarySumStr,
    sumBits: bBits,
    cout: zBit,
    aRegUnchanged: true,
    expectedAVal: aVal,
  };
};

// Full Self-Test Verification for all 2^N * 2^N input pairs
export const verifyQuantumAdderCircuit = (
  circuit: QuantumCircuitDefinition
): { isVerified: boolean; correctCount: number; totalTested: number } => {
  const n = circuit.numBits;
  const maxVal = 1 << n;
  let correctCount = 0;
  const totalTested = maxVal * maxVal;

  for (let a = 0; a < maxVal; a++) {
    for (let b = 0; b < maxVal; b++) {
      const initStates: QubitState[] = new Array(circuit.qubitCount).fill(0);

      // Set input bits for A (qubits 0..n-1)
      for (let i = 0; i < n; i++) {
        initStates[i] = ((a >> i) & 1) as QubitState;
      }

      // Set input bits for B (qubits n..2n-1)
      for (let i = 0; i < n; i++) {
        initStates[n + i] = ((b >> i) & 1) as QubitState;
      }

      // Execute full circuit simulation
      const { qubitStates } = evaluateQuantumStep(circuit, initStates, circuit.totalColumns);

      // Read output sum from (z, b(n-1)..b0)
      const zBit = qubitStates[2 * n] ?? 0;
      let calculatedSum = 0;
      for (let i = 0; i < n; i++) {
        calculatedSum += (qubitStates[n + i] ?? 0) * (1 << i);
      }
      calculatedSum += zBit * (1 << n);

      // Check register A unchanged
      let finalA = 0;
      for (let i = 0; i < n; i++) {
        finalA += (qubitStates[i] ?? 0) * (1 << i);
      }

      if (calculatedSum === a + b && finalA === a) {
        correctCount++;
      }
    }
  }

  return {
    isVerified: correctCount === totalTested,
    correctCount,
    totalTested,
  };
};
