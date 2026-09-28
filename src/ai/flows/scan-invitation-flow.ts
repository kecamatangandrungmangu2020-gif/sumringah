
'use server';
/**
 * @fileOverview An AI assistant to scan invitation PDFs and extract key details.
 *
 * - scanInvitation - A function that handles the scanning of invitation PDFs.
 * - ScanInvitationInput - The input type for the scanInvitation function.
 * - ScanInvitationOutput - The return type for the scanInvitation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ScanInvitationInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "An invitation file (PDF or image), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ScanInvitationInput = z.infer<typeof ScanInvitationInputSchema>;

const ScanInvitationOutputSchema = z.object({
  eventTitle: z.string().describe('The main title or purpose of the event (acara/perihal). Extract the core topic, combining purpose and event name. E.g., "Pertemuan Kecamatan I - Kegiatan Pengembangan Infrastruktur Sosial Wilayah (PISEW) Tahun 2026".'),
  eventDate: z.string().describe('The date of the event in YYYY-MM-DD format. Extract from "Hari/tanggal" (e.g. "Rabu, 29 Juli 2026" becomes "2026-07-29"). If the year is not specified, assume current year 2026.'),
  eventTime: z.string().describe('The start time of the event from "Waktu" in HH:mm 24-hour format. For "Pukul 13.00 WIB s/d selesai", output "13:00".'),
  eventLocation: z.string().describe('The location or venue of the event (tempat). E.g., "Balai Kecamatan Karanganyar".'),
  eventNotes: z.string().optional().describe('Additional notes from "Catatan" (e.g. "Dimohon hadir tepat waktu") and any itemized agenda breakdown points.'),
  eventType: z.enum(["Internal", "Eksternal"]).default("Internal").describe('Classification of event: "Eksternal" if inviting/involving external entities/villages or national programs like PISEW, "Internal" otherwise.'),
});
export type ScanInvitationOutput = z.infer<typeof ScanInvitationOutputSchema>;

export async function scanInvitation(input: ScanInvitationInput): Promise<ScanInvitationOutput> {
  return scanInvitationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scanInvitationPrompt',
  model: 'googleai/gemini-flash-latest',
  input: { schema: ScanInvitationInputSchema },
  output: { schema: ScanInvitationOutputSchema },
  prompt: `Anda adalah asisten administrasi cerdas untuk instansi pemerintahan di Indonesia (Kecamatan & Kecamatan).
Tugas Anda adalah menganalisis dokumen surat undangan resmi (PDF atau Gambar) dan mengekstrak informasi kegiatan ke dalam struktur data yang rapi.

Panduan Ekstraksi:
- Perihal / Acara (eventTitle): Ambil nama/tujuan utama kegiatan secara deskriptif dan padat (contoh: "Pertemuan Kecamatan I - Kegiatan Pengembangan Infrastruktur Sosial Wilayah (PISEW) Tahun 2026").
- Hari / Tanggal (eventDate): Ekstrak dari baris "Hari/tanggal" dan WAJIB dikonversikan ke format ISO YYYY-MM-DD (contoh: "Rabu, 29 Juli 2026" menjadi "2026-07-29").
- Waktu (eventTime): Ekstrak waktu mulai dari baris "Waktu" dan format menjadi HH:mm 24 jam (contoh: "Pukul 13.00 WIB s/d selesai" menjadi "13:00").
- Tempat (eventLocation): Ekstrak nama lokasi tempat acara diselenggarakan dari baris "Tempat" (contoh: "Balai Kecamatan Karanganyar").
- Catatan Tambahan (eventNotes): Masukkan catatan penting dari "Catatan" (misal: "Dimohon hadir tepat waktu") beserta rincian poin agenda yang dibahas jika ada (1. ..., 2. ...).
- Jenis Kegiatan (eventType): "Eksternal" jika acara melibatkan luar kantor/Kecamatan lain/program nasional (seperti PISEW), "Internal" jika hanya internal pegawai.

Dokumen untuk dianalisis: {{media url=pdfDataUri}}`,
});

const fallbackPrompt = ai.definePrompt({
  name: 'scanInvitationFallbackPrompt',
  model: 'googleai/gemini-3.8-flash',
  input: { schema: ScanInvitationInputSchema },
  output: { schema: ScanInvitationOutputSchema },
  prompt: `Anda adalah asisten administrasi cerdas untuk instansi pemerintahan di Indonesia (Kecamatan & Kecamatan).
Tugas Anda adalah menganalisis dokumen surat undangan resmi (PDF atau Gambar) dan mengekstrak informasi kegiatan ke dalam struktur data yang rapi.

Panduan Ekstraksi:
- Perihal / Acara (eventTitle): Ambil nama/tujuan utama kegiatan secara deskriptif dan padat.
- Hari / Tanggal (eventDate): Format ISO YYYY-MM-DD.
- Waktu (eventTime): Format HH:mm.
- Tempat (eventLocation): Nama lokasi tempat acara.
- Catatan Tambahan (eventNotes): Catatan penting atau poin agenda.
- Jenis Kegiatan (eventType): "Eksternal" jika luar kantor, "Internal" jika internal pegawai.

Dokumen untuk dianalisis: {{media url=pdfDataUri}}`,
});

const scanInvitationFlow = ai.defineFlow(
  {
    name: 'scanInvitationFlow',
    inputSchema: ScanInvitationInputSchema,
    outputSchema: ScanInvitationOutputSchema,
  },
  async input => {
    try {
      const { output } = await prompt(input);
      if (output) return output;
    } catch (err: any) {
      console.warn("Scan invitation primary prompt failed, trying fallback...", err?.message || err);
    }

    const { output } = await fallbackPrompt(input);
    if (!output) {
      throw new Error("Gagal mengekstrak informasi undangan.");
    }
    return output;
  }
);

