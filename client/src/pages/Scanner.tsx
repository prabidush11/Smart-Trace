import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, ShieldQuestion, ScanLine, Box, ChevronDown, ChevronUp, MapPin, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { VerifyProductResponse } from "@shared/schema";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 🌍 Locations
const LOCATIONS = {
  nyc: { label: "New York, USA", lat: 40.7128, long: -74.0060 },
  mumbai: { label: "Mumbai, India", lat: 19.0760, long: 72.8777 },
  ldn: { label: "London, UK", lat: 51.5074, long: -0.1278 },
  shg: { label: "Shanghai, CN", lat: 31.2304, long: 121.4737 },
};

export default function Scanner() {
  const [mode, setMode] = useState<"standard" | "hierarchy">("standard");
  
  const [serialNumber, setSerialNumber] = useState(""); 
  const [cartonId, setCartonId] = useState("");         
  const [result, setResult] = useState<VerifyProductResponse | null>(null);

  const [showDevTools, setShowDevTools] = useState(false);
  const [locationKey, setLocationKey] = useState<keyof typeof LOCATIONS>("mumbai");

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        serialNumber,
        lat: LOCATIONS[locationKey].lat, 
        long: LOCATIONS[locationKey].long, 
      };
      
      if (mode === "hierarchy") {
        payload.cartonId = cartonId;
      }
      const res = await apiRequest("POST", "/api/verify", payload);
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (serialNumber) verifyMutation.mutate();
  };

  const getStatusConfig = (res: VerifyProductResponse) => {
    // ✅ NEW: Specific UI for Hierarchy Success
    if (res.status === "valid" && res.parentLabel) {
      return { 
        color: "bg-blue-600", 
        icon: <Layers className="w-12 h-12" />, 
        title: "HIERARCHY MATCH",
        text: "text-white"
      };
    }

    switch (res.status) {
      case "valid":
        return { color: "bg-emerald-600", icon: <ShieldCheck className="w-12 h-12" />, title: "VERIFIED", text: "text-white" };
      case "suspect":
        return { color: "bg-yellow-500", icon: <ShieldQuestion className="w-12 h-12" />, title: "SUSPECT", text: "text-white" };
      case "invalid":
      default:
        return { color: "bg-red-600", icon: <ShieldAlert className="w-12 h-12" />, title: "INVALID", text: "text-white" };
    }
  };

  const statusConfig = result ? getStatusConfig(result) : null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 flex flex-col items-center justify-center p-6 min-h-[calc(100vh-2rem)]">
        <div className="w-full max-w-md space-y-8">
          
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto text-primary"
            >
              <ScanLine className="w-8 h-8" />
            </motion.div>
            
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Verification</h1>
              <div className="flex items-center justify-center gap-2 mt-2 text-sm font-medium text-slate-500 bg-slate-100 py-1 px-3 rounded-full w-fit mx-auto">
                <MapPin className="w-4 h-4 text-blue-500" />
                Scanning from: <span className="text-slate-800">{LOCATIONS[locationKey].label}</span>
              </div>
            </div>
          </div>

          <Tabs value={mode} onValueChange={(v: any) => { setMode(v); setResult(null); }} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="standard">Standard Scan</TabsTrigger>
              <TabsTrigger value="hierarchy">Hierarchy Check</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
               <Input 
                 autoFocus
                 value={serialNumber}
                 onChange={(e) => setSerialNumber(e.target.value)}
                 placeholder="Scan Unit HashID..."
                 className="h-14 text-lg font-mono shadow-sm"
               />
            </div>

            <AnimatePresence>
              {mode === "hierarchy" && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <div className="relative">
                    <Input 
                      value={cartonId}
                      onChange={(e) => setCartonId(e.target.value)}
                      placeholder="Scan Carton ID..."
                      className="h-14 text-lg font-mono shadow-sm pl-10 border-blue-200 focus-visible:ring-blue-500"
                    />
                    <Box className="absolute left-3 top-4 w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-xs text-slate-500 text-center">
                    Verifying if Unit belongs to this Carton.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <Button 
              type="submit" 
              size="lg"
              disabled={!serialNumber || (mode === "hierarchy" && !cartonId) || verifyMutation.isPending}
              className="w-full h-12 text-base bg-primary hover:bg-primary/90"
            >
              {verifyMutation.isPending ? "Checking..." : mode === "hierarchy" ? "Verify Hierarchy" : "Verify Product"}
            </Button>
          </form>

          {/* === OUTPUT CARD === */}
          <AnimatePresence mode="wait">
            {result && statusConfig && (
              <motion.div
                key={result.timestamp}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative overflow-hidden rounded-2xl p-6 text-center shadow-2xl ${statusConfig.color} text-white`}
              >
                <div className="flex flex-col items-center gap-4 relative z-10">
                  <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                    {statusConfig.icon}
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-wider">
                      {statusConfig.title}
                    </h2>
                    <p className="text-white/90 mt-2 font-medium leading-relaxed">
                      {result.message}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-12 pt-6 border-t border-slate-100 text-center">
            <button 
              onClick={() => setShowDevTools(!showDevTools)}
              className="text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition flex items-center gap-1 mx-auto"
            >
              Change Location {showDevTools ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            
            {showDevTools && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mt-4 bg-slate-100 p-4 rounded-xl"
              >
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(LOCATIONS).map(([key, loc]) => (
                    <button
                      key={key}
                      onClick={() => setLocationKey(key as any)}
                      className={`text-xs p-2 rounded border transition ${
                        locationKey === key 
                          ? "bg-white border-blue-500 text-blue-600 font-bold shadow-sm" 
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-white"
                      }`}
                    >
                      {loc.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}