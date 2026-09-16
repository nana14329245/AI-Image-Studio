"use client";

import {
  MAX_SOURCE_FILE_BYTES,
  MAX_SOURCE_FILE_MB,
  MAX_SOURCE_PIXELS,
  MAX_UPLOAD_DATA_URL_CHARS,
  dataUrlLength,
  fitWithin,
} from "@/lib/uploadLimits";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type PreparedUpload = {
  dataUrl: string;
  width: number;
  height: number;
  /** True when the browser re-encoded or shrank the file before upload. */
  converted: boolean;
};

/** An error whose message is written for the person choosing the file. */
export class UploadError extends Error {}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new UploadError("อ่านไฟล์ไม่สำเร็จ")));
    reader.onerror = () => reject(new UploadError("อ่านไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง"));
    reader.readAsDataURL(file);
  });
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    // Applies the EXIF orientation, so a portrait phone photo is not sent sideways
    // once it is redrawn without its metadata.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new UploadError("เปิดภาพนี้ไม่ได้ ไฟล์อาจเสียหาย กรุณาเลือกไฟล์ใหม่");
  }
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): string {
  return canvas.toDataURL(type, quality);
}

/**
 * Reads a chosen image and makes sure it can be sent to the API: at most
 * `maxEdge` on its longest side and short enough to stay under Vercel's request
 * body limit. A file that already fits is sent byte for byte.
 *
 * Re-encoding keeps transparency where it can: PNG and WebP sources become WebP,
 * JPEG stays JPEG. A browser that cannot encode WebP gets JPEG on a white
 * background instead of the black that a transparent area would otherwise turn.
 */
export async function prepareImageUpload(file: File, maxEdge: number): Promise<PreparedUpload> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new UploadError("รองรับไฟล์ JPG, PNG และ WebP เท่านั้น");
  }
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new UploadError(`กรุณาเลือกไฟล์ขนาดไม่เกิน ${MAX_SOURCE_FILE_MB} MB`);
  }

  const bitmap = await decode(file);
  try {
    const { width, height } = bitmap;
    if (width * height > MAX_SOURCE_PIXELS) {
      throw new UploadError("ภาพใหญ่เกินไป กรุณาใช้ภาพขนาดไม่เกิน 100 ล้านพิกเซล");
    }

    const target = fitWithin(width, height, maxEdge);
    const fitsAsIs = target.width === width && target.height === height && dataUrlLength(file.size, file.type) <= MAX_UPLOAD_DATA_URL_CHARS;
    if (fitsAsIs) {
      return { dataUrl: await readAsDataUrl(file), width, height, converted: false };
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new UploadError("เบราว์เซอร์นี้ย่อภาพไม่ได้ กรุณาใช้ภาพที่เล็กกว่านี้");

    // Lower quality first, then fewer pixels, until the data URL fits.
    for (const scale of [1, 0.85, 0.7, 0.55, 0.4]) {
      const attempt = scale === 1 ? target : fitWithin(target.width, target.height, Math.round(Math.max(target.width, target.height) * scale));
      canvas.width = attempt.width;
      canvas.height = attempt.height;

      let type = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
      context.clearRect(0, 0, attempt.width, attempt.height);
      context.drawImage(bitmap, 0, 0, attempt.width, attempt.height);
      if (type === "image/webp" && !encode(canvas, type, 0.9).startsWith("data:image/webp")) {
        type = "image/jpeg";
      }
      if (type === "image/jpeg" && file.type !== "image/jpeg") {
        context.globalCompositeOperation = "destination-over";
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, attempt.width, attempt.height);
        context.globalCompositeOperation = "source-over";
      }

      for (const quality of [0.92, 0.85, 0.75]) {
        const dataUrl = encode(canvas, type, quality);
        if (dataUrl.length <= MAX_UPLOAD_DATA_URL_CHARS) {
          return { dataUrl, width: attempt.width, height: attempt.height, converted: true };
        }
      }
    }
    throw new UploadError("บีบอัดภาพให้เล็กพอส่งไม่ได้ กรุณาใช้ภาพที่เล็กกว่านี้");
  } finally {
    bitmap.close();
  }
}

export function uploadErrorMessage(error: unknown): string {
  return error instanceof UploadError ? error.message : "อ่านไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง";
}
