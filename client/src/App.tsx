import { Router, Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoginPage } from "@/pages/login";
import { TablesPage } from "@/pages/tables";
import { OrderPage } from "@/pages/order";
import { StatsPage } from "@/pages/stats";
import { NotFoundPage } from "@/pages/not-found";
import { ProtectedRoute } from "@/components/protected-route";
import { MegaTest } from "@/components/mega-test";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MegaTest />
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Switch>
              <Route path="/login" component={LoginPage} />
              <Route path="/tables" component={() => (
                <ProtectedRoute>
                  <TablesPage />
                </ProtectedRoute>
              )} />
              <Route path="/order/:postId" component={() => (
                <ProtectedRoute>
                  <OrderPage />
                </ProtectedRoute>
              )} />
              <Route path="/stats" component={() => (
                <ProtectedRoute>
                  <StatsPage />
                </ProtectedRoute>
              )} />
              <Route path="/" component={() => (
                <ProtectedRoute>
                  <TablesPage />
                </ProtectedRoute>
              )} />
              <Route component={NotFoundPage} />
            </Switch>
          </div>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;