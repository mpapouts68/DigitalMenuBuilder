import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { QrCode, LogOut, User } from "lucide-react";
import { generateQRCode } from "@/lib/qr-code";
import { useAuth } from "@/hooks/useAuth";
import logoImage from "@assets/Screenshot 2025-06-20 101253_1750403621548.png";

interface MenuHeaderProps {
  isAdminMode: boolean;
  onAdminModeChange: (checked: boolean) => void;
}

export function MenuHeader({ isAdminMode, onAdminModeChange }: MenuHeaderProps) {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <img 
              src={logoImage} 
              alt="Leidseplein Restaurant Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={generateQRCode}
              className="text-red-600 hover:text-red-800"
              title="Generate QR Code"
            >
              <QrCode className="h-4 w-4" />
            </Button>
            {user && (
              <>
                <div className="flex items-center space-x-1 text-xs">
                  <User className="h-3 w-3 text-gray-500" />
                  <span className="text-gray-600">
                    {user.firstName || user.email || 'Admin'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isAdminMode}
                    onCheckedChange={onAdminModeChange}
                    className="data-[state=checked]:bg-red-600"
                  />
                  <span className="text-xs text-slate-600">Admin</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700"
                  title="Sign Out"
                >
                  <LogOut className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
