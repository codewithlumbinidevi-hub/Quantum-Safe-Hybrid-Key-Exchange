import React from 'react';
import { Activity, ShieldCheck, AlertCircle } from 'lucide-react';

interface PqcHeaderProps {
  isBackendHealthy: boolean | null;
  onRunQuickExchange?: () => void;
  isRunning?: boolean;
}

export function PqcHeader({ isBackendHealthy, onRunQuickExchange, isRunning }: PqcHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b"
      style={{
        background: '#F8F6F1',
        borderColor: '#E8E0D7',
      }}
    >
      {/* Left Brand / Title */}
      <div className="flex items-baseline gap-3">
        <h1 className="font-serif text-[18px] font-normal tracking-wide" style={{ color: '#332F2D' }}>
          Q-SHIELD
        </h1>
        <span
          className="text-[10px] font-semibold tracking-widest uppercase"
          style={{ color: '#8E867D', letterSpacing: '0.14em' }}
        >
          QUANTUM SECURITY RESEARCH ENVIRONMENT
        </span>
      </div>

      {/* Right Controls & Health */}
      <div className="flex items-center gap-3">
        {/* Track Badge */}
        <span
          className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium"
          style={{ background: '#EDE8E0', color: '#68615A', border: '1px solid #DCD3C7' }}
        >
          TRACK 5 · PS-P1 (FIPS 203)
        </span>

        {/* Backend Status Chip */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
          style={{
            background: isBackendHealthy ? '#EBF5EE' : isBackendHealthy === false ? '#FBEBEB' : '#F1EFEA',
            color: isBackendHealthy ? '#2A6B3D' : isBackendHealthy === false ? '#A62626' : '#736B63',
            border: `1px solid ${isBackendHealthy ? '#C2E5CD' : isBackendHealthy === false ? '#F5C2C2' : '#DDD6CC'}`,
          }}
          title={isBackendHealthy ? 'FastAPI Backend Online (127.0.0.1:8000)' : 'Backend offline'}
        >
          <span
            className={`w-2 h-2 rounded-full ${isBackendHealthy ? 'bg-emerald-600' : isBackendHealthy === false ? 'bg-red-500' : 'bg-gray-400'}`}
          />
          <span>{isBackendHealthy ? 'Backend Connected' : isBackendHealthy === false ? 'Backend Offline' : 'Connecting...'}</span>
        </div>

        {/* Quick Action */}
        {onRunQuickExchange && (
          <button
            onClick={onRunQuickExchange}
            disabled={isRunning || isBackendHealthy === false}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium text-white transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
            style={{ background: '#963B43' }}
          >
            <Activity size={13} />
            <span>{isRunning ? 'Running...' : 'Quick Exchange'}</span>
          </button>
        )}
      </div>
    </header>
  );
}
