'use server';
/**
 * @fileOverview Asisten AI untuk membantu menyusun draf notulen kegiatan Kecamatan.
 * Dilengkapi proteksi fail-safe otomatis terhadap Google Gemini 503 Service Unavailable / timeout.
 */

import { z } from 'genkit';
import { convertNotulenToWa } from '@/lib/wa-notulen-formatter';

const GenerateNotulenInputSchema = z.object({
  title: z.string().describe('Judul atau nama kegiatan'),
  location: z.string().describe('Lokasi pelaksanaan kegiatan'),
  date: z.string().describe('Tanggal pelaksanaan kegiatan'),
  time: z.string().optional().describe('Waktu pelaksanaan kegiatan'),
  notes: z.string().optional().describe('Catatan acuan / arahan / poin-poin untuk generate notulen'),
  activityType: z.string().optional().describe('Jenis kegiatan: Internal atau Eksternal'),
});
export type GenerateNotulenInput = z.infer<typeof GenerateNotulenInputSchema>;

const GenerateNotulenOutputSchema = z.object({
  notulen: z.string().describe('Teks narasi notulen formal kegiatan'),
  notulenWa: z.string().optional().describe('Format laporan notulen WhatsApp siap kirim ke Camat'),
});
export type GenerateNotulenOutput = z.infer<typeof GenerateNotulenOutputSchema>;

/**
 * Fallback lokal cerdas jika layanan Google Gemini sedang 503 / mengalami lonjakan trafik (high demand).
 * Menghasilkan notulen formal dan pesan WhatsApp resmi sesuai standar Kecamatan Gandrungmangu.
 */
function generateLocalFallback(input: GenerateNotulenInput): GenerateNotulenOutput {
  const title = input.title || 'Kegiatan Dinas';
  const location = input.location || 'Balai Kecamatan Gandrungmangu';
  const date = input.date || 'Hari ini';
  const notesDetail = input.notes 
    ? `Adapun pokok pembahasan khusus meliputi: ${input.notes}.` 
    : 'Pembahasan difokuskan pada koordinasi lintas sektor, evaluasi kinerja kedinasan, serta peningkatan mutu pelayanan kepada masyarakat.';

  const notulen = `Pada hari ini, ${date}, bertempat di ${location}, telah diselenggarakan kegiatan "${title}". Pertemuan ini dihadiri oleh jajaran aparatur Kecamatan Gandrungmangu, perwakilan instansi terkait, dan tokoh masyarakat guna memperkuat koordinasi serta menyelaraskan pelaksanaan program kedinasan di wilayah Kecamatan Gandrungmangu.\n\nDalam pertemuan ini, pimpinan rapat menyampaikan arahan mengenai prioritas kerja dan langkah-langkah strategis yang perlu dijalankan. ${notesDetail} Seluruh peserta memberikan pandangan dan masukan yang konstruktif dalam sesi tanya jawab demi tercapainya hasil musyawarah yang mufakat.\n\nSebagai tindak lanjut, disepakati bahwa seluruh unit kerja akan segera menindaklanjuti hasil koordinasi ini sesuai dengan bidang tugas masing-masing. Kegiatan ditutup secara resmi dalam keadaan tertib, aman, dan lancar.`;

  // notulenWa disarikan langsung dari teks notulen di atas
  const notulenWa = convertNotulenToWa({
    notulen,
    title: input.title,
    location: input.location,
    date: input.date,
    time: input.time,
    notes: input.notes,
    activityType: input.activityType
  });

  return { notulen, notulenWa };
}

/**
 * Validasi apakah teks notulenWa sudah memuat semua 5 seksi resmi standar Gandrungmangu
 */
function isCompleteWaFormat(text?: string): boolean {
  if (!text || text.length < 50) return false;
  return (
    text.includes('*I. Waktu Pelaksanaan*') &&
    text.includes('*II. Hadir*') &&
    text.includes('*III. Hasil Rapat*') &&
    text.includes('*IV. Diskusi') &&
    text.includes('*V. Penutup*')
  );
}

/**
 * Panggilan langsung ke Google Gemini API dengan timeout 4 detik per model dan prompt terstruktur.
 */
async function tryCallGeminiAPI(input: GenerateNotulenInput): Promise<GenerateNotulenOutput | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const promptText = `Anda adalah asisten administrasi profesional Pemerintah Kecamatan Gandrungmangu, Kabupaten Cilacap.
Tugas Anda adalah menyusun draf Notulen Resmi DAN Laporan Notulen Kirim WhatsApp (WA) kepada Camat Gandrungmangu.

Data Kegiatan:
- Judul Kegiatan: ${input.title}
- Lokasi: ${input.location}
- Tanggal: ${input.date}
- Waktu: ${input.time || '09.00 WIB s.d selesai'}
- Jenis Kegiatan: ${input.activityType || 'Internal'}
- Catatan/Arahan Utama: ${input.notes || '-'}

PANDUAN KONTEN & STRUKTUR:
1. "notulen":
Tulis narasi formal kedinasan dalam 3 paragraf utuh (tanpa kop surat/judul):
- Paragraf 1: Pembukaan (hari, tanggal, waktu, tempat, nama kegiatan, dan pihak-pihak/unsur pejabat/undangan yang hadir).
- Paragraf 2: Isi rapat & arahan pimpinan (uraikan arahan pimpinan dan pokok bahasan kegiatan).
- Paragraf 3: Diskusi, kesepakatan tindak lanjut, dan penutupan kegiatan dalam keadaan tertib dan lancar.

2. "notulenWa":
PENTING SEKALI: Bidang notulenWa WAJIB merupakan ringkasan poin-poin terstruktur yang disarikan LANGSUNG dari teks narasi "notulen" yang Anda buat.
Hadir, Hasil Rapat, Diskusi/tanya jawab, dan Penutup harus 100% selaras dengan isi notulen di atas!
Format Wajib WhatsApp:
Kepada Yth.
Camat Gandrungmangu

Mohon ijin melaporkan kegiatan *${input.title}*, sbb :
*I. Waktu Pelaksanaan*
Hari/ Tgl : [Hari dan Tanggal lengkap bahasa Indonesia]
Waktu : ${input.time ? `Pukul ${input.time.replace(/:/g, '.')} WIB s.d selesai` : 'Pukul 09.00 WIB s.d selesai'}
Tempat : ${input.location}

*II. Hadir* 
[Daftar nomor 1, 2, 3... pihak yang hadir, disarikan langsung dari peserta pada paragraf 1 notulen]

*III. Hasil Rapat*
[Butir-butir pokok hasil rapat dan arahan yang disarikan langsung dari paragraf 2 notulen, dikelompokkan dengan *A. Arahan Pimpinan* atau sub-topik terkait dan tanda -]

*IV. Diskusi/tanya jawab*
[Poin-poin tanya jawab / masukan peserta / kesepakatan yang disarikan langsung dari paragraf 3 notulen]

*V. Penutup*
[Kalimat penutup sesuai akhir paragraf 3 notulen, kondisi aman dan lancar]
selesai pada [waktu selesai kegiatan]

DUMP

Keluarkan output dalam format JSON valid persis:
{
  "notulen": "...",
  "notulenWa": "..."
}`;

  const modelsToTry = ['gemini-flash-latest', 'gemini-3.8-flash'];

  for (const model of modelsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // Max 4 detik timeout per model

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json'
          }
        })
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[AI Notulen] Model ${model} returned HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText);
          if (parsed && parsed.notulen) {
            // Pastikan notulenWa valid dan selaras; jika tidak lengkap, sinkronkan dari parsed.notulen
            let finalWa = parsed.notulenWa;
            if (!isCompleteWaFormat(finalWa)) {
              finalWa = convertNotulenToWa({
                notulen: parsed.notulen,
                title: input.title,
                location: input.location,
                date: input.date,
                time: input.time,
                notes: input.notes,
                activityType: input.activityType
              });
            }

            return {
              notulen: parsed.notulen,
              notulenWa: finalWa
            };
          }
        } catch {
          if (rawText.length > 50) {
            const notulenText = rawText.trim();
            const finalWa = convertNotulenToWa({
              notulen: notulenText,
              title: input.title,
              location: input.location,
              date: input.date,
              time: input.time,
              notes: input.notes,
              activityType: input.activityType
            });
            return { notulen: notulenText, notulenWa: finalWa };
          }
        }
      }
    } catch (err: any) {
      console.warn(`[AI Notulen] Percobaan dengan ${model} gagal atau timeout:`, err?.message || err);
    }
  }

  return null;
}

/**
 * Fungsi utama yang dipanggil client untuk generate notulen.
 * Dijamin selalu mengembalikan draf notulen dan format WA yang selaras 100%.
 */
export async function generateNotulen(input: GenerateNotulenInput): Promise<GenerateNotulenOutput> {
  try {
    const aiResult = await tryCallGeminiAPI(input);
    if (aiResult && aiResult.notulen) {
      // Pastikan notulenWa selalu ada dan selaras dengan notulen
      if (!isCompleteWaFormat(aiResult.notulenWa)) {
        aiResult.notulenWa = convertNotulenToWa({
          notulen: aiResult.notulen,
          title: input.title,
          location: input.location,
          date: input.date,
          time: input.time,
          notes: input.notes,
          activityType: input.activityType
        });
      }
      return aiResult;
    }
  } catch (err: any) {
    console.warn("[AI Notulen] Menggunakan fallback karena error:", err?.message || err);
  }

  // Jika semua model AI sedang 503 / timeout / offline, otomatis gunakan template cerdas
  return generateLocalFallback(input);
}

