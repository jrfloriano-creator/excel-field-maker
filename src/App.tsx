import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useFullscreenToggle } from "@/hooks/useFullscreenToggle";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
// ✅ Import da nova página
import ContasPagarPage from "./pages/ContasPagar";

const queryClient = new QueryClient();

const App = () => {
  useFullscreenToggle();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ✅ Rota do módulo Contas a Pagar */}
          <Route path="/contas-pagar" element={<ContasPagarPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;