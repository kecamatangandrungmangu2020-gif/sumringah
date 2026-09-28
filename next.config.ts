import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // trailingSlash sangat penting untuk Firebase Hosting agar rute statis tidak pecah saat refresh/navigasi
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Memaksa paket Node.js tradisional dikelola sebagai eksternal untuk menghindari masalah Turbopack
  serverExternalPackages: ['docxtemplater', 'pizzip'],
  async rewrites() {
    return [
      {
        source: '/pengajuansurat/',
        destination: '/pengajuan-surat/',
      },
      {
        source: '/pengajuansurat',
        destination: '/pengajuan-surat/',
      },
      {
        source: '/desa/:slug/',
        destination: '/:slug/',
      },
      {
        source: '/desa/:slug',
        destination: '/:slug/',
      },
    ];
  },
};

export default nextConfig;
