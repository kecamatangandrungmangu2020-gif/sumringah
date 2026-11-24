'use server';
/**
 * @fileOverview Asisten AI untuk membantu menyusun draf notulen kegiatan Kecamatan.
 * Dilengkapi proteksi fail-safe otomatis terhadap Google Gemini 503 Service Unavailable / timeout.
 */

import { z } from 'genkit';
import { convertNotulenToWa, formatIndonesianDateWithDay, formatTimeWib } from '@/lib/wa-notulen-formatter';

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
 * Parser cerdas catatan manual (mendukung catatan bebas maupun berseksi Hadir / Hasil Rapat / Diskusi)
 */
function parseManualNotes(rawNotes?: string) {
  const empty = { hadir: [] as string[], hasil: [] as string[], diskusi: [] as string[] };
  if (!rawNotes || !rawNotes.trim()) return empty;

  const lines = rawNotes.replace(/\r\n/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
  let mode: 'auto' | 'hadir' | 'hasil' | 'diskusi' = 'auto';
  const hadir: string[] = [];
  const hasil: string[] = [];
  const diskusi: string[] = [];

  for (const line of lines) {
    const cleanHeader = line.replace(/^[*#\s]*(?:(?:I|II|III|IV|V|\d+)[\.\)]\s*)?/i, '').trim();

    if (/^(?:hadir|dihadiri|peserta|kehadiran)\b/i.test(cleanHeader)) {
      mode = 'hadir';
      const afterColon = cleanHeader.replace(/^(?:hadir|dihadiri(?:\s+oleh)?|peserta|kehadiran)\s*[:=\-]?\s*/i, '').trim();
      if (afterColon) {
        afterColon.split(/[,;]|(?:\s+dan\s+)/i).map(s => s.trim()).filter(Boolean).forEach(s => hadir.push(s));
      }
      continue;
    }

    if (/^(?:hasil\s+rapat|pembahasan|pokok\s+bahasan|materi|arahan|kegiatan|isi\s+rapat)\b/i.test(cleanHeader)) {
      mode = 'hasil';
      const afterColon = cleanHeader.replace(/^(?:hasil\s+rapat|pembahasan|pokok\s+bahasan|materi|arahan|kegiatan|isi\s+rapat)\s*[:=\-]?\s*/i, '').trim();
      if (afterColon) hasil.push(afterColon);
      continue;
    }

    if (/^(?:diskusi|tanya\s*jawab|masukan|usulan|kesepakatan|tindak\s+lanjut)\b/i.test(cleanHeader)) {
      mode = 'diskusi';
      const afterColon = cleanHeader.replace(/^(?:diskusi(?:\/tanya\s*jawab)?|tanya\s*jawab|masukan|usulan|kesepakatan|tindak\s+lanjut)\s*[:=\-]?\s*/i, '').trim();
      if (afterColon) diskusi.push(afterColon);
      continue;
    }

    const item = line.replace(/^[-•*\d\.\)\s]+/, '').trim();
    if (!item) continue;

    if (mode === 'hadir') {
      hadir.push(item);
    } else if (mode === 'diskusi') {
      diskusi.push(item);
    } else if (mode === 'hasil') {
      hasil.push(item);
    } else {
      // Mode bebas: deteksi kata kunci per kalimat
      if (/^(?:hadir|dihadiri)\b/i.test(item)) {
        const rest = item.replace(/^(?:hadir|dihadiri(?:\s+oleh)?)\s*[:=\-]?\s*/i, '');
        rest.split(/[,;]/).map(s => s.trim()).filter(Boolean).forEach(s => hadir.push(s));
      } else if (/(?:tanya jawab|diskusi|mengusulkan|bertanya|masukan|disepakati|tindak lanjut)/i.test(item)) {
        diskusi.push(item);
      } else {
        hasil.push(item);
      }
    }
  }

  return { hadir, hasil, diskusi };
}

/**
 * Fallback lokal cerdas jika layanan Google Gemini sedang 503 / mengalami lonjakan trafik (high demand).
 * Tetap memetakan catatan manual user secara akurat ke II. Hadir, III. Hasil Rapat, dan IV. Diskusi/tanya jawab.
 */
function generateLocalFallback(input: GenerateNotulenInput): GenerateNotulenOutput {
  const title = input.title || 'Kegiatan Dinas';
  const location = input.location || 'Balai Kecamatan Gandrungmangu';
  const dateDisplay = formatIndonesianDateWithDay(input.date);
  const timeDisplay = formatTimeWib(input.time);
  const parsed = parseManualNotes(input.notes);

  const hadirText = parsed.hadir.length > 0
    ? parsed.hadir.join(', ')
    : 'jajaran aparatur Kecamatan Gandrungmangu, perwakilan instansi terkait, dan unsur peserta undangan';

  const hasilText = parsed.hasil.length > 0
    ? parsed.hasil.join('. ') + '.'
    : 'Pembahasan difokuskan pada koordinasi lintas sektor, arahan pimpinan, serta penyelarasan pelaksanaan program kerja di wilayah Kecamatan Gandrungmangu.';

  const diskusiText = parsed.diskusi.length > 0
    ? parsed.diskusi.join('. ') + '.'
    : 'Peserta menyampaikan masukan dan tanggapan konstruktif serta menyepakati langkah tindak lanjut sesuai bidang tugas masing-masing.';

  const notulen = `Pada hari ${dateDisplay}, bertempat di ${location}, telah dilaksanakan kegiatan "${title}" (${timeDisplay}). Kegiatan ini dihadiri oleh ${hadirText}.\n\nDalam pelaksanaan rapat, dibahas sejumlah pokok materi dan hasil pembahasan utama, antara lain: ${hasilText}\n\nPada sesi diskusi dan tanya jawab, ${diskusiText} Seluruh rangkaian kegiatan berjalan dengan tertib, aman, dan lancar.`;

  if (parsed.hadir.length > 0 || parsed.hasil.length > 0 || parsed.diskusi.length > 0) {
    const hadirBlock = (parsed.hadir.length > 0 ? parsed.hadir : [
      'Sekcam Gandrungmangu / yang mewakili',
      'Kasi & Kasubag Kecamatan Gandrungmangu',
      'Peserta undangan terkait',
    ]).map((h, idx) => `${idx + 1}. ${h}`).join('\n');

    const hasilBlock = (parsed.hasil.length > 0 ? parsed.hasil : [
      'Pelaksanaan koordinasi dan penyampaian arahan pimpinan terkait agenda kegiatan.',
    ]).map(item => `- ${item}`).join('\n');

    const diskusiBlock = (parsed.diskusi.length > 0 ? parsed.diskusi : [
      'Peserta memberikan tanggapan dan masukan konstruktif serta menyepakati tindak lanjut bersama.',
    ]).map(item => `- ${item}`).join('\n');

    const notulenWa = `Kepada Yth.
Camat Gandrungmangu

Mohon ijin melaporkan kegiatan *${title}*, sbb :
*I. Waktu Pelaksanaan*
Hari/ Tgl : ${dateDisplay}
Waktu : ${timeDisplay}
Tempat : ${location}

*II. Hadir*
${hadirBlock}

*III. Hasil Rapat*
${hasilBlock}

*IV. Diskusi/tanya jawab*
${diskusiBlock}

*V. Penutup*
Demikian laporan kegiatan ini disampaikan, kegiatan berlangsung dengan tertib, aman, dan lancar.

DUMP`;

    return { notulen, notulenWa };
  }

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
    /I\.\s*Waktu\s+Pelaksanaan/i.test(text) &&
    /II\.\s*Hadir/i.test(text) &&
    /III\.\s*Hasil\s+Rapat/i.test(text) &&
    /IV\.\s*Diskusi/i.test(text) &&
    /V\.\s*Penutup/i.test(text)
  );
}

/**
 * Panggilan langsung ke Google Gemini API dengan timeout 25 detik per model dan prompt terstruktur.
 */
async function tryCallGeminiAPI(input: GenerateNotulenInput): Promise<GenerateNotulenOutput | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const hasManualNotes = Boolean(input.notes && input.notes.trim().length > 0);
  const dateDisplay = formatIndonesianDateWithDay(input.date);
  const timeDisplay = formatTimeWib(input.time);

  const promptText = `Anda adalah asisten administrasi profesional Pemerintah Kecamatan Gandrungmangu, Kabupaten Cilacap.
Tugas Anda adalah menyusun draf Notulen Resmi DAN Laporan Notulen Kirim WhatsApp (WA) kepada Camat Gandrungmangu berdasarkan DATA KEGIATAN dan CATATAN RAPAT MANUAL di bawah ini.

Data Kegiatan:
- Judul Kegiatan: ${input.title}
- Lokasi: ${input.location}
- Hari / Tanggal: ${dateDisplay} (${input.date})
- Waktu: ${timeDisplay}
- Jenis Kegiatan: ${input.activityType || 'Internal'}

CATATAN RAPAT MANUAL / ACUAN PETUGAS:
${hasManualNotes ? input.notes : '(Tidak ada catatan manual tambahan — susun secara proporsional sesuai judul kegiatan)'}

ATURAN KETAT PEMBACAAN CATATAN MANUAL:
- WAJIB memetakan dan mempertahankan 100% fakta, nama orang/pejabat, instansi, angka, tanggal, keputusan, serta poin diskusi yang tertulis pada CATATAN RAPAT MANUAL di atas.
- DILARANG mengarang nama pejabat, angka, atau fakta baru yang tidak disebutkan di catatan manual.
- Rapikan bahasa catatan manual yang singkat/poin-poin menjadi bahasa dinas resmi yang jelas, runtut, dan informatif.

PANDUAN KONTEN & STRUKTUR:
1. "notulen" (KHUSUS UNTUK CETAK PDF NOTA DINAS / NOTULEN RESMI):
Tulis narasi notulen kedinasan resmi berformat alinea paragraf siap cetak PDF (TANPA kop surat, TANPA judul "NOTA DINAS", TANPA tabel/baris "Kegiatan/Tanggal/Waktu/Tempat", TANPA format markdown *bintang*, TANPA "Kepada Yth." atau "DUMP"):
- Pisahkan setiap alinea paragraf dengan satu baris kosong (\\n\\n) agar tercetak rapi dengan alinea menjorok dan rata kanan-kiri di PDF.
- Alinea 1 (Pembukaan & Kehadiran): Kalimat pembuka resmi yang memuat hari, tanggal, waktu, tempat, nama kegiatan, serta daftar pejabat/unsur yang hadir persis sesuai catatan manual.
- Alinea 2 (Jalannya Rapat & Pokok Hasil Rapat): Uraikan arahan pimpinan, pokok materi, dan hasil pembahasan secara runtut dengan bahasa dinas baku. Jika terdapat banyak butir keputusan/poin penting, boleh dilanjutkan dengan daftar bernomor rapi (1. ..., 2. ..., 3. ...) di bawah kalimat pengantar.
- Alinea 3 (Diskusi / Tanya Jawab & Tindak Lanjut): Uraikan masukan, pertanyaan/tanggapan peserta, serta kesepakatan tindak lanjut sesuai catatan manual.
- Alinea 4 (Penutup): Kalimat penutup resmi yang menyatakan seluruh rangkaian kegiatan telah selesai dilaksanakan dalam keadaan tertib, aman, dan lancar.

2. "notulenWa":
WAJIB mengikuti format resmi 5 butir di bawah ini, dan isinya WAJIB selaras 100% dengan catatan manual & teks "notulen":

Kepada Yth.
Camat Gandrungmangu

Mohon ijin melaporkan kegiatan *${input.title}*, sbb :
*I. Waktu Pelaksanaan*
Hari/ Tgl : ${dateDisplay}
Waktu : ${timeDisplay}
Tempat : ${input.location}

*II. Hadir*
[WAJIB daftar bernomor 1, 2, 3... sesuai persis pihak/pejabat/unsur yang tertulis di catatan manual. Jika catatan manual tidak menyebut peserta, isi secara umum sesuai konteks kegiatan.]

*III. Hasil Rapat*
[WAJIB butir-butir lengkap seluruh pokok pembahasan, materi, arahan, dan keputusan rapat yang tertulis di catatan manual, gunakan tanda - atau sub-judul ber-bintang jika terdiri dari beberapa pembicara/topik.]

*IV. Diskusi/tanya jawab*
[WAJIB menyesuaikan dengan tanya jawab, usulan, masukan, atau kesepakatan tindak lanjut yang tertulis di catatan manual. Jika catatan manual tidak menyebut tanya jawab khusus, tuliskan ringkasan tanggapan/kesepakatan penutup secara singkat dan proporsional.]

*V. Penutup*
[Kalimat penutup resmi, kondisi aman, tertib, dan lancar]

DUMP

Keluarkan output dalam format JSON valid persis:
{
  "notulen": "...",
  "notulenWa": "..."
}`;

  const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];

  for (const model of modelsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 detik agar tidak premature timeout

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.3,
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
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find((p: any) => p.text && !p.thought) || parts[parts.length - 1];
      const rawText = textPart?.text;
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText);
          if (parsed && parsed.notulen) {
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

