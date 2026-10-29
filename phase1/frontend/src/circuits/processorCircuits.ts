/**
 * Processor Logic-Gate Circuit Definitions
 * Implements Processor A (Linear Topology / Ripple Adder) and Processor B (Heavy-Hex Parallel Topology)
 */

import { CircuitDefinition } from './gateEngine';

/**
 * PROCESSOR A: Linear Nearest-Neighbor Routing Logic Circuit
 * Structural representation: 2-bit Ripple Carry Full Adder with Enable Control line.
 * Implements linear topology signal routing and arithmetic validation.
 */
export const PROCESSOR_A_CIRCUIT: CircuitDefinition = {
  id: 'processor-a',
  name: 'Processor A Circuit (Linear Routing & Ripple Adder)',
  description: 'Models Processor A linear chain connectivity with Ripple Carry Addition and nearest-neighbor enable control.',
  inputs: [
    { id: 'A0', label: 'Input A0', defaultValue: 1 },
    { id: 'B0', label: 'Input B0', defaultValue: 1 },
    { id: 'A1', label: 'Input A1', defaultValue: 0 },
    { id: 'B1', label: 'Input B1', defaultValue: 1 },
    { id: 'EN', label: 'Enable', defaultValue: 1 },
  ],
  outputs: [
    { id: 'S0', label: 'Sum 0 (S0)' },
    { id: 'S1', label: 'Sum 1 (S1)' },
    { id: 'C_OUT', label: 'Carry Out (C_OUT)' },
  ],
  maxLayers: 4,
  gates: [
    // Layer 1: Bit 0 Half-Adder XOR & AND
    { id: 'g_xor0', type: 'XOR', label: 'A0 ⊕ B0', inputs: ['A0', 'B0'], output: 'n_xor0', layer: 1, x: 180, y: 70 },
    { id: 'g_and0', type: 'AND', label: 'A0 · B0', inputs: ['A0', 'B0'], output: 'C0', layer: 1, x: 180, y: 150 },

    // Layer 1: Bit 1 Half-Adder XOR & AND
    { id: 'g_xor1_raw', type: 'XOR', label: 'A1 ⊕ B1', inputs: ['A1', 'B1'], output: 'n_xor1_raw', layer: 1, x: 180, y: 250 },
    { id: 'g_and1_raw', type: 'AND', label: 'A1 · B1', inputs: ['A1', 'B1'], output: 'n_and1_raw', layer: 1, x: 180, y: 330 },

    // Layer 2: Bit 0 Enable Gate & Bit 1 Carry XOR
    { id: 'g_s0_gate', type: 'AND', label: 'S0 = XOR0 · EN', inputs: ['n_xor0', 'EN'], output: 'S0', layer: 2, x: 380, y: 70 },
    { id: 'g_sum1_xor', type: 'XOR', label: 'S1_raw = XOR1 ⊕ C0', inputs: ['n_xor1_raw', 'C0'], output: 'n_sum1_raw', layer: 2, x: 380, y: 230 },
    { id: 'g_carry1_and', type: 'AND', label: 'C0 · (A1 ⊕ B1)', inputs: ['C0', 'n_xor1_raw'], output: 'n_c_prop1', layer: 2, x: 380, y: 310 },

    // Layer 3: Bit 1 Carry OR & Enable Gating
    { id: 'g_s1_gate', type: 'AND', label: 'S1 = S1_raw · EN', inputs: ['n_sum1_raw', 'EN'], output: 'S1', layer: 3, x: 580, y: 200 },
    { id: 'g_cout_or', type: 'OR', label: 'C_OUT_raw = AND1 + C_prop', inputs: ['n_and1_raw', 'n_c_prop1'], output: 'n_cout_raw', layer: 3, x: 580, y: 300 },

    // Layer 4: Carry Out Enable Gating
    { id: 'g_cout_gate', type: 'AND', label: 'C_OUT = C_OUT_raw · EN', inputs: ['n_cout_raw', 'EN'], output: 'C_OUT', layer: 4, x: 780, y: 300 },
  ],
};

/**
 * PROCESSOR B: Heavy-Hex Parallel Routing Logic Circuit
 * Structural representation: 2-bit Parallel MUX-based Priority Comparator & Lookahead Carry.
 * Implements parallel multi-path heavy-hex routing logic.
 */
export const PROCESSOR_B_CIRCUIT: CircuitDefinition = {
  id: 'processor-b',
  name: 'Processor B Circuit (Heavy-Hex Parallel MUX & Lookahead)',
  description: 'Models Processor B heavy-hex parallel routing with MUX selection, fast lookahead carry, and priority compare.',
  inputs: [
    { id: 'X0', label: 'Input X0', defaultValue: 1 },
    { id: 'Y0', label: 'Input Y0', defaultValue: 0 },
    { id: 'X1', label: 'Input X1', defaultValue: 1 },
    { id: 'Y1', label: 'Input Y1', defaultValue: 1 },
    { id: 'SEL', label: 'Hex Route Select', defaultValue: 0 },
  ],
  outputs: [
    { id: 'OUT0', label: 'Parallel Route 0' },
    { id: 'OUT1', label: 'Parallel Route 1' },
    { id: 'MATCH', label: 'Priority Match' },
  ],
  maxLayers: 4,
  gates: [
    // Layer 1: Inverters and Bit-wise Comparators
    { id: 'g_not_sel', type: 'NOT', label: '¬SEL', inputs: ['SEL'], output: 'n_nsel', layer: 1, x: 180, y: 60 },
    { id: 'g_xnor0', type: 'XOR', label: 'X0 ⊕ Y0', inputs: ['X0', 'Y0'], output: 'n_xor_bit0', layer: 1, x: 180, y: 150 },
    { id: 'g_xnor1', type: 'XOR', label: 'X1 ⊕ Y1', inputs: ['X1', 'Y1'], output: 'n_xor_bit1', layer: 1, x: 180, y: 270 },

    // Layer 2: MUX Branch Gates & NOR Match logic
    { id: 'g_mux0_a', type: 'AND', label: 'X0 · ¬SEL', inputs: ['X0', 'n_nsel'], output: 'n_m0a', layer: 2, x: 380, y: 70 },
    { id: 'g_mux0_b', type: 'AND', label: 'Y0 · SEL', inputs: ['Y0', 'SEL'], output: 'n_m0b', layer: 2, x: 380, y: 150 },
    { id: 'g_mux1_a', type: 'AND', label: 'X1 · ¬SEL', inputs: ['X1', 'n_nsel'], output: 'n_m1a', layer: 2, x: 380, y: 250 },
    { id: 'g_mux1_b', type: 'AND', label: 'Y1 · SEL', inputs: ['Y1', 'SEL'], output: 'n_m1b', layer: 2, x: 380, y: 330 },
    { id: 'g_nor_diff', type: 'NOR', label: 'NOR(XOR0, XOR1)', inputs: ['n_xor_bit0', 'n_xor_bit1'], output: 'n_match_raw', layer: 2, x: 380, y: 420 },

    // Layer 3: MUX OR Combines
    { id: 'g_mux0_or', type: 'OR', label: 'OUT0 = M0A + M0B', inputs: ['n_m0a', 'n_m0b'], output: 'OUT0', layer: 3, x: 580, y: 110 },
    { id: 'g_mux1_or', type: 'OR', label: 'OUT1 = M1A + M1B', inputs: ['n_m1a', 'n_m1b'], output: 'OUT1', layer: 3, x: 580, y: 290 },
    { id: 'g_buf_match', type: 'BUF', label: 'Match Signal', inputs: ['n_match_raw'], output: 'MATCH', layer: 3, x: 580, y: 420 },
  ],
};
