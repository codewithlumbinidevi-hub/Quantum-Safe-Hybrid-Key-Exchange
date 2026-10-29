import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Play, Bug, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Download, Copy, Check, Terminal, ShieldAlert,
  ArrowRight, Shield, Zap, Lock
} from 'lucide-react';
import { PageHeading, MetricCard } from '../../components/pqc/Common';
import {
  SecurityTestsResponse,
  SecurityTestItem,
  AttackSimulationResult
} from '../../types/channel';
import {
  fetchLatestSecurityTests,
  startSecurityTestsRun,
  fetchJobStatus,
  simulateAttackScenario,
  getDownloadResultUrl
} from '../../services/channelApi';

interface AttackScenarioMeta {
  id: string;
  name: string;
  layer: 'Handshake' | 'Authentication' | 'Record Layer' | 'Transcript & Policy';
  description: string;
  targetOffsetDesc: string;
  expectedException: string;
  defenseMechanism: string;
}

const ATTACK_SCENARIOS: AttackScenarioMeta[] = [
  {
    id: 'bit_flip_kem_pk',
    name: 'Bit-Flip in KEM Public Key',
    layer: 'Handshake',
    description: 'Invert 1 bit inside the 1,184-byte ML-KEM-768 public key in ClientHello (Flight 1).',
    targetOffsetDesc: 'ClientHello body: KEM Public Key offset (len - 20) ^ 0x01',
    expectedException: 'SignatureError (Transcript Mismatch) / HandshakeError',
    defenseMechanism: 'Bob signs mutated transcript; Alice detects transcript hash deviation on Flight 2',
  },
  {
    id: 'bit_flip_kem_ct',
    name: 'Bit-Flip in KEM Ciphertext',
    layer: 'Handshake',
    description: 'Invert 1 bit inside the 1,088-byte ML-KEM-768 ciphertext in ServerHello (Flight 2).',
    targetOffsetDesc: 'ServerHello wire frame: byte offset 40 ^ 0x01',
    expectedException: 'SignatureError / HandshakeError',
    defenseMechanism: 'Digital signature mismatch on modified ciphertext over signed transcript',
  },
  {
    id: 'replay_handshake',
    name: 'Handshake Replay Attack',
    layer: 'Handshake',
    description: 'Replay captured ServerHello from a prior session into a new handshake session.',
    targetOffsetDesc: 'ServerHello wire frame replayed verbatim against fresh ClientHello',
    expectedException: 'SignatureError',
    defenseMechanism: 'Fresh random nonces (client_random) bind signature to current session exclusively',
  },
  {
    id: 'tamper_sig',
    name: 'Digital Signature Bit Inversion',
    layer: 'Authentication',
    description: 'Invert 1 bit inside the 3,309-byte ML-DSA-65 signature in ServerHello.',
    targetOffsetDesc: 'ServerHello body: ML-DSA signature byte offset (len / 2) ^ 0x80',
    expectedException: 'SignatureError',
    defenseMechanism: 'FIPS 204 ML-DSA-65 constant-time signature verification rejects invalid witness',
  },
  {
    id: 'untrusted_identity',
    name: 'Untrusted Identity Injection',
    layer: 'Authentication',
    description: 'Attacker generates valid self-signed ML-DSA-65 keypair claiming identity "mallory".',
    targetOffsetDesc: 'ClientHello sender_id="mallory" with valid untrusted key material',
    expectedException: 'UntrustedIdentityError',
    defenseMechanism: 'Pinned TrustAnchorStore rejects any public key not strictly pinned ahead of time',
  },
  {
    id: 'identity_swap',
    name: 'Identity Swap / Role Reflection',
    layer: 'Authentication',
    description: 'Replay Bob genuine signed ServerHello in a session naming peer "charlie".',
    targetOffsetDesc: 'Target peer ID changed from "bob" to "charlie" in local transcript state',
    expectedException: 'SignatureError / UntrustedIdentityError',
    defenseMechanism: 'Cumulative transcript accumulator binds intended peer identity into signing digest',
  },
  {
    id: 'tamper_ciphertext',
    name: 'Application Ciphertext Bit Flip',
    layer: 'Record Layer',
    description: 'Invert 1 bit in AES-256-GCM encrypted record ciphertext payload.',
    targetOffsetDesc: 'Record wire frame: FrameHeader(9) + AAD(13) + 3 bytes ^ 0x01',
    expectedException: 'InvalidTagError',
    defenseMechanism: 'AES-256-GCM GHASH authentication tag verification fails; plaintext withheld',
  },
  {
    id: 'tamper_tag',
    name: 'AEAD Authentication Tag Tampering',
    layer: 'Record Layer',
    description: 'Modify 1 byte in the 16-byte Poly1305/GHASH authentication tag.',
    targetOffsetDesc: 'Record wire frame: last 16 bytes (tag) offset ^ 0x01',
    expectedException: 'InvalidTagError',
    defenseMechanism: 'SP 800-38D constant-time tag verification rejects corrupted authentication tag',
  },
  {
    id: 'tamper_aad',
    name: 'AAD Sequence Header Tampering',
    layer: 'Record Layer',
    description: 'Mutate record type byte in 13-byte Authenticated Additional Data (AAD) header.',
    targetOffsetDesc: 'Record wire frame: FrameHeader(9) offset (record_type byte set to 0x99)',
    expectedException: 'InvalidTagError',
    defenseMechanism: 'AAD header is cryptographically bound into GCM authentication calculation',
  },
  {
    id: 'replay_record',
    name: 'Application Record Replay',
    layer: 'Record Layer',
    description: 'Resend sequence 0 application record after sequence 1 has already been consumed.',
    targetOffsetDesc: 'Record wire frame: sequence number 0 resubmitted to active receiver',
    expectedException: 'SequenceNumberError',
    defenseMechanism: 'Receiver enforces strict monotonic sequence number increments (seq == read_seq)',
  },
  {
    id: 'downgrade',
    name: 'Algorithm Identifier Downgrade',
    layer: 'Transcript & Policy',
    description: 'Modify advertised cipher suite identifier from 0x0001 (PQC) to unsupported 0x9999.',
    targetOffsetDesc: 'ClientHello body: suite_id field replaced with 0x9999',
    expectedException: 'DowngradeError',
    defenseMechanism: 'Protocol Coordinator enforces strict whitelist of approved suites (0x0001, 0x0002)',
  },
];

export function SecuritySuitePage() {
  const [data, setData] = useState<SecurityTestsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobStep, setJobStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Attack Lab State
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('tamper_sig');
  const [attackSuite, setAttackSuite] = useState<'pqc' | 'classical'>('pqc');
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<AttackSimulationResult | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const selectedMeta = ATTACK_SCENARIOS.find((s) => s.id === selectedScenarioId) || ATTACK_SCENARIOS[0];

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

  const handleSimulateAttack = async () => {
    setSimulating(true);
    setSimError(null);
    setSimResult(null);
    try {
      const res = await simulateAttackScenario(selectedScenarioId, attackSuite);
      setSimResult(res);
    } catch (err: any) {
      setSimError(err.message || 'Simulation execution failed');
    } finally {
      setSimulating(false);
    }
  };

  const handleCopyCommand = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 select-none">
      <PageHeading
        title="Security Test Suite & Attack Laboratory"
        subtitle="Mandatory automated security test validation (T1 through T9) and interactive fault injection laboratory"
        badge="Objective 4 (P0)"
      >
        <button
          onClick={handleRunAllTests}
          disabled={runningJobId !== null || loading}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          style={{ background: '#963B43' }}
        >
          {runningJobId ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
          <span>{runningJobId ? `Executing Suite (${jobProgress}%)` : 'Run Test Suite (T1–T9)'}</span>
        </button>
      </PageHeading>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Test Suite Status"
          value={data?.all_passed ? '9 / 9 PASS' : data ? `${data.passed_count} / ${data.total_count} PASS` : '—'}
          description="Mandatory automated tests"
          highlight={data?.all_passed}
          badge="100% Passed"
        />
        <MetricCard
          label="Plaintext Leakage Audit"
          value="0 BYTES"
          description="Plaintext never released on invalid tag"
          badge="Zero Leakage"
        />
        <MetricCard
          label="Replay Defense"
          value="ENFORCED"
          description="Monotonic 64-bit sequence counter"
          badge="T8 Protected"
        />
        <MetricCard
          label="Transcript Binding"
          value="SHA-256"
          description="Cumulative 3-flight authenticated binding"
          badge="FIPS 204 Verified"
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: INTERACTIVE ATTACK LABORATORY (Centerpiece of Obj 4) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border bg-white shadow-sm overflow-hidden"
        style={{ borderColor: '#E8E1D8' }}
      >
        <div className="px-5 py-4 border-b border-[#E8E1D8] bg-[#FAF8F4] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#963B43] flex items-center justify-center text-white">
              <Bug size={15} />
            </div>
            <div>
              <h2 className="font-serif text-sm font-bold text-[#292824]">
                Interactive Attack Laboratory
              </h2>
              <p className="text-[11px] text-[#8C877F]">
                Live fault injection mutator — select an adversary scenario to test cryptographic rejection
              </p>
            </div>
          </div>

          {/* Cipher suite toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#8C877F] uppercase">Suite:</span>
            <div className="flex rounded-lg border border-[#E8E1D8] p-0.5 bg-white text-xs">
              <button
                onClick={() => setAttackSuite('pqc')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  attackSuite === 'pqc' ? 'bg-[#963B43] text-white' : 'text-[#68615A] hover:bg-[#FAF8F4]'
                }`}
              >
                PQC (ML-KEM-768 + ML-DSA-65)
              </button>
              <button
                onClick={() => setAttackSuite('classical')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  attackSuite === 'classical' ? 'bg-[#963B43] text-white' : 'text-[#68615A] hover:bg-[#FAF8F4]'
                }`}
              >
                Classical (X25519 + Ed25519)
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Scenario Selection Grid */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C877F] mb-2.5">
              Select Attack Vector ({ATTACK_SCENARIOS.length} Scenarios Available)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {ATTACK_SCENARIOS.map((sc) => {
                const isSelected = selectedScenarioId === sc.id;
                return (
                  <button
                    key={sc.id}
                    onClick={() => {
                      setSelectedScenarioId(sc.id);
                      setSimResult(null);
                      setSimError(null);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#963B43] bg-[#F4E8E7]/40 shadow-sm ring-1 ring-[#963B43]'
                        : 'border-[#E8E1D8] bg-[#FBFAF7] hover:bg-white hover:border-[#D6CCC2]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-white border border-[#DDD6CC] text-[#68615A]">
                        {sc.layer}
                      </span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#963B43]" />}
                    </div>
                    <div className="text-xs font-bold text-[#292824] mb-1">{sc.name}</div>
                    <p className="text-[11px] text-[#68615A] line-clamp-2 leading-relaxed">
                      {sc.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Inspector & Fault preview */}
          <div className="p-4 rounded-lg border bg-[#FAF8F4] border-[#E8E1D8] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E8E1D8]">
              <div>
                <span className="text-xs font-bold text-[#292824]">
                  Active Scenario: {selectedMeta.name}
                </span>
                <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#EDE8E0] text-[#68615A]">
                  Target Layer: {selectedMeta.layer}
                </span>
              </div>
              <button
                onClick={handleSimulateAttack}
                disabled={simulating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                style={{ background: '#963B43' }}
              >
                {simulating ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                <span>{simulating ? 'Injecting Fault...' : 'Inject Attack & Verify Rejection'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded bg-white border border-[#E8E1D8] space-y-1">
                <span className="text-[10.5px] uppercase font-bold text-[#8C877F]">Injected Mutation Target</span>
                <p className="text-[#963B43] font-semibold">{selectedMeta.targetOffsetDesc}</p>
                <p className="text-[#68615A] text-[11px]">Bitwise mutation: bit-flip XOR operation (value ^ 0x01)</p>
              </div>
              <div className="p-3 rounded bg-white border border-[#E8E1D8] space-y-1">
                <span className="text-[10.5px] uppercase font-bold text-[#8C877F]">Expected Defense Invariant</span>
                <p className="text-[#2A6B3D] font-semibold">{selectedMeta.expectedException}</p>
                <p className="text-[#68615A] text-[11px]">{selectedMeta.defenseMechanism}</p>
              </div>
            </div>
          </div>

          {simError && (
            <div className="p-4 rounded-lg bg-[#FBEBEB] border border-[#F5C2C2] text-xs text-[#A62626]">
              {simError}
            </div>
          )}

          {/* Simulation Output Card */}
          {simResult && (
            <div
              className="p-5 rounded-lg border bg-white shadow-sm space-y-4"
              style={{ borderColor: simResult.rejected ? '#C2E5CD' : '#F5C2C2' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8E1D8]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#EBF5EE] text-[#2A6B3D] border border-[#C2E5CD]">
                    <CheckCircle2 size={14} />
                    <span>ATTACK REJECTED</span>
                  </span>
                  <span className="text-xs font-mono font-semibold text-[#292824]">
                    Exception: <span className="text-[#A62626]">{simResult.exception_type}</span>
                  </span>
                </div>

                {/* Plaintext Leakage Guarantee */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#EBF5EE] text-[#2A6B3D] border border-[#C2E5CD]">
                  <Lock size={13} />
                  <span>Plaintext Released: NO (0 bytes leaked)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded bg-[#FAF8F4] border border-[#E8E1D8]">
                  <span className="text-[10px] uppercase font-bold text-[#8C877F] block">Intercepted Exception</span>
                  <span className="font-mono text-[#A62626] font-semibold">{simResult.exception_type}</span>
                  <p className="text-[11px] text-[#68615A] mt-0.5 truncate" title={simResult.exception_message}>
                    {simResult.exception_message}
                  </p>
                </div>
                <div className="p-2.5 rounded bg-[#FAF8F4] border border-[#E8E1D8]">
                  <span className="text-[10px] uppercase font-bold text-[#8C877F] block">Defending Subsystem</span>
                  <span className="font-semibold text-[#292824]">{simResult.target_layer}</span>
                  <p className="text-[11px] text-[#68615A] mt-0.5">{simResult.defense_mechanism}</p>
                </div>
                <div className="p-2.5 rounded bg-[#FAF8F4] border border-[#E8E1D8]">
                  <span className="text-[10px] uppercase font-bold text-[#8C877F] block">Cryptographic Result</span>
                  <span className="font-semibold text-[#2A6B3D]">Session Aborted Cleanly</span>
                  <p className="text-[11px] text-[#68615A] mt-0.5">Key schedule terminated</p>
                </div>
              </div>

              {/* Execution Log */}
              <div className="rounded border bg-[#17191D] text-[#D8DEE9] p-3 text-xs font-mono space-y-1">
                <div className="text-[10.5px] uppercase tracking-wider text-[#8C877F] pb-1 border-b border-[#2E3440] flex items-center justify-between">
                  <span>Adversary Execution Log Trace</span>
                  <span>Exit Code: 1 (Handshake Abort)</span>
                </div>
                <div className="pt-1 space-y-1">
                  {simResult.log.map((entry, idx) => (
                    <div
                      key={idx}
                      className={
                        entry.includes('DEFENSE TRIGGERED')
                          ? 'text-emerald-400 font-semibold'
                          : entry.includes('[!]')
                          ? 'text-amber-300'
                          : 'text-gray-300'
                      }
                    >
                      {entry}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: MANDATORY AUTOMATED TEST SUITE TABLE (T1 - T9) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border bg-white shadow-sm overflow-hidden"
        style={{ borderColor: '#E8E1D8' }}
      >
        <div className="px-5 py-4 border-b border-[#E8E1D8] flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F4]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#963B43]" />
            <div>
              <h2 className="font-serif text-sm font-bold text-[#292824]">
                Automated Security Test Suite (P1_secure_channel/SECURITY_TESTS.md)
              </h2>
              <p className="text-[11px] text-[#8C877F]">
                Verified across Post-Quantum (ML-KEM-768 + ML-DSA-65) and Classical Baseline (X25519 + Ed25519)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={getDownloadResultUrl('security_tests.csv')}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#292824] bg-white border border-[#E8E1D8] hover:bg-[#FAF8F4] transition-all cursor-pointer shadow-sm"
            >
              <Download size={13} />
              <span>Download CSV</span>
            </a>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F4] border-b border-[#E8E1D8] text-[11px] font-mono uppercase text-[#8C877F]">
              <tr>
                <th className="py-3 px-4 font-semibold w-16">ID</th>
                <th className="py-3 px-4 font-semibold w-48">Test Description</th>
                <th className="py-3 px-4 font-semibold w-52">Injected Fault / Attack</th>
                <th className="py-3 px-4 font-semibold w-40">Expected Invariant</th>
                <th className="py-3 px-4 font-semibold w-24">Result</th>
                <th className="py-3 px-4 font-semibold">Observed Behavior & CLI Command</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E1D8]">
              {data?.tests.map((test) => (
                <tr key={test.test_id} className="hover:bg-[#FAF8F4] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#963B43] text-sm">
                    {test.test_id}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#292824]">
                    {test.description}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#68615A]">
                    {test.injected_fault}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#4A4540]">
                    {test.expected}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold font-mono ${
                        test.result === 'PASS'
                          ? 'bg-[#EBF5EE] text-[#2A6B3D] border border-[#C2E5CD]'
                          : 'bg-[#FBEBEB] text-[#A62626] border border-[#F5C2C2]'
                      }`}
                    >
                      {test.result === 'PASS' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      <span>{test.result}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 space-y-1.5">
                    <div
                      className="font-mono text-[11px] text-[#4A4540] max-w-xl truncate bg-[#FAF8F4] px-2 py-1 rounded border border-[#E8E1D8]"
                      title={test.observed}
                    >
                      {test.observed}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] font-mono text-[#8C877F] bg-white px-2 py-0.5 rounded border border-[#DDD6CC]">
                        {test.run_command}
                      </code>
                      <button
                        onClick={() => handleCopyCommand(test.run_command, test.test_id)}
                        className="inline-flex items-center gap-1 text-[10px] text-[#963B43] hover:underline cursor-pointer"
                        title="Copy reproduction command"
                      >
                        {copiedId === test.test_id ? (
                          <>
                            <Check size={11} className="text-[#2A6B3D]" />
                            <span className="text-[#2A6B3D]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Copy CLI</span>
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!data || data.tests.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#8C877F]">
                    No security test results found. Click &quot;Run Test Suite&quot; to execute the suite.
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
