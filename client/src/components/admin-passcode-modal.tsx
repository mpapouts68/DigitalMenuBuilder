import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff } from "lucide-react";

interface AdminPasscodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Hardcoded passcode - can be moved to environment variable later
const ADMIN_PASSCODE = "1234";

export function AdminPasscodeModal({ open, onOpenChange, onSuccess }: AdminPasscodeModalProps) {
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simple delay to simulate verification
    setTimeout(() => {
      if (passcode === ADMIN_PASSCODE) {
        onSuccess();
        onOpenChange(false);
        setPasscode("");
        toast({
          title: "Access granted",
          description: "Admin mode activated",
        });
      } else {
        toast({
          title: "Access denied",
          description: "Incorrect passcode",
          variant: "destructive",
        });
      }
      setIsSubmitting(false);
    }, 500);
  };

  const handleClose = () => {
    setPasscode("");
    setShowPasscode(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-orange-600" />
            Admin Access Required
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passcode">Enter Admin Passcode</Label>
            <div className="relative">
              <Input
                id="passcode"
                type={showPasscode ? "text" : "password"}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode"
                className="pr-10"
                autoComplete="off"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPasscode(!showPasscode)}
              >
                {showPasscode ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              disabled={!passcode || isSubmitting}
            >
              {isSubmitting ? "Verifying..." : "Access Admin"}
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Contact management for admin access
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}