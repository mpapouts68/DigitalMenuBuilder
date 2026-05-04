import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ModifierChoiceImageProps {
  value: string;
  onChange: (next: string) => void;
  idPrefix: string;
}

/** Admin: optional thumbnail + upload for option/extra row (max 2MB). */
export function ModifierChoiceImage({ value, onChange, idPrefix }: ModifierChoiceImageProps) {
  const ref = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Use an image under 2MB.",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {value ? (
        <img src={value} alt="" className="h-10 w-10 rounded-md object-cover border border-slate-200" />
      ) : null}
      <input
        id={`${idPrefix}-file`}
        type="file"
        accept="image/*"
        className="hidden"
        ref={ref}
        onChange={onFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-2"
        onClick={() => ref.current?.click()}
        title="Add image"
      >
        <ImageIcon className="h-3.5 w-3.5" />
      </Button>
      {value ? (
        <Button type="button" variant="ghost" size="sm" className="h-8 px-1 text-xs text-red-600" onClick={() => onChange("")}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}
