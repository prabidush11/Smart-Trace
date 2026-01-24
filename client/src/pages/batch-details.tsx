import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package,        // For Units
  Box,            // For Cartons
  Container,      // For Pallets
  ArrowLeft, 
  Loader2, 
  ChevronDown, 
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// === TYPES ===
interface Unit {
  uuid: string;
  serialNumber: string; // This now contains "DATA-HASH"
  status: string;
  type: 'unit';
}

interface Carton {
  uuid: string;
  serialNumber: string;
  children: Unit[];
  type: 'carton';
}

interface Pallet {
  uuid: string;
  serialNumber: string;
  children: Carton[];
  type: 'pallet';
}

interface BatchDetails {
  id: number;
  productName: string;
  quantity: number;
  createdAt: string;
  hierarchy: (Pallet | Carton)[]; 
}

export default function BatchDetails() {
  const [, params] = useRoute("/batch/:id");
  const id = params?.id;

  const { data: batch, isLoading } = useQuery<BatchDetails>({
    queryKey: [`/api/batches/${id}`],
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading supply chain...</span>
      </div>
    );
  }

  if (!batch) return <div className="p-8 text-red-500">Batch not found</div>;

  const totalPallets = batch.hierarchy.filter(i => i.type === 'pallet').length;
  const totalCartons = totalPallets > 0 
    ? (batch.hierarchy as Pallet[]).reduce((acc, p) => acc + p.children.length, 0)
    : batch.hierarchy.length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <a className="p-2 hover:bg-gray-100 rounded-full transition cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </a>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{batch.productName}</h1>
          <p className="text-gray-500">
            Batch ID: #{batch.id} • Created: {new Date(batch.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="ml-auto">
          <Badge className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 text-sm flex gap-2 items-center">
            <ShieldCheck className="w-4 h-4" /> Secure Hash Enabled
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-blue-50 border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Total Units</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{batch.quantity}</div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">Cartons</CardTitle>
            <Box className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{totalCartons}</div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">Pallets</CardTitle>
            <Container className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{totalPallets}</div>
          </CardContent>
        </Card>
      </div>

      {/* HIERARCHY TREE VIEW */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
          Traceability Hierarchy
        </h2>
        
        <div className="grid gap-6">
          {totalPallets > 0 ? (
            (batch.hierarchy as Pallet[]).map((pallet) => (
              <PalletCard key={pallet.uuid} pallet={pallet} />
            ))
          ) : (
            (batch.hierarchy as Carton[]).map((carton) => (
              <CartonCard key={carton.uuid} carton={carton} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// === SUB-COMPONENTS ===

// Helper to format ID: "DATA-HASH" -> <span>DATA-<b class="text-green">HASH</b></span>
const FormatHashID = ({ id }: { id: string }) => {
  if (!id.includes('-')) return <span className="font-mono text-gray-600">{id}</span>;
  
  const parts = id.split('-');
  const hash = parts.pop();
  const data = parts.join('-');

  return (
    <span className="font-mono text-xs truncate">
      <span className="text-gray-500">{data}-</span>
      <span className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded border border-emerald-100">{hash}</span>
    </span>
  );
};

function PalletCard({ pallet }: { pallet: Pallet }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border-l-4 border-l-orange-500 shadow-sm overflow-hidden">
      <div 
        className="p-4 bg-orange-50/30 flex items-center justify-between cursor-pointer hover:bg-orange-50 transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronDown className="text-orange-400" /> : <ChevronRight className="text-orange-400" />}
          <div className="p-2 bg-orange-100 rounded-lg">
            <Container className="w-6 h-6 text-orange-700" />
          </div>
          <div className="flex flex-col">
            <FormatHashID id={pallet.serialNumber} />
            <p className="text-xs text-orange-400 font-mono mt-1">SSCC (Pallet)</p>
          </div>
        </div>
        <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">
          {pallet.children.length} Cartons
        </Badge>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="p-4 bg-gray-50/50 border-t border-gray-100 space-y-3">
              {pallet.children.map(carton => (
                <CartonCard key={carton.uuid} carton={carton} isNested />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function CartonCard({ carton, isNested = false }: { carton: Carton, isNested?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`border rounded-lg bg-white ${isNested ? "shadow-sm" : "border-l-4 border-l-purple-500 mb-4"}`}>
      <div 
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <div className="p-1.5 bg-purple-100 rounded">
            <Box className="w-4 h-4 text-purple-700" />
          </div>
          <div>
             <FormatHashID id={carton.serialNumber} />
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {carton.children.length} Units
        </Badge>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0 }} 
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-gray-50 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {carton.children.map((unit) => (
                <div 
                  key={unit.uuid} 
                  className="flex items-center gap-2 p-2 border rounded bg-white hover:border-emerald-400 transition group overflow-hidden"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(unit.serialNumber);
                    // Optional: Add a toast here "Copied!"
                  }}
                >
                  <Package className="w-3 h-3 text-gray-400 group-hover:text-emerald-500 flex-shrink-0" />
                  <FormatHashID id={unit.serialNumber} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}