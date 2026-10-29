import {
  HealthResponse,
  HybridExchangeResult,
  CryptoBenchmarkResult,
  ProcessorBenchmarkResult,
  ResultsSummary,
} from '../types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response, fallbackError: string): Promise<T> {
  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || '';
    } catch {
      // Failed to parse JSON (likely a plain-text/HTML proxy error)
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        errorDetail = 'Backend API is offline on http://127.0.0.1:8000. Start the backend with: python -m uvicorn backend.app.main:app --port 8000';
      } else if (res.status === 500 && res.statusText === 'Internal Server Error') {
        errorDetail = 'Backend API is unreachable. Please verify that the FastAPI backend server is running on http://127.0.0.1:8000.';
      } else {
        errorDetail = res.statusText || fallbackError;
      }
    }
    throw new Error(errorDetail || fallbackError);
  }
  return res.json();
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse<HealthResponse>(res, 'Health check failed');
}

export async function runHybridExchange(demoMessage?: string): Promise<HybridExchangeResult> {
  const res = await fetch(`${API_BASE}/hybrid-exchange/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demo_message: demoMessage }),
  });
  return handleResponse<HybridExchangeResult>(res, 'Hybrid key exchange failed');
}

export async function runCryptoBenchmark(
  iterations: number = 100,
  platformProfile: string = 'platform_a',
  warmupIterations: number = 5,
  saveCsv: boolean = true,
  benchmarkMode: string = 'hybrid'
): Promise<CryptoBenchmarkResult> {
  const res = await fetch(`${API_BASE}/benchmarks/crypto/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      iterations,
      platform_profile: platformProfile,
      warmup_iterations: warmupIterations,
      save_csv: saveCsv,
      benchmark_mode: benchmarkMode,
    }),
  });
  return handleResponse<CryptoBenchmarkResult>(res, 'Cryptographic benchmark failed');
}

export async function getLatestCryptoBenchmark(): Promise<CryptoBenchmarkResult | null> {
  const res = await fetch(`${API_BASE}/benchmarks/crypto/latest`);
  if (res.status === 404) return null;
  return handleResponse<CryptoBenchmarkResult>(res, 'Failed to fetch latest crypto benchmark');
}

export function getExportCryptoCsvUrl(target: 'summary' | 'trials' = 'summary'): string {
  return `${API_BASE}/benchmarks/crypto/export?target=${target}`;
}

export function getManifestUrl(): string {
  return `${API_BASE}/results/manifest`;
}

export function getChecksumsUrl(): string {
  return `${API_BASE}/results/checksums`;
}

export function getBenchmarkDataUrl(): string {
  return `${API_BASE}/results/benchmark-data`;
}

export async function runProcessorBenchmark(
  circuitId: string = 'qft_5',
  shots: number = 4096,
  optimizationLevel: number = 1,
  seed: number = 42
): Promise<ProcessorBenchmarkResult> {
  const res = await fetch(`${API_BASE}/benchmarks/processors/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      circuit_id: circuitId,
      shots,
      optimization_level: optimizationLevel,
      seed,
      save_csv: true,
    }),
  });
  return handleResponse<ProcessorBenchmarkResult>(res, 'Processor benchmark failed');
}

export async function getLatestProcessorBenchmark(): Promise<ProcessorBenchmarkResult | null> {
  const res = await fetch(`${API_BASE}/benchmarks/processors/latest`);
  if (res.status === 404) return null;
  return handleResponse<ProcessorBenchmarkResult>(res, 'Failed to fetch latest processor benchmark');
}

export function getExportProcessorCsvUrl(): string {
  return `${API_BASE}/benchmarks/processors/export`;
}

export function getProcessorChartUrl(): string {
  return `${API_BASE}/benchmarks/processors/chart`;
}

export async function fetchResultsSummary(): Promise<ResultsSummary> {
  const res = await fetch(`${API_BASE}/results/summary`);
  return handleResponse<ResultsSummary>(res, 'Failed to fetch results summary');
}
