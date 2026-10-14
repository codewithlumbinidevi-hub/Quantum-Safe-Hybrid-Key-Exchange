import React, { useState, useRef, useMemo } from 'react';
import {
  Shield, ScanSearch, Upload, Play, RefreshCw, Download, Github,
  AlertCircle, X, ChevronRight, ChevronDown, ChevronUp, FileCode,
  ExternalLink, CheckCircle2, Radio, Activity, Cpu, ArrowRight
} from 'lucide-react';
import type { ScanResult, Finding, Severity, AlgorithmFamily } from '../../types/scanner';
import { runScan, runDemoScan, uploadAndScan, getReportUrl } from '../../services/scannerApi';
import {
  StatusDot, MetricCard, SeverityBadge, AlgoBadge, DemoBanner, CodeExcerpt
} from '../../components/scanner/ScannerUI';
import type { ScannerPage } from '../../components/scanner/ScannerSidebar';

interface Props {
  onNavigate: (page: ScannerPage) => void;
  scanResult: ScanResult | null;
  setScanResult: (r: ScanResult | null) => void;
}

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const PIPELINE_STAGES = [
  { id: 1, name: 'Source Ingestion', desc: 'Secure ZIP/Git archive unpack' },
  { id: 2, name: 'AST & Tokenization', desc: 'Syntax tree parsing' },
  { id: 3, name: 'Pattern Discovery', desc: 'Regex & rule matching' },
  { id: 4, name: 'Vulnerability Scoring', desc: 'Quantum severity classification' },
  { id: 5, name: 'Ground-Truth Verify', desc: 'Precision & recall check' },
  { id: 6, name: 'NIST Standards Map', desc: 'FIPS 203/204/205 mapping' },
  { id: 7, name: 'Hybrid Protocol Check', desc: 'Transition readiness' },
  { id: 8, name: 'Migration Plan Ready', desc: 'Report generation' },
];

export function DashboardPage({ onNavigate, scanResult, setScanResult }: Props) {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'completed' | 'failed'>(
    scanResult ? 'completed' : 'idle'
  );
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [showInputForm, setShowInputForm] = useState(!scanResult);

  // Table filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('');
  const [algorithmFilter, setAlgorithmFilter] = useState<AlgorithmFamily | ''>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setScanResult(null);
    setStatus('idle');
    setError(null);
    setProgress('');
    setRepoUrl('');
    setBranch('main');
    setShowInputForm(true);
    setSearch('');
    setSeverityFilter('');
    setAlgorithmFilter('');
    setExpandedFindingId(null);
  };

  const doScan = async (fn: () => Promise<ScanResult>) => {
    setStatus('scanning');
    setError(null);
    setProgress('Initialising static analysis engine…');
    try {
      setProgress('Retrieving repository archive…');
      const result = await fn();
      setScanResult(result);
      setStatus('completed');
      setProgress('');
      setShowInputForm(false);
    } catch (e: any) {
      setError(e.message || 'Scan failed.');
      setStatus('failed');
      setProgress('');
    }
  };

  const handleGitHub = () => {
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL.');
      return;
    }
    doScan(() => runScan(repoUrl.trim(), branch.trim() || 'main'));
  };

  const handleDemo = () => doScan(runDemoScan);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Only .zip archives are accepted.');
      return;
    }
    doScan(() => uploadAndScan(file));
  };

  const summary = scanResult?.summary;
  const rawFindings = scanResult?.findings ?? [];

  // Filtered findings for the table
  const filteredFindings = useMemo(() => {
    return rawFindings.filter((f) => {
      if (severityFilter && f.severity !== severityFilter) return false;
      if (algorithmFilter && f.algorithm_family !== algorithmFilter) return false;
      if (fileTypeFilter === 'python' && !f.file_path.endsWith('.py')) return false;
      if (fileTypeFilter === 'config' && !/\.(ini|yaml|yml|json|toml|cfg)$/i.test(f.file_path)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          f.file_path.toLowerCase().includes(q) ||
          f.matched_symbol.toLowerCase().includes(q) ||
          f.rule_id.toLowerCase().includes(q) ||
          f.rule_name.toLowerCase().includes(q) ||
          f.migration_recommendation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rawFindings, severityFilter, algorithmFilter, fileTypeFilter, search]);

  // Compute telemetry metrics
  const totalFindings = summary?.total_findings ?? 0;
  const criticalFindings = summary?.critical_count ?? 0;
  const highFindings = summary?.high_count ?? 0;
  const mediumFindings = summary?.medium_count ?? 0;
  const filesScanned = summary?.files_scanned ?? 0;
  const algoFamiliesCount = summary?.algorithm_families ?? 0;

  // Quantum Risk Index
  const quantumRiskLabel = totalFindings > 0
    ? (criticalFindings > 0 || highFindings > 0 ? 'CRITICAL RISK' : 'MODERATE RISK')
    : (status === 'completed' ? 'CLEAN' : 'STANDBY');

  const quantumRiskColor = totalFindings > 0
    ? (criticalFindings > 0 ? '#C74848' : '#C58B3A')
    : (status === 'completed' ? '#3E9B70' : '#8C877F');

  const activePipelineIndex = status === 'completed' ? 8 : (status === 'scanning' ? 3 : 0);

  return (
    <div className="space-y-5">
      {/* ── TOP HEADER BANNER CARD (Mirrors reference screenshot banner) ── */}
      <div
        className="qs-card p-5"
        style={{
          background: '#FBFAF7',
          border: '1px solid #E8E1D8',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: '#963B43' }}
            >
              <Shield size={20} color="#FFFFFF" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="font-serif text-lg md:text-xl font-normal tracking-tight"
                  style={{ color: '#292824' }}
                >
                  Q-SHIELD Cryptographic Inventory & Migration Scanner
                </h1>
              </div>
              <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: '#8C877F' }}>
                <span>Inspect source code, identify quantum-vulnerable cryptographic algorithms, and generate NIST-standardised migration plans.</span>
              </p>
            </div>
          </div>

          {/* Right badge: Track info */}
          <div className="hidden lg:flex flex-col items-end flex-shrink-0">
            <span
              className="font-mono text-[9px] font-semibold tracking-widest px-2.5 py-1 rounded"
              style={{ background: '#F4E8E7', color: '#963B43', border: '1px solid #E8C8C4' }}
            >
              TRACK 5 · PS-P2
            </span>
            <span className="text-[10px] mt-1 font-mono" style={{ color: '#8C877F' }}>
              Deterministic AST &amp; Pattern Analysis
            </span>
          </div>
        </div>

        {/* ── COMPACT TOOLBAR CONTROLS BAR (Mirrors reference screenshot control bar) ── */}
        <div
          className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-3"
          style={{ borderColor: '#E8E1D8' }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* Scan Repository */}
            <button
              onClick={() => {
                if (showInputForm && repoUrl) {
                  handleGitHub();
                } else {
                  setShowInputForm(true);
                }
              }}
              disabled={status === 'scanning'}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium text-white transition-opacity disabled:opacity-50 shadow-sm"
              style={{ background: '#963B43' }}
              title="Scan a repository for quantum-vulnerable cryptography"
            >
              <ScanSearch size={13} />
              <span>Scan Repository</span>
            </button>

            {/* Upload ZIP */}
            <div className="relative">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={status === 'scanning'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-qs-border transition-colors disabled:opacity-50 hover:bg-qs-softMaroon hover:text-qs-maroon"
                style={{ background: '#FBFAF7', color: '#292824' }}
                title="Upload local source repository as ZIP archive"
              >
                <Upload size={12} style={{ color: '#963B43' }} />
                <span>Upload Source ZIP</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleUpload}
              />
            </div>

            {/* Demo Mode Button */}
            <button
              onClick={handleDemo}
              disabled={status === 'scanning'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors disabled:opacity-50"
              style={{
                background: scanResult?.summary.is_demo ? '#F4E8E7' : '#FBFAF7',
                borderColor: scanResult?.summary.is_demo ? '#963B43' : '#E8E1D8',
                color: scanResult?.summary.is_demo ? '#963B43' : '#292824',
              }}
              title="Run scan with built-in synthetic test repository"
            >
              <Play size={12} style={{ color: '#963B43' }} />
              <span>Demo Mode</span>
            </button>

            {/* Export Report Dropdown / Buttons */}
            {scanResult && (
              <div className="flex items-center gap-1 border border-qs-border rounded-md px-1 py-0.5 bg-[#FBFAF7]">
                <span className="text-[10px] font-semibold uppercase px-1 text-qs-textMuted flex items-center gap-1">
                  <Download size={11} /> Export:
                </span>
                <a
                  href={getReportUrl(scanResult.summary.scan_id, 'json')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 text-[11px] font-mono rounded hover:bg-qs-softMaroon hover:text-qs-maroon transition-colors"
                  style={{ color: '#292824' }}
                >
                  JSON
                </a>
                <a
                  href={getReportUrl(scanResult.summary.scan_id, 'csv')}
                  download
                  className="px-2 py-1 text-[11px] font-mono rounded hover:bg-qs-softMaroon hover:text-qs-maroon transition-colors"
                  style={{ color: '#292824' }}
                >
                  CSV
                </a>
                <a
                  href={getReportUrl(scanResult.summary.scan_id, 'markdown')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 text-[11px] font-mono rounded hover:bg-qs-softMaroon hover:text-qs-maroon transition-colors"
                  style={{ color: '#963B43' }}
                >
                  MD Report
                </a>
              </div>
            )}

            {/* Reset Scan */}
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-qs-border transition-colors hover:bg-[#F0EDE5]"
              style={{ color: '#8C877F' }}
              title="Reset current scan and clear results"
            >
              <RefreshCw size={11} />
              <span>Reset</span>
            </button>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-3">
            <StatusDot status={status} />
            <span className="text-[11px] font-mono text-qs-textMuted hidden sm:inline">
              {summary ? `${summary.files_scanned} files · ${(summary.scan_duration_ms / 1000).toFixed(2)}s` : 'Deterministic engine idle'}
            </span>
          </div>
        </div>
      </div>

      {/* Demo Mode persistent banner */}
      {scanResult?.summary.is_demo && <DemoBanner />}

      {/* ── TWO-COLUMN DASHBOARD LAYOUT (Direct match to reference screenshot) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* ════ LEFT COLUMN: REPOSITORY SCANNER & DETAILED FINDINGS TABLE (7 cols / 58% width) ════ */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Repository Input Panel (Collapsible or visible when needed) */}
          {showInputForm && (
            <div className="qs-card p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Github size={14} style={{ color: '#963B43' }} />
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#292824' }}>
                    Repository Source Configuration
                  </h3>
                </div>
                {scanResult && (
                  <button
                    onClick={() => setShowInputForm(false)}
                    className="text-xs flex items-center gap-1 text-qs-textMuted hover:text-qs-text"
                  >
                    <span>Hide form</span>
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8C877F' }}>
                    Public GitHub Repository URL
                  </label>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => { setRepoUrl(e.target.value); setError(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleGitHub()}
                    placeholder="https://github.com/owner/repository"
                    disabled={status === 'scanning'}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-md border"
                    style={{
                      background: '#FBFAF7',
                      borderColor: '#E8E1D8',
                      color: '#292824',
                      outline: 'none',
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8C877F' }}>
                      Branch / Tag
                    </label>
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main"
                      disabled={status === 'scanning'}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-md border"
                      style={{
                        background: '#FBFAF7',
                        borderColor: '#E8E1D8',
                        color: '#292824',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleGitHub}
                      disabled={status === 'scanning' || !repoUrl.trim()}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white transition-opacity disabled:opacity-40"
                      style={{ background: '#963B43' }}
                    >
                      <ScanSearch size={12} />
                      <span>Start Scan</span>
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div
                  className="flex items-start gap-2 p-3 rounded-md text-xs"
                  style={{ background: '#FAE8E8', border: '1px solid #F0C0C0', color: '#C74848' }}
                >
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">Scan Error</p>
                    <p>{error}</p>
                  </div>
                  <button onClick={() => setError(null)}><X size={12} /></button>
                </div>
              )}

              {status === 'scanning' && (
                <div
                  className="flex items-center gap-2.5 p-3 rounded-md text-xs"
                  style={{ background: '#FFF8E8', border: '1px solid #F0D890', color: '#8A6010' }}
                >
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0" />
                  <p className="font-medium font-mono">{progress}</p>
                </div>
              )}

              <p className="text-[10.5px] leading-relaxed" style={{ color: '#8C877F' }}>
                Deterministic analysis downloads repository files in memory. No code is executed. Only Python source files (.py) receive full AST pattern matching.
              </p>
            </div>
          )}

          {/* Active Repository Card when scanned */}
          {summary && !showInputForm && (
            <div className="qs-card p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md flex items-center justify-center bg-qs-softMaroon text-qs-maroon">
                  <FileCode size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-qs-text truncate max-w-xs">
                      {summary.repo_source}
                    </span>
                    {summary.branch && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-qs-textMuted border border-gray-200">
                        {summary.branch}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-qs-textMuted mt-0.5">
                    {summary.files_scanned} files scanned · {summary.total_findings} findings detected in {(summary.scan_duration_ms / 1000).toFixed(2)}s
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInputForm(true)}
                className="text-xs px-2.5 py-1 rounded border border-qs-border text-qs-textMuted hover:bg-qs-softMaroon hover:text-qs-maroon transition-colors"
              >
                Change Repository
              </button>
            </div>
          )}

          {/* ── MAIN RESULTS PANEL (Section 5 requirements) ── */}
          <div className="qs-card overflow-hidden">
            <div className="px-4 py-3 border-b border-qs-border flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold" style={{ color: '#292824' }}>
                  Cryptographic Findings
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-gray-100 text-qs-textMuted">
                  {filteredFindings.length} of {totalFindings}
                </span>
              </div>
              
              {/* Quick link to dedicated Findings Page */}
              <button
                onClick={() => onNavigate('findings')}
                className="text-xs flex items-center gap-1 font-medium hover:underline"
                style={{ color: '#963B43' }}
              >
                <span>Full findings table</span>
                <ChevronRight size={12} />
              </button>
            </div>

            {/* Filter controls bar */}
            <div className="p-3 border-b border-qs-border bg-[#FAF7F2] flex flex-wrap items-center gap-2">
              {/* Search box */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter files, symbols, rules…"
                className="px-2.5 py-1 text-xs rounded border flex-1 min-w-[140px]"
                style={{ background: '#FBFAF7', borderColor: '#E8E1D8', color: '#292824', outline: 'none' }}
              />

              {/* Severity filter */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="px-2 py-1 text-xs rounded border"
                style={{ background: '#FBFAF7', borderColor: '#E8E1D8', color: '#292824', outline: 'none' }}
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>

              {/* Algorithm filter */}
              <select
                value={algorithmFilter}
                onChange={(e) => setAlgorithmFilter(e.target.value as any)}
                className="px-2 py-1 text-xs rounded border"
                style={{ background: '#FBFAF7', borderColor: '#E8E1D8', color: '#292824', outline: 'none' }}
              >
                <option value="">All Algorithms</option>
                <option value="RSA">RSA</option>
                <option value="ECC">ECC</option>
                <option value="DSA">DSA</option>
                <option value="DH">Diffie-Hellman</option>
              </select>

              {/* File type filter */}
              <select
                value={fileTypeFilter}
                onChange={(e) => setFileTypeFilter(e.target.value)}
                className="px-2 py-1 text-xs rounded border"
                style={{ background: '#FBFAF7', borderColor: '#E8E1D8', color: '#292824', outline: 'none' }}
              >
                <option value="all">All Files</option>
                <option value="python">Python (.py)</option>
                <option value="config">Config / Text</option>
              </select>

              {(search || severityFilter || algorithmFilter || fileTypeFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setSeverityFilter('');
                    setAlgorithmFilter('');
                    setFileTypeFilter('all');
                  }}
                  className="text-[11px] px-2 py-1 rounded border border-qs-border text-qs-textMuted hover:bg-qs-softMaroon"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Findings Table matching the 7 requested columns */}
            {rawFindings.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <ScanSearch size={32} className="mx-auto mb-2.5 opacity-25" style={{ color: '#8C877F' }} />
                <p className="font-serif text-sm" style={{ color: '#292824' }}>
                  {status === 'completed' ? 'No cryptographic vulnerabilities detected' : 'Awaiting repository scan'}
                </p>
                <p className="text-xs mt-1 text-qs-textMuted max-w-sm mx-auto">
                  {status === 'completed'
                    ? 'The scanned files contain no known classical quantum-vulnerable algorithms matching configured rules.'
                    : 'Enter a public GitHub repository or click Demo Mode to run deterministic static analysis.'}
                </p>
                {status === 'idle' && (
                  <button
                    onClick={handleDemo}
                    className="mt-4 px-3.5 py-1.5 text-xs rounded-md text-white font-medium"
                    style={{ background: '#963B43' }}
                  >
                    Load Demo Repository
                  </button>
                )}
              </div>
            ) : filteredFindings.length === 0 ? (
              <div className="py-10 text-center text-xs text-qs-textMuted">
                No findings match the selected filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="qs-table w-full">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Algorithm</th>
                      <th>File Path</th>
                      <th>Line</th>
                      <th>Detection Reason</th>
                      <th>Migration Target</th>
                      <th className="text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFindings.map((f) => {
                      const isExpanded = expandedFindingId === f.finding_id;
                      return (
                        <React.Fragment key={f.finding_id}>
                          <tr
                            className="cursor-pointer hover:bg-[#FAF7F2] transition-colors"
                            onClick={() => setExpandedFindingId(isExpanded ? null : f.finding_id)}
                          >
                            <td>
                              <SeverityBadge severity={f.severity} compact />
                            </td>
                            <td>
                              <AlgoBadge family={f.algorithm_family} />
                            </td>
                            <td>
                              <span className="font-mono text-xs flex items-center gap-1 text-qs-text" title={f.file_path}>
                                <FileCode size={11} className="opacity-40 flex-shrink-0" />
                                <span className="truncate max-w-[140px]">{f.file_path}</span>
                              </span>
                            </td>
                            <td className="font-mono text-xs text-qs-textMuted">
                              {f.line_number}
                            </td>
                            <td>
                              <span className="text-xs text-qs-text line-clamp-1" title={f.rule_name}>
                                {f.rule_name}
                              </span>
                            </td>
                            <td>
                              <span
                                className="font-mono text-[11px] font-medium line-clamp-1"
                                style={{ color: '#3E9B70' }}
                                title={f.migration_recommendation}
                              >
                                {f.migration_recommendation.split('.')[0]}
                              </span>
                            </td>
                            <td className="text-right">
                              <button
                                className="text-[11px] font-mono font-semibold"
                                style={{ color: '#963B43' }}
                              >
                                {isExpanded ? '▲' : '▼'}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Details Drawer */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="!p-0">
                                <div
                                  className="p-4 space-y-3.5 border-t border-b border-qs-border"
                                  style={{ background: '#FAF7F2' }}
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8C877F' }}>
                                        Detection Explanation ({f.rule_id})
                                      </p>
                                      <p className="text-xs leading-relaxed text-qs-text">
                                        {f.explanation}
                                      </p>
                                      <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-semibold text-qs-textMuted">Confidence:</span>
                                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-qs-border text-qs-text">
                                          {f.confidence}
                                        </span>
                                        <span className="text-[10px] uppercase font-semibold text-qs-textMuted ml-2">Matched Symbol:</span>
                                        <code className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-qs-border text-qs-maroon">
                                          {f.matched_symbol}
                                        </code>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8C877F' }}>
                                        NIST Migration Recommendation
                                      </p>
                                      <p className="text-xs leading-relaxed" style={{ color: '#292824' }}>
                                        {f.migration_recommendation}
                                      </p>
                                      {f.references.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {f.references.map((ref) => (
                                            <a
                                              key={ref}
                                              href={ref}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-1 text-[11px] hover:underline"
                                              style={{ color: '#963B43' }}
                                            >
                                              <ExternalLink size={10} />
                                              <span>{ref.replace('https://', '').split('/')[0]}</span>
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Code Excerpt */}
                                  <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-qs-textMuted">
                                        Source Excerpt — {f.file_path}:{f.line_number}
                                      </p>
                                      <button
                                        onClick={() => onNavigate('file-explorer')}
                                        className="text-[11px] text-qs-maroon hover:underline flex items-center gap-1"
                                      >
                                        <span>Open in File Explorer</span>
                                        <ChevronRight size={10} />
                                      </button>
                                    </div>
                                    <CodeExcerpt code={f.evidence_excerpt} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT COLUMN: LIVE TELEMETRY & PQC MIGRATION PIPELINE (5 cols / 42% width) ════ */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* ── CARD 1: Q-SHIELD Quantum Security — Migration Telemetry (Mirrors screenshot) ── */}
          <div className="qs-card p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-qs-border pb-3">
              <div>
                <h3 className="font-serif text-sm font-medium text-qs-text">
                  Q-SHIELD Quantum Security
                </h3>
                <p className="text-[11px] text-qs-textMuted">
                  Cryptographic inventory &amp; quantum posture
                </p>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold" style={{ color: quantumRiskColor }}>
                <span className={`w-1.5 h-1.5 rounded-full ${status === 'scanning' ? 'animate-pulse' : ''}`} style={{ background: quantumRiskColor }} />
                <span>{status === 'scanning' ? 'SCANNING' : (status === 'completed' ? 'ACTIVE TELEMETRY' : 'STANDBY')}</span>
              </div>
            </div>

            {/* LIVE TELEMETRY Metric Tiles (Just like QBER / CHANNEL NOISE in screenshot) */}
            <div>
              <p className="text-[9.5px] uppercase font-semibold tracking-widest text-qs-textMuted mb-2">
                Live Telemetry
              </p>
              <div className="grid grid-cols-2 gap-3">
                
                {/* Tile 1: Quantum Vulnerability Level */}
                <div className="p-3 rounded-lg border border-qs-border bg-[#FAF7F2]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] uppercase font-semibold tracking-wider text-qs-textMuted">
                      Quantum Risk
                    </span>
                    <span
                      className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: '#F4E8E7', color: '#963B43' }}
                    >
                      MEASURED
                    </span>
                  </div>
                  <p className="font-mono text-xl font-bold" style={{ color: quantumRiskColor }}>
                    {totalFindings > 0 ? `${totalFindings} Vulnerabilities` : (status === 'completed' ? '0 Findings' : '—')}
                  </p>
                  <p className="text-[10px] text-qs-textMuted mt-1">
                    {criticalFindings > 0 ? `${criticalFindings} Critical · ${highFindings} High` : 'Threshold: 0 classical keys'}
                  </p>
                  {/* Progress bar */}
                  <div className="w-full h-1 rounded-full bg-gray-200 mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: totalFindings > 0 ? '100%' : '0%',
                        background: quantumRiskColor,
                      }}
                    />
                  </div>
                </div>

                {/* Tile 2: Algorithm Diversity / Scan Profile */}
                <div className="p-3 rounded-lg border border-qs-border bg-[#FAF7F2]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] uppercase font-semibold tracking-wider text-qs-textMuted">
                      Algorithm Families
                    </span>
                    <Activity size={12} className="text-qs-textMuted" />
                  </div>
                  <p className="font-mono text-xl font-bold text-qs-text">
                    {algoFamiliesCount > 0 ? `${algoFamiliesCount} Detected` : (status === 'completed' ? 'Clean' : 'Idle')}
                  </p>
                  <p className="text-[10px] text-qs-textMuted mt-1">
                    {filesScanned > 0 ? `Across ${filesScanned} source files` : 'Awaiting repository'}
                  </p>
                  {/* Step dots */}
                  <div className="flex items-center gap-1 mt-2.5">
                    {[1, 2, 3, 4].map((dot) => (
                      <span
                        key={dot}
                        className="h-1 flex-1 rounded-full transition-colors"
                        style={{
                          background: dot <= algoFamiliesCount ? '#963B43' : '#E8E1D8',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Narrative Telemetry Box (Matches screenshot's "Awaiting first transmission" box) */}
            <div
              className="p-4 rounded-lg border border-dashed text-center"
              style={{
                borderColor: '#E8E1D8',
                background: status === 'completed' ? '#FBFAF7' : '#F8F6F1',
              }}
            >
              {status === 'idle' && (
                <div className="space-y-1">
                  <Shield size={24} className="mx-auto opacity-20 text-qs-textMuted" />
                  <p className="text-xs text-qs-text font-serif">
                    Awaiting first transmission.
                  </p>
                  <p className="text-[11px] text-qs-textMuted max-w-xs mx-auto">
                    Provide a GitHub repository URL or click Demo Mode to begin deterministic quantum inventory analysis.
                  </p>
                </div>
              )}

              {status === 'scanning' && (
                <div className="space-y-2">
                  <div className="w-5 h-5 rounded-full border-2 border-qs-maroon border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs font-mono font-medium text-qs-maroon">
                    {progress || 'Analyzing repository AST tokens…'}
                  </p>
                </div>
              )}

              {status === 'completed' && summary && (
                <div className="text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-qs-textMuted">
                      Post-Quantum Transition Status
                    </span>
                    <span className="font-mono text-[10px] text-qs-maroon font-semibold">
                      FIPS 203 / 204 / 205
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-qs-text">
                    {totalFindings > 0
                      ? `Detected ${totalFindings} classical algorithm occurrences vulnerable to Shor's algorithm. Migration required to NIST standards:`
                      : 'Repository is free of quantum-vulnerable public key cryptographic algorithms.'}
                  </p>
                  {totalFindings > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {scanResult.algorithm_inventory.map((alg) => (
                        <span
                          key={alg.family}
                          className="font-mono text-[10px] px-2 py-0.5 rounded border bg-white flex items-center gap-1"
                          style={{ borderColor: '#E8E1D8' }}
                        >
                          <span className="font-bold text-qs-maroon">{alg.family}</span>
                          <span className="text-qs-textMuted">→</span>
                          <span className="text-qs-success">{alg.migration_target.split(' ')[0]}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {status === 'failed' && (
                <div className="text-center text-xs text-qs-critical">
                  <AlertCircle size={20} className="mx-auto mb-1" />
                  <span>Scan encountered an error. Check repository URL and retry.</span>
                </div>
              )}
            </div>
          </div>

          {/* ── CARD 2: PQC Migration Pipeline (Direct visual equivalent of BB84 Pipeline in screenshot) ── */}
          <div className="qs-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-qs-border pb-2.5">
              <div>
                <h3 className="font-serif text-sm font-medium text-qs-text">
                  PQC Migration Pipeline
                </h3>
                <p className="text-[11px] text-qs-textMuted">
                  Live protocol &amp; analysis stages
                </p>
              </div>
              <span className="font-mono text-[10px] text-qs-textMuted font-semibold">
                {status === 'completed' ? '8 / 8 Completed' : (status === 'scanning' ? 'In Progress' : 'Ready')}
              </span>
            </div>

            {/* Pipeline Stage Pills (Mirrors the BB84 12-stage pills in the reference screenshot) */}
            <div className="grid grid-cols-2 gap-2">
              {PIPELINE_STAGES.map((stg) => {
                const isPassed = activePipelineIndex >= stg.id;
                const isCurrent = activePipelineIndex === stg.id - 1 && status === 'scanning';

                return (
                  <div
                    key={stg.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                      isPassed
                        ? 'border-[#C4E8D4] bg-[#E8F5EE] text-[#292824]'
                        : isCurrent
                        ? 'border-qs-maroon bg-qs-softMaroon text-qs-maroon shadow-sm'
                        : 'border-[#E8E1D8] bg-[#FAF7F2] text-qs-textMuted opacity-70'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] font-bold flex-shrink-0 ${
                        isPassed
                          ? 'bg-[#3E9B70] text-white'
                          : isCurrent
                          ? 'bg-qs-maroon text-white animate-pulse'
                          : 'bg-[#D5CCC2] text-white'
                      }`}
                    >
                      {stg.id}
                    </span>
                    <span className="font-mono text-[11px] truncate flex-1 font-medium">
                      {stg.name}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-qs-textMuted pt-1">
              Deterministic static analysis executes through 8 validation gates before finalizing NIST post-quantum migration targets.
            </p>
          </div>

          {/* ── CARD 3: Quick Migration Summary / Algorithm Inventory Preview ── */}
          {scanResult && scanResult.algorithm_inventory.length > 0 && (
            <div className="qs-card p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-qs-border pb-2.5">
                <h3 className="font-serif text-sm font-medium text-qs-text">
                  Migration Targets (NIST Standards)
                </h3>
                <button
                  onClick={() => onNavigate('migration-planner')}
                  className="text-xs text-qs-maroon flex items-center gap-0.5 hover:underline"
                >
                  <span>Planner</span>
                  <ChevronRight size={11} />
                </button>
              </div>

              <div className="space-y-2">
                {scanResult.algorithm_inventory.map((alg) => (
                  <div
                    key={alg.family}
                    className="p-2.5 rounded-md border border-qs-border bg-[#FAF7F2] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <AlgoBadge family={alg.family} />
                      <span className="text-xs font-mono text-qs-textMuted">
                        {alg.total_findings} finding{alg.total_findings !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-right">
                      <ArrowRight size={11} className="text-qs-textMuted" />
                      <span className="font-mono text-xs font-semibold text-qs-success">
                        {alg.migration_target.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
