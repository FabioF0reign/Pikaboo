import type { SupabaseClient } from "@supabase/supabase-js";

// Downsizes an image client-side before it ever leaves the browser, so a
// full-resolution phone photo doesn't get uploaded as-is.
export function resizeImageToBlob(file: File, maxDim = 900, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas unsupported"));
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("could not encode image"))), "image/jpeg", quality);
      };
      img.onerror = () => reject(new Error("could not read image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

export async function uploadPhoto(supabase: SupabaseClient, bucket: string, blob: Blob): Promise<string> {
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
