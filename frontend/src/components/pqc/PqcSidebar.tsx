import React from 'react';
import {
  Shield, LayoutDashboard, Activity, KeyRound, Box,
  GitMerge, FlaskConical, Cpu, Layers, BarChart3, History,
  Download, BookOpen, Info, ChevronRight
} from 'lucide-react';

export type PqcPage =
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
}

interface NavItem {
  id: PqcPage;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
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
      { id: 'processor-benchmark', label: 'Processor A vs B (Simulated Quantum)', icon: <Layers size={14} /> },
      { id: 'results-statistics', label: 'Results & Statistics', icon: <BarChart3 size={14} /> },
    ],
  },
  {
    label: 'Records',
    items: [
      { id: 'experiment-history', label: 'Experiment History', icon: <History size={14} /> },
      { id: 'export-center', label: 'Export Center', icon: <Download size={14} /> },
    ],
  },
  {
    label: 'Reference',
    items: [
      { id: 'architecture-methodology', label: 'Architecture & Methodology', icon: <BookOpen size={14} /> },
      { id: 'about-pqc', label: 'About Q-SHIELD-PQC', icon: <Info size={14} /> },
    ],
  },
];

export function PqcSidebar({ activePage, onNavigate }: SidebarProps) {
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
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p
              className="px-3 mb-1 text-[9.5px] font-semibold tracking-widest uppercase"
              style={{ color: '#8E867D', letterSpacing: '0.14em' }}
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
                    <span className="flex-1 text-[13px]">{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Anchored Footer Disclaimer */}
      <div className="px-5 py-3 border-t border-[#E8E0D7]">
        <p className="text-[10px] leading-relaxed" style={{ color: '#8E867D' }}>
          Research simulation environment. Results depend on the execution environment and configured processor profiles.
        </p>
      </div>
    </aside>
  );
}
