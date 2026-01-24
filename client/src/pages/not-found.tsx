import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-amber-900/10">
          <AlertTriangle className="w-10 h-10" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-bold text-slate-900">404</h1>
          <p className="text-slate-500 text-lg">Page not found</p>
          <p className="text-sm text-slate-400">The page you're looking for doesn't exist or has been moved.</p>
        </div>

        <Link href="/" className="inline-block">
          <button className="px-6 py-3 bg-primary text-white font-medium rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:-translate-y-0.5">
            Return to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
