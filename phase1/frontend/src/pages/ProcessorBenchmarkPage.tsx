import React, { useState, useEffect, useMemo } from 'react';
import { 
  Cpu, 
  Play, 
  Download, 
  RefreshCw,
  Image as ImageIcon,
  CircuitBoard,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { CouplingMapVisualizer } from '../components/CouplingMapVisualizer';
import { PageHeading, Card, MetricCard, NoticeBox, ErrorState } from '../components/pqc/Common';
import { 
  runProcessorBenchmark, 
  getLatestProcessorBenchmark, 
  getExportProcessorCsvUrl, 
  getProcessorChartUrl 
} from '../services/api';
import { ProcessorBenchmarkResult } from '../types';

// Quantum Circuit Engine & Component Imports
import { 
  QubitState, 
  QuantumCircuitDefinition, 
  evaluateQuantumStep, 
  extractAdderValues, 
  verifyQuantumAdderCircuit 
} from '../circuits/quantumEngine';
import { PROCESSOR_A_QUANTUM_CIRCUIT, PROCESSOR_B_QUANTUM_CIRCUIT } from '../circuits/quantumCircuits';
import { QuantumCircuitView } from '../components/circuits/QuantumCircuitView';
import { QuantumCircuitControls } from '../components/circuits/QuantumCircuitControls';
import { QuantumTruthTable } from '../components/circuits/QuantumTruthTable';
import { ProcessorComparisonCard } from '../components/circuits/ProcessorComparisonCard';

export const ProcessorBenchmarkPage: React.FC = () => {
  // Tab state: 'graph' | 'quantum-a' | 'quantum-b'
  const [activeTab, setActiveTab] = useState<'graph' | 'quantum-a' | 'quantum-b'>('graph');

  // Existing Qiskit benchmark state
  const [circuitId, setCircuitId] = useState<string>('qft_5');
  const [shots, setShots] = useState<number>(4096);
  const [optimizationLevel, setOptimizationLevel] = useState<number>(1);
  const [seed, setSeed] = useState<number>(42);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ProcessorBenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active Quantum Circuit definition (A or B)
  const currentQuantumCircuit: QuantumCircuitDefinition =
    activeTab === 'quantum-b' ? PROCESSOR_B_QUANTUM_CIRCUIT : PROCESSOR_A_QUANTUM_CIRCUIT;

  // Input bit states for Register A and Register B
  const [inputsA, setInputsA] = useState<QubitState[]>([1, 1]); // Default A=3 for 2-bit
  const [inputsB, setInputsB] = useState<QubitState[]>([0, 0]); // Default B=0 for 2-bit

  const [step, setStep] = useState<number>(currentQuantumCircuit.totalColumns);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Re-initialize input registers when switching between Processor A (2-bit) and B (4-bit)
  useEffect(() => {
    if (activeTab === 'quantum-b') {
      setInputsA([1, 1, 0, 0]); // A=3 for 4-bit
      setInputsB([1, 0, 0, 0]); // B=1 for 4-bit
      setStep(PROCESSOR_B_QUANTUM_CIRCUIT.totalColumns);
    } else if (activeTab === 'quantum-a') {
      setInputsA([1, 1]); // A=3 for 2-bit
      setInputsB([0, 0]); // B=0 for 2-bit
      setStep(PROCESSOR_A_QUANTUM_CIRCUIT.totalColumns);
    }
    setIsPlaying(false);
  }, [activeTab]);

  // Auto-propagation animation when "Play" is clicked
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setStep((prev) => {
          if (prev >= currentQuantumCircuit.totalColumns) {
            return 1;
          }
          return prev + 1;
        });
      }, 900);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentQuantumCircuit.totalColumns]);

  useEffect(() => {
    async function loadLatest() {
      try {
        const latest = await getLatestProcessorBenchmark();
        if (latest) setResult(latest);
      } catch {
        // Ignored
      }
    }
    loadLatest();
  }, []);

  const handleRunBenchmark = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await runProcessorBenchmark(circuitId, shots, optimizationLevel, seed);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Processor benchmark failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleABit = (idx: number) => {
    setInputsA((prev) => {
      const next = [...prev];
      next[idx] = (next[idx] === 1 ? 0 : 1) as QubitState;
      return next;
    });
  };

  const handleToggleBBit = (idx: number) => {
    setInputsB((prev) => {
      const next = [...prev];
      next[idx] = (next[idx] === 1 ? 0 : 1) as QubitState;
      return next;
    });
  };

  const handleStepForward = () => {
    setStep((prev) => (prev >= currentQuantumCircuit.totalColumns ? 1 : prev + 1));
  };

  const handleReset = () => {
    setStep(0);
    setIsPlaying(false);
  };

  // Build full initial state array mapped to circuit qubit registers (a0..a(n-1), b0..b(n-1), z)
  // FIX 1: z ALWAYS starts as |0> for both Processor A and Processor B
  const initialQubitStates = useMemo(() => {
    const states: QubitState[] = new Array(currentQuantumCircuit.qubitCount).fill(0);
    const n = currentQuantumCircuit.numBits;

    // Set A register (indices 0..n-1)
    for (let i = 0; i < n; i++) {
      states[i] = inputsA[i] ?? 0;
    }

    // Set B register (indices n..2n-1)
    for (let i = 0; i < n; i++) {
      states[n + i] = inputsB[i] ?? 0;
    }

    // Carry out z (index 2n) ALWAYS starts at 0
    states[2 * n] = 0;

    return states;
  }, [currentQuantumCircuit, inputsA, inputsB]);

  // Execute Quantum Simulation for current column step
  // FIX 2: State dynamically calculated from simulator step by step
  const simResult = evaluateQuantumStep(currentQuantumCircuit, initialQubitStates, step);

  // Extract decimal values and binary representation from current simulated states
  const { aVal, bVal, sumVal, binarySumStr } = extractAdderValues(
    currentQuantumCircuit,
    simResult.qubitStates
  );

  // Automated verification check across all input pairs
  const verification = useMemo(
    () => verifyQuantumAdderCircuit(currentQuantumCircuit),
    [currentQuantumCircuit]
  );

  // Recharts data for architecture comparison
  const comparisonChartData = result
    ? [
        {
          name: 'Transpiled Depth',
          'Processor A (5Q Linear)': result.processor_a.metrics.transpiled_depth,
          'Processor B (9Q Heavy-Hex)': result.processor_b.metrics.transpiled_depth,
        },
        {
          name: 'Transpiled CX Gates',
          'Processor A (5Q Linear)': result.processor_a.metrics.transpiled_cx_count,
          'Processor B (9Q Heavy-Hex)': result.processor_b.metrics.transpiled_cx_count,
        },
        {
          name: 'Est. SWAP Gates',
          'Processor A (5Q Linear)': result.processor_a.metrics.swap_gate_estimate,
          'Processor B (9Q Heavy-Hex)': result.processor_b.metrics.swap_gate_estimate,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeading
        title="Processor A vs B (Quantum Ripple-Carry Adder Simulator)"
        subtitle="Evaluates circuit transpilation in Qiskit Aer alongside verified Reversible Ripple-Carry Adder (CNOT + Toffoli) simulations for Processor A and B."
        badge="QISKIT FALL FEST 2026 PHASE 1"
      />

      {/* Mandatory Scientific Distinction Notice */}
      <NoticeBox type="info" title="Scientific Distinction (Separation of Concerns)">
        ECDH P-256 and ML-KEM-768 are classical cryptographic algorithms executed strictly on CPU hardware (Platform A vs Platform B). This module independently models physical quantum processor topologies and Reversible Ripple-Carry Adder (CNOT + Toffoli) circuits in Qiskit Aer.
      </NoticeBox>

      {/* VIEW SELECTION TAB BAR */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700/80 pb-3">
        <button
          onClick={() => setActiveTab('graph')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'graph'
              ? 'bg-[#963B43] text-white shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Activity size={15} />
          <span>Architecture Graph & Benchmark</span>
        </button>

        <button
          onClick={() => setActiveTab('quantum-a')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'quantum-a'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <CircuitBoard size={15} />
          <span>Processor A Quantum Adder (5Q Reversible Ripple-Carry)</span>
        </button>

        <button
          onClick={() => setActiveTab('quantum-b')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'quantum-b'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <CircuitBoard size={15} />
          <span>Processor B Quantum Adder (9Q Reversible Ripple-Carry)</span>
        </button>
      </div>

      {/* TAB CONTENT: QUANTUM CIRCUIT VISUALIZER (A / B) */}
      {activeTab !== 'graph' && (
        <div className="space-y-6">
          {/* View Header with Gate Statistics */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Cpu className={activeTab === 'quantum-a' ? 'text-cyan-400' : 'text-purple-400'} size={18} />
                <span>{currentQuantumCircuit.name}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact Reversible Ripple-Carry Adder (CNOT + Toffoli) constructed from CNOT (CX) and Toffoli (CCX) quantum gates.
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 font-bold">
                Qubits: <strong className="text-cyan-400">{currentQuantumCircuit.qubitCount}</strong>
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 font-bold">
                Gates: <strong className="text-amber-400">{currentQuantumCircuit.gates.length - currentQuantumCircuit.qubitCount}</strong> ({currentQuantumCircuit.gateCounts.cx} CX, {currentQuantumCircuit.gateCounts.ccx} CCX)
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 font-bold">
                Depth: <strong className="text-emerald-400">{currentQuantumCircuit.totalColumns} Steps</strong>
              </span>
            </div>
          </div>

          {/* Side-by-Side Comparison Summary Card */}
          <ProcessorComparisonCard />

          <Card title="Quantum Circuit Execution & Controls">
            {/* Controls Bar */}
            <QuantumCircuitControls
              circuit={currentQuantumCircuit}
              inputsA={inputsA}
              inputsB={inputsB}
              onToggleABit={handleToggleABit}
              onToggleBBit={handleToggleBBit}
              decimalA={aVal}
              decimalB={bVal}
              decimalResult={sumVal}
              binarySumStr={binarySumStr}
              currentStep={step}
              maxSteps={currentQuantumCircuit.totalColumns}
              isPlaying={isPlaying}
              onPlayPauseToggle={() => setIsPlaying(!isPlaying)}
              onStepForward={handleStepForward}
              onReset={handleReset}
              verification={verification}
            />

            {/* Standard Quantum Circuit Diagram View */}
            <QuantumCircuitView
              circuit={currentQuantumCircuit}
              qubitStates={simResult.qubitStates}
              initialStates={initialQubitStates}
              activeColumn={step}
            />
          </Card>

          {/* Quantum Simulation Truth Table */}
          <QuantumTruthTable
            circuit={currentQuantumCircuit}
            currentA={aVal}
            currentB={bVal}
          />
        </div>
      )}

      {/* TAB CONTENT: EXISTING QISKIT BENCHMARK & COUPLING MAPS */}
      {activeTab === 'graph' && (
        <>
          {/* Interactive Coupling Topologies Display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Processor A: 5-Qubit Linear Chain"
              subtitle="Baseline reference coupling graph: 5 qubits, 4 edges, diameter 4"
            >
              <CouplingMapVisualizer
                title="Processor A: 5-Qubit Linear Chain"
                architectureId="page-proc-a"
                numQubits={5}
                edges={[[0, 1], [1, 2], [2, 3], [3, 4]]}
                colorTheme="cyan"
              />
            </Card>
            <Card
              title="Processor B: 9-Qubit Sparse Heavy-Hex"
              subtitle="Reference 12-edge graph matching Fall Fest specification"
            >
              <CouplingMapVisualizer
                title="Processor B: 9-Qubit Sparse Heavy-Hex Inspired"
                architectureId="page-proc-b"
                numQubits={9}
                edges={[
                  [0, 1], [1, 2], [1, 6], [2, 3], [2, 6],
                  [2, 5], [3, 4], [4, 5], [5, 6], [6, 7], [6, 8], [8, 0]
                ]}
                colorTheme="purple"
              />
            </Card>
          </div>

          {/* Controls Card */}
          <Card
            title="Circuit Selection & Transpilation Settings"
            subtitle="Basis gates: ['rz', 'sx', 'x', 'cx'] · Identical synthetic noise on both topologies"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Circuit */}
              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Test Quantum Circuit
                </label>
                <select
                  value={circuitId}
                  onChange={(e) => setCircuitId(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-2.5 py-1.5 rounded border bg-white text-stone-800 focus:outline-none focus:border-[#963B43]"
                  style={{ borderColor: '#DCD3C7' }}
                >
                  <option value="qft_5">QFT-5 (All-to-all Entanglement)</option>
                  <option value="ghz_5">GHZ-5 (Linear Nearest-Neighbor)</option>
                  <option value="cross_conn_5">Cross-Connectivity Stress (5Q)</option>
                </select>
              </div>

              {/* Shots */}
              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Simulation Shots
                </label>
                <input
                  type="number"
                  min={100}
                  max={10000}
                  value={shots}
                  onChange={(e) => setShots(parseInt(e.target.value) || 4096)}
                  disabled={isLoading}
                  className="w-full px-2.5 py-1.5 rounded border bg-white text-stone-800 focus:outline-none focus:border-[#963B43] font-mono"
                  style={{ borderColor: '#DCD3C7' }}
                />
              </div>

              {/* Transpiler Level & Seed */}
              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Opt Level (0-3) & Seed
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min={0}
                    max={3}
                    value={optimizationLevel}
                    onChange={(e) => setOptimizationLevel(parseInt(e.target.value) || 1)}
                    disabled={isLoading}
                    className="w-1/2 px-2.5 py-1.5 rounded border bg-white text-stone-800 focus:outline-none focus:border-[#963B43] font-mono text-center"
                    style={{ borderColor: '#DCD3C7' }}
                    title="Optimization Level"
                  />
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value) || 42)}
                    disabled={isLoading}
                    className="w-1/2 px-2.5 py-1.5 rounded border bg-white text-stone-800 focus:outline-none focus:border-[#963B43] font-mono text-center"
                    style={{ borderColor: '#DCD3C7' }}
                    title="Transpiler Seed"
                  />
                </div>
              </div>

              {/* Run Button */}
              <div className="flex items-end">
                <button
                  onClick={handleRunBenchmark}
                  disabled={isLoading}
                  className="w-full px-4 py-2 rounded text-white font-medium text-xs transition flex items-center justify-center space-x-2 shadow-sm cursor-pointer disabled:opacity-50"
                  style={{ background: '#963B43' }}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Transpiling & Simulating...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Benchmark A vs B</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </Card>

          {/* Error state */}
          {error && <ErrorState message={error} onRetry={handleRunBenchmark} />}

          {/* Results View */}
          {result ? (
            <div className="space-y-6">
              {/* Key Metric Comparison Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard
                  label="Transpiled Depth"
                  value={`A: ${result.processor_a.metrics.transpiled_depth} | B: ${result.processor_b.metrics.transpiled_depth}`}
                  description={`Logical: ${result.circuit.logical_depth} · Δ: ${result.comparison_summary.depth_reduction_b_vs_a_percent}%`}
                  highlight
                />
                <MetricCard
                  label="Transpiled CX Count"
                  value={`A: ${result.processor_a.metrics.transpiled_cx_count} | B: ${result.processor_b.metrics.transpiled_cx_count}`}
                  description={`Logical: ${result.circuit.logical_cx_count} · Δ: ${result.comparison_summary.cx_reduction_b_vs_a_percent}%`}
                />
                <MetricCard
                  label="Estimated SWAP Gates"
                  value={`A: ${result.processor_a.metrics.swap_gate_estimate} | B: ${result.processor_b.metrics.swap_gate_estimate}`}
                  description={`B saves ~${result.comparison_summary.swap_overhead_diff} SWAP gates`}
                />
                <MetricCard
                  label="Hellinger Fidelity"
                  value={`A: ${result.processor_a.hellinger_fidelity} | B: ${result.processor_b.hellinger_fidelity}`}
                  description={`Δ = ${result.comparison_summary.fidelity_difference} (Ideal vs Noisy Aer)`}
                />
              </div>

              {/* Compilation Overhead Bar Chart */}
              <Card
                title="Transpilation & Routing Overhead Comparison"
                subtitle={`Circuit: ${result.circuit.name} (${result.transpiler_settings.shots} shots, opt_level=${result.transpiler_settings.optimization_level})`}
                headerAction={
                  <div className="flex items-center gap-2">
                    <a
                      href={getExportProcessorCsvUrl()}
                      download="processor_ab_results.csv"
                      className="px-2.5 py-1 rounded border text-xs text-stone-700 bg-white hover:bg-stone-50 flex items-center gap-1 cursor-pointer"
                      style={{ borderColor: '#DCD3C7' }}
                    >
                      <Download size={12} />
                      <span>Download CSV</span>
                    </a>
                    <a
                      href={getProcessorChartUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded border text-xs text-stone-700 bg-white hover:bg-stone-50 flex items-center gap-1 cursor-pointer"
                      style={{ borderColor: '#DCD3C7' }}
                    >
                      <ImageIcon size={12} />
                      <span>Download Figure PNG</span>
                    </a>
                  </div>
                }
              >
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D7" />
                      <XAxis dataKey="name" stroke="#68615A" fontSize={11} />
                      <YAxis stroke="#68615A" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E8E0D7',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="Processor A (5Q Linear)" fill="#2A6B3D" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Processor B (9Q Heavy-Hex)" fill="#963B43" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          ) : (
            <Card title="Quantum Simulation Status">
              <div className="p-8 text-center text-stone-400 text-xs">
                <Cpu className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-stone-600">Simulation Not Executed Yet</h4>
                <p className="text-stone-400 max-w-sm mx-auto mt-1">
                  Select parameters above and click "Benchmark A vs B" to compile circuits, evaluate routing, and simulate synthetic noise in Qiskit Aer.
                </p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
