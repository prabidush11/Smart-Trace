import { Link, useLocation } from "wouter";
import { LayoutDashboard, ScanLine, Box, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/scanner", label: "Product Scanner", icon: ScanLine },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 text-slate-300 hidden md:flex flex-col z-50">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/50">
            <Box className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-white tracking-tight">
            SmartTrace
          </span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          
          return (
            <Link key={link.href} href={link.href}>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-blue-600/10 text-blue-400 font-semibold shadow-inner shadow-blue-900/20" 
                    : "hover:bg-slate-800 hover:text-white text-slate-400"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-white")} />
                {link.label}
              </button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
          <p className="text-xs font-mono text-slate-500 mb-1">SYSTEM STATUS</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-emerald-400">Operational</span>
          </div>
        </div>
        
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
