import logoImage from "@assets/Screenshot 2025-06-20 101253_1750403621548.png";

interface MenuHeaderProps {}

export function MenuHeader({}: MenuHeaderProps) {

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50 border-b border-slate-100">
      <div className="max-w-sm mx-auto px-4 py-4 sm:max-w-md sm:px-6">
        {/* Logo Section - Prominent and mobile-optimized */}
        <div className="flex items-center justify-center mb-4">
          <img 
            src={logoImage} 
            alt="Leidseplein Restaurant Logo" 
            className="h-16 w-auto sm:h-20"
          />
        </div>




      </div>


    </header>
  );
}
