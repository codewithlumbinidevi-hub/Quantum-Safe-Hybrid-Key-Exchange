import React, { useState, useCallback } from 'react';
import { Shield } from 'lucide-react';
import { ScannerSidebar, type ScannerPage } from '../components/scanner/ScannerSidebar';
import { DashboardPage } from './scanner/DashboardPage';
import { FindingsPage } from './scanner/FindingsPage';
import { AlgorithmInventoryPage } from './scanner/AlgorithmInventoryPage';
import { FileExplorerPage } from './scanner/FileExplorerPage';
import { MigrationPlannerPage } from './scanner/MigrationPlannerPage';
import { PQCReferencePage } from './scanner/PQCReferencePage';
import { TestResultsPage } from './scanner/TestResultsPage';
import { ScanHistoryPage } from './scanner/ScanHistoryPage';
import { HowItWorksPage } from './scanner/HowItWorksPage';
import { AboutPage } from './scanner/AboutPage';
import { RepositoryScannerPage } from './scanner/RepositoryScannerPage';
import type { ScanResult } from '../types/scanner';

export function ScannerApp() {
  const [activePage, setActivePage] = useState<ScannerPage>('dashboard');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);

  const handleSetResult = useCallback((r: ScanResult | null) => {
    setScanResult(r);
    if (r) {
      setScanHistory(prev => [...prev.filter(h => h.summary.scan_id !== r.summary.scan_id), r]);
    }
  }, []);

  const handleNavigate = useCallback((page: ScannerPage) => {
    setActivePage(page);
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={handleNavigate}
            scanResult={scanResult}
            setScanResult={handleSetResult}
          />
        );
      case 'scanner':
        return (
          <RepositoryScannerPage
            setScanResult={(r) => { handleSetResult(r); }}
            onNavigate={handleNavigate}
            currentResult={scanResult}
          />
        );
      case 'findings':
        return <FindingsPage scanResult={scanResult} />;
      case 'algorithm-inventory':
        return <AlgorithmInventoryPage scanResult={scanResult} />;
      case 'file-explorer':
        return <FileExplorerPage scanResult={scanResult} />;
      case 'migration-planner':
        return <MigrationPlannerPage />;
      case 'pqc-reference':
        return <PQCReferencePage />;
      case 'test-results':
        return <TestResultsPage />;
      case 'scan-history':
        return (
          <ScanHistoryPage
            history={scanHistory}
            onLoad={(r) => { handleSetResult(r); handleNavigate('dashboard'); }}
          />
        );
      case 'how-it-works':
        return <HowItWorksPage />;
      case 'about':
        return <AboutPage />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#F8F6F1' }}>
      {/* Sidebar */}
      <ScannerSidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        hasResults={!!scanResult}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col" style={{ marginLeft: '208px' }}>
        {/* Top header bar */}
        <header
          className="sticky top-0 z-30 px-6 py-3 border-b flex items-center justify-between"
          style={{ background: '#F8F6F1', borderColor: '#E8E1D8' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <Shield size={12} style={{ color: '#963B43' }} />
              <span className="font-serif text-sm font-normal" style={{ color: '#292824' }}>Q-SHIELD</span>
              <span className="text-[10px] tracking-widest font-semibold" style={{ color: '#8C877F', letterSpacing: '0.12em' }}>
                QUANTUM SECURITY RESEARCH ENVIRONMENT
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="font-mono text-[9px] font-semibold tracking-widest px-2 py-1 rounded"
              style={{ background: '#F4E8E7', color: '#963B43', border: '1px solid #E8C8C4' }}
            >
              TRACK 5 · PS-P2
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-6 py-5 overflow-y-auto">
          {renderPage()}
        </main>

        {/* Footer */}
        <footer
          className="px-6 py-3 border-t text-center"
          style={{ borderColor: '#E8E1D8', background: '#F4F0EA' }}
        >
          <p className="text-[11px]" style={{ color: '#8C877F' }}>
            Q-SHIELD Cryptographic Inventory & Migration Scanner · PS-P2 · Qiskit Fall Fest 2026 · SRM University-AP ·{' '}
            Research demonstration. Not endorsed by IBM, Qiskit, SRM University-AP, or NIST.
          </p>
        </footer>
      </div>
    </div>
  );
}
