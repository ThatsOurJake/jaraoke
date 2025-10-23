import fs from 'node:fs';
import path from 'node:path';

export const imageToBase64 = (imagePath: string): string => {
  const imageType = path.extname(imagePath).substring(1);
  const imageData = fs.readFileSync(imagePath);
  const base64Data = imageData.toString('base64');
  return `data:image/${imageType};base64,${base64Data}`;
};

export const bufferToBase64 = (buffer: Uint8Array, format: string): string => {
  const base64Data = Buffer.from(buffer).toString('base64');
  return `data:${format};base64,${base64Data}`;
};
