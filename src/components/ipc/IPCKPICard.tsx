import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface IPCKPICardProps {
  icon: React.ElementType;
  label: string;
  labelAr?: string;
  value: string;
  sub?: string;
  color: string;
  delay?: number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  onClick?: () => void;
}

export function IPCKPICard({
  icon: Icon,
  label,
  labelAr,
  value,
  sub,
  color,
  delay = 0,
  trend,
  trendValue,
  onClick,
}: IPCKPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-none border border-[#c5a880]/15 p-5 transition-all duration-500 bg-[#121214] group luxury-glow ${
        onClick ? "cursor-pointer hover:border-[#c5a880]/40" : ""
      }`}
      whileHover={{ y: -2 }}
    >
      {/* Background soft glow */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-3xl opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
        style={{ background: "#c5a880" }}
      />

      {/* Header Row: Label & Trend */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase font-black tracking-widest text-[#c5a880] font-sans">
            {label}
          </span>
          {labelAr && (
            <span className="text-[9px] text-[#c5a880]/60 italic font-editorial-serif mt-0.5">
              {labelAr}
            </span>
          )}
        </div>
        
        {trend ? (
          <div
            className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-none border ${
              trend === "up"
                ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/5"
                : trend === "down"
                ? "text-red-400 border-red-400/20 bg-red-400/5"
                : "text-zinc-400 border-zinc-400/20 bg-zinc-400/5"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp size={8} />
            ) : trend === "down" ? (
              <TrendingDown size={8} />
            ) : (
              <Minus size={8} />
            )}
            {trendValue}
          </div>
        ) : (
          <Icon size={14} className="text-[#c5a880]/50" />
        )}
      </div>

      {/* Main Value */}
      <div className="text-2xl font-light text-white tracking-wide font-luxury-serif leading-none mt-1">
        {value}
      </div>

      {/* Subtext */}
      {sub && (
        <div className="text-[10px] text-zinc-500 mt-2 font-sans truncate">
          {sub}
        </div>
      )}

      {/* Bottom sliding accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#c5a880]/15" />
      <motion.div
        className="absolute bottom-0 left-0 h-[1.5px] bg-[#c5a880]"
        initial={{ width: "0%" }}
        whileHover={{ width: "100%" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </motion.div>
  );
}
