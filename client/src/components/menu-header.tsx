import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import { generateQRCode } from "@/lib/qr-code";

interface MenuHeaderProps {
  isAdminMode: boolean;
  onAdminModeChange: (checked: boolean) => void;
}

export function MenuHeader({ isAdminMode, onAdminModeChange }: MenuHeaderProps) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Café Restaurant Leiden</h1>
            <p className="text-sm text-slate-500">Nederlandse & Internationale Keuken</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={generateQRCode}
              className="text-blue-600 hover:text-blue-800"
              title="Generate QR Code"
            >
              <QrCode className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <Switch
                checked={isAdminMode}
                onCheckedChange={onAdminModeChange}
                className="data-[state=checked]:bg-amber-600"
              />
              <span className="text-xs text-slate-600">Admin</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
