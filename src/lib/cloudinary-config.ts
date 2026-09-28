/**
 * @fileOverview Konfigurasi Cloudinary Kecamatan Digital.
 */

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || "zqw5r6ay";
const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY || "642265149435519";
const apiSecret = process.env.CLOUDINARY_API_SECRET || "EXSyqGY7vsFBof3Q3w948fm0yE4";
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "sistem_giat";

export const CLOUDINARY_CONFIG = {
  cloudName,
  uploadPreset,
  apiKey,
  apiSecret,
  baseUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
};


/**
 * Utilitas untuk mengoptimalkan URL Cloudinary secara otomatis.
 */
export const getOptimizedCloudinaryUrl = (url: string) => {
  if (!url || !url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
};
