import React from 'react';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import { Bit, CircuitDefinition } from '../../circuits/gateEngine';

interface CircuitControlsProps {
  circuit: CircuitDefinition;
  inputs: Record<string, Bit>;
  onInputChange: (id: string, val: Bit) => void;
  currentStep: number;
  maxSteps: number;
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  onStepForward: () => void;
  onReset: () => void;
}

export const CircuitControls: React.FC<CircuitControlsProps> = ({
  circuit,
  inputs,
  onInputChange,
  currentStep,
  maxSteps,
  isPlaying,
  onPlayPauseToggle,
  onStepForward,
  onReset,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 gap-4 mb-4 shadow-lg">
      {/* Input Bit Toggles */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
          Input Signals:
        </span>
        {circuit.inputs.map((inp) => {
          const val = inputs[inp.id] ?? inp.defaultValue;
          return (
            <button
              key={inp.id}
              onClick={() => onInputChange(inp.id, val === 1 ? 0 : 1)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs font-semibold transition-all ${
                val === 1
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              <span>{inp.label}:</span>
              <span className={`px-1.5 py-0.5 rounded ${val === 1 ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}>
                {val}
              </span>
            </button>
          );
        })}
      </div>

      {/* Animation & Step Execution Controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-slate-400 mr-2">
          Layer Step: <strong className="text-cyan-400">{currentStep}</strong> / {maxSteps}
        </span>

        <button
          onClick={onPlayPauseToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors shadow-md shadow-cyan-600/20"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          onClick={onStepForward}
          disabled={isPlaying}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 font-medium text-xs transition-colors"
        >
          <SkipForward size={14} />
          <span>Step</span>
        </button>

        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs transition-colors"
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
