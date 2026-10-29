import React from 'react';
import type { ScanResult } from '../../types/scanner';
import { AlgoBadge, SeverityBadge, SectionHeader, EmptyState } from '../../components/scanner/ScannerUI';
import { ScanSearch } from 'lucide-react';

interface Props { scanResult: ScanResult | null }

export function AlgorithmInventoryPage({ scanResult }: Props) {
  if (!scanResult) {
    return (
      <EmptyState
        icon={<ScanSearch size={36} />}
        title="No scan results"
        description="Run a repository scan to view the algorithm inventory."
      />
    );
  }

  const inv = scanResult.algorithm_inventory;
  const total = inv.reduce((s, a) => s + a.total_findings, 0);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Algorithm Inventory"
        description={`${inv.length} cryptographic algorithm famil${inv.length !== 1 ? 'ies' : 'y'} detected across ${total} finding${total !== 1 ? 's' : ''}`}
        badge="CRYPTOGRAPHIC INVENTORY"
      />

      {/* Overview bar chart */}
      <div className="qs-card p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#8C877F' }}>
          Finding Distribution
        </h3>
        <div className="space-y-3">
          {inv.map(alg => {
            const pct = total > 0 ? (alg.total_findings / total) * 100 : 0;
            return (
              <div key={alg.family}>
                <div className="flex items-center justify-between mb-1">
                  <AlgoBadge family={alg.family} />
                  <span className="font-mono text-xs" style={{ color: '#8C877F' }}>
                    {alg.total_findings} finding{alg.total_findings !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E8E1D8' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: '#963B43' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-1 gap-4">
        {inv.map(alg => (
          <div key={alg.family} className="qs-card overflow-hidden">
            <div className="px-4 py-3 border-b border-qs-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlgoBadge family={alg.family} />
                <div>
                  <span className="text-sm font-medium" style={{ color: '#292824' }}>
                    {alg.total_findings} finding{alg.total_findings !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs ml-2" style={{ color: '#8C877F' }}>
                    in {alg.files_affected} file{alg.files_affected !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {alg.critical > 0 && (
                  <span className="flex items-center gap-1">
                    <SeverityBadge severity="critical" compact />
                    <span className="font-mono text-xs" style={{ color: '#8C877F' }}>×{alg.critical}</span>
                  </span>
                )}
                {alg.high > 0 && (
                  <span className="flex items-center gap-1">
                    <SeverityBadge severity="high" compact />
                    <span className="font-mono text-xs" style={{ color: '#8C877F' }}>×{alg.high}</span>
                  </span>
                )}
                {alg.medium > 0 && (
                  <span className="flex items-center gap-1">
                    <SeverityBadge severity="medium" compact />
                    <span className="font-mono text-xs" style={{ color: '#8C877F' }}>×{alg.medium}</span>
                  </span>
                )}
                {alg.low > 0 && (
                  <span className="flex items-center gap-1">
                    <SeverityBadge severity="low" compact />
                    <span className="font-mono text-xs" style={{ color: '#8C877F' }}>×{alg.low}</span>
                  </span>
                )}
                {alg.info > 0 && (
                  <span className="flex items-center gap-1">
                    <SeverityBadge severity="info" compact />
                    <span className="font-mono text-xs" style={{ color: '#8C877F' }}>×{alg.info}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#8C877F' }}>
                Migration Direction
              </p>
              <p className="text-xs leading-relaxed" style={{ color: '#292824' }}>
                {alg.migration_target}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="qs-card p-4">
        <p className="text-[11px] leading-relaxed" style={{ color: '#8C877F' }}>
          <strong style={{ color: '#292824' }}>Note:</strong> A finding marks algorithmic usage requiring review. 
          It does not confirm an actively exploitable vulnerability. 
          Severity reflects quantum-security risk classification under the assumption of a future 
          large-scale quantum computer. Migration urgency depends on the sensitivity of protected data, 
          expected data longevity, and compliance requirements.
        </p>
      </div>
    </div>
  );
}
