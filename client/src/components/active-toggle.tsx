import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ActiveToggleProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  onClick?: (event: React.MouseEvent) => void;
}

export function ActiveToggle({
  id,
  checked,
  onCheckedChange,
  disabled,
  className,
  compact,
  onClick,
}: ActiveToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1",
        checked ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50",
        className,
      )}
      onClick={onClick}
    >
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(compact && "scale-90")}
      />
      <Label
        htmlFor={id}
        className={cn(
          "cursor-pointer font-medium whitespace-nowrap",
          compact ? "text-[11px]" : "text-xs",
          checked ? "text-emerald-800" : "text-slate-500",
        )}
      >
        {checked ? "Active" : "Inactive"}
      </Label>
    </div>
  );
}
