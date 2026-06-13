import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, DollarSign, Shield, Zap, CheckCircle } from "lucide-react";

/* ─── Release changelog ─────────────────────────────── */

const APP_VERSION = "2.4.0";
const STORAGE_KEY = `pzone_whats_new_seen_${APP_VERSION}`;

interface ChangeItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: "new" | "improved" | "fixed";
}

const CHANGES: ChangeItem[] = [
  {
    icon: <DollarSign className="h-5 w-5" />,
    title: "USD / EGP Currency Support",
    description:
      "Projects with $ in the contract value are now automatically detected as USD. Dashboard portfolio totals convert to EGP using the live Central Bank of Egypt rate.",
    tag: "new",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Enhanced Security",
    description:
      "All admin scripts now use environment variables instead of hardcoded keys. Sensitive data has been removed from version control.",
    tag: "improved",
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Performance Boost",
    description:
      "Eliminated N+1 database queries in Projects, Alarms, and Financial dashboards — pages load up to 5× faster with large datasets.",
    tag: "improved",
  },
  {
    icon: <CheckCircle className="h-5 w-5" />,
    title: "Sync Reliability",
    description:
      "Google Sheet sync now handles duplicates correctly. Collection transactions use dedupe keys to prevent double-counting.",
    tag: "fixed",
  },
];

const TAG_STYLES: Record<string, string> = {
  new: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  improved: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  fixed: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

/* ─── Component ──────────────────────────────────────── */

export default function WhatsNewDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      // Small delay so the dashboard loads first
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-[520px] border-border/50 bg-gradient-to-b from-background to-muted/30 p-0 gap-0 overflow-hidden">
        {/* Header with gradient accent */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 shadow-lg shadow-emerald-500/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  What's New
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  PZone v{APP_VERSION} — Latest updates
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Changes list */}
        <div className="px-6 pb-2 space-y-3 max-h-[400px] overflow-y-auto">
          {CHANGES.map((change, i) => (
            <div
              key={i}
              className="group flex gap-3 p-3 rounded-xl border border-border/40 bg-card/50 hover:bg-card/80 hover:border-border/60 transition-all duration-200"
            >
              <div className="flex-shrink-0 flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                {change.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm text-foreground">
                    {change.title}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 uppercase font-bold tracking-wider ${TAG_STYLES[change.tag]}`}
                  >
                    {change.tag}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {change.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/40 bg-muted/20">
          <Button
            onClick={handleDismiss}
            className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
          >
            Got it, let's go! 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
