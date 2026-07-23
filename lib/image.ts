const MAX_EDGE = 1600;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export interface ProcessedImage { dataUrl: string; mimeType: "image/jpeg"; size: number; width: number; height: number }

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Não foi possível processar a imagem.")), "image/jpeg", quality));
}

export async function processImage(file: Blob): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Seu navegador não permite preparar a imagem.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  let quality = 0.88;
  let blob = await canvasBlob(canvas, quality);
  while (blob.size > MAX_IMAGE_BYTES && quality > 0.42) {
    quality -= 0.1;
    blob = await canvasBlob(canvas, quality);
  }
  if (blob.size > MAX_IMAGE_BYTES) throw new Error("A imagem continua maior que 2 MB após a otimização.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(blob);
  });
  return { dataUrl, mimeType: "image/jpeg", size: blob.size, width, height };
}

export function splitDataUrl(value: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) throw new Error("Formato local da imagem inválido.");
  return { mimeType: match[1] as "image/jpeg" | "image/png" | "image/webp", data: match[2] };
}
