import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { PQCReference } from '../../types/scanner';
import { fetchPQCReference } from '../../services/scannerApi';
import { SectionHeader } from '../../components/scanner/ScannerUI';

export function PQCReferencePage() {
  const [refs, setRefs] = useState<PQCReference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPQCReference().then(setRefs).finally(() => setLoading(false));
  }, []);

  const categoryColor: Record<string, string> = {
    'Key Establishment (KEM)': '#3E9B70',
    'Digital Signatures': '#963B43',
    'Digital Signatures (Hash-Based)': '#C58B3A',
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <SectionHeader
        title="Post-Quantum Cryptography Reference"
        description="NIST-standardised post-quantum algorithms (August 2024). Use these as migration targets."
        badge="PQC REFERENCE"
      />

      {loading && (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="qs-card p-4"><div className="shimmer h-20 rounded" /></div>)}
        </div>
      )}

      {refs.map(ref => (
        <div key={ref.algorithm} className="qs-card overflow-hidden">
          <div className="px-4 py-3 border-b border-qs-border flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-base font-semibold" style={{ color: '#292824' }}>
                  {ref.algorithm}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{ background: '#F4E8E7', color: '#963B43', border: '1px solid #E8C8C4' }}>
                  {ref.nist_standard}
                </span>
              </div>
              <p className="text-xs" style={{ color: '#8C877F' }}>{ref.full_name}</p>
            </div>
            <span className="font-mono text-[10px] font-semibold px-2 py-1 rounded"
              style={{ background: '#E8F5EE', color: categoryColor[ref.category] || '#292824', border: '1px solid #C4E8D4' }}>
              {ref.category}
            </span>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs leading-relaxed" style={{ color: '#292824' }}>{ref.description}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8C877F' }}>Parameter Sets</p>
                <p className="font-mono text-xs" style={{ color: '#292824' }}>{ref.key_sizes}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8C877F' }}>Status</p>
                <p className="text-xs font-medium" style={{ color: '#3E9B70' }}>{ref.status}</p>
              </div>
            </div>
            {ref.references.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ref.references.map(r => (
                  <a key={r} href={r} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px]" style={{ color: '#963B43' }}>
                    <ExternalLink size={10} />
                    {r.replace('https://', '').replace('nvlpubs.nist.gov/nistpubs/FIPS/', 'NIST FIPS/')}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
