import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function PlaceholderPage({ title, description, icon: Icon }: PlaceholderPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon size={28} className="text-primary" />
      </div>
      <h1 className="text-2xl font-heading font-bold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">{description}</p>
      <span className="mt-6 text-xs font-medium text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
        Coming Soon — Phase 2
      </span>
    </motion.div>
  );
}
