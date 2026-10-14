import React from 'react';
import type { Severity } from '../../types/scanner';

// ── Severity Badge ──────────────────────────────────────────────────────────
interface SeverityBadgeProps {
  severity: Severity;
  compact?: boolean;
}

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  info: 'INFO',
};

const SEVERITY_CLASSES: Record<Severity, string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
  info: 'badge-info',
};

export function SeverityBadge({ severity, compact }: SeverityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-mono font-semibold rounded ${SEVERITY_CLASSES[severity]} ${
        compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'
      }`}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

// ── Algorithm Family Badge ──────────────────────────────────────────────────
interface AlgoBadgeProps { family: string }

const ALGO_COLORS: Record<string, string> = {
  RSA: 'bg-[#FDF0F0] text-[#A03030] border-[#F0C8C8]',
  DSA: 'bg-[#FFF4E8] text-[#A06020] border-[#F0D8A0]',
  DH:  'bg-[#F0F4FF] text-[#3040A0] border-[#C0D0F0]',
  ECC: 'bg-[#F4F0FF] text-[#6040A0] border-[#D0C0F0]',
  Symmetric: 'bg-[#E8F8F0] text-[#207050] border-[#A0E0C0]',
  Hash: 'bg-[#F0F8FF] text-[#205070] border-[#A0D0F0]',
  Unknown: 'bg-[#F4F4F4] text-[#606060] border-[#D0D0D0]',
};

export function AlgoBadge({ family }: AlgoBadgeProps) {
  const cls = ALGO_COLORS[family] ?? ALGO_COLORS.Unknown;
  return (
    <span className={`inline-flex items-center font-mono text-[10px] font-semibold rounded border px-2 py-0.5 ${cls}`}>
      {family}
    </span>
  );
}

// ── Status Dot ──────────────────────────────────────────────────────────────
interface StatusDotProps { status: 'idle' | 'scanning' | 'completed' | 'failed' }

export function StatusDot({ status }: StatusDotProps) {
  const COLOR = {
    idle: 'bg-[#B8B0A8]',
    scanning: 'bg-[#C58B3A] animate-pulse',
    completed: 'bg-[#3E9B70]',
    failed: 'bg-[#C74848]',
  }[status];
  const LABEL = {
    idle: 'IDLE',
    scanning: 'SCANNING',
    completed: 'COMPLETED',
    failed: 'FAILED',
  }[status];
  const TEXT_COLOR = {
    idle: 'text-[#8C877F]',
    scanning: 'text-[#C58B3A]',
    completed: 'text-[#3E9B70]',
    failed: 'text-[#C74848]',
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider ${TEXT_COLOR}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${COLOR}`} />
      {LABEL}
    </span>
  );
}

// ── Metric Card ─────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

export function MetricCard({ label, value, sub, accent }: MetricCardProps) {
  return (
    <div className={`qs-card px-4 py-3 ${accent ? 'border-qs-maroon' : ''}`}>
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#8C877F' }}>
        {label}
      </p>
      <p className={`font-mono text-xl font-medium ${accent ? 'text-qs-maroon' : 'text-qs-text'}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: '#8C877F' }}>{sub}</p>}
    </div>
  );
}

// ── Section Header ──────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  children?: React.ReactNode;
}

export function SectionHeader({ title, description, badge, children }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        {badge && (
          <span
            className="inline-flex items-center font-mono text-[9px] font-semibold tracking-widest px-2 py-0.5 rounded mb-1.5"
            style={{ background: '#F4E8E7', color: '#963B43', border: '1px solid #E8C8C4' }}
          >
            {badge}
          </span>
        )}
        <h2 className="font-serif text-lg font-normal" style={{ color: '#292824' }}>{title}</h2>
        {description && (
          <p className="text-sm mt-0.5" style={{ color: '#8C877F' }}>{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// ── Code Excerpt ─────────────────────────────────────────────────────────────
interface CodeExcerptProps { code: string }

export function CodeExcerpt({ code }: CodeExcerptProps) {
  const lines = code.split('\n');
  return (
    <div className="code-block text-xs">
      {lines.map((line, i) => {
        const isCurrent = line.trimStart().startsWith('>>>');
        return (
          <div
            key={i}
            className={isCurrent ? 'excerpt-current-line' : undefined}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
}

// ── Skeleton Loader ──────────────────────────────────────────────────────────
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="shimmer h-3 rounded" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {icon && <div className="mb-4 opacity-30" style={{ color: '#8C877F' }}>{icon}</div>}
      <p className="font-serif text-base mb-1" style={{ color: '#292824' }}>{title}</p>
      {description && <p className="text-sm mb-4" style={{ color: '#8C877F' }}>{description}</p>}
      {action}
    </div>
  );
}

// ── Demo Banner ──────────────────────────────────────────────────────────────
export function DemoBanner() {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium"
      style={{ background: '#FFF8E8', border: '1px solid #F0D890', color: '#8A6010' }}
    >
      <span className="font-mono font-bold tracking-wide text-[10px]">
        ⚠ DEMO DATA — SYNTHETIC SAMPLE
      </span>
      <span className="opacity-70">Results are from a pre-built example repository, not a real codebase.</span>
    </div>
  );
}
