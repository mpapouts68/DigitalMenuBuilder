import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold text-orange-800">
            Leidseplein Restaurant
          </CardTitle>
          <CardDescription className="text-lg">
            Digital Menu Management System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-gray-600">
            <p>Welcome to our restaurant menu management system.</p>
            <p className="mt-2">Please sign in to access admin features.</p>
          </div>
          
          <Button 
            onClick={handleLogin}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            size="lg"
          >
            Sign In to Continue
          </Button>
          
          <div className="text-center text-sm text-gray-500">
            <p>Secure authentication powered by Replit</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}