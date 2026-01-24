import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Layers, ShieldAlert, Box, Camera, X, 
  CheckCircle2, ArrowRightLeft, PackageCheck 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Html5QrcodeScanner } from "html5-qrcode";
import type { VerifyProductResponse } from "@shared/schema";

export default function Hierarchy() {
  const [unitId, setUnitId] = useState("");
  const [cartonId, setCartonId] = useState("");
  const [activeScanTarget, setActiveScanTarget] = useState<"unit" | "carton" | null>(null);
  const [result, setResult] = useState<VerifyProductResponse | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Initialize/Cleanup Camera Scanner
  useEffect(() => {
    if (activeScanTarget) {
      const timer = setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner(
            "hierarchy-reader", 
            { 
              fps: 20, 
              qrbox: { width: 250, height: 250 },
              videoConstraints: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              }
            }, 
            false
          );
          
          scanner.render((text) => {
            const id = text.includes("id=") ? text.split("id=")[1] : text;
            if (activeScanTarget === "unit") setUnitId(id);
            if (activeScanTarget === "carton") setCartonId(id);
            
            setActiveScanTarget(null);
            scanner.clear();
          }, () => {});
          
          scannerRef.current = scanner;
        } catch (err) {
          console.error("Scanner init failed", err);
        }
      }, 300);
      return () => {
        clearTimeout(timer);
        if (scannerRef.current) scannerRef.current.clear().catch(() => {});
      };
    }
  }, [activeScanTarget]);

  const checkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/verify", {
        serialNumber: unitId,
        cartonId: cartonId,
        lat: 0, 
        long: 0,
        mode: "hierarchy"
      });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  const isMatch = result?.status === "valid";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          
          {/* CAMERA OVERLAY */}
          <AnimatePresence>
            {activeScanTarget && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black flex flex-col">
                <div id="hierarchy-reader" className="flex-1" />
                <div className="p-6 bg-slate-900 flex flex-col gap-4">
                  <p className="text-white text-center font-bold uppercase tracking-widest text-sm">
                    Scanning {activeScanTarget === "unit" ? "Product Unit" : "Parent Carton"}
                  </p>
                  <Button onClick={() => setActiveScanTarget(null)} className="bg-white text-black h-14 rounded-2xl font-bold">
                    <X className="mr-2" /> Cancel Scan
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto text-blue-600 mb-4 shadow-inner">
              <PackageCheck className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Hierarchy Check</h1>
            <p className="text-slate-500 text-sm">Verify unit-to-carton relationships for supply chain traceability</p>
          </div>

          <form 
            onSubmit={(e) => { e.preventDefault(); checkMutation.mutate(); }} 
            className="space-y-4 bg-white p-6 rounded-3xl shadow-xl border border-slate-100"
          >
            {/* UNIT INPUT */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Step 1: Product Unit</label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    placeholder="Unit HashID..."
                    className="h-14 font-mono pl-12 rounded-xl"
                  />
                  <Layers className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                </div>
                <Button 
                  type="button" 
                  onClick={() => setActiveScanTarget("unit")} 
                  className="h-14 w-14 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <Camera />
                </Button>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRightLeft className="text-slate-200 rotate-90 w-5 h-5" />
            </div>

            {/* CARTON INPUT */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Step 2: Parent Carton</label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    value={cartonId}
                    onChange={(e) => setCartonId(e.target.value)}
                    placeholder="Carton ID..."
                    className="h-14 font-mono pl-12 rounded-xl border-blue-100 focus:border-blue-500"
                  />
                  <Box className="absolute left-4 top-4 w-5 h-5 text-blue-400" />
                </div>
                <Button 
                  type="button" 
                  onClick={() => setActiveScanTarget("carton")} 
                  className="h-14 w-14 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <Camera />
                </Button>
              </div>
            </div>

            <Button 
              disabled={checkMutation.isPending || !unitId || !cartonId} 
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold mt-2 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
            >
              {checkMutation.isPending ? "Verifying..." : "Verify Hierarchy Match"}
            </Button>
          </form>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className={`p-6 rounded-3xl text-center shadow-2xl border-2 ${
                  isMatch ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  {isMatch ? (
                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-12 h-12 text-red-600" />
                  )}
                  <h2 className="text-xl font-black uppercase tracking-tight">
                    {isMatch ? "MATCH CONFIRMED" : "HIERARCHY MISMATCH"}
                  </h2>
                  <p className="text-sm font-medium opacity-80 leading-relaxed">{result.message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}