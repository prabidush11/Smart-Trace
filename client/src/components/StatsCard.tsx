import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatsCard({ title, value, description, icon: Icon, trend, className }: StatsCardProps) {
  return (
    <div className={cn("industrial-card p-6 flex items-start justify-between relative overflow-hidden group", className)}>
      <div className="relative z-10">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <h3 className="mt-2 text-3xl font-display font-bold text-foreground">{value}</h3>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      
      <div className="p-3 bg-primary/5 rounded-xl group-hover:bg-primary/10 transition-colors">
        <Icon className="w-6 h-6 text-primary" />
      </div>

      {/* Decorative gradient blob */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />
    </div>
  );
}
