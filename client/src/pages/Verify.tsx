import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, ShieldAlert, ShieldQuestion, 
  Search, MapPin, ChevronDown, ChevronUp, 
  Layers, Box, Package, Camera, X, Loader2, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Html5QrcodeScanner } from "html5-qrcode";
import type { VerifyProductResponse } from "@shared/schema";

export default function Verify() {
  const [sn, setSn] = useState("");
  const [result, setResult] = useState<VerifyProductResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  // ✅ Pincode & Dropdown State
  const [pincode, setPincode] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [location, setLocation] = useState({
    lat: 19.0760,
    long: 72.8777,
    label: "Mumbai, India (Default)"
  });

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // ✅ Search for locations by Pincode
  const lookupPincode = async () => {
    if (!pincode || pincode.length < 3) return;
    setIsGeocoding(true);
    setSearchResults([]);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&postalcode=${pincode}&limit=5`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        setSearchResults(data);
      } else {
        alert("No locations found for this pincode.");
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // ✅ Handle selection from dropdown
  const selectLocation = (item: any) => {
    setLocation({
      lat: parseFloat(item.lat),
      long: parseFloat(item.lon),
      label: item.display_name.split(',').slice(0, 3).join(',')
    });
    setSearchResults([]);
    setPincode(""); // Clear input after selection
  };

  useEffect(() => {
    if (isScanning) {
      const timer = setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner(
            "reader", 
            { 
              fps: 20, 
              qrbox: { width: 280, height: 280 },
              aspectRatio: 1.0,
              videoConstraints: {
                facingMode: { ideal: "environment" }, 
                width: { ideal: 1920 },               
                height: { ideal: 1080 }
              }
            }, 
            false
          );
          
          scanner.render((decodedText) => {
            const id = decodedText.includes("id=") ? decodedText.split("id=")[1] : decodedText;
            setSn(id);
            verifyMutation.mutate(id);
            setIsScanning(false);
            scanner.clear();
          }, () => {});
          
          scannerRef.current = scanner;
        } catch (err) {
          console.error("Scanner init failed", err);
        }
      }, 300);
      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch((e) => console.warn("Cleanup failed", e));
        }
      };
    }
  }, [isScanning]);

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", "/api/verify", { 
        serialNumber: id, 
        lat: location.lat, 
        long: location.long, 
        mode: "consumer" 
      });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  const getCfg = (s: string) => {
    if (s === "valid") return { bg: "bg-emerald-600", icon: <ShieldCheck className="w-12 h-12" />, title: "AUTHENTIC" };
    if (s === "suspect") return { bg: "bg-amber-500", icon: <ShieldQuestion className="w-12 h-12" />, title: "SUSPECT" };
    return { bg: "bg-red-600", icon: <ShieldAlert className="w-12 h-12" />, title: "INVALID" };
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          
          <AnimatePresence>
            {isScanning && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black flex flex-col">
                <div id="reader" className="flex-1 overflow-hidden" />
                <div className="p-6 bg-slate-900 border-t border-slate-800 flex flex-col gap-4">
                  <Button onClick={() => setIsScanning(false)} className="w-full bg-white text-slate-900 h-14 rounded-2xl font-bold">
                    <X className="mr-2 w-5 h-5" /> Close Scanner
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Verify Product</h1>
            <p className="text-slate-500 text-sm flex items-center justify-center gap-1.5 font-medium truncate px-4">
              <MapPin className="w-4 h-4 text-blue-500 shrink-0" /> {location.label}
            </p>
          </div>

          {/* ✅ DYNAMIC PINCODE & DROPDOWN UI */}
          <div className="relative z-50">
            <div className="bg-white p-5 rounded-[2rem] shadow-xl border border-slate-100 space-y-3">
               <div className="flex items-center justify-between px-1">
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Simulate Scan Origin</span>
                 <span className="text-[10px] font-bold text-blue-600">{location.lat.toFixed(2)}, {location.long.toFixed(2)}</span>
               </div>
               <div className="flex gap-2">
                  <Input 
                    value={pincode} 
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="Enter Pincode..."
                    className="h-12 rounded-xl bg-slate-50 border-none font-mono"
                  />
                  <Button 
                    onClick={lookupPincode} 
                    disabled={isGeocoding}
                    className="h-12 w-12 rounded-xl bg-slate-900 hover:bg-black"
                  >
                    {isGeocoding ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
                  </Button>
               </div>
            </div>

            {/* DROPDOWN RESULTS */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
                >
                  {searchResults.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => selectLocation(item)}
                      className="w-full p-4 text-left hover:bg-slate-50 border-b border-slate-50 last:border-none flex items-start gap-3 transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-800">{item.display_name.split(',')[0]}</p>
                        <p className="text-[10px] text-slate-500 truncate">{item.display_name}</p>
                      </div>
                      <Check className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); verifyMutation.mutate(sn); }} className="relative group">
            <Input 
              value={sn} 
              onChange={(e) => setSn(e.target.value)} 
              placeholder="Scan or enter Serial..." 
              className="h-16 text-lg font-mono shadow-xl rounded-2xl pr-28 border-slate-200 focus:ring-blue-500" 
            />
            <div className="absolute right-2 top-2 flex gap-1.5">
              <Button type="button" onClick={() => { setResult(null); setIsScanning(true); }} className="h-12 w-12 rounded-xl bg-blue-600 text-white shadow-lg"><Camera /></Button>
              <Button disabled={verifyMutation.isPending} className="h-12 w-12 rounded-xl bg-slate-900 text-white shadow-lg"><Search /></Button>
            </div>
          </form>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`p-8 rounded-[2.5rem] text-center shadow-2xl ${getCfg(result.status).bg} text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                <div className="flex flex-col items-center gap-4 relative z-10">
                  <div className="p-5 bg-white/20 rounded-full backdrop-blur-xl ring-8 ring-white/5">{getCfg(result.status).icon}</div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">{getCfg(result.status).title}</h2>
                  <p className="font-semibold text-lg opacity-90 leading-snug">{result.message}</p>
                </div>

                {result.status === "valid" && (
                  <div className="mt-8 pt-6 border-t border-white/20 relative z-10">
                    <p className="text-[10px] font-black uppercase opacity-60 mb-6 tracking-widest text-center">Supply Chain Traceability</p>
                    <div className="flex items-center justify-between px-4">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/20"><Layers className="w-6 h-6" /></div>
                        <span className="text-[10px] font-bold">Pallet</span>
                      </div>
                      <div className="h-px flex-1 bg-white/20 mx-2 mb-6" />
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/20"><Box className="w-6 h-6" /></div>
                        <span className="text-[10px] font-bold">Carton</span>
                      </div>
                      <div className="h-px flex-1 bg-white/20 mx-2 mb-6" />
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-xl ring-4 ring-emerald-500/20"><Package className="w-6 h-6" /></div>
                        <span className="text-[10px] font-bold">Unit</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}