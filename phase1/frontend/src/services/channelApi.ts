/**
 * API client functions for Phase 2 Secure Communication Channel endpoints.
 */
import {
  HandshakeRunResponse,
  SecurityTestsResponse,
  AttackSimulationResult,
  BackgroundJob,
  PlatformInfo,
  TrustInfo,
  ResultFileItem,
  BenchmarkLatestResponse,
  SubmissionVerificationResponse,
} from '../types/channel';

const API_BASE = '/api/channel';

async function handleResponse<T>(res: Response, fallbackError: string): Promise<T> {
  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || '';
    } catch {
      errorDetail = res.statusText || fallbackError;
    }
    throw new Error(errorDetail || fallbackError);
  }
  return res.json();
}

export async function fetchChannelStatus(): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/status`);
  return handleResponse<Record<string, any>>(res, 'Failed to fetch channel status');
}

export async function runLiveHandshake(
  suite: 'pqc' | 'classical' = 'pqc',
  transport: 'loopback' | 'tcp' = 'loopback',
  payload: 'none' | '1kb' | '100kb' | '10mb' = 'none'
): Promise<HandshakeRunResponse> {
  const res = await fetch(`${API_BASE}/handshake/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suite, transport, payload }),
  });
  return handleResponse<HandshakeRunResponse>(res, 'Handshake execution failed');
}

export async function getHandshakeRun(runId: string): Promise<HandshakeRunResponse> {
  const res = await fetch(`${API_BASE}/handshake/${runId}`);
  return handleResponse<HandshakeRunResponse>(res, `Failed to fetch handshake run ${runId}`);
}

export async function fetchLatestSecurityTests(): Promise<SecurityTestsResponse> {
  const res = await fetch(`${API_BASE}/tests/latest`);
  return handleResponse<SecurityTestsResponse>(res, 'Failed to fetch security tests');
}

export async function startSecurityTestsRun(testId?: string): Promise<{ job_id: string; status: string; message: string }> {
  const url = testId ? `${API_BASE}/tests/run?test_id=${encodeURIComponent(testId)}` : `${API_BASE}/tests/run`;
  const res = await fetch(url, { method: 'POST' });
  return handleResponse<{ job_id: string; status: string; message: string }>(res, 'Failed to trigger security tests');
}

export async function simulateAttackScenario(
  scenario: string,
  suite: 'pqc' | 'classical' = 'pqc'
): Promise<AttackSimulationResult> {
  const res = await fetch(`${API_BASE}/attack/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario, suite }),
  });
  return handleResponse<AttackSimulationResult>(res, 'Attack simulation failed');
}

export async function fetchJobStatus(jobId: string): Promise<BackgroundJob> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  return handleResponse<BackgroundJob>(res, `Failed to poll job ${jobId}`);
}

export async function fetchBenchmarkLatest(): Promise<BenchmarkLatestResponse> {
  const res = await fetch(`${API_BASE}/benchmark/latest`);
  return handleResponse<BenchmarkLatestResponse>(res, 'Failed to fetch benchmark data');
}

export async function startBenchmarkRun(
  suite: 'pqc' | 'classical' | 'both' = 'both',
  trials: number = 20,
  mode: 'in_process' | 'tcp_loopback' = 'in_process'
): Promise<{ job_id: string; status: string; message: string }> {
  const res = await fetch(`${API_BASE}/benchmark/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suite, trials, mode }),
  });
  return handleResponse<{ job_id: string; status: string; message: string }>(res, 'Failed to trigger benchmark');
}

export async function fetchPlatformInfo(): Promise<PlatformInfo> {
  const res = await fetch(`${API_BASE}/platform/info`);
  return handleResponse<PlatformInfo>(res, 'Failed to fetch platform info');
}

export async function fetchTrustInfo(): Promise<TrustInfo> {
  const res = await fetch(`${API_BASE}/trust/info`);
  return handleResponse<TrustInfo>(res, 'Failed to fetch trust info');
}

export async function fetchResultFiles(): Promise<ResultFileItem[]> {
  const res = await fetch(`${API_BASE}/results/files`);
  return handleResponse<ResultFileItem[]>(res, 'Failed to enumerate result files');
}

export function getDownloadResultUrl(filename: string): string {
  return `${API_BASE}/results/download/${filename}`;
}

export async function verifySubmissionArtifacts(): Promise<SubmissionVerificationResponse> {
  const res = await fetch(`${API_BASE}/submission/verify`);
  return handleResponse<SubmissionVerificationResponse>(res, 'Failed to verify submission artifacts');
}

export async function fetchReportText(): Promise<string> {
  const res = await fetch(`${API_BASE}/report/text`);
  const data = await handleResponse<{ content: string }>(res, 'Failed to fetch report text');
  return data.content;
}

export function getResultsBundleUrl(): string {
  return `${API_BASE}/results/bundle`;
}

