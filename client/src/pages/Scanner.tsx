import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useVerifyProduct } from "@/hooks/use-smart-trace";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, ShieldAlert, ScanLine, Search, MapPin, Globe2, Loader2, PackageX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import type { VerifyProductResponse } from "@shared/schema";

const LOCATIONS = {
  nyc: { label: "New York, USA", lat: 40.7128, long: -74.0060 },
  ldn: { label: "London, UK", lat: 51.5074, long: -0.1278 },
  shg: { label: "Shanghai, CN", lat: 31.2304, long: 121.4737 },
  custom: { label: "Custom Coordinates", lat: 0, long: 0 },
};

export default function Scanner() {
  const verifyMutation = useVerifyProduct();
  
  const [serialNumber, setSerialNumber] = useState("");
  const [locationKey, setLocationKey] = useState<keyof typeof LOCATIONS>("nyc");
  const [customLat, setCustomLat] = useState("");
  const [customLong, setCustomLong] = useState("");
  const [result, setResult] = useState<VerifyProductResponse | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber) return;

    let lat = LOCATIONS[locationKey].lat;
    let long = LOCATIONS[locationKey].long;

    if (locationKey === "custom") {
      lat = parseFloat(customLat) || 0;
      long = parseFloat(customLong) || 0;
    }

    try {
      const data = await verifyMutation.mutateAsync({
        serialNumber,
        lat,
        long,
      });
      setResult(data as VerifyProductResponse);
    } catch (error) {
      // Error handled by hook toast
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-2rem)]">
        <div className="w-full max-w-lg space-y-6">
          
          <div className="text-center space-y-2 mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-6 ring-4 ring-slate-100">
              <ScanLine className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Product Verification</h1>
            <p className="text-slate-500">Enter a serial number to verify authenticity and track supply chain history.</p>
          </div>

          {/* Scanner Form Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="industrial-card p-6 md:p-8 space-y-6 bg-white shadow-xl shadow-slate-200/50 border-slate-200"
          >
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="serial" className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Serial Number</Label>
                <div className="relative">
                  <Input 
                    id="serial"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Enter UUID or SN..."
                    className="pl-10 h-12 font-mono text-lg border-slate-300 focus-visible:ring-primary bg-slate-50/50"
                  />
                  <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Simulation Location</Label>
                <Select value={locationKey} onValueChange={(val: any) => setLocationKey(val)}>
                  <SelectTrigger className="h-12 border-slate-300 bg-slate-50/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LOCATIONS).map(([key, loc]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Globe2 className="w-4 h-4 text-slate-400" />
                          {loc.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {locationKey === "custom" && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Latitude</Label>
                    <Input 
                      type="number" 
                      value={customLat} 
                      onChange={(e) => setCustomLat(e.target.value)} 
                      placeholder="0.0000"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Longitude</Label>
                    <Input 
                      type="number" 
                      value={customLong} 
                      onChange={(e) => setCustomLong(e.target.value)} 
                      placeholder="0.0000"
                      className="font-mono"
                    />
                  </div>
                </motion.div>
              )}

              <Button 
                type="submit" 
                size="lg" 
                disabled={!serialNumber || verifyMutation.isPending}
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Authenticity"
                )}
              </Button>
            </form>
          </motion.div>

          {/* Result Display */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={result.timestamp} // Force re-render on new scan
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`industrial-card p-6 border-l-4 ${
                  result.status === "valid" ? "border-l-emerald-500 bg-emerald-50/50" : 
                  result.status === "suspect" ? "border-l-red-500 bg-red-50/50" : 
                  "border-l-slate-400 bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full shrink-0 ${
                    result.status === "valid" ? "bg-emerald-100 text-emerald-600" : 
                    result.status === "suspect" ? "bg-red-100 text-red-600" : 
                    "bg-slate-200 text-slate-500"
                  }`}>
                    {result.status === "valid" ? <ShieldCheck className="w-8 h-8" /> : 
                     result.status === "suspect" ? <ShieldAlert className="w-8 h-8" /> :
                     <PackageX className="w-8 h-8" />}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <h3 className={`text-xl font-bold font-display ${
                      result.status === "valid" ? "text-emerald-900" : 
                      result.status === "suspect" ? "text-red-900" : 
                      "text-slate-900"
                    }`}>
                      {result.status === "valid" ? "AUTHENTIC PRODUCT" : 
                       result.status === "suspect" ? "SUSPECT DETECTED" : 
                       "NOT FOUND"}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{result.message}</p>
                    
                    {result.label && (
                      <div className="mt-4 pt-4 border-t border-slate-200/60 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400 text-xs uppercase block mb-1">Type</span>
                          <span className="font-medium font-mono text-slate-700 capitalize">{result.label.type}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs uppercase block mb-1">Serial</span>
                          <span className="font-medium font-mono text-slate-700 truncate block" title={result.label.serialNumber}>
                            {result.label.serialNumber}
                          </span>
                        </div>
                        {result.timestamp && (
                          <div className="col-span-2">
                            <span className="text-slate-400 text-xs uppercase block mb-1">Scan Timestamp</span>
                            <span className="font-medium font-mono text-slate-700">
                              {format(new Date(), 'PPpp')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}
