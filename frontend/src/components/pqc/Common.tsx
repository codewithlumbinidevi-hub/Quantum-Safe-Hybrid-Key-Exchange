import React from 'react';
import { AlertCircle, CheckCircle2, Clock, Info, HelpCircle } from 'lucide-react';

/* ─── Page Heading ───────────────────────────────────────────────────────── */
interface PageHeadingProps {
  title: string;
  subtitle?: string;
  badge?: string;
  children?: React.ReactNode;
}

export function PageHeading({ title, subtitle, badge, children }: PageHeadingProps) {
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-2xl font-normal tracking-tight" style={{ color: '#332F2D' }}>
            {title}
          </h2>
          {badge && (
            <span
              className="px-2 py-0.5 rounded text-[11px] font-mono font-medium"
              style={{ background: '#EDE8E0', color: '#68615A', border: '1px solid #DCD3C7' }}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs" style={{ color: '#8E867D' }}>
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

/* ─── Status Badge ────────────────────────────────────────────────────────── */
interface StatusBadgeProps {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'waiting' | 'nominal';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const configs = {
    idle: { bg: '#F1EFEA', text: '#736B63', border: '#DDD6CC', dot: 'bg-gray-400', defaultLabel: 'Idle' },
    waiting: { bg: '#F1EFEA', text: '#736B63', border: '#DDD6CC', dot: 'bg-gray-400', defaultLabel: 'Waiting' },
    running: { bg: '#FEF7EA', text: '#9A6B1A', border: '#F6E3B8', dot: 'bg-amber-500 animate-pulse', defaultLabel: 'Running' },
    completed: { bg: '#EBF5EE', text: '#2A6B3D', border: '#C2E5CD', dot: 'bg-emerald-600', defaultLabel: 'Completed' },
    nominal: { bg: '#EBF5EE', text: '#2A6B3D', border: '#C2E5CD', dot: 'bg-emerald-600', defaultLabel: 'Nominal' },
    failed: { bg: '#FBEBEB', text: '#A62626', border: '#F5C2C2', dot: 'bg-red-500', defaultLabel: 'Failed' },
  };

  const c = configs[status] || configs.idle;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <span>{label || c.defaultLabel}</span>
    </span>
  );
}

/* ─── Metric Card ─────────────────────────────────────────────────────────── */
interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
  sourceRunId?: string;
  badge?: string;
  highlight?: boolean;
}

export function MetricCard({
  label,
  value,
  unit,
  description,
  sourceRunId,
  badge,
  highlight,
}: MetricCardProps) {
  return (
    <div
      className="p-3.5 rounded-lg border flex flex-col justify-between transition-shadow bg-white"
      style={{
        borderColor: highlight ? '#963B43' : '#E8E0D7',
        boxShadow: highlight ? '0 1px 3px rgba(150, 59, 67, 0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[10.5px] font-semibold tracking-wider uppercase" style={{ color: '#8E867D' }}>
          {label}
        </span>
        {badge && (
          <span
            className="px-1.5 py-0.2 rounded text-[9.5px] font-mono"
            style={{ background: '#EDE8E0', color: '#68615A' }}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span
          className="font-mono text-xl font-bold tracking-tight"
          style={{ color: value === 'Not measured' ? '#8E867D' : '#332F2D' }}
        >
          {value}
        </span>
        {unit && value !== 'Not measured' && (
          <span className="text-xs font-medium" style={{ color: '#8E867D' }}>
            {unit}
          </span>
        )}
      </div>

      {(description || sourceRunId) && (
        <div className="mt-1 pt-1.5 border-t border-[#F2EDE4] flex items-center justify-between text-[10px]">
          {description && <span style={{ color: '#8E867D' }}>{description}</span>}
          {sourceRunId && (
            <span className="font-mono text-[9px] px-1 py-0.5 rounded" style={{ background: '#F1EFEA', color: '#68615A' }}>
              {sourceRunId.slice(0, 8)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Card Container ──────────────────────────────────────────────────────── */
interface CardProps {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, subtitle, badge, headerAction, children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-white rounded-lg border p-5 ${className}`}
      style={{ borderColor: '#E8E0D7', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#F2EDE4]">
          <div>
            <div className="flex items-center gap-2">
              {title && (
                <h3 className="font-serif text-base font-normal" style={{ color: '#332F2D' }}>
                  {title}
                </h3>
              )}
              {badge}
            </div>
            {subtitle && (
              <p className="text-[11px] mt-0.5" style={{ color: '#8E867D' }}>
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="flex items-center gap-2">{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Empty State ─────────────────────────────────────────────────────────── */
interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div
      className="p-8 text-center rounded-lg border border-dashed flex flex-col items-center justify-center my-4"
      style={{ borderColor: '#DCD3C7', background: '#FCFBF9' }}
    >
      <Clock size={28} className="mb-2 opacity-40" style={{ color: '#8E867D' }} />
      <h4 className="font-serif text-sm font-medium" style={{ color: '#332F2D' }}>
        {title}
      </h4>
      <p className="text-xs max-w-sm mt-1 mb-4" style={{ color: '#8E867D' }}>
        {description}
      </p>
      {action}
    </div>
  );
}

/* ─── Error State ─────────────────────────────────────────────────────────── */
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Error encountered', message, onRetry }: ErrorStateProps) {
  return (
    <div
      className="p-4 rounded-lg border flex items-start gap-3 my-3"
      style={{ background: '#FBEBEB', borderColor: '#F5C2C2', color: '#A62626' }}
    >
      <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-xs">
        <h5 className="font-bold mb-0.5">{title}</h5>
        <p className="leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 px-2.5 py-1 rounded text-[11px] font-medium bg-red-800 text-white hover:bg-red-900 cursor-pointer"
          >
            Retry Action
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Notice Box ──────────────────────────────────────────────────────────── */
interface NoticeBoxProps {
  type?: 'info' | 'success' | 'warning';
  title?: string;
  children: React.ReactNode;
}

export function NoticeBox({ type = 'info', title, children }: NoticeBoxProps) {
  const styles = {
    info: { bg: '#F7F4EF', border: '#E8E0D7', text: '#332F2D', icon: <Info size={14} className="text-stone-500" /> },
    success: { bg: '#EBF5EE', border: '#C2E5CD', text: '#2A6B3D', icon: <CheckCircle2 size={14} className="text-emerald-700" /> },
    warning: { bg: '#FEF7EA', border: '#F6E3B8', text: '#9A6B1A', icon: <AlertCircle size={14} className="text-amber-700" /> },
  };

  const s = styles[type];

  return (
    <div
      className="p-3 rounded-lg border text-xs flex items-start gap-2.5 my-3"
      style={{ background: s.bg, borderColor: s.border, color: s.text }}
    >
      <span className="flex-shrink-0 mt-0.5">{s.icon}</span>
      <div className="flex-1 leading-relaxed">
        {title && <span className="font-bold block mb-0.5">{title}</span>}
        {children}
      </div>
    </div>
  );
}
