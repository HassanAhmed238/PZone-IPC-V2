/**
 * useChartZoom — hook for smooth scroll-wheel zoom on Recharts charts.
 *
 * Returns { startIndex, endIndex, brushProps, containerProps, isZoomed, resetZoom }
 *
 * Usage:
 *   const zoom = useChartZoom(data.length);
 *   <div {...zoom.containerProps}>
 *     <LineChart data={data}>
 *       ...
 *       <Brush {...zoom.brushProps} />
 *     </LineChart>
 *   </div>
 */
import { useState, useCallback, useEffect, useRef } from "react";

interface ChartZoomReturn {
  /** Current start index for the brush */
  startIndex: number;
  /** Current end index for the brush */
  endIndex: number;
  /** Props to spread on the Recharts <Brush> */
  brushProps: {
    startIndex: number;
    endIndex: number;
    onChange: (range: { startIndex?: number; endIndex?: number }) => void;
    height: number;
    travellerWidth: number;
    stroke: string;
    fill: string;
    fillOpacity: number;
  };
  /** Props to spread on the container div (handles wheel zoom) */
  containerProps: {
    onWheel: (e: React.WheelEvent) => void;
    ref: React.RefObject<HTMLDivElement>;
    style: React.CSSProperties;
  };
  /** Whether the chart is currently zoomed in */
  isZoomed: boolean;
  /** Reset zoom to show all data */
  resetZoom: () => void;
  /** Current zoom level multiplier */
  zoomLevel: number;
  /** The visible slice of data */
  getVisibleSlice: <T>(data: T[]) => T[];
}

export function useChartZoom(dataLength: number, minVisible = 2): ChartZoomReturn {
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(Math.max(0, dataLength - 1));
  const containerRef = useRef<HTMLDivElement>(null!);

  // Reset when data length changes
  useEffect(() => {
    setStartIndex(0);
    setEndIndex(Math.max(0, dataLength - 1));
  }, [dataLength]);

  const visibleCount = endIndex - startIndex + 1;
  const isZoomed = visibleCount < dataLength;
  const zoomLevel = dataLength > 0 ? dataLength / visibleCount : 1;

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (dataLength <= minVisible) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Cursor position as a ratio within the chart
      const cursorRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      const zoomSpeed = 0.18;
      const direction = e.deltaY > 0 ? -1 : 1; // scroll-up = zoom in
      const delta = Math.max(1, Math.round(visibleCount * zoomSpeed)) * direction;

      const leftDelta = Math.round(delta * cursorRatio);
      const rightDelta = delta - leftDelta;

      let ns = startIndex + leftDelta;
      let ne = endIndex - rightDelta;

      // Enforce minimum visible
      if (ne - ns + 1 < minVisible) {
        const center = Math.round((startIndex + endIndex) / 2);
        ns = Math.max(0, center - Math.floor(minVisible / 2));
        ne = Math.min(dataLength - 1, ns + minVisible - 1);
        ns = Math.max(0, ne - minVisible + 1);
      }

      // Enforce full range
      if (ne - ns + 1 >= dataLength) {
        ns = 0;
        ne = dataLength - 1;
      }

      ns = Math.max(0, ns);
      ne = Math.min(dataLength - 1, ne);

      setStartIndex(ns);
      setEndIndex(ne);
    },
    [startIndex, endIndex, dataLength, visibleCount, minVisible]
  );

  const resetZoom = useCallback(() => {
    setStartIndex(0);
    setEndIndex(Math.max(0, dataLength - 1));
  }, [dataLength]);

  const handleBrushChange = useCallback(
    (range: { startIndex?: number; endIndex?: number }) => {
      if (range.startIndex !== undefined) setStartIndex(range.startIndex);
      if (range.endIndex !== undefined) setEndIndex(range.endIndex);
    },
    []
  );

  const getVisibleSlice = useCallback(
    <T,>(data: T[]): T[] => data.slice(startIndex, endIndex + 1),
    [startIndex, endIndex]
  );

  return {
    startIndex,
    endIndex,
    brushProps: {
      startIndex,
      endIndex,
      onChange: handleBrushChange,
      height: 20,
      travellerWidth: 8,
      stroke: "#667eea44",
      fill: "#0f172a",
      fillOpacity: 0.9,
    },
    containerProps: {
      onWheel: handleWheel,
      ref: containerRef as any,
      style: { touchAction: "none" } as React.CSSProperties,
    },
    isZoomed,
    resetZoom,
    zoomLevel,
    getVisibleSlice,
  };
}
