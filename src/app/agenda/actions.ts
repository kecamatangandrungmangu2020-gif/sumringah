/**
 * @fileOverview Utilitas komunikasi Google Apps Script untuk Sisi Client.
 * File ini dirancang khusus untuk kompatibilitas Static Export & CORS.
 */

import { GOOGLE_CONFIG } from '@/lib/google-config';

/**
 * Memanggil Google Apps Script menggunakan metode "Simple Request".
 * Kita menggunakan header 'text/plain' untuk melewati pengecekan preflight CORS 
 * yang sering menyebabkan error "Failed to fetch" di lingkungan browser ketat.
 */
export async function callAppsScript(payload: any) {
  // 1. Coba lewat internal server proxy (/api/apps-script/) terlebih dahulu
  // Server-side fetch terhindar dari bentrok sesi multi-akun Google dan batasan CORS browser
  try {
    const proxyResponse = await fetch('/api/apps-script/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      if (data && typeof data === 'object') {
        return data;
      }
    }
  } catch (proxyError) {
    // Lanjutkan ke fallback jika internal proxy tidak tersedia
    console.warn("Proxy call failed, trying direct Google Apps Script call...", proxyError);
  }

  // 2. Fallback: Panggilan langsung ke Apps Script
  try {
    const response = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error("Apps Script Communication Error:", error);

    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      return { 
        success: false, 
        error: "Koneksi ke Google diblokir oleh Browser (CORS). Pastikan Apps Script di-deploy dengan akses 'Anyone' (Siapa Saja)." 
      };
    }

    return { 
      success: false, 
      error: error.message || "Gagal menghubungi server Google Apps Script." 
    };
  }
}
