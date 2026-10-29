/**
 * Gate Engine & Reusable Logic Gates Library
 * Supports Primitive Gates (AND, OR, NOT, XOR, NAND, NOR)
 * and Sub-Circuits (Half Adder, Full Adder, Comparator, Multiplexer).
 */

export type Bit = 0 | 1;

export type GateType = 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND' | 'NOR' | 'BUF' | 'INPUT';

export interface LogicGate {
  id: string;
  type: GateType;
  label: string;
  inputs: string[]; // Node IDs providing inputs
  output: string;   // Output Node ID
  layer: number;    // Stage / propagation depth
  x?: number;
  y?: number;
}

export interface CircuitWire {
  fromGateId: string;
  fromNodeId: string;
  toGateId: string;
  toNodeId: string;
}

export interface CircuitDefinition {
  id: string;
  name: string;
  description: string;
  inputs: { id: string; label: string; defaultValue: Bit }[];
  outputs: { id: string; label: string }[];
  gates: LogicGate[];
  maxLayers: number;
}

// Primitive Gate Evaluators
export const evaluateGate = (type: GateType, inputs: Bit[]): Bit => {
  switch (type) {
    case 'AND':
      return inputs.reduce((a, b) => (a & b) as Bit, 1 as Bit);
    case 'OR':
      return inputs.reduce((a, b) => (a | b) as Bit, 0 as Bit);
    case 'NOT':
      return inputs[0] === 1 ? 0 : 1;
    case 'XOR':
      return inputs.reduce((a, b) => (a ^ b) as Bit, 0 as Bit);
    case 'NAND':
      return evaluateGate('AND', inputs) === 1 ? 0 : 1;
    case 'NOR':
      return evaluateGate('OR', inputs) === 1 ? 0 : 1;
    case 'BUF':
    case 'INPUT':
      return inputs[0] ?? 0;
    default:
      return 0;
  }
};

// Truth Table Row
export interface TruthTableRow {
  inputs: Record<string, Bit>;
  outputs: Record<string, Bit>;
}

// Evaluate entire circuit for given input values up to a specific max propagation step
export const evaluateCircuitStepByStep = (
  circuit: CircuitDefinition,
  inputValues: Record<string, Bit>,
  stepLayer: number
): {
  nodeValues: Record<string, Bit>;
  activeGateIds: string[];
  evaluatedGateIds: string[];
} => {
  const nodeValues: Record<string, Bit> = { ...inputValues };
  const activeGateIds: string[] = [];
  const evaluatedGateIds: string[] = [];

  // Sort gates by propagation layer
  const gatesByLayer: Map<number, LogicGate[]> = new Map();
  circuit.gates.forEach((gate) => {
    const list = gatesByLayer.get(gate.layer) || [];
    list.push(gate);
    gatesByLayer.set(gate.layer, list);
  });

  for (let layer = 1; layer <= circuit.maxLayers; layer++) {
    const gates = gatesByLayer.get(layer) || [];
    if (layer < stepLayer) {
      gates.forEach((gate) => {
        const inVals = gate.inputs.map((inId) => nodeValues[inId] ?? 0);
        nodeValues[gate.output] = evaluateGate(gate.type, inVals);
        evaluatedGateIds.push(gate.id);
      });
    } else if (layer === stepLayer) {
      gates.forEach((gate) => {
        const inVals = gate.inputs.map((inId) => nodeValues[inId] ?? 0);
        nodeValues[gate.output] = evaluateGate(gate.type, inVals);
        activeGateIds.push(gate.id);
        evaluatedGateIds.push(gate.id);
      });
    }
  }

  return { nodeValues, activeGateIds, evaluatedGateIds };
};

// Generate full Truth Table for any circuit
export const generateTruthTable = (circuit: CircuitDefinition): TruthTableRow[] => {
  const inputKeys = circuit.inputs.map((i) => i.id);
  const totalRows = 1 << inputKeys.length;
  const rows: TruthTableRow[] = [];

  for (let i = 0; i < totalRows; i++) {
    const inputs: Record<string, Bit> = {};
    inputKeys.forEach((key, index) => {
      inputs[key] = ((i >> (inputKeys.length - 1 - index)) & 1) as Bit;
    });

    const { nodeValues } = evaluateCircuitStepByStep(circuit, inputs, circuit.maxLayers);
    const outputs: Record<string, Bit> = {};
    circuit.outputs.forEach((out) => {
      outputs[out.id] = nodeValues[out.id] ?? 0;
    });

    rows.push({ inputs, outputs });
  }

  return rows;
};
