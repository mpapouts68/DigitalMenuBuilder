import { cn } from "@/lib/utils";
import { Megaphone, BarChart3 } from "lucide-react";

interface AdvertisementBannerProps {
  className?: string;
  type?: "advertisement" | "promotional";
}

export function AdvertisementBanner({ className, type = "advertisement" }: AdvertisementBannerProps) {
  const Icon = type === "promotional" ? Megaphone : BarChart3;
  const text = type === "promotional" ? "Promotional Banner" : "Advertisement Space";

  return (
    <div className={cn(
      "banner-space rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300",
      "bg-gradient-to-br from-slate-100 to-slate-200",
      className
    )}>
      <div className="text-center">
        <Icon className="text-slate-400 text-2xl mb-1 mx-auto" />
        <p className="text-xs text-slate-500">{text}</p>
      </div>
    </div>
  );
}
