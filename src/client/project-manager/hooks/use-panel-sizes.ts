import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pm-panel-sizes";
const DEFAULT_SIZES: [number, number] = [50, 50];
const MIN_SIZE_PERCENT = 20;

interface PanelSizesState {
  sizes: [number, number];
  updateSize: (index: 0, delta: number, containerWidth: number) => void;
}

/**
 * Hook for managing resizable panel sizes.
 * Sizes are stored as percentages and persisted to localStorage.
 */
export function usePanelSizes(): PanelSizesState {
  const [sizes, setSizes] = useState<[number, number]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as number[];
        if (Array.isArray(parsed) && parsed.length === 2) {
          return parsed as [number, number];
        }
      }
    } catch {
      // Invalid stored value
    }
    return DEFAULT_SIZES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
    } catch {
      // localStorage not available
    }
  }, [sizes]);

  const updateSize = useCallback(
    (index: 0, deltaPixels: number, containerWidth: number) => {
      if (containerWidth <= 0) return;

      const deltaPercent = (deltaPixels / containerWidth) * 100;

      setSizes((prev) => {
        const newSizes = [...prev] as [number, number];

        const newLeft = prev[0] + deltaPercent;
        const newRight = prev[1] - deltaPercent;

        // Enforce minimum sizes
        if (newLeft < MIN_SIZE_PERCENT || newRight < MIN_SIZE_PERCENT) {
          return prev;
        }

        newSizes[0] = newLeft;
        newSizes[1] = newRight;

        return newSizes;
      });
    },
    []
  );

  return { sizes, updateSize };
}
