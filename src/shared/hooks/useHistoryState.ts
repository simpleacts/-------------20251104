import { useState, useCallback } from 'react';

export const useHistoryState = <T>(initialState: T) => {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  const setState = useCallback((newState: T | ((prevState: T) => T), overwrite = false) => {
    const currentState = history[index];
    const resolvedState = typeof newState === 'function' ? (newState as (prevState: T) => T)(currentState) : newState;

    if (JSON.stringify(resolvedState) === JSON.stringify(currentState)) {
        return; // No change, don't add to history
    }

    if (overwrite) {
        const newHistory = [...history];
        newHistory[index] = resolvedState;
        setHistory(newHistory);
    } else {
        const newHistory = history.slice(0, index + 1);
        newHistory.push(resolvedState);
        setHistory(newHistory);
        setIndex(newHistory.length - 1);
    }
  }, [history, index]);

  const resetState = useCallback((newState: T) => {
    setHistory([newState]);
    setIndex(0);
  }, []);

  const undo = useCallback(() => {
    if (index > 0) {
      setIndex(index - 1);
    }
  }, [index]);

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      setIndex(index + 1);
    }
  }, [index, history.length]);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return [history[index], setState, undo, redo, canUndo, canRedo, resetState] as const;
};
