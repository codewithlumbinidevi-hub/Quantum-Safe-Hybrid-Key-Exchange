import React, { useEffect, useState } from 'react';
import type { TestMetrics } from '../../types/scanner';
import { fetchTestMetrics } from '../../services/scannerApi';
import { SectionHeader, MetricCard } from '../../components/scanner/ScannerUI';
import { AlertTriangle } from 'lucide-react';

export function TestResultsPage() {
  const [metrics, setMetrics] = useState<TestMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTestMetrics()
      .then(setMetrics)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 max-w-3xl">
      <SectionHeader
        title="Test Results & Evaluation"
        description="Scanner performance evaluated against the built-in synthetic ground-truth annotation set."
        badge="VALIDATION"
      />

      <div className="qs-card p-4 flex gap-3">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#C58B3A' }} />
        <p className="text-xs leading-relaxed" style={{ color: '#292824' }}>
          Metrics are computed against a <strong>synthetic demo repository</strong> with known cryptographic patterns.
          They do not represent performance on arbitrary codebases. 
          Precision and recall are only meaningful when a ground-truth annotation set is available.
        </p>
      </div>

      {loading && (
        <div className="qs-card p-8 flex items-center justify-center gap-2" style={{ color: '#8C877F' }}>
          <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          <span className="text-sm">Running evaluation scan…</span>
        </div>
      )}

      {error && (
        <div className="qs-card p-4 text-xs" style={{ color: '#C74848', background: '#FAE8E8' }}>
          Backend not available: {error}. Start the backend to compute live metrics.
        </div>
      )}

      {metrics && (
        <>
          {/* Test repository info */}
          <div className="qs-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#8C877F' }}>Test Repository</p>
            <p className="font-mono text-xs mb-1" style={{ color: '#292824' }}>{metrics.test_repo}</p>
            <p className="text-xs" style={{ color: '#8C877F' }}>{metrics.test_repo_url}</p>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Files Examined" value={metrics.total_files} />
            <MetricCard label="Ground Truth" value={metrics.ground_truth_findings} />
            <MetricCard label="True Positives" value={metrics.true_positives} accent />
            <MetricCard label="False Positives" value={metrics.false_positives} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="False Negatives" value={metrics.false_negatives} />
            <MetricCard label="Precision" value={metrics.precision_display} accent />
            <MetricCard label="Recall" value={metrics.recall_display} accent />
            <MetricCard label="Scan Duration" value={`${metrics.scan_duration_ms.toFixed(0)} ms`} />
          </div>

          {/* Formula explanation */}
          <div className="qs-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#8C877F' }}>Evaluation Formulas</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-xs font-semibold mb-1" style={{ color: '#292824' }}>Precision</p>
                <p className="font-mono text-xs" style={{ color: '#8C877F' }}>= TP / (TP + FP)</p>
                <p className="text-xs mt-1" style={{ color: '#8C877F' }}>
                  Fraction of detections that are in the ground truth.
                </p>
              </div>
              <div>
                <p className="font-mono text-xs font-semibold mb-1" style={{ color: '#292824' }}>Recall</p>
                <p className="font-mono text-xs" style={{ color: '#8C877F' }}>= TP / (TP + FN)</p>
                <p className="text-xs mt-1" style={{ color: '#8C877F' }}>
                  Fraction of ground-truth findings that were detected.
                </p>
              </div>
            </div>
            <p className="text-xs mt-3" style={{ color: '#8C877F' }}>
              Ground truth is matched per (file_path, rule_id) pair. Line-number matching is relaxed 
              to tolerate minor positional shifts.
              Zero denominators are handled by reporting "N/A".
            </p>
          </div>

          {/* Notes */}
          <div className="qs-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#8C877F' }}>Evaluation Notes</p>
            <p className="text-xs leading-relaxed" style={{ color: '#8C877F' }}>{metrics.notes}</p>
          </div>
        </>
      )}
    </div>
  );
}
