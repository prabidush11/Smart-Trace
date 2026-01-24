import { useState, useEffect } from "react";
import { useBatches, useGenerateBatch } from "@/hooks/use-smart-trace";
import { Sidebar } from "@/components/Sidebar";
import { StatsCard } from "@/components/StatsCard";
import { Package, Cuboid, Factory, Plus, Loader2, Container, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// --- HELPER: Random Code Generator ---
const generateRandomCode = () => {
  const prefix = "GTIN";
  const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 random digits
  return `${prefix}-${randomNum}`;
};

export default function Dashboard() {
  const { data: batches, isLoading } = useBatches();
  const generateBatch = useGenerateBatch();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Form State
  const [productName, setProductName] = useState("");
  // ✅ Initialize with a random code immediately
  const [productCode, setProductCode] = useState(generateRandomCode());
  const [quantity, setQuantity] = useState(1000);
  
  // Aggregation Rules
  const [unitsPerCarton, setUnitsPerCarton] = useState(10);
  const [cartonsPerPallet, setCartonsPerPallet] = useState(50);

  // Quick Math for Preview
  const totalCartons = Math.ceil(quantity / unitsPerCarton);
  const totalPallets = Math.ceil(totalCartons / cartonsPerPallet);

  const totalUnitsStats = batches?.reduce((acc, batch) => acc + batch.quantity, 0) || 0;
  const totalCartonsStats = Math.ceil(totalUnitsStats / 12); 

  // Function to manually refresh the code if needed
  const handleRegenerateCode = () => {
    setProductCode(generateRandomCode());
  };

  const handleGenerate = async () => {
    try {
      await generateBatch.mutateAsync({ 
        productName, 
        productCode,
        quantity: Number(quantity),
        unitsPerCarton: Number(unitsPerCarton),
        cartonsPerPallet: Number(cartonsPerPallet)
      });
      setIsDialogOpen(false);
      
      // ✅ RESET & AUTO-GENERATE FOR NEXT TIME
      setProductName("");
      setProductCode(generateRandomCode()); // <--- Fresh code automatically!
      setQuantity(1000);
      
    } catch (error) {
      console.error("Failed to generate", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 lg:p-12">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-500 mt-1">Manage production batches and aggregation rules.</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5">
                  <Plus className="mr-2 w-5 h-5" />
                  New Production Run
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-xl border-slate-200 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">Generate 3-Tier Batch</DialogTitle>
                  <DialogDescription>
                    Configure the Pallet → Carton → Unit hierarchy.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  {/* Product Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product">Product Name</Label>
                      <Input
                        id="product"
                        placeholder="e.g. Paracetamol"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                      />
                    </div>
                    
                    {/* ✅ AUTO-GENERATED CODE INPUT */}
                    <div className="space-y-2">
                      <Label htmlFor="code" className="flex justify-between items-center">
                        Product Code
                        <span 
                          onClick={handleRegenerateCode} 
                          className="text-xs text-blue-500 cursor-pointer flex items-center gap-1 hover:underline"
                        >
                          <RefreshCw className="w-3 h-3" /> Auto-Gen
                        </span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="code"
                          value={productCode}
                          onChange={(e) => setProductCode(e.target.value)}
                          className="font-mono bg-slate-50 text-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-blue-600 font-semibold">Total Units to Produce</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="border-blue-200 bg-blue-50/50"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-500">Aggregation Rules</span>
                    </div>
                  </div>

                  {/* Aggregation Rules */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unitsPerCarton">Units per Carton</Label>
                      <Input
                        id="unitsPerCarton"
                        type="number"
                        value={unitsPerCarton}
                        onChange={(e) => setUnitsPerCarton(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cartonsPerPallet">Cartons per Pallet</Label>
                      <Input
                        id="cartonsPerPallet"
                        type="number"
                        value={cartonsPerPallet}
                        onChange={(e) => setCartonsPerPallet(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Preview Calculation */}
                  <div className="bg-slate-100 p-3 rounded-lg text-xs font-mono text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Generating:</span>
                      <strong>{totalPallets} Pallets</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Containing:</span>
                      <strong>{totalCartons} Cartons</strong>
                    </div>
                    <div className="flex justify-between text-blue-600">
                      <span>Total:</span>
                      <strong>{quantity} Units</strong>
                    </div>
                  </div>

                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleGenerate} disabled={generateBatch.isPending || !productName} className="bg-primary text-white">
                    {generateBatch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Production"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard title="Total Batches" value={batches?.length || 0} icon={Factory} description="Active runs" />
            <StatsCard title="Units Generated" value={totalUnitsStats.toLocaleString()} icon={Package} className="border-blue-100 bg-blue-50/50" />
            <StatsCard title="Cartons Tracked" value={totalCartonsStats.toLocaleString()} icon={Cuboid} />
          </div>

          {/* Recent Batches Table */}
          <div className="industrial-card overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-lg font-bold font-display text-slate-800">Recent Production Batches</h3>
              <div className="text-xs font-mono text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">LIVE DATA</div>
            </div>
            
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-12 flex justify-center items-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : batches && batches.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium uppercase text-xs tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Batch ID</th>
                      <th className="px-6 py-4">Product Name</th>
                      <th className="px-6 py-4 text-right">Quantity</th>
                      <th className="px-6 py-4">Created At</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batches.map((batch, idx) => (
                      <motion.tr 
                        key={batch.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => setLocation(`/batch/${batch.id}`)}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4 font-mono text-slate-500 group-hover:text-primary">#{batch.id.toString().padStart(4, '0')}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900 group-hover:text-primary">{batch.productName}</td>
                        <td className="px-6 py-4 text-right font-mono">{batch.quantity.toLocaleString()}</td>
                        <td className="px-6 py-4 text-slate-500">{batch.createdAt ? format(new Date(batch.createdAt), 'MMM d, yyyy HH:mm') : '-'}</td>
                        <td className="px-6 py-4 text-center"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">Completed</span></td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-400"><Package className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>No batches generated yet.</p></div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}