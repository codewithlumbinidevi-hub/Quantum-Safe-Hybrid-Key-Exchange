import React, { useState, useMemo } from 'react';
import { Folder, FileCode, ChevronRight, ChevronDown } from 'lucide-react';
import type { ScanResult, Finding } from '../../types/scanner';
import { SeverityBadge, CodeExcerpt, EmptyState, AlgoBadge } from '../../components/scanner/ScannerUI';
import { ScanSearch } from 'lucide-react';

interface Props { scanResult: ScanResult | null }

function buildFlatFilePaths(tree: Record<string, any>, prefix = ''): string[] {
  const paths: string[] = [];
  for (const [name, node] of Object.entries(tree)) {
    if (name.startsWith('_')) continue;
    const fullPath = prefix ? `${prefix}/${name}` : name;
    if (node._type === 'file') {
      paths.push(node.path || fullPath);
    } else if (node._type === 'dir') {
      paths.push(...buildFlatFilePaths(node._children ?? {}, fullPath));
    }
  }
  return paths;
}

interface TreeNodeProps {
  name: string;
  node: any;
  prefix: string;
  selected: string | null;
  onSelect: (path: string) => void;
  findingPaths: Set<string>;
}

function TreeNode({ name, node, prefix, selected, onSelect, findingPaths }: TreeNodeProps) {
  const [open, setOpen] = useState(true);
  const fullPath = prefix ? `${prefix}/${name}` : name;

  if (node._type === 'file') {
    const filePath = node.path || fullPath;
    const hasFinding = findingPaths.has(filePath);
    return (
      <button
        onClick={() => onSelect(filePath)}
        className={[
          'flex items-center gap-1.5 w-full text-left px-2 py-1 rounded text-xs transition-colors',
          selected === filePath ? 'bg-qs-softMaroon text-qs-maroon' : 'hover:bg-[#F4F0EA]',
        ].join(' ')}
        style={{ color: selected === filePath ? '#963B43' : '#292824' }}
      >
        <FileCode size={12} className={hasFinding ? 'text-qs-maroon' : 'opacity-40'} />
        <span className="flex-1 truncate font-mono">{name}</span>
        {hasFinding && <span className="w-1.5 h-1.5 rounded-full bg-qs-maroon flex-shrink-0" />}
      </button>
    );
  }

  if (node._type === 'dir') {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded text-xs hover:bg-[#F4F0EA] transition-colors"
          style={{ color: '#8C877F' }}
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <Folder size={12} className="opacity-60" />
          <span className="flex-1 truncate font-mono">{name}</span>
        </button>
        {open && (
          <div className="ml-3 border-l border-qs-border pl-1">
            {Object.entries(node._children ?? {})
              .filter(([k]) => !k.startsWith('_'))
              .map(([childName, childNode]) => (
                <TreeNode
                  key={childName}
                  name={childName}
                  node={childNode}
                  prefix={fullPath}
                  selected={selected}
                  onSelect={onSelect}
                  findingPaths={findingPaths}
                />
              ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export function FileExplorerPage({ scanResult }: Props) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const findingsByFile = useMemo(() => {
    const map: Record<string, Finding[]> = {};
    for (const f of scanResult?.findings ?? []) {
      if (!map[f.file_path]) map[f.file_path] = [];
      map[f.file_path].push(f);
    }
    return map;
  }, [scanResult]);

  const findingPaths = useMemo(() => new Set(Object.keys(findingsByFile)), [findingsByFile]);
  const fileFindings = selectedFile ? (findingsByFile[selectedFile] ?? []) : [];

  if (!scanResult) {
    return (
      <EmptyState
        icon={<ScanSearch size={36} />}
        title="No scan results"
        description="Run a repository scan to explore files."
      />
    );
  }

  const tree = scanResult.file_tree;
  const totalFiles = buildFlatFilePaths(tree).length;

  return (
    <div className="flex gap-4 h-full">
      {/* File tree panel */}
      <div className="qs-card w-56 flex-shrink-0 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider px-2 mb-2" style={{ color: '#8C877F' }}>
          Files ({totalFiles})
        </p>
        {Object.entries(tree)
          .filter(([k]) => !k.startsWith('_'))
          .map(([name, node]) => (
            <TreeNode
              key={name}
              name={name}
              node={node}
              prefix=""
              selected={selectedFile}
              onSelect={setSelectedFile}
              findingPaths={findingPaths}
            />
          ))}
      </div>

      {/* Detail panel */}
      <div className="flex-1 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {!selectedFile ? (
          <div className="qs-card flex items-center justify-center py-20">
            <div className="text-center">
              <FileCode size={32} className="mx-auto mb-3 opacity-20" style={{ color: '#8C877F' }} />
              <p className="text-sm font-serif" style={{ color: '#8C877F' }}>Select a file to view findings</p>
              <p className="text-xs mt-1" style={{ color: '#8C877F' }}>
                Files with a red dot contain cryptographic findings.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="qs-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileCode size={14} style={{ color: '#963B43' }} />
                <code className="font-mono text-sm" style={{ color: '#292824' }}>{selectedFile}</code>
              </div>
              <p className="text-xs" style={{ color: '#8C877F' }}>
                {fileFindings.length === 0
                  ? 'No cryptographic findings detected in this file.'
                  : `${fileFindings.length} finding${fileFindings.length !== 1 ? 's' : ''} detected`}
              </p>
            </div>

            {fileFindings.length === 0 ? (
              <div className="qs-card flex items-center justify-center py-12">
                <p className="text-sm font-serif" style={{ color: '#8C877F' }}>
                  No cryptographic findings in this file.
                </p>
              </div>
            ) : (
              fileFindings.map(f => (
                <div key={f.finding_id} className="qs-card overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-qs-border flex items-center gap-3">
                    <SeverityBadge severity={f.severity} compact />
                    <AlgoBadge family={f.algorithm_family} />
                    <code className="font-mono text-xs" style={{ color: '#8C877F' }}>
                      Line {f.line_number}
                    </code>
                    <code className="font-mono text-xs" style={{ color: '#963B43' }}>
                      {f.rule_id}
                    </code>
                    <span className="text-xs font-medium flex-1 text-right" style={{ color: '#292824' }}>
                      {f.rule_name}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs leading-relaxed" style={{ color: '#8C877F' }}>{f.explanation}</p>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#8C877F' }}>
                        Code Evidence
                      </p>
                      <CodeExcerpt code={f.evidence_excerpt} />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8C877F' }}>
                        Migration Recommendation
                      </p>
                      <p className="text-xs" style={{ color: '#292824' }}>{f.migration_recommendation}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
