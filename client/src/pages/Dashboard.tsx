import { useState } from "react";
import { useBatches, useGenerateBatch } from "@/hooks/use-smart-trace";
import { Sidebar } from "@/components/Sidebar";
import { StatsCard } from "@/components/StatsCard";
import { Package, Cuboid, Factory, Plus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
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

export default function Dashboard() {
  const { data: batches, isLoading } = useBatches();
  const generateBatch = useGenerateBatch();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState(100);

  const totalBatches = batches?.length || 0;
  const totalUnits = batches?.reduce((acc, batch) => acc + batch.quantity, 0) || 0;
  
  // Example carton calculation (12 units per carton)
  const totalCartons = Math.ceil(totalUnits / 12); 

  const handleGenerate = async () => {
    try {
      await generateBatch.mutateAsync({ productName, quantity: Number(quantity) });
      setIsDialogOpen(false);
      setProductName("");
      setQuantity(100);
    } catch (error) {
      // Error handled by hook toast
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
              <p className="text-slate-500 mt-1">Overview of your production batches and inventory.</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5">
                  <Plus className="mr-2 w-5 h-5" />
                  Generate Batch
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-xl border-slate-200 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">New Production Batch</DialogTitle>
                  <DialogDescription>
                    Create a new batch of product units. This will generate unique serial numbers for each unit.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="product" className="text-slate-700 font-medium">Product Name</Label>
                    <Input
                      id="product"
                      placeholder="e.g. Ultra Widget X1"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="border-slate-300 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quantity" className="text-slate-700 font-medium">Quantity (Units)</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="border-slate-300 focus-visible:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">Approx. {Math.ceil(quantity/12)} cartons</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-300">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleGenerate} 
                    disabled={generateBatch.isPending || !productName}
                    className="bg-primary hover:bg-primary/90 min-w-[100px]"
                  >
                    {generateBatch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard 
              title="Total Batches" 
              value={totalBatches} 
              icon={Factory}
              description="Active production runs"
            />
            <StatsCard 
              title="Units Generated" 
              value={totalUnits.toLocaleString()} 
              icon={Package} 
              className="border-blue-100 bg-blue-50/50"
            />
            <StatsCard 
              title="Cartons Tracked" 
              value={totalCartons.toLocaleString()} 
              icon={Cuboid} 
            />
          </div>

          {/* Recent Batches Table */}
          <div className="industrial-card overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-lg font-bold font-display text-slate-800">Recent Production Batches</h3>
              <div className="text-xs font-mono text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                LIVE DATA
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-12 flex justify-center items-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
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
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="px-6 py-4 font-mono text-slate-500">#{batch.id.toString().padStart(4, '0')}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900 group-hover:text-primary transition-colors">
                          {batch.productName}
                        </td>
                        <td className="px-6 py-4 text-right font-mono">{batch.quantity.toLocaleString()}</td>
                        <td className="px-6 py-4 text-slate-500">
                          {batch.createdAt ? format(new Date(batch.createdAt), 'MMM d, yyyy HH:mm') : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Completed
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No batches generated yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
