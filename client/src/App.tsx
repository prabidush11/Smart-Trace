import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import Dashboard from "@/pages/Dashboard";
import Verify from "@/pages/Verify";         // ✅ New specialized consumer page
import Hierarchy from "@/pages/Hierarchy";   // ✅ New specialized warehouse page
import BatchDetails from "@/pages/batch-details";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      
      {/* ✅ Separated scan routes */}
      <Route path="/verify" component={Verify} />
      <Route path="/hierarchy" component={Hierarchy} />
      
      <Route path="/batch/:id" component={BatchDetails} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;