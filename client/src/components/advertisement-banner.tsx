import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Megaphone, BarChart3, Upload, X, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Banner } from "@shared/schema";

interface AdvertisementBannerProps {
  className?: string;
  type?: "advertisement" | "promotional";
  isAdminMode?: boolean;
}

export function AdvertisementBanner({ className, type = "advertisement", isAdminMode = false }: AdvertisementBannerProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [altText, setAltText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: banner } = useQuery<Banner | null>({
    queryKey: [`/api/banners/type/${type}`],
    queryFn: async () => {
      const res = await fetch(`/api/banners/type/${type}`);
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch banner: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: true,
    retry: false,
  });

  const createBannerMutation = useMutation({
    mutationFn: async (bannerData: { type: string; imageUrl: string; altText?: string }) => {
      return await apiRequest("POST", "/api/banners", bannerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/banners/type/${type}`] });
      setShowUploadDialog(false);
      setImageUrl("");
      setAltText("");
      toast({
        title: "Banner uploaded",
        description: "The banner image has been successfully uploaded.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload banner image.",
        variant: "destructive",
      });
    },
  });

  const updateBannerMutation = useMutation({
    mutationFn: async (bannerData: { id: number; imageUrl: string; altText?: string }) => {
      return await apiRequest("PUT", `/api/banners/${bannerData.id}`, {
        imageUrl: bannerData.imageUrl,
        altText: bannerData.altText,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/banners/type/${type}`] });
      setShowUploadDialog(false);
      setImageUrl("");
      setAltText("");
      toast({
        title: "Banner updated",
        description: "The banner image has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update banner image.",
        variant: "destructive",
      });
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/banners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/banners/type/${type}`] });
      toast({
        title: "Banner removed",
        description: "The banner image has been successfully removed.",
      });
    },
    onError: () => {
      toast({
        title: "Remove failed",
        description: "Failed to remove banner image.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!imageUrl) {
      toast({
        title: "No image selected",
        description: "Please select an image to upload.",
        variant: "destructive",
      });
      return;
    }

    if (banner) {
      updateBannerMutation.mutate({
        id: banner.id,
        imageUrl,
        altText,
      });
    } else {
      createBannerMutation.mutate({
        type,
        imageUrl,
        altText,
      });
    }
  };

  const handleRemoveBanner = () => {
    if (banner) {
      deleteBannerMutation.mutate(banner.id);
    }
  };

  const Icon = type === "promotional" ? Megaphone : BarChart3;
  const text = type === "promotional" ? "Promotional Banner" : "Advertisement Space";

  // If there's a banner image, display it
  if (banner && banner.imageUrl) {
    return (
      <div className={cn("banner-space rounded-lg relative overflow-hidden", className)}>
        <img
          src={banner.imageUrl}
          alt={banner.altText || text}
          className="w-full h-full object-cover"
        />
        {isAdminMode && (
          <div className="absolute top-2 right-2 flex gap-1">
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit {text}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="image-upload">Select Image</Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                      className="mt-1"
                    />
                  </div>
                  {imageUrl && (
                    <div className="space-y-2">
                      <Label>Preview</Label>
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-20 object-cover rounded border"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="alt-text">Alt Text (Optional)</Label>
                    <Input
                      id="alt-text"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Describe the image"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSubmit}
                      disabled={!imageUrl || updateBannerMutation.isPending}
                      className="flex-1"
                    >
                      {updateBannerMutation.isPending ? "Updating..." : "Update Banner"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowUploadDialog(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRemoveBanner}
              disabled={deleteBannerMutation.isPending}
              className="h-8 w-8 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Default placeholder view
  return (
    <div className={cn(
      "banner-space rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300",
      "bg-gradient-to-br from-slate-100 to-slate-200 relative",
      className
    )}>
      <div className="text-center">
        <Icon className="text-slate-400 text-2xl mb-1 mx-auto" />
        <p className="text-xs text-slate-500">{text}</p>
        {isAdminMode && (
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="mt-2">
                <Upload className="h-3 w-3 mr-1" />
                Upload Image
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload {text}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="image-upload">Select Image</Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="mt-1"
                  />
                </div>
                {imageUrl && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-20 object-cover rounded border"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="alt-text">Alt Text (Optional)</Label>
                  <Input
                    id="alt-text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Describe the image"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={!imageUrl || createBannerMutation.isPending}
                    className="flex-1"
                  >
                    {createBannerMutation.isPending ? "Uploading..." : "Upload Banner"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadDialog(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
