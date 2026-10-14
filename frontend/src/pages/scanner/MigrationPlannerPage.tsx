import React, { useEffect, useState } from 'react';
import { ExternalLink, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import type { MigrationRecommendation } from '../../types/scanner';
import { fetchMigrationGuide } from '../../services/scannerApi';
import { SectionHeader } from '../../components/scanner/ScannerUI';

export function MigrationPlannerPage() {
  const [guide, setGuide] = useState<MigrationRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMigrationGuide()
      .then(setGuide)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 max-w-3xl">
      <SectionHeader
        title="Migration Planner"
        description="Guidance for migrating from quantum-vulnerable classical cryptography to NIST-standardised post-quantum algorithms."
        badge="MIGRATION"
      />

      {/* Key notice */}
      <div className="qs-card p-4 flex gap-3">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#C58B3A' }} />
        <div className="text-xs leading-relaxed" style={{ color: '#292824' }}>
          <strong>Migration requires careful planning.</strong>{' '}
          A one-to-one algorithm replacement is not always appropriate or safe. 
          Production migration depends on protocol compatibility, library support, 
          interoperability, key sizes, performance, compliance requirements, and threat model.
          Consult the relevant NIST FIPS documents and protocol specifications before migrating.
          If hybrid cryptography is considered, use an established, reviewed protocol specification.
        </div>
      </div>

      {/* Migration table */}
      <div className="qs-card overflow-hidden">
        <div className="px-4 py-3 border-b border-qs-border">
          <h3 className="text-sm font-medium" style={{ color: '#292824' }}>Migration Direction Summary</h3>
        </div>
        <table className="qs-table w-full">
          <thead>
            <tr>
              <th>Classical Usage</th>
              <th>→</th>
              <th>Post-Quantum Direction</th>
              <th>NIST Standard</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-mono text-xs">RSA / ECDH key establishment</td>
              <td style={{ color: '#963B43' }}><ArrowRight size={12} /></td>
              <td><span className="font-mono text-xs font-semibold" style={{ color: '#3E9B70' }}>ML-KEM</span></td>
              <td className="font-mono text-xs" style={{ color: '#8C877F' }}>FIPS 203</td>
            </tr>
            <tr>
              <td className="font-mono text-xs">DH key exchange</td>
              <td style={{ color: '#963B43' }}><ArrowRight size={12} /></td>
              <td><span className="font-mono text-xs font-semibold" style={{ color: '#3E9B70' }}>ML-KEM</span></td>
              <td className="font-mono text-xs" style={{ color: '#8C877F' }}>FIPS 203</td>
            </tr>
            <tr>
              <td className="font-mono text-xs">ECDSA / DSA signatures</td>
              <td style={{ color: '#963B43' }}><ArrowRight size={12} /></td>
              <td><span className="font-mono text-xs font-semibold" style={{ color: '#3E9B70' }}>ML-DSA or SLH-DSA</span></td>
              <td className="font-mono text-xs" style={{ color: '#8C877F' }}>FIPS 204 / FIPS 205</td>
            </tr>
            <tr>
              <td className="font-mono text-xs">RSA signatures</td>
              <td style={{ color: '#963B43' }}><ArrowRight size={12} /></td>
              <td><span className="font-mono text-xs font-semibold" style={{ color: '#3E9B70' }}>ML-DSA or SLH-DSA</span></td>
              <td className="font-mono text-xs" style={{ color: '#8C877F' }}>FIPS 204 / FIPS 205</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Detail cards */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="qs-card p-4">
              <div className="shimmer h-4 rounded w-3/4 mb-2" />
              <div className="shimmer h-3 rounded w-full mb-1" />
              <div className="shimmer h-3 rounded w-5/6" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="qs-card p-4 text-xs" style={{ color: '#C74848', background: '#FAE8E8' }}>
          {error}
        </div>
      )}

      {guide.map((rec, i) => (
        <div key={i} className="qs-card overflow-hidden">
          <div className="px-4 py-3 border-b border-qs-border flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#8C877F' }}>
                Classical Usage
              </p>
              <p className="font-mono text-xs" style={{ color: '#C74848' }}>
                {rec.classical_usage}
              </p>
            </div>
            <ArrowRight size={16} style={{ color: '#963B43' }} />
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#8C877F' }}>
                Post-Quantum Target
              </p>
              <p className="font-mono text-xs font-semibold" style={{ color: '#3E9B70' }}>
                {rec.pqc_target}
              </p>
              <p className="font-mono text-[10px]" style={{ color: '#8C877F' }}>
                {rec.nist_standard}
              </p>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8C877F' }}>Rationale</p>
              <p className="text-xs leading-relaxed" style={{ color: '#292824' }}>{rec.rationale}</p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#8C877F' }}>Considerations</p>
              <ul className="space-y-1.5">
                {rec.considerations.map((c, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs" style={{ color: '#292824' }}>
                    <CheckCircle size={11} className="mt-0.5 flex-shrink-0" style={{ color: '#3E9B70' }} />
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {rec.references.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#8C877F' }}>References</p>
                <div className="flex flex-wrap gap-2">
                  {rec.references.map(ref => (
                    <a key={ref} href={ref} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px]" style={{ color: '#963B43' }}>
                      <ExternalLink size={10} />
                      {ref.replace('https://', '').replace('nvlpubs.nist.gov/nistpubs/FIPS/', 'NIST FIPS/')}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
