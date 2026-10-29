import React, { useState, useEffect } from 'react';
import { ShieldCheck, Play, Bug, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { PageHeading, MetricCard, StatusBadge } from '../../components/pqc/Common';
import { SecurityTestsResponse, SecurityTestItem } from '../../types/channel';
import { fetchLatestSecurityTests, startSecurityTestsRun, fetchJobStatus } from '../../services/channelApi';

export function SecuritySuitePage() {
  const [data, setData] = useState<SecurityTestsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobStep, setJobStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLatestSecurityTests();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch security tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunAllTests = async () => {
    try {
      setError(null);
      const res = await startSecurityTestsRun();
      setRunningJobId(res.job_id);
      setJobProgress(5);
      setJobStep('Starting security tests suite...');

      // Poll job status
      const interval = setInterval(async () => {
        try {
          const job = await fetchJobStatus(res.job_id);
          setJobProgress(job.progress);
          setJobStep(job.current_step);
          if (job.status === 'completed' || job.status === 'failed') {
            clearInterval(interval);
            setRunningJobId(null);
            await loadData();
          }
        } catch {
          clearInterval(interval);
          setRunningJobId(null);
        }
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to start test job');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Security Test Suite & Attack Laboratory"
        subtitle="Mandatory automated security test validation (T1 through T9) under Objective 4"
        badge="FIPS 203 / 204"
      >
        <button
          onClick={handleRunAllTests}
          disabled={runningJobId !== null || loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          style={{ background: '#963B43' }}
        >
          {runningJobId ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
          <span>{runningJobId ? `Running (${jobProgress}%)` : 'Run All Tests (T1–T9)'}</span>
        </button>
      </PageHeading>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Tests Status"
          value={data?.all_passed ? '9 / 9 PASS' : data ? `${data.passed_count} / ${data.total_count} PASS` : '—'}
          description="All mandatory tests verified"
          highlight={data?.all_passed}
        />
        <MetricCard
          label="Handshake & Auth"
          value="T1 - T3"
          description="Honest run, bit-flip, sig tamper"
        />
        <MetricCard
          label="Record & Integrity"
          value="T4 - T5"
          description="Ciphertext, tag & AAD tampering"
        />
        <MetricCard
          label="Identity & Downgrade"
          value="T6 - T9"
          description="Untrusted key, swap, replay, downgrade"
        />
      </div>

      {runningJobId && (
        <div className="p-4 rounded-lg border bg-[#FAF8F4] border-[#E8CDCE] space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-[#963B43]">
            <span>{jobStep || 'Executing tests in background...'}</span>
            <span>{jobProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#E8E1D8] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#963B43] transition-all duration-300"
              style={{ width: `${jobProgress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-[#FBEBEB] border border-[#F5C2C2] text-xs text-[#A62626]">
          {error}
        </div>
      )}

      {/* Tests Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden" style={{ borderColor: '#E8E1D8' }}>
        <div className="px-5 py-3 border-b border-[#E8E1D8] flex items-center justify-between bg-[#FAF8F4]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#963B43]" />
            <span className="font-semibold text-xs tracking-wide text-[#332F2D]">
              MANDATORY SECURITY TESTS (SECURITY_TESTS.md)
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#8C877F]">
            Last updated: {data?.last_updated || '—'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F4] border-b border-[#E8E1D8] text-[11px] font-mono uppercase text-[#8C877F]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">ID</th>
                <th className="py-2.5 px-4 font-semibold">Test Name</th>
                <th className="py-2.5 px-4 font-semibold">Injected Fault</th>
                <th className="py-2.5 px-4 font-semibold">Expected</th>
                <th className="py-2.5 px-4 font-semibold">Result</th>
                <th className="py-2.5 px-4 font-semibold">Observed Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E1D8]">
              {data?.tests.map((test) => (
                <tr key={test.test_id} className="hover:bg-[#FAF8F4] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#963B43]">{test.test_id}</td>
                  <td className="py-3 px-4 font-medium text-[#292824]">{test.description}</td>
                  <td className="py-3 px-4 font-mono text-[#68615A] text-[11px]">{test.injected_fault}</td>
                  <td className="py-3 px-4 text-[#68615A]">{test.expected}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                        test.result === 'PASS'
                          ? 'bg-[#EBF5EE] text-[#2A6B3D] border border-[#C2E5CD]'
                          : 'bg-[#FBEBEB] text-[#A62626] border border-[#F5C2C2]'
                      }`}
                    >
                      {test.result === 'PASS' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      <span>{test.result}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#4A4540] max-w-md truncate" title={test.observed}>
                    {test.observed}
                  </td>
                </tr>
              ))}
              {(!data || data.tests.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#8C877F]">
                    No security test results found. Click &quot;Run All Tests&quot; to execute the suite.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
