import { create } from 'zustand';
import { CompilationResult, compileWarehouse, WarehouseModel } from '@waresync/core';

interface CompilerStore {
  lastResult: CompilationResult | null;
  isCompiling: boolean;
  compile: (model: WarehouseModel) => CompilationResult;
}

export const useCompilerStore = create<CompilerStore>((set) => ({
  lastResult: null,
  isCompiling: false,

  compile: (model) => {
    set({ isCompiling: true });
    const result = compileWarehouse(model);
    set({ lastResult: result, isCompiling: false });
    return result;
  },
}));
