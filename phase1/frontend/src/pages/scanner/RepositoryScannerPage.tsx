import React, { useState, useRef } from 'react';
import { ScanSearch, Upload, Play, AlertCircle, X, Info } from 'lucide-react';
import type { ScanResult } from '../../types/scanner';
import { runScan, runDemoScan, uploadAndScan } from '../../services/scannerApi';
import { SectionHeader, DemoBanner } from '../../components/scanner/ScannerUI';
import type { ScannerPage } from '../../components/scanner/ScannerSidebar';

interface Props {
  setScanResult: (r: ScanResult) => void;
  onNavigate: (page: ScannerPage) => void;
  currentResult: ScanResult | null;
}

export function RepositoryScannerPage({ setScanResult, onNavigate, currentResult }: Props) {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const doScan = async (fn: () => Promise<ScanResult>) => {
    setScanning(true);
    setError(null);
    setProgress('Initialising…');
    try {
      setProgress('Fetching repository…');
      const r = await fn();
      setScanResult(r);
      setProgress('');
      onNavigate('dashboard');
    } catch (e: any) {
      setError(e.message || 'Scan failed.');
      setProgress('');
    } finally {
      setScanning(false);
    }
  };

  const handleGitHub = () => {
    if (!repoUrl.trim()) { setError('Enter a GitHub repository URL.'); return; }
    doScan(() => runScan(repoUrl.trim(), branch.trim() || 'main'));
  };

  const handleDemo = () => doScan(runDemoScan);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) { setError('Only .zip archives are accepted.'); return; }
    doScan(() => uploadAndScan(file));
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <SectionHeader
        title="Repository Scanner"
        description="Scan a GitHub repository or upload a source ZIP to detect quantum-vulnerable cryptographic usage."
        badge="SCANNER"
      />

      {/* GitHub URL */}
      <div className="qs-card p-5 space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: '#292824' }}>
          <ScanSearch size={14} style={{ color: '#963B43' }} />
          GitHub Repository
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#8C877F' }}>
              Repository URL
            </label>
            <input
              type="url"
              value={repoUrl}
              onChange={e => { setRepoUrl(e.target.value); setError(null); }}
              onKeyDown={e => e.key === 'Enter' && handleGitHub()}
              placeholder="https://github.com/owner/repository"
              disabled={scanning}
              className="w-full px-3 py-2 text-sm rounded-md border"
              style={{ background: '#FBFAF7', border: '1px solid #E8E1D8', color: '#292824', fontFamily: 'monospace', outline: 'none' }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#8C877F' }}>
              Branch (optional)
            </label>
            <input
              type="text"
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="main"
              disabled={scanning}
              className="w-full px-3 py-2 text-sm rounded-md border"
              style={{ background: '#FBFAF7', border: '1px solid #E8E1D8', color: '#292824', fontFamily: 'monospace', outline: 'none' }}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md"
            style={{ background: '#FAE8E8', border: '1px solid #F0C0C0', color: '#C74848' }}>
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <p className="text-xs flex-1">{error}</p>
            <button onClick={() => setError(null)}><X size={12} /></button>
          </div>
        )}

        {scanning && (
          <div className="flex items-center gap-2 p-3 rounded-md"
            style={{ background: '#FFF8E8', border: '1px solid #F0D890', color: '#8A6010' }}>
            <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <p className="text-xs font-medium">{progress}</p>
          </div>
        )}

        <button
          onClick={handleGitHub}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white disabled:opacity-50 transition-opacity"
          style={{ background: '#963B43' }}
        >
          <ScanSearch size={14} /> Scan Repository
        </button>

        <div className="flex items-start gap-2 text-xs" style={{ color: '#8C877F' }}>
          <Info size={12} className="mt-0.5 flex-shrink-0" />
          Only public GitHub repositories are supported. No authentication required.
          Scanning downloads the repository archive. No code is executed.
        </div>
      </div>

      {/* Upload ZIP */}
      <div className="qs-card p-5 space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: '#292824' }}>
          <Upload size={14} style={{ color: '#963B43' }} />
          Upload Source ZIP
        </h3>
        <p className="text-xs" style={{ color: '#8C877F' }}>
          Upload a ZIP archive of your source repository. Maximum 50 MB. Only .zip format accepted.
        </p>
        <div>
          <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-qs-border hover:bg-qs-softMaroon transition-colors disabled:opacity-50"
            style={{ color: '#8C877F' }}
          >
            <Upload size={13} /> Choose ZIP file…
          </button>
        </div>
      </div>

      {/* Demo Mode */}
      <div className="qs-card p-5 space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: '#292824' }}>
          <Play size={14} style={{ color: '#963B43' }} />
          Demo Mode
        </h3>
        <DemoBanner />
        <p className="text-xs" style={{ color: '#8C877F' }}>
          Scans a built-in synthetic repository with documented RSA, ECDSA, DSA, DH, and ECC patterns.
          Works without GitHub access or credentials.
        </p>
        <button
          onClick={handleDemo}
          disabled={scanning}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-qs-border hover:bg-qs-softMaroon transition-colors disabled:opacity-50"
          style={{ color: '#8C877F' }}
        >
          <Play size={13} /> Run Demo Scan
        </button>
      </div>

      {/* Current scan indicator */}
      {currentResult && (
        <div className="qs-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold" style={{ color: '#292824' }}>Active scan result loaded</p>
            <p className="font-mono text-xs" style={{ color: '#8C877F' }}>{currentResult.summary.repo_source}</p>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-3 py-1.5 text-xs rounded-md text-white"
            style={{ background: '#963B43' }}
          >
            View Results
          </button>
        </div>
      )}
    </div>
  );
}
