import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AdvertisementBanner } from "./advertisement-banner";
import logoImage from "@assets/Screenshot 2025-06-20 101253_1750403621548.png";

interface MenuHeaderProps {
  isAdminMode: boolean;
  onAdminModeChange: (checked: boolean) => void;
}

export function MenuHeader({ isAdminMode, onAdminModeChange }: MenuHeaderProps) {
  const [showQRCode, setShowQRCode] = useState(false);

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50 border-b border-slate-100">
      <div className="max-w-sm mx-auto px-4 py-4 sm:max-w-md sm:px-6">
        {/* Logo Section - Prominent and mobile-optimized */}
        <div className="flex items-center justify-center mb-6">
          <div className="text-center">
            <img 
              src={logoImage} 
              alt="Leidseplein Restaurant Logo" 
              className="h-16 w-auto mx-auto mb-2 sm:h-20"
            />
            <h1 className="text-lg font-bold text-slate-900 leading-tight sm:text-xl">
              Café Restaurant Leiden
            </h1>
            <p className="text-sm text-slate-600">Digital Menu</p>
          </div>
        </div>



        {/* Controls Section - Optimized for touch */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setShowQRCode(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 px-4 py-2 rounded-full border-red-200 text-red-700 hover:bg-red-50 active:bg-red-100 transition-colors"
          >
            <QrCode className="h-4 w-4" />
            <span className="text-sm font-medium">Share</span>
          </Button>
          
          <div className="flex items-center gap-3">
            <Label htmlFor="admin-mode" className="text-sm text-slate-600 font-medium">
              Admin
            </Label>
            <Switch
              id="admin-mode"
              checked={isAdminMode}
              onCheckedChange={onAdminModeChange}
              className="data-[state=checked]:bg-red-600"
            />
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-center">Share Menu</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center p-6">
            <QRCodeSVG
              value={window.location.href}
              size={200}
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              level={"L"}
              includeMargin={false}
              className="rounded-lg shadow-sm"
            />
            <p className="text-center text-sm text-slate-600 mt-4">
              Scan to access this menu on your device
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
