import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Menu from "@/pages/menu";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import PrinterPage from "@/pages/printer";
import AdminPage from "@/pages/admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Menu} />
      <Route path="/menu" component={Menu} />
      <Route path="/login" component={Login} />
      <Route path="/printer" component={PrinterPage} />
      <Route path="/admin" component={AdminPage} />
      <Route>
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">Page Not Found</h1>
            <p className="text-slate-600">The page you're looking for doesn't exist.</p>
          </div>
        </div>
      </Route>
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
