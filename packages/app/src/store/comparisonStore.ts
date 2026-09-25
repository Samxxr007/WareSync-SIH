/**
 * comparisonStore — Zustand store holding the results of a Baseline vs.
 * Proposed benchmark run (ComparisonResult from @waresync/core).
 * Also tracks run status so the UI can show a progress indicator.
 */
import { create } from 'zustand';
import type { ComparisonRunResults } from '@waresync/core';

type RunStatus = 'idle' | 'running' | 'done' | 'error';

interface ComparisonState {
  status: RunStatus;
  result: ComparisonRunResults | null;
  errorMessage: string | null;
  /** Duration of the last run in milliseconds */
  runDurationMs: number | null;

  setStatus: (s: RunStatus) => void;
  setResult: (r: ComparisonRunResults, durationMs: number) => void;
  setError: (msg: string) => void;
  reset: () => void;
}

export const useComparisonStore = create<ComparisonState>()((set) => ({
  status: 'idle',
  result: null,
  errorMessage: null,
  runDurationMs: null,

  setStatus: (status) => set({ status }),

  setResult: (result, runDurationMs) =>
    set({ result, runDurationMs, status: 'done', errorMessage: null }),

  setError: (errorMessage) => set({ status: 'error', errorMessage }),

  reset: () =>
    set({ status: 'idle', result: null, errorMessage: null, runDurationMs: null }),
}));
