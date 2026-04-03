import { net } from "electron";
import path from "node:path";
import fs from "node:fs";
import { registerEvent } from "../register-event";
import { logger } from "@main/services";

const mimeTypesByExtension: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  avif: "image/avif",
  ico: "image/x-icon",
};

const getMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  return mimeTypesByExtension[ext] ?? "image/png";
};

const getImageDataUrl = async (
  _event: Electron.IpcMainInvokeEvent,
  imageUrl: string
): Promise<string | null> => {
  try {
    // Local filesystem path (absolute path, not a URL)
    if (
      !imageUrl.startsWith("http://") &&
      !imageUrl.startsWith("https://") &&
      !imageUrl.startsWith("local:")
    ) {
      if (!fs.existsSync(imageUrl)) return null;
      const buffer = await fs.promises.readFile(imageUrl);
      const mimeType = getMimeType(imageUrl);
      return `data:${mimeType};base64,${buffer.toString("base64")}`;
    }

    // local: protocol — strip prefix and read from disk
    if (imageUrl.startsWith("local:")) {
      const filePath = imageUrl.slice("local:".length);
      if (!fs.existsSync(filePath)) return null;
      const buffer = await fs.promises.readFile(filePath);
      const mimeType = getMimeType(filePath);
      return `data:${mimeType};base64,${buffer.toString("base64")}`;
    }

    // Remote HTTP/HTTPS URL
    const response = await net.fetch(imageUrl);
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type")?.split(";")[0];
    const extension = path
      .extname(new URL(imageUrl).pathname)
      .toLowerCase()
      .slice(1);
    const mimeType =
      contentType && contentType.startsWith("image/")
        ? contentType
        : (mimeTypesByExtension[extension] ?? "image/png");

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    logger.error("Failed to proxy image as data URL", { imageUrl, error });
    return null;
  }
};

registerEvent("getImageDataUrl", getImageDataUrl);
