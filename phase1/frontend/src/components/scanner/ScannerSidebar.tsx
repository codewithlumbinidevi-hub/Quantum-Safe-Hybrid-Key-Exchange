import React from 'react';
import {
  Shield, LayoutDashboard, ScanSearch, FileSearch, BookOpen,
  GitBranch, FlaskConical, History, Info, HelpCircle,
  ChevronRight, Database, Cpu, AlertTriangle
} from 'lucide-react';

export type ScannerPage =
  | 'dashboard'
  | 'scanner'
  | 'findings'
  | 'algorithm-inventory'
  | 'file-explorer'
  | 'migration-planner'
  | 'pqc-reference'
  | 'test-results'
  | 'scan-history'
  | 'how-it-works'
  | 'about';

interface SidebarProps {
  activePage: ScannerPage;
  onNavigate: (page: ScannerPage) => void;
  hasResults: boolean;
}

interface NavItem {
  id: ScannerPage;
  label: string;
  icon: React.ReactNode;
  requiresResults?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
      { id: 'scanner', label: 'Repository Scanner', icon: <ScanSearch size={14} /> },
    ],
  },
  {
    label: 'Cryptographic Inventory',
    items: [
      { id: 'findings', label: 'Findings', icon: <AlertTriangle size={14} />, requiresResults: true },
      { id: 'algorithm-inventory', label: 'Algorithm Inventory', icon: <Database size={14} />, requiresResults: true },
      { id: 'file-explorer', label: 'File Explorer', icon: <FileSearch size={14} />, requiresResults: true },
    ],
  },
  {
    label: 'Migration',
    items: [
      { id: 'migration-planner', label: 'Migration Planner', icon: <GitBranch size={14} /> },
      { id: 'pqc-reference', label: 'PQC Reference', icon: <BookOpen size={14} /> },
    ],
  },
  {
    label: 'Validation',
    items: [
      { id: 'test-results', label: 'Test Results', icon: <FlaskConical size={14} /> },
      { id: 'scan-history', label: 'Scan History', icon: <History size={14} /> },
    ],
  },
  {
    label: 'Reference',
    items: [
      { id: 'how-it-works', label: 'How It Works', icon: <HelpCircle size={14} /> },
      { id: 'about', label: 'About This Tool', icon: <Info size={14} /> },
    ],
  },
];

export function ScannerSidebar({ activePage, onNavigate, hasResults }: SidebarProps) {
  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-52 flex flex-col border-r border-qs-border z-40"
      style={{ background: '#F8F6F1' }}
    >
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-qs-border">
        <div className="flex items-center gap-2.5 mb-1">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: '#963B43' }}
          >
            <Shield size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span className="font-serif text-base font-normal tracking-wide" style={{ color: '#292824' }}>
            Q-SHIELD
          </span>
        </div>
        <p className="text-[10px] tracking-widest font-medium ml-9.5 pl-0.5" style={{ color: '#8C877F', letterSpacing: '0.12em' }}>
          QUANTUM-SAFE SYSTEMS
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p
              className="px-3 mb-1 text-[9.5px] font-semibold tracking-widest uppercase"
              style={{ color: '#8C877F', letterSpacing: '0.14em' }}
            >
              {section.label}
            </p>
            {section.items.map((item) => {
              const disabled = item.requiresResults && !hasResults;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => !disabled && onNavigate(item.id)}
                  disabled={disabled}
                  title={disabled ? 'Run a scan first' : undefined}
                  className={[
                    'sidebar-nav-item w-full text-left',
                    isActive ? 'active' : '',
                    disabled ? 'opacity-40 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="flex-1 text-[13px]">{item.label}</span>
                  {isActive && (
                    <ChevronRight size={11} className="flex-shrink-0 opacity-70" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer note */}
      <div className="px-4 py-3 border-t border-qs-border">
        <p className="text-[10px] leading-tight" style={{ color: '#8C877F' }}>
          Research demonstration.{' '}
          <br />
          Static analysis only.
        </p>
      </div>
    </aside>
  );
}
