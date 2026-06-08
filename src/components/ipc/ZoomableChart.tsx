/**
 * ZoomableChart — premium wrapper that adds Recharts Brush zoom + scroll-wheel zoom.
 *
 * Usage:
 *   <ZoomableChart data={monthlyData} dataKey="month">
 *     {(brushElement, isZoomed) => (
 *       <LineChart data={monthlyData}>
 *         ...axis, lines etc...
 *         {brushElement}
 *       </LineChart>
 *     )}
 *   </ZoomableChart>
 */
import { type ReactNode } from "react";
import { Brush } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useChartZoom } from "@/hooks/useChartZoom";

interface ZoomableChartProps<T> {
  /** Full dataset */
  data: T[];
  /** The dataKey for the Brush x-axis preview (e.g. "month", "name") */
  dataKey?: string;
  /** Render function: receives (visibleData, brushElement, zoomInfo) */
  children: (
    visibleData: T[],
    brushElement: ReactNode,
    info: { isZoomed: boolean; zoomLevel: number; resetZoom: () => void }
  ) => ReactNode;
  /** Min data points visible when zoomed in */
  minVisible?: number;
  /** Brush height (default: 24) */
  brushHeight?: number;
}

export function ZoomableChart<T>({
  data,
  dataKey = "name",
  children,
  minVisible = 2,
  brushHeight = 24,
}: ZoomableChartProps<T>) {
  const zoom = useChartZoom(data.length, minVisible);

  // Only render brush if there's enough data
  const showBrush = data.length > minVisible;

  const brushElement = showBrush ? (
    <Brush
      dataKey={dataKey}
      startIndex={zoom.startIndex}
      endIndex={zoom.endIndex}
      onChange={zoom.brushProps.onChange}
      height={brushHeight}
      travellerWidth={10}
      stroke="#667eea55"
      fill="#0f172a"
      fillOpacity={0.95}
      tickFormatter={() => ""}
    />
  ) : null;

  const visibleData = zoom.getVisibleSlice(data);

  return (
    <div className="relative group" {...zoom.containerProps}>
      {/* Zoom level badge + reset button */}
      <AnimatePresence>
        {zoom.isZoomed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -4 }}
            className="absolute top-1 right-1 z-20 flex items-center gap-1.5"
          >
            <span className="text-[9px] font-mono font-bold text-purple-200 bg-purple-500/15 border border-purple-500/25 backdrop-blur-md rounded-full px-2 py-0.5 shadow-lg shadow-purple-500/5">
              🔍 {zoom.zoomLevel.toFixed(1)}x
            </span>
            <button
              onClick={zoom.resetZoom}
              className="p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-200 shadow-lg"
              title="Reset zoom"
            >
              <RotateCcw size={10} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The chart */}
      {children(visibleData, brushElement, {
        isZoomed: zoom.isZoomed,
        zoomLevel: zoom.zoomLevel,
        resetZoom: zoom.resetZoom,
      })}

      {/* Scroll hint */}
      {data.length > minVisible && !zoom.isZoomed && (
        <p className="text-[8px] text-slate-600 text-center mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity duration-300">
          Scroll to zoom into details
        </p>
      )}
    </div>
  );
}
