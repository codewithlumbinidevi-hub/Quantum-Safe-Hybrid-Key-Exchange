import React, { useState, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronUp, ExternalLink, FileCode } from 'lucide-react';
import type { ScanResult, Finding, Severity, AlgorithmFamily } from '../../types/scanner';
import {
  SeverityBadge, AlgoBadge, SectionHeader, EmptyState, CodeExcerpt, DemoBanner
} from '../../components/scanner/ScannerUI';
import { ScanSearch } from 'lucide-react';
import { getReportUrl } from '../../services/scannerApi';

interface Props { scanResult: ScanResult | null }

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const FAMILIES: AlgorithmFamily[] = ['RSA', 'DSA', 'DH', 'ECC', 'Symmetric', 'Hash', 'Unknown'];

export function FindingsPage({ scanResult }: Props) {
  const [search, setSearch] = useState('');
  const [filterSev, setFilterSev] = useState<Severity | ''>('');
  const [filterFam, setFilterFam] = useState<AlgorithmFamily | ''>('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<keyof Finding>('severity');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const findings = scanResult?.findings ?? [];

  const filtered = useMemo(() => {
    let list = [...findings];
    if (filterSev) list = list.filter(f => f.severity === filterSev);
    if (filterFam) list = list.filter(f => f.algorithm_family === filterFam);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.file_path.toLowerCase().includes(q) ||
        f.matched_symbol.toLowerCase().includes(q) ||
        f.rule_id.toLowerCase().includes(q) ||
        f.rule_name.toLowerCase().includes(q)
      );
    }
    const ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    list.sort((a, b) => {
      let va: any = a[sortBy], vb: any = b[sortBy];
      if (sortBy === 'severity') { va = ORDER[va] ?? 9; vb = ORDER[vb] ?? 9; }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [findings, filterSev, filterFam, search, sortBy, sortAsc]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSort = (col: keyof Finding) => {
    if (sortBy === col) setSortAsc(a => !a);
    else { setSortBy(col); setSortAsc(true); }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: keyof Finding }) =>
    sortBy === col
      ? sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />
      : <ChevronDown size={10} className="opacity-30" />;

  if (!scanResult) {
    return (
      <EmptyState
        icon={<ScanSearch size={36} />}
        title="No scan results"
        description="Run a repository scan to view findings."
      />
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Findings"
        description={`${filtered.length} finding${filtered.length !== 1 ? 's' : ''} ${filterSev || filterFam || search ? '(filtered)' : `from ${findings.length} total`}`}
        badge="CRYPTOGRAPHIC INVENTORY"
      >
        {scanResult.summary.scan_id && (
          <div className="flex items-center gap-1">
            <a
              href={getReportUrl(scanResult.summary.scan_id, 'csv')}
              download
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-qs-border hover:bg-qs-softMaroon transition-colors"
              style={{ color: '#8C877F' }}
            >
              Export CSV
            </a>
            <a
              href={getReportUrl(scanResult.summary.scan_id, 'markdown')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-qs-border hover:bg-qs-softMaroon transition-colors"
              style={{ color: '#8C877F' }}
            >
              Markdown Report
            </a>
          </div>
        )}
      </SectionHeader>

      {scanResult.summary.is_demo && <DemoBanner />}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" style={{ color: '#8C877F' }} />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search file, symbol, rule…"
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border"
            style={{ background: '#FBFAF7', border: '1px solid #E8E1D8', color: '#292824', outline: 'none' }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80">
              <X size={11} />
            </button>
          )}
        </div>

        <select
          value={filterSev}
          onChange={e => { setFilterSev(e.target.value as any); setPage(1); }}
          className="px-2.5 py-1.5 text-xs rounded-md border"
          style={{ background: '#FBFAF7', border: '1px solid #E8E1D8', color: '#292824', outline: 'none' }}
        >
          <option value="">All Severities</option>
          {SEVERITIES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>

        <select
          value={filterFam}
          onChange={e => { setFilterFam(e.target.value as any); setPage(1); }}
          className="px-2.5 py-1.5 text-xs rounded-md border"
          style={{ background: '#FBFAF7', border: '1px solid #E8E1D8', color: '#292824', outline: 'none' }}
        >
          <option value="">All Algorithms</option>
          {FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        {(filterSev || filterFam || search) && (
          <button
            onClick={() => { setFilterSev(''); setFilterFam(''); setSearch(''); setPage(1); }}
            className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md border border-qs-border hover:bg-qs-softMaroon transition-colors"
            style={{ color: '#8C877F' }}
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="qs-card overflow-hidden">
        {paged.length === 0 ? (
          <EmptyState title="No findings match current filters." />
        ) : (
          <>
            <table className="qs-table w-full">
              <thead>
                <tr>
                  {([
                    ['severity', 'Severity'],
                    ['algorithm_family', 'Algorithm'],
                    ['file_path', 'File'],
                    ['line_number', 'Line'],
                    ['rule_id', 'Rule'],
                    ['confidence', 'Confidence'],
                    [null, 'Details'],
                  ] as [keyof Finding | null, string][]).map(([col, label]) => (
                    <th
                      key={label}
                      onClick={col ? () => handleSort(col) : undefined}
                      className={col ? 'cursor-pointer select-none' : ''}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {col && <SortIcon col={col} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map(f => (
                  <React.Fragment key={f.finding_id}>
                    <tr
                      className="cursor-pointer"
                      onClick={() => setExpanded(expanded === f.finding_id ? null : f.finding_id)}
                    >
                      <td><SeverityBadge severity={f.severity} compact /></td>
                      <td><AlgoBadge family={f.algorithm_family} /></td>
                      <td>
                        <span className="font-mono text-xs" style={{ color: '#292824' }}>
                          <FileCode size={11} className="inline mr-1 opacity-40" />
                          {f.file_path}
                        </span>
                      </td>
                      <td className="font-mono text-xs" style={{ color: '#8C877F' }}>{f.line_number}</td>
                      <td className="font-mono text-xs" style={{ color: '#963B43' }}>{f.rule_id}</td>
                      <td>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: '#F4F1EC', color: '#8C877F' }}>
                          {f.confidence}
                        </span>
                      </td>
                      <td>
                        <button className="text-[10px] font-medium" style={{ color: '#963B43' }}>
                          {expanded === f.finding_id ? '▲ Close' : '▼ Expand'}
                        </button>
                      </td>
                    </tr>

                    {expanded === f.finding_id && (
                      <tr>
                        <td colSpan={7} className="!p-0">
                          <div className="p-4 space-y-4" style={{ background: '#FAF7F2', borderTop: '1px solid #E8E1D8' }}>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8C877F' }}>Explanation</p>
                                <p className="text-xs leading-relaxed" style={{ color: '#292824' }}>{f.explanation}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8C877F' }}>Migration Recommendation</p>
                                <p className="text-xs leading-relaxed" style={{ color: '#292824' }}>{f.migration_recommendation}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#8C877F' }}>
                                Code Evidence — {f.file_path}:{f.line_number}
                              </p>
                              <CodeExcerpt code={f.evidence_excerpt} />
                            </div>
                            {f.references.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#8C877F' }}>References</p>
                                <div className="flex flex-wrap gap-2">
                                  {f.references.map(ref => (
                                    <a key={ref} href={ref} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-[11px]" style={{ color: '#963B43' }}>
                                      <ExternalLink size={10} />
                                      {ref.replace('https://', '')}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-qs-border">
                <p className="text-xs" style={{ color: '#8C877F' }}>
                  Page {page} of {totalPages} · {filtered.length} findings
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-2 py-1 text-xs rounded border border-qs-border disabled:opacity-40"
                    style={{ color: '#8C877F' }}>
                    ← Prev
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-2 py-1 text-xs rounded border border-qs-border disabled:opacity-40"
                    style={{ color: '#8C877F' }}>
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
