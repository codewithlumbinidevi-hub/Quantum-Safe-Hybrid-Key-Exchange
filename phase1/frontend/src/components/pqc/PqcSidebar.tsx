import React, { useState } from 'react';
import {
  Shield, LayoutDashboard, Activity, KeyRound, Box,
  GitMerge, FlaskConical, Cpu, Layers, BarChart3, History,
  Download, BookOpen, Info, ChevronRight, ChevronDown,
  ShieldCheck, Lock, Terminal, FileCheck2, Server, Radio, ScanSearch
} from 'lucide-react';

export type PqcPage =
  // Phase 2 - Secure Channel (PS-P1)
  | 'channel-security'
  | 'channel-performance'
  | 'channel-handshake'
  | 'channel-analysis'
  | 'channel-reproducibility'
  | 'channel-platforms'
  // Phase 1 - Legacy Hybrid
  | 'dashboard'
  | 'exchange-lab'
  | 'ecdh-ref'
  | 'mlkem-ref'
  | 'hybrid-kdf-ref'
  | 'benchmark-lab'
  | 'processor-comparison'
  | 'processor-benchmark'
  | 'results-statistics'
  | 'experiment-history'
  | 'export-center'
  | 'architecture-methodology'
  | 'about-pqc';

interface SidebarProps {
  activePage: PqcPage;
  onNavigate: (page: PqcPage) => void;
  hasExchangeResult?: boolean;
  onSwitchToScanner?: () => void;
}

interface NavItem {
  id: PqcPage;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const PHASE2_ITEMS: NavItem[] = [
  {
    id: 'channel-security',
    label: 'Security Suite & Attack Lab',
    icon: <ShieldCheck size={14} />,
    badge: 'T1–T9',
    badgeColor: '#2A6B3D',
  },
  {
    id: 'channel-performance',
    label: 'Performance Evaluation',
    icon: <BarChart3 size={14} />,
    badge: 'Obj 3',
    badgeColor: '#963B43',
  },
  {
    id: 'channel-handshake',
    label: 'Solution & Live Handshake',
    icon: <Radio size={14} />,
    badge: 'Obj 1',
    badgeColor: '#963B43',
  },
  {
    id: 'channel-analysis',
    label: 'Technical Analysis',
    icon: <BookOpen size={14} />,
    badge: 'Obj 5',
    badgeColor: '#68615A',
  },
  {
    id: 'channel-reproducibility',
    label: 'Submission & Checksums',
    icon: <FileCheck2 size={14} />,
    badge: 'Obj 4',
    badgeColor: '#68615A',
  },
  {
    id: 'channel-platforms',
    label: 'Platforms & Constraints',
    icon: <Server size={14} />,
    badge: 'A / B / D',
    badgeColor: '#68615A',
  },
];

const PHASE1_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Research Dashboard', icon: <LayoutDashboard size={14} /> },
      { id: 'exchange-lab', label: 'Hybrid Exchange Lab', icon: <Activity size={14} /> },
    ],
  },
  {
    label: 'Cryptography',
    items: [
      { id: 'ecdh-ref', label: 'ECDH P-256', icon: <KeyRound size={14} /> },
      { id: 'mlkem-ref', label: 'ML-KEM-768', icon: <Box size={14} /> },
      { id: 'hybrid-kdf-ref', label: 'Hybrid Key Derivation', icon: <GitMerge size={14} /> },
    ],
  },
  {
    label: 'Benchmarking',
    items: [
      { id: 'benchmark-lab', label: 'Benchmark Lab', icon: <FlaskConical size={14} /> },
      { id: 'processor-comparison', label: 'Platform A vs B (Host CPU)', icon: <Cpu size={14} /> },
      { id: 'processor-benchmark', label: 'Processor A vs B (Simulated)', icon: <Layers size={14} /> },
      { id: 'results-statistics', label: 'Results & Statistics', icon: <BarChart3 size={14} /> },
    ],
  },
  {
    label: 'Records & Reference',
    items: [
      { id: 'experiment-history', label: 'Experiment History', icon: <History size={14} /> },
      { id: 'export-center', label: 'Export Center', icon: <Download size={14} /> },
      { id: 'architecture-methodology', label: 'Architecture & Reference', icon: <BookOpen size={14} /> },
      { id: 'about-pqc', label: 'About Q-SHIELD-PQC', icon: <Info size={14} /> },
    ],
  },
];

export function PqcSidebar({ activePage, onNavigate, onSwitchToScanner }: SidebarProps) {
  // If active page is one of the Phase 1 items, expand phase 1 by default
  const isPhase1Active = !activePage.startsWith('channel-');
  const [isPhase1Expanded, setIsPhase1Expanded] = useState<boolean>(isPhase1Active);

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-[268px] flex flex-col z-40 select-none"
      style={{
        background: '#F7F4EF',
        borderRight: '1px solid #E8E0D7',
      }}
    >
      {/* Brand Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#E8E0D7]">
        <div className="flex items-center gap-2.5 mb-1">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: '#963B43' }}
          >
            <Shield size={15} color="#FFFFFF" strokeWidth={2.4} />
          </div>
          <span
            className="font-serif text-[17px] font-normal tracking-wide"
            style={{ color: '#332F2D' }}
          >
            Q-SHIELD
          </span>
        </div>
        <p
          className="text-[9.5px] uppercase font-semibold tracking-widest pl-9.5 ml-0.5"
          style={{ color: '#8E867D', letterSpacing: '0.14em' }}
        >
          QUANTUM-SAFE SYSTEMS
        </p>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {/* PHASE 2 - SECURE CHANNEL (Primary) */}
        <div>
          <div className="flex items-center justify-between px-3 mb-1.5">
            <span
              className="text-[9.5px] font-semibold tracking-widest uppercase text-[#963B43]"
              style={{ letterSpacing: '0.14em' }}
            >
              Phase 2 — Secure Channel
            </span>
            <span
              className="text-[9px] px-1.5 py-0.2 rounded font-mono font-medium"
              style={{ background: '#F4E8E7', color: '#963B43' }}
            >
              PS-P1
            </span>
          </div>

          <div className="space-y-0.5">
            {PHASE2_ITEMS.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2.5 w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'text-white font-medium shadow-sm'
                      : 'hover:bg-[#F4E8E7] hover:text-[#963B43]'
                  }`}
                  style={{
                    background: isActive ? '#963B43' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#332F2D',
                  }}
                >
                  <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'opacity-70'}`}>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-[13px] truncate">{item.label}</span>
                  {item.badge && !isActive && (
                    <span
                      className="text-[9.5px] px-1.5 py-0.2 rounded font-mono font-semibold"
                      style={{
                        background: '#EDE8E0',
                        color: item.badgeColor || '#68615A',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* PHASE 1 - LEGACY HYBRID (Collapsible Accordion) */}
        <div className="pt-2 border-t border-[#E8E0D7]">
          <button
            onClick={() => setIsPhase1Expanded(!isPhase1Expanded)}
            className="flex items-center justify-between w-full px-3 py-1 text-left rounded hover:bg-[#EFECE6] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span
                className="text-[9.5px] font-semibold tracking-widest uppercase text-[#8E867D]"
                style={{ letterSpacing: '0.14em' }}
              >
                Phase 1 (Legacy Hybrid)
              </span>
            </div>
            <span className="text-[#8E867D]">
              {isPhase1Expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
          </button>

          {isPhase1Expanded && (
            <div className="mt-2 space-y-3 pl-1">
              {PHASE1_SECTIONS.map((section) => (
                <div key={section.label}>
                  <p
                    className="px-2 mb-1 text-[9px] font-semibold tracking-wider uppercase text-[#A0988E]"
                    style={{ letterSpacing: '0.12em' }}
                  >
                    {section.label}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const isActive = activePage === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => onNavigate(item.id)}
                          className={`flex items-center gap-2 w-full text-left px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-[#963B43]/15 text-[#963B43] font-medium'
                              : 'text-[#68615A] hover:bg-[#F4E8E7] hover:text-[#963B43]'
                          }`}
                        >
                          <span className="flex-shrink-0 opacity-70">{item.icon}</span>
                          <span className="flex-1 text-[12px] truncate">{item.label}</span>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#963B43] flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* PS-P2 Scanner Navigation Button */}
      {onSwitchToScanner && (
        <div className="p-3 border-t border-[#E8E0D7] bg-[#F3EFE9]">
          <button
            onClick={onSwitchToScanner}
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-left text-xs text-[#68615A] hover:bg-[#EAE4DC] transition-colors cursor-pointer"
            title="Open PS-P2 Classical Cryptography AST Scanner"
          >
            <div className="flex items-center gap-2">
              <ScanSearch size={14} className="text-[#963B43]" />
              <span className="font-medium text-[11.5px]">PS-P2 Code Scanner</span>
            </div>
            <ChevronRight size={13} className="opacity-60" />
          </button>
        </div>
      )}
    </aside>
  );
}
