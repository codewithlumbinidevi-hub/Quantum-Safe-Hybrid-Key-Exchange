import React from 'react';
import { Play, Pause, SkipForward, RotateCcw, CheckCircle2 } from 'lucide-react';
import { QuantumCircuitDefinition, QubitState } from '../../circuits/quantumEngine';

interface QuantumCircuitControlsProps {
  circuit: QuantumCircuitDefinition;
  inputsA: QubitState[];
  inputsB: QubitState[];
  onToggleABit: (bitIndex: number) => void;
  onToggleBBit: (bitIndex: number) => void;
  decimalA: number;
  decimalB: number;
  decimalResult: number;
  binarySumStr: string;
  currentStep: number;
  maxSteps: number;
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  onStepForward: () => void;
  onReset: () => void;
  verification: { isVerified: boolean; correctCount: number; totalTested: number };
}

export const QuantumCircuitControls: React.FC<QuantumCircuitControlsProps> = ({
  inputsA,
  inputsB,
  onToggleABit,
  onToggleBBit,
  decimalA,
  decimalB,
  decimalResult,
  binarySumStr,
  currentStep,
  maxSteps,
  isPlaying,
  onPlayPauseToggle,
  onStepForward,
  onReset,
  verification,
}) => {
  return (
    <div className="space-y-4 mb-4">
      {/* Top Banner: Equation Result & Verification Badge */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-3.5 px-5 gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Quantum Addition Result:
          </span>
          <span className="font-mono text-base font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1 rounded-lg">
            {decimalA} + {decimalB} = {decimalResult}
          </span>
          <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-800 px-2.5 py-1 rounded">
            (Binary: {binarySumStr})
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
          <CheckCircle2 size={14} />
          <span>
            Verified: {verification.correctCount} / {verification.totalTested} correct
          </span>
        </div>
      </div>

      {/* Controls Bar: Inputs and Execution */}
      <div className="flex flex-col lg:flex-row items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4 gap-4 shadow-lg">
        {/* Input Toggles for A and B */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Input Register A */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-2 rounded-lg">
            <span className="text-xs font-bold text-cyan-400 font-mono">
              A ({decimalA}):
            </span>
            {inputsA.map((val, idx) => (
              <button
                key={`a-${idx}`}
                onClick={() => onToggleABit(idx)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-extrabold transition-all cursor-pointer ${
                  val === 1
                    ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                a{idx}={val}
              </button>
            ))}
          </div>

          {/* Input Register B */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-2 rounded-lg">
            <span className="text-xs font-bold text-emerald-400 font-mono">
              B ({decimalB}):
            </span>
            {inputsB.map((val, idx) => (
              <button
                key={`b-${idx}`}
                onClick={() => onToggleBBit(idx)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-extrabold transition-all cursor-pointer ${
                  val === 1
                    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                b{idx}={val}
              </button>
            ))}
          </div>
        </div>

        {/* Step-by-Step Execution Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 mr-2">
            Column Step: <strong className="text-emerald-400">{currentStep}</strong> / {maxSteps}
          </span>

          <button
            onClick={onPlayPauseToggle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={onStepForward}
            disabled={isPlaying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-medium text-xs transition-colors cursor-pointer"
          >
            <SkipForward size={14} />
            <span>Step</span>
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
