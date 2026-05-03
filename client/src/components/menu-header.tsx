import type { CSSProperties } from "react";
import { menuHeaderBackdropStyle } from "@/lib/menuBackdrop";

interface MenuHeaderProps {
  logoUrl?: string | null;
  headerTitle?: string | null;
  headerSubtitle?: string | null;
}

const DEFAULT_LOGO = "/logo.png";

export function MenuHeader({ logoUrl, headerTitle, headerSubtitle }: MenuHeaderProps) {
  const title = headerTitle?.trim();
  const subtitle = headerSubtitle?.trim();
  const textShadow =
    "0 0 12px rgba(255,255,255,1), 0 0 24px rgba(255,255,255,0.85), 0 2px 4px rgba(255,255,255,0.9), 0 1px 0 rgba(255,255,255,0.95)";

  const headerBg: CSSProperties = {
    ...menuHeaderBackdropStyle(),
    boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.35)",
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-900/10" style={headerBg}>
      <div className="max-w-sm mx-auto px-3 py-2 sm:max-w-md sm:px-5 sm:py-2.5">
        <div className="flex flex-col items-center text-center gap-1.5">
          <div className="shrink-0 rounded-full bg-transparent p-0 shadow-none ring-0">
            <img
              src={logoUrl?.trim() || DEFAULT_LOGO}
              alt="Logo"
              className="h-20 w-20 rounded-full object-cover object-center shadow-sm sm:h-24 sm:w-24"
            />
          </div>
          {title && (
            <h1
              className="text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl"
              style={{ textShadow }}
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p
              className="text-base leading-snug text-slate-800 sm:text-lg italic"
              style={{ textShadow }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
