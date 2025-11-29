import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pm-panel-sizes";
const DEFAULT_SIZES: [number, number, number] = [33.33, 33.34, 33.33];
const MIN_SIZE_PERCENT = 10;

interface PanelSizesState {
  sizes: [number, number, number];
  updateSize: (index: 0 | 1, delta: number, containerWidth: number) => void;
}

/**
 * Hook for managing resizable panel sizes.
 * Sizes are stored as percentages and persisted to localStorage.
 */
export function usePanelSizes(): PanelSizesState {
  const [sizes, setSizes] = useState<[number, number, number]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as number[];
        if (Array.isArray(parsed) && parsed.length === 3) {
          return parsed as [number, number, number];
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
    (index: 0 | 1, deltaPixels: number, containerWidth: number) => {
      if (containerWidth <= 0) return;

      const deltaPercent = (deltaPixels / containerWidth) * 100;

      setSizes((prev) => {
        const newSizes = [...prev] as [number, number, number];

        // Resizer 0 is between panel 0 and 1
        // Resizer 1 is between panel 1 and 2
        const leftIndex = index;
        const rightIndex = index + 1;

        const newLeft = prev[leftIndex] + deltaPercent;
        const newRight = prev[rightIndex] - deltaPercent;

        // Enforce minimum sizes
        if (newLeft < MIN_SIZE_PERCENT || newRight < MIN_SIZE_PERCENT) {
          return prev;
        }

        newSizes[leftIndex] = newLeft;
        newSizes[rightIndex] = newRight;

        return newSizes;
      });
    },
    []
  );

  return { sizes, updateSize };
}
