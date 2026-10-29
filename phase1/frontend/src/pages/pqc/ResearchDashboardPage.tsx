import React, { useState } from 'react';
import {
  Activity, Play, Download, RefreshCw, Cpu, Layers,
  ShieldCheck, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { PageHeading, Card, StatusBadge, NoticeBox, ErrorState } from '../../components/pqc/Common';
import { ExchangePipeline } from '../../components/pqc/ExchangePipeline';
import { TelemetryPanel } from '../../components/pqc/TelemetryPanel';
import { HybridExchangeResult, CryptoBenchmarkResult, EnvironmentInfo } from '../../types';

interface ResearchDashboardProps {
  exchangeResult: HybridExchangeResult | null;
  benchmarkResult: CryptoBenchmarkResult | null;
  environmentInfo: EnvironmentInfo | null;
  isBackendHealthy: boolean | null;
  isExchangeRunning: boolean;
  isBenchmarkRunning: boolean;
  onRunExchange: (msg?: string) => Promise<void>;
  onRunBenchmark: (iterations: number, platform: string) => Promise<void>;
  onNavigate: (page: any) => void;
  exportCsvUrl: string;
}

export function ResearchDashboardPage({
  exchangeResult,
  benchmarkResult,
  environmentInfo,
  isBackendHealthy,
  isExchangeRunning,
  isBenchmarkRunning,
  onRunExchange,
  onRunBenchmark,
  onNavigate,
  exportCsvUrl,
}: ResearchDashboardProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('platform_a');
  const [selectedIterations, setSelectedIterations] = useState<number>(100);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleBenchmarkClick = async () => {
    setErrorMsg(null);
    try {
      await onRunBenchmark(selectedIterations, selectedPlatform);
    } catch (err: any) {
      setErrorMsg(err.message || 'Benchmark execution failed.');
    }
  };

  const handleExchangeClick = async () => {
    setErrorMsg(null);
    try {
      await onRunExchange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Hybrid key exchange failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Page Heading */}
      <PageHeading
        title="Q-SHIELD Quantum-Safe Key Exchange"
        subtitle="Classical and post-quantum key establishment — measured and compared across two simulated CPU environments."
        badge="NIST FIPS 203 + SECP256R1"
      />

      {/* Compact Control Toolbar */}
      <div
        className="p-3 rounded-lg border bg-white flex flex-wrap items-center justify-between gap-3 shadow-xs"
        style={{ borderColor: '#E8E0D7' }}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Run Hybrid Exchange Button */}
          <button
            onClick={handleExchangeClick}
            disabled={isExchangeRunning || isBackendHealthy === false}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium text-white transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
            style={{ background: '#963B43' }}
          >
            <Activity size={13} className={isExchangeRunning ? 'animate-spin' : ''} />
            <span>{isExchangeRunning ? 'Exchanging...' : 'Run Hybrid Exchange'}</span>
          </button>

          {/* Run Benchmark Button */}
          <button
            onClick={handleBenchmarkClick}
            disabled={isBenchmarkRunning || isBackendHealthy === false}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            style={{ borderColor: '#DCD3C7', color: '#332F2D', background: '#FAF8F5' }}
          >
            <Play size={12} className={isBenchmarkRunning ? 'animate-spin' : ''} />
            <span>{isBenchmarkRunning ? 'Benchmarking...' : 'Run Benchmark'}</span>
          </button>

          <div className="h-4 w-px bg-stone-300 mx-1 hidden sm:block" />

          {/* Platform Selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] font-medium text-stone-500">Platform:</span>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              disabled={isBenchmarkRunning}
              className="px-2 py-1 rounded border text-xs bg-white text-stone-800 focus:outline-none focus:border-[#963B43]"
              style={{ borderColor: '#DCD3C7' }}
            >
              <option value="platform_a">Platform A (Standard)</option>
              <option value="platform_b">Platform B (Constrained)</option>
              <option value="both">Compare Both</option>
            </select>
          </div>

          {/* Iterations Selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] font-medium text-stone-500">Trials:</span>
            <select
              value={selectedIterations}
              onChange={(e) => setSelectedIterations(Number(e.target.value))}
              disabled={isBenchmarkRunning}
              className="px-2 py-1 rounded border text-xs bg-white text-stone-800 focus:outline-none focus:border-[#963B43]"
              style={{ borderColor: '#DCD3C7' }}
            >
              <option value={10}>10 trials</option>
              <option value={100}>100 trials</option>
              <option value={500}>500 trials</option>
              <option value={1000}>1,000 trials</option>
            </select>
          </div>
        </div>

        {/* Right side: Export & Connection */}
        <div className="flex items-center gap-2">
          <a
            href={exportCsvUrl}
            download
            className="flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 cursor-pointer"
            style={{ borderColor: '#DCD3C7' }}
          >
            <Download size={12} />
            <span>Export CSV</span>
          </a>

          <div
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium"
            style={{
              background: isBackendHealthy ? '#EBF5EE' : '#FBEBEB',
              color: isBackendHealthy ? '#2A6B3D' : '#A62626',
            }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isBackendHealthy ? 'bg-emerald-600' : 'bg-red-500'}`} />
            <span>{isBackendHealthy ? 'API Online' : 'API Offline'}</span>
          </div>
        </div>
      </div>

      {errorMsg && <ErrorState message={errorMsg} onRetry={handleBenchmarkClick} />}

      {/* Main Two-Column Layout (Matching Screenshot Proportions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Hybrid Exchange Console */}
        <div className="lg:col-span-7 space-y-4">
          <Card
            title="Hybrid Exchange Console"
            subtitle="Alice & Bob ephemeral key establishment via NIST P-256 + ML-KEM-768"
            headerAction={
              <button
                onClick={() => onNavigate('exchange-lab')}
                className="text-[11px] text-[#963B43] font-medium flex items-center gap-0.5 hover:underline cursor-pointer"
              >
                Open Full Lab <ArrowUpRight size={12} />
              </button>
            }
          >
            <ExchangePipeline
              result={exchangeResult}
              isRunning={isExchangeRunning}
              onRunExchange={onRunExchange}
            />
          </Card>
        </div>

        {/* Right Column (5 cols): Research Telemetry & Processor Status */}
        <div className="lg:col-span-5 space-y-4">
          <TelemetryPanel
            exchangeResult={exchangeResult}
            benchmarkResult={benchmarkResult}
            environmentInfo={environmentInfo}
          />
        </div>
      </div>
    </div>
  );
}
