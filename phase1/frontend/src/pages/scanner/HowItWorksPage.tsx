import React, { useEffect, useState } from 'react';
import type { DetectionRule } from '../../types/scanner';
import { fetchRules } from '../../services/scannerApi';
import { SectionHeader, AlgoBadge, SeverityBadge } from '../../components/scanner/ScannerUI';

export function HowItWorksPage() {
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRules().then(setRules).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 max-w-3xl">
      <SectionHeader
        title="How It Works"
        description="Technical description of the Q-SHIELD scanner's detection methodology."
        badge="REFERENCE"
      />

      <div className="qs-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#292824' }}>Detection Methodology</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#8C877F' }}>
            Q-SHIELD performs <strong style={{ color: '#292824' }}>deterministic static analysis</strong> using 
            configurable regex-based detection rules. No AI, machine learning, or cloud services are used.
            The scanner reads source files as text and applies each rule's pattern set to every line.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#292824' }}>Supported Languages</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#8C877F' }}>
            <strong style={{ color: '#292824' }}>Python (.py)</strong> files receive full pattern-based scanning.
            Other text-format files (.cfg, .yaml, .toml, .json, .sh) receive limited pattern matching.
            Binary files are not scanned.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#292824' }}>What Is Not Detected</h3>
          <ul className="space-y-1.5 text-xs" style={{ color: '#8C877F' }}>
            <li className="flex gap-2"><span className="mt-1 flex-shrink-0">•</span>Cryptographic algorithms used indirectly through dynamic dispatch or reflection.</li>
            <li className="flex gap-2"><span className="mt-1 flex-shrink-0">•</span>Algorithms configured entirely at runtime from environment variables or databases.</li>
            <li className="flex gap-2"><span className="mt-1 flex-shrink-0">•</span>Custom or proprietary cryptographic implementations not matching known API patterns.</li>
            <li className="flex gap-2"><span className="mt-1 flex-shrink-0">•</span>Cryptographic usage in non-Python files beyond limited string matching.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#292824' }}>False Positives</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#8C877F' }}>
            Patterns may match occurrences in comments, docstrings, or string literals that do not represent 
            actual cryptographic usage. All findings should be reviewed by a human analyst.
          </p>
        </div>
      </div>

      {/* Detection rules */}
      <div className="qs-card overflow-hidden">
        <div className="px-4 py-3 border-b border-qs-border">
          <h3 className="text-sm font-medium" style={{ color: '#292824' }}>
            Detection Rules
            {rules.length > 0 && (
              <span className="ml-2 font-mono text-xs" style={{ color: '#8C877F' }}>
                ({rules.length} rules)
              </span>
            )}
          </h3>
        </div>
        {loading && (
          <div className="p-4 space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="shimmer h-8 rounded" />)}
          </div>
        )}
        {rules.length > 0 && (
          <table className="qs-table w-full">
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Name</th>
                <th>Family</th>
                <th>Severity</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.rule_id}>
                  <td className="font-mono text-xs" style={{ color: '#963B43' }}>{r.rule_id}</td>
                  <td className="text-xs" style={{ color: '#292824' }}>{r.rule_name}</td>
                  <td><AlgoBadge family={r.algorithm_family} /></td>
                  <td><SeverityBadge severity={r.severity as any} compact /></td>
                  <td>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: '#F4F1EC', color: '#8C877F' }}>
                      {r.confidence}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
