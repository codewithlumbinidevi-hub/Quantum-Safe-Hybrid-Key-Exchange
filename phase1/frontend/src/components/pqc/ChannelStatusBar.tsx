import React from 'react';
import { Shield, ShieldAlert, Cpu, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface ChannelStatusBarProps {
  isBackendHealthy: boolean | null;
  channelStatus?: Record<string, any> | null;
  lastRunId?: string | null;
  onRefresh?: () => void;
}

export function ChannelStatusBar({
  isBackendHealthy,
  channelStatus,
  lastRunId,
  onRefresh,
}: ChannelStatusBarProps) {
  const cryptoVer = channelStatus?.cryptography_version || '50.0.2';
  const pqcryptoVer = channelStatus?.pqcrypto_version || '1.0.0';

  return (
    <div
      className="border-b px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs select-none"
      style={{
        background: '#FAF8F4',
        borderColor: '#E8E1D8',
        color: '#4A4540',
      }}
    >
      {/* Left side: System status & active suite */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Backend health */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium"
          style={{
            background: isBackendHealthy ? '#EBF5EE' : isBackendHealthy === false ? '#FBEBEB' : '#F1EFEA',
            color: isBackendHealthy ? '#2A6B3D' : isBackendHealthy === false ? '#A62626' : '#736B63',
            border: `1px solid ${isBackendHealthy ? '#C2E5CD' : isBackendHealthy === false ? '#F5C2C2' : '#DDD6CC'}`,
          }}
          title={isBackendHealthy ? 'FastAPI Backend Online (127.0.0.1:8000)' : 'Backend offline'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isBackendHealthy ? 'bg-emerald-600' : isBackendHealthy === false ? 'bg-red-500' : 'bg-gray-400'
            }`}
          />
          <span>{isBackendHealthy ? 'API Online' : isBackendHealthy === false ? 'API Offline' : 'Connecting...'}</span>
        </div>

        {/* Primary Suite Pill */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium"
          style={{ background: '#F4E8E7', color: '#963B43', border: '1px solid #E8CDCE' }}
        >
          <Shield size={12} className="text-[#963B43]" />
          <span>ML-KEM-768 + ML-DSA-65 (FIPS 203/204)</span>
        </div>

        {/* Runtime Dependencies */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-[#8C877F]">
          <span>cryptography v{cryptoVer}</span>
          <span>·</span>
          <span>pqcrypto v{pqcryptoVer}</span>
          <span>·</span>
          <span>HKDF-SHA256 + AES-256-GCM</span>
        </div>
      </div>

      {/* Right side: Last Run & Prototype Disclaimer */}
      <div className="flex items-center gap-3 flex-wrap">
        {lastRunId && (
          <div className="flex items-center gap-1 text-[11px] font-mono text-[#68615A]">
            <span className="text-[#8C877F]">Last Run:</span>
            <span className="px-1.5 py-0.2 rounded bg-[#EFECE6] border border-[#DDD6CC] font-semibold">
              {lastRunId}
            </span>
          </div>
        )}

        {/* Security Disclosure Pill */}
        <div
          className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[10.5px] font-medium"
          style={{
            background: '#FEF7EA',
            color: '#9A6B1A',
            border: '1px solid #F6E3B8',
          }}
          title="Educational prototype for Qiskit Fall Fest 2026. Side-channel and production deployment hardening out of scope."
        >
          <AlertTriangle size={12} className="text-amber-600 flex-shrink-0" />
          <span>Prototype Security Notice</span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1 rounded text-[#8C877F] hover:text-[#963B43] hover:bg-[#F4E8E7] transition-colors cursor-pointer"
            title="Refresh channel telemetry"
          >
            <RefreshCw size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
