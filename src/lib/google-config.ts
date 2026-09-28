/**
 * @fileOverview Konfigurasi terpusat untuk integrasi layanan Google.
 */

interface GoogleConfig {
  /**
   * URL hasil deploy Google Apps Script yang berfungsi sebagai backend.
   */
  appsScriptUrl: string;

  /**
   * ID Kalender Google yang akan digunakan untuk manajemen agenda.
   * Menggunakan 'primary' adalah opsi paling aman untuk merujuk ke kalender utama.
   */
  calendarId: string;

  /**
   * ID folder "parent" di Google Drive tempat laporan-laporan baru akan disimpan.
   */
  parentFolderId: string;
}

export const GOOGLE_CONFIG: GoogleConfig = {
  appsScriptUrl: process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbyc62ssR5RyklDOpKOXB8wo3MX93jTZYI82oUbASBjxkK4FAwyuIlR_u4sIN0e2XDMOMg/exec",
  calendarId: process.env.NEXT_PUBLIC_CALENDAR_ID || "primary",
  parentFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || process.env.NEXT_PUBLIC_DOK_PENTING_FOLDER_ID || process.env.NEXT_PUBLIC_KEGIATAN_FOLDER_ID || "1-yZW2Z7V5J2j2aVp9p4aJ3R8Q9J4v8tU",
};

