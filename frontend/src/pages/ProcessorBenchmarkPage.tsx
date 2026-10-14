import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Play, 
  Download, 
  Layers, 
  RefreshCw,
  Image as ImageIcon
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

export const ProcessorBenchmarkPage: React.FC = () => {
  const [circuitId, setCircuitId] = useState<string>('qft_5');
  const [shots, setShots] = useState<number>(4096);
  const [optimizationLevel, setOptimizationLevel] = useState<number>(1);
  const [seed, setSeed] = useState<number>(42);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ProcessorBenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLatest() {
      try {
        const latest = await getLatestProcessorBenchmark();
        if (latest) setResult(latest);
      } catch {
        // Ignored if none exists yet
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
        title="Processor A vs Processor B Architecture Benchmark"
        subtitle="Evaluates circuit transpilation overhead, routing constraints, and noisy simulation fidelity in Qiskit Aer between 5-qubit linear and 9-qubit sparse heavy-hex topologies."
        badge="QISKIT FALL FEST 2026 PHASE 1"
      />

      {/* Mandatory Scientific Distinction Notice */}
      <NoticeBox type="info" title="Scientific Distinction (Separation of Concerns)">
        ECDH P-256 and ML-KEM-768 are classical cryptographic algorithms executed strictly on CPU hardware (Platform A vs Platform B). This module independently models physical quantum processor topologies and circuit routing in Qiskit Aer to satisfy the universal Fall Fest Phase 1 architectural requirement. Noisy circuit fidelity is not a measure of cryptographic hardness.
      </NoticeBox>

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

        <div className="mt-3 text-[11px] text-stone-500 border-t pt-2 border-stone-200">
          Synthetic Noise Baseline: 1Q depolarizing <code className="font-mono text-stone-700">p=0.001</code> · 2Q CX depolarizing <code className="font-mono text-stone-700">p=0.005</code> · Readout error <code className="font-mono text-stone-700">p=0.01</code>
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

          {/* Detailed Side-by-Side Metrics Table */}
          <Card
            title="Architectural Transpilation Metrics Breakdown"
            subtitle="Comparing Physical Topologies: 5Q Linear Chain vs 9Q Sparse Heavy-Hex"
          >
            <div className="overflow-x-auto border rounded border-stone-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Metric</th>
                    <th className="py-2.5 px-3 text-emerald-800">Processor A (5Q Linear)</th>
                    <th className="py-2.5 px-3 text-[#963B43]">Processor B (9Q Heavy-Hex)</th>
                    <th className="py-2.5 px-3 text-stone-600">Topology Advantage / Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono text-[11px] text-stone-800">
                  <tr className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3 font-sans font-medium">Physical Qubit Count</td>
                    <td className="py-2.5 px-3">5 qubits</td>
                    <td className="py-2.5 px-3">9 qubits</td>
                    <td className="py-2.5 px-3 font-sans text-stone-500">+4 physical ancilla/routing nodes</td>
                  </tr>
                  <tr className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3 font-sans font-medium">Coupling Graph Diameter</td>
                    <td className="py-2.5 px-3">4 hops</td>
                    <td className="py-2.5 px-3">3 hops</td>
                    <td className="py-2.5 px-3 font-sans text-emerald-700 font-semibold">Shorter worst-case communication path</td>
                  </tr>
                  <tr className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3 font-sans font-medium">Transpiled Circuit Depth</td>
                    <td className="py-2.5 px-3">{result.processor_a.metrics.transpiled_depth}</td>
                    <td className="py-2.5 px-3">{result.processor_b.metrics.transpiled_depth}</td>
                    <td className="py-2.5 px-3 font-sans text-emerald-700 font-semibold">
                      {result.comparison_summary.depth_reduction_b_vs_a_percent}% depth change
                    </td>
                  </tr>
                  <tr className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3 font-sans font-medium">Transpiled CX Gate Count</td>
                    <td className="py-2.5 px-3">{result.processor_a.metrics.transpiled_cx_count}</td>
                    <td className="py-2.5 px-3">{result.processor_b.metrics.transpiled_cx_count}</td>
                    <td className="py-2.5 px-3 font-sans text-emerald-700 font-semibold">
                      {result.comparison_summary.cx_reduction_b_vs_a_percent}% CX reduction
                    </td>
                  </tr>
                  <tr className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3 font-sans font-medium">Estimated SWAP Count</td>
                    <td className="py-2.5 px-3">{result.processor_a.metrics.swap_gate_estimate}</td>
                    <td className="py-2.5 px-3">{result.processor_b.metrics.swap_gate_estimate}</td>
                    <td className="py-2.5 px-3 font-sans text-emerald-700 font-semibold">
                      Saved ~{result.comparison_summary.swap_overhead_diff} SWAP gates
                    </td>
                  </tr>
                  <tr className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3 font-sans font-medium">Hellinger Fidelity (Noisy)</td>
                    <td className="py-2.5 px-3">{result.processor_a.hellinger_fidelity}</td>
                    <td className="py-2.5 px-3">{result.processor_b.hellinger_fidelity}</td>
                    <td className="py-2.5 px-3 font-sans text-stone-600">
                      Δ = {result.comparison_summary.fidelity_difference}
                    </td>
                  </tr>
                  <tr className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3 font-sans font-medium">Total Variation Distance (TVD)</td>
                    <td className="py-2.5 px-3">{result.processor_a.tvd}</td>
                    <td className="py-2.5 px-3">{result.processor_b.tvd}</td>
                    <td className="py-2.5 px-3 font-sans text-stone-500">Lower is closer to ideal distribution</td>
                  </tr>
                </tbody>
              </table>
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
    </div>
  );
};
