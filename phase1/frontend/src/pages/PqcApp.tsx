import React, { useState, useEffect } from 'react';
import { PqcSidebar, PqcPage } from '../components/pqc/PqcSidebar';
import { PqcHeader } from '../components/pqc/PqcHeader';
import { ChannelStatusBar } from '../components/pqc/ChannelStatusBar';

// Phase 2 Modules
import { SecuritySuitePage } from './channel/SecuritySuitePage';
import { PerformanceEvaluationPage } from './channel/PerformanceEvaluationPage';
import { LiveHandshakePage } from './channel/LiveHandshakePage';
import { TechnicalAnalysisPage } from './channel/TechnicalAnalysisPage';
import { ReproducibilityPage } from './channel/ReproducibilityPage';
import { PlatformsPage } from './channel/PlatformsPage';

// Phase 1 Legacy Views
import { ResearchDashboardPage } from './pqc/ResearchDashboardPage';
import { HybridExchangeLabPage } from './pqc/HybridExchangeLabPage';
import { BenchmarkLabPage } from './pqc/BenchmarkLabPage';
import { ProcessorComparisonPage } from './pqc/ProcessorComparisonPage';
import { ProcessorBenchmarkPage } from './ProcessorBenchmarkPage';
import { ResultsStatisticsPage } from './pqc/ResultsStatisticsPage';
import { ExperimentHistoryPage } from './pqc/ExperimentHistoryPage';
import { ExportCenterPage } from './pqc/ExportCenterPage';
import { EcdhReferencePage } from './pqc/EcdhReferencePage';
import { MlkemReferencePage } from './pqc/MlkemReferencePage';
import { HybridKdfReferencePage } from './pqc/HybridKdfReferencePage';
import { ArchitectureMethodologyPage } from './pqc/ArchitectureMethodologyPage';
import { AboutPqcPage } from './pqc/AboutPqcPage';

import {
  fetchHealth,
  runHybridExchange,
  runCryptoBenchmark,
  getLatestCryptoBenchmark,
  getExportCryptoCsvUrl,
} from '../services/api';
import { fetchChannelStatus } from '../services/channelApi';
import {
  HybridExchangeResult,
  CryptoBenchmarkResult,
  EnvironmentInfo,
} from '../types';

interface PqcAppProps {
  onSwitchToScanner?: () => void;
}

export function PqcApp({ onSwitchToScanner }: PqcAppProps) {
  // Default to Phase 2 Security Suite (highest priority / graded objective)
  const [activePage, setActivePage] = useState<PqcPage>('channel-security');
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);
  const [channelStatus, setChannelStatus] = useState<Record<string, any> | null>(null);
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo | null>(null);
  const [exchangeResult, setExchangeResult] = useState<HybridExchangeResult | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<CryptoBenchmarkResult | null>(null);
  const [isExchangeRunning, setIsExchangeRunning] = useState(false);
  const [isBenchmarkRunning, setIsBenchmarkRunning] = useState(false);

  const loadStatus = async () => {
    try {
      const health = await fetchHealth();
      setIsBackendHealthy(health.status === 'healthy');
      setEnvironmentInfo(health.environment);
    } catch {
      setIsBackendHealthy(false);
    }

    try {
      const chStatus = await fetchChannelStatus();
      setChannelStatus(chStatus);
    } catch {
      // Channel status optional fallback
    }
  };

  // Poll health and channel metadata on startup
  useEffect(() => {
    async function init() {
      await loadStatus();

      try {
        const latest = await getLatestCryptoBenchmark();
        if (latest) {
          setBenchmarkResult(latest);
        }
      } catch {
        // No prior benchmark exists yet
      }
    }
    init();

    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handlers for Phase 1 legacy exchange and benchmark
  const handleRunExchange = async (message?: string) => {
    setIsExchangeRunning(true);
    try {
      const res = await runHybridExchange(message);
      setExchangeResult(res);
    } finally {
      setIsExchangeRunning(false);
    }
  };

  const handleRunBenchmark = async (
    iterations: number,
    platform: string,
    warmup: number = 5,
    mode: string = 'hybrid'
  ) => {
    setIsBenchmarkRunning(true);
    try {
      const res = await runCryptoBenchmark(iterations, platform, warmup, true, mode);
      setBenchmarkResult(res);
    } finally {
      setIsBenchmarkRunning(false);
    }
  };

  return (
    <div
      className="min-h-screen flex text-[#332F2D] font-sans selection:bg-[#963B43]/20 selection:text-[#963B43]"
      style={{ background: '#F8F6F1' }}
    >
      {/* Persistent Left Sidebar */}
      <PqcSidebar
        activePage={activePage}
        onNavigate={setActivePage}
        hasExchangeResult={exchangeResult !== null}
        onSwitchToScanner={onSwitchToScanner}
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-[268px] flex flex-col min-h-screen">
        {/* Sticky Top Header */}
        <PqcHeader
          isBackendHealthy={isBackendHealthy}
          onRunQuickExchange={() => handleRunExchange()}
          isRunning={isExchangeRunning}
          onSwitchToScanner={onSwitchToScanner}
        />

        {/* Global Phase 2 Status Bar */}
        <ChannelStatusBar
          isBackendHealthy={isBackendHealthy}
          channelStatus={channelStatus}
          onRefresh={loadStatus}
        />

        {/* Content Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {/* Phase 2 Modules */}
          {activePage === 'channel-security' && <SecuritySuitePage />}
          {activePage === 'channel-performance' && <PerformanceEvaluationPage />}
          {activePage === 'channel-handshake' && <LiveHandshakePage />}
          {activePage === 'channel-analysis' && <TechnicalAnalysisPage />}
          {activePage === 'channel-reproducibility' && <ReproducibilityPage />}
          {activePage === 'channel-platforms' && <PlatformsPage />}

          {/* Phase 1 Legacy Views */}
          {activePage === 'dashboard' && (
            <ResearchDashboardPage
              exchangeResult={exchangeResult}
              benchmarkResult={benchmarkResult}
              environmentInfo={environmentInfo}
              isBackendHealthy={isBackendHealthy}
              isExchangeRunning={isExchangeRunning}
              isBenchmarkRunning={isBenchmarkRunning}
              onRunExchange={handleRunExchange}
              onRunBenchmark={(iters, plat) => handleRunBenchmark(iters, plat, 5, 'hybrid')}
              onNavigate={setActivePage}
              exportCsvUrl={getExportCryptoCsvUrl('summary')}
            />
          )}

          {activePage === 'exchange-lab' && (
            <HybridExchangeLabPage
              result={exchangeResult}
              isRunning={isExchangeRunning}
              onRunExchange={handleRunExchange}
            />
          )}

          {activePage === 'benchmark-lab' && (
            <BenchmarkLabPage
              benchmarkResult={benchmarkResult}
              environmentInfo={environmentInfo}
              isRunning={isBenchmarkRunning}
              onRunBenchmark={handleRunBenchmark}
              exportCsvUrl={getExportCryptoCsvUrl('summary')}
            />
          )}

          {activePage === 'processor-comparison' && (
            <ProcessorComparisonPage
              environmentInfo={environmentInfo}
              latestCryptoBenchmark={benchmarkResult}
            />
          )}

          {activePage === 'processor-benchmark' && (
            <ProcessorBenchmarkPage />
          )}

          {activePage === 'results-statistics' && (
            <ResultsStatisticsPage benchmarkResult={benchmarkResult} />
          )}

          {activePage === 'experiment-history' && (
            <ExperimentHistoryPage benchmarkResult={benchmarkResult} />
          )}

          {activePage === 'export-center' && <ExportCenterPage />}

          {activePage === 'ecdh-ref' && <EcdhReferencePage />}

          {activePage === 'mlkem-ref' && <MlkemReferencePage />}

          {activePage === 'hybrid-kdf-ref' && <HybridKdfReferencePage />}

          {activePage === 'architecture-methodology' && <ArchitectureMethodologyPage />}

          {activePage === 'about-pqc' && <AboutPqcPage />}
        </main>
      </div>

      {/* Switcher Pill to switch to PS-P2 Scanner */}
      {onSwitchToScanner && (
        <button
          onClick={onSwitchToScanner}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-md cursor-pointer select-none transition-transform hover:scale-105"
          style={{
            background: '#292824',
            color: '#FBFAF7',
            border: '1px solid #4A4540',
          }}
          title="Switch to PS-P2 Cryptographic Scanner & Migration Engine"
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#963B43' }} />
          <span>Switch to PS-P2 Scanner</span>
        </button>
      )}
    </div>
  );
}
