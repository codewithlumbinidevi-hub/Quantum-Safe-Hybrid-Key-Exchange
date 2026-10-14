// Q-SHIELD Scanner — Frontend API Service

import type {
  ScanResult,
  PQCReference,
  MigrationRecommendation,
  DetectionRule,
  TestMetrics,
} from '../types/scanner';

const BASE = '/api/scanner';

async function handleResponse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j.detail || '';
    } catch {
      detail = res.statusText || fallback;
    }
    throw new Error(detail || fallback);
  }
  return res.json();
}

export async function scannerHealth() {
  const res = await fetch(`${BASE}/health`);
  return handleResponse<Record<string, any>>(res, 'Scanner health check failed');
}

export async function runScan(repoUrl: string, branch: string = 'main'): Promise<ScanResult> {
  const res = await fetch(`${BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url: repoUrl, branch, demo_mode: false }),
  });
  return handleResponse<ScanResult>(res, 'Scan failed');
}

export async function runDemoScan(): Promise<ScanResult> {
  const res = await fetch(`${BASE}/demo`);
  return handleResponse<ScanResult>(res, 'Demo scan failed');
}

export async function uploadAndScan(file: File): Promise<ScanResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/scan/upload`, {
    method: 'POST',
    body: form,
  });
  return handleResponse<ScanResult>(res, 'Upload scan failed');
}

export async function fetchPQCReference(): Promise<PQCReference[]> {
  const res = await fetch(`${BASE}/pqc-reference`);
  return handleResponse<PQCReference[]>(res, 'Failed to fetch PQC reference');
}

export async function fetchMigrationGuide(): Promise<MigrationRecommendation[]> {
  const res = await fetch(`${BASE}/migration-guide`);
  return handleResponse<MigrationRecommendation[]>(res, 'Failed to fetch migration guide');
}

export async function fetchRules(): Promise<DetectionRule[]> {
  const res = await fetch(`${BASE}/rules`);
  return handleResponse<DetectionRule[]>(res, 'Failed to fetch detection rules');
}

export async function fetchTestMetrics(): Promise<TestMetrics> {
  const res = await fetch(`${BASE}/test-metrics`);
  return handleResponse<TestMetrics>(res, 'Failed to fetch test metrics');
}

export function getReportUrl(scanId: string, format: 'json' | 'csv' | 'markdown') {
  return `${BASE}/scan/${scanId}/report?format=${format}`;
}
