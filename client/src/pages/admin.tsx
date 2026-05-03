import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { auth } from "@/lib/auth";
import { AdminOperationsModal } from "@/components/admin-operations-modal";
import type { BrandingSettingsResponse, PendingPrintJob } from "@/types/pos";

interface AuthUser {
  username: string;
  role: "admin" | "printer";
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: user, refetch: refetchUser } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user", "admin-page"],
    enabled: auth.isAuthenticated(),
    retry: false,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/user");
      return response.json();
    },
  });

  const isAdmin = !!user && user.role === "admin";

  const { data: pendingJobs = [] } = useQuery<PendingPrintJob[]>({
    queryKey: ["/api/admin/print-jobs/pending", "admin-page"],
    enabled: isAdmin,
    refetchInterval: 3000,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/print-jobs/pending");
      return response.json();
    },
  });

  const { data: branding } = useQuery<BrandingSettingsResponse | null>({
    queryKey: ["/api/branding", "admin-page"],
    enabled: true,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/branding");
      return response.json();
    },
  });

  useEffect(() => {
    const title = branding?.headerTitle?.trim();
    document.title = title ? `${title} - Admin` : "Admin";
  }, [branding?.headerTitle]);

  const handlePasscodeLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/auth/passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await response.json();
      if (!response.ok || !data.token) {
        setError(data.message || "Invalid passcode");
        return;
      }
      auth.setToken(data.token);
      await refetchUser();
      setPasscode("");
    } catch {
      setError("Failed to authenticate");
    }
  };

  const handleLogout = () => {
    auth.removeToken();
    setLocation("/menu");
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin access</CardTitle>
            <CardDescription>Enter admin passcode to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasscodeLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-passcode">Passcode</Label>
                <Input
                  id="admin-passcode"
                  type="password"
                  value={passcode}
                  onChange={(event) => setPasscode(event.target.value)}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setLocation("/menu")}>
                  Back
                </Button>
                <Button type="submit" className="flex-1">
                  Enter
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Admin Console</CardTitle>
              <CardDescription>Orders, printing, and company settings.</CardDescription>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setLocation("/menu?admin=1")} variant="default">
                Manage menu (edit/import/export)
              </Button>
              <Button onClick={() => setLocation("/printer")} className="gap-2">
                Printing / Orders Page
                <Badge variant={pendingJobs.length > 0 ? "destructive" : "secondary"}>{pendingJobs.length}</Badge>
              </Button>
              <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                Company settings
              </Button>
              <Button variant="outline" onClick={() => setLocation("/menu")}>
                Back to menu
              </Button>
            </div>

            {pendingJobs.length > 0 ? (
              <Alert className="border-amber-300 bg-amber-50 animate-pulse">
                <AlertDescription>
                  {pendingJobs.length} pending print job(s). Open Printing / Orders page now.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertDescription>No pending print jobs.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <AdminOperationsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

