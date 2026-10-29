import React, { useEffect, useState } from 'react';
import type { ScanResult } from '../../types/scanner';
import { SectionHeader, EmptyState, SeverityBadge, AlgoBadge } from '../../components/scanner/ScannerUI';
import { History } from 'lucide-react';

interface Props {
  history: ScanResult[];
  onLoad: (result: ScanResult) => void;
}

export function ScanHistoryPage({ history, onLoad }: Props) {
  if (history.length === 0) {
    return (
      <EmptyState
        icon={<History size={36} />}
        title="No scan history"
        description="Completed scans will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Scan History"
        description={`${history.length} scan${history.length !== 1 ? 's' : ''} completed this session`}
        badge="VALIDATION"
      />

      <div className="qs-card overflow-hidden">
        <table className="qs-table w-full">
          <thead>
            <tr>
              <th>Repository</th>
              <th>Timestamp</th>
              <th>Files</th>
              <th>Findings</th>
              <th>Critical</th>
              <th>High</th>
              <th>Duration</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map(r => (
              <tr key={r.summary.scan_id}>
                <td>
                  <span className="font-mono text-xs" style={{ color: '#292824' }}>
                    {r.summary.is_demo ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded mr-1"
                        style={{ background: '#FFF8E8', color: '#8A6010', border: '1px solid #F0D890' }}>
                        DEMO
                      </span>
                    ) : null}
                    {r.summary.repo_source.replace('github:', '').replace('upload:', '')}
                  </span>
                </td>
                <td className="font-mono text-xs" style={{ color: '#8C877F' }}>{r.summary.timestamp}</td>
                <td className="font-mono text-xs" style={{ color: '#8C877F' }}>{r.summary.files_scanned}</td>
                <td className="font-mono text-xs font-semibold" style={{ color: '#292824' }}>{r.summary.total_findings}</td>
                <td>{r.summary.critical_count > 0 ? <SeverityBadge severity="critical" compact /> : <span className="text-xs opacity-40">—</span>}</td>
                <td>{r.summary.high_count > 0 ? <SeverityBadge severity="high" compact /> : <span className="text-xs opacity-40">—</span>}</td>
                <td className="font-mono text-xs" style={{ color: '#8C877F' }}>{(r.summary.scan_duration_ms / 1000).toFixed(2)}s</td>
                <td>
                  <button
                    onClick={() => onLoad(r)}
                    className="text-xs px-2 py-1 rounded border border-qs-border hover:bg-qs-softMaroon transition-colors"
                    style={{ color: '#963B43' }}
                  >
                    Load
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
