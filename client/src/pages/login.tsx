import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NumericKeypad } from '@/components/numeric-keypad';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import logoPath from '@assets/logoB_1752121880525.ico';

export function LoginPage() {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/tables');
    }
  }, [isAuthenticated, setLocation]);

  const handleLogin = async () => {
    if (!pin) {
      toast({
        title: "Error",
        description: "Please enter your PIN",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login(pin);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Login successful",
        });
        setLocation('/tables');
      } else {
        toast({
          title: "Error",
          description: result.message || "Invalid PIN",
          variant: "destructive",
        });
        setPin(''); // Clear PIN on error
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
      setPin(''); // Clear PIN on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with Logo */}
      <div className="w-full bg-gray-800 shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center">
            <img 
              src={logoPath} 
              alt="OlymPOS" 
              className="h-20 w-auto"
              onError={(e) => {
                // Fallback if logo fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Staff Login</CardTitle>
            <CardDescription>Enter your PIN to access the system</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Logging in...</p>
              </div>
            ) : (
              <NumericKeypad
                value={pin}
                onChange={setPin}
                maxLength={6}
                showValue={showPin}
                onToggleVisibility={() => setShowPin(!showPin)}
                onEnter={handleLogin}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="w-full bg-gray-800 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="text-center text-sm text-gray-400">
            Mobile Restaurant Management System
          </div>
        </div>
      </div>
    </div>
  );
}