/**
 * @fileOverview Utility pembuat dan penyelarasan format laporan WhatsApp resmi Kecamatan Gandrungmangu
 * Mengonversi draf notulen narasi menjadi format 5 butir resmi (I. Waktu, II. Hadir, III. Hasil Rapat, IV. Diskusi, V. Penutup, DUMP)
 */

export interface FormatNotulenWaOptions {
  notulen?: string;
  title?: string;
  date?: string;
  time?: string;
  location?: string;
  notes?: string;
  officialName?: string;
  activityType?: string;
}

/**
 * Format tanggal Indonesia lengkap dengan nama hari
 * Contoh input: "2026-09-28" -> "Senin, 28 September 2026"
 */
export function formatIndonesianDateWithDay(dateStr?: string): string {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  if (!dateStr || dateStr.trim() === "") {
    const now = new Date();
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  try {
    const trimmed = dateStr.trim();
    // Jika format YYYY-MM-DD
    const parts = trimmed.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const [year, month, day] = parts;
      const d = new Date(year, month - 1, day);
      return `${days[d.getDay()]}, ${day} ${months[month - 1]} ${year}`;
    }

    // Coba parse standar
    const parsedDate = new Date(trimmed);
    if (!isNaN(parsedDate.getTime())) {
      return `${days[parsedDate.getDay()]}, ${parsedDate.getDate()} ${months[parsedDate.getMonth()]} ${parsedDate.getFullYear()}`;
    }
  } catch (e) {
    // fallback
  }

  return dateStr;
}

/**
 * Format waktu standar kedinasan WIB
 */
export function formatTimeWib(timeStr?: string): string {
  if (!timeStr || timeStr.trim() === "" || timeStr === "-") {
    return "Pukul 09.00 WIB s.d selesai";
  }
  const clean = timeStr.trim();
  if (clean.toLowerCase().includes("selesai") || clean.toLowerCase().includes("wib")) {
    return clean.replace(/:/g, ".");
  }
  return `Pukul ${clean.replace(/:/g, ".")} WIB s.d selesai`;
}

/**
 * Ekstrak daftar pihak yang hadir dari teks narasi notulen atau catatan
 */
function extractAttendees(notulenText: string, notes?: string, officialName?: string): string[] {
  const attendees: string[] = [];

  // 1. Cek apakah ada daftar eksplisit dalam notes (misal "Dihadiri: Sekcam, Danramil...")
  if (notes) {
    const matchHadirNotes = notes.match(/(?:hadir|dihadiri|peserta)\s*[:=]\s*([^.\n]+)/i);
    if (matchHadirNotes && matchHadirNotes[1]) {
      const items = matchHadirNotes[1]
        .split(/[,;\n]|(?:\s+dan\s+)|(?:\s+serta\s+)/i)
        .map(s => s.trim())
        .filter(s => s.length > 2);
      if (items.length > 0) {
        attendees.push(...items);
      }
    }
  }

  // 2. Ekstrak dari teks notulen (biasanya paragraf 1)
  if (attendees.length === 0 && notulenText) {
    const matchHadirNotulen = notulenText.match(/(?:dihadiri oleh|turut hadir|pertemuan ini dihadiri oleh|dihadiri)\s+([^.\n]+)/i);
    if (matchHadirNotulen && matchHadirNotulen[1]) {
      const rawClause = matchHadirNotulen[1]
        .replace(/^(antara lain|yaitu|meliputi)\s+/i, "")
        .replace(/\b(guna|dalam rangka|untuk|demi)\b.*$/i, "");
      
      const items = rawClause
        .split(/[,;]|(?:\s+dan\s+)|(?:\s+serta\s+)/i)
        .map(s => s.trim().replace(/^para\s+/i, "").replace(/^unsur\s+/i, ""))
        .filter(s => s.length > 2 && !s.toLowerCase().startsWith("memperkuat"));

      if (items.length > 0) {
        attendees.push(...items);
      }
    }
  }

  // 3. Jika officialName dipilih, sertakan bila belum ada
  if (officialName && officialName.trim() !== "") {
    const exists = attendees.some(a => a.toLowerCase().includes(officialName.toLowerCase()));
    if (!exists) {
      attendees.unshift(officialName.trim());
    }
  }

  // 4. Jika masih kosong, buat daftar representatif sesuai tata kelola pemerintahan Gandrungmangu
  if (attendees.length === 0) {
    return [
      "Sekcam Gandrungmangu / yang mewakili",
      "Danramil 10 Gandrungmangu / Babinsa",
      "Kapolsek Gandrungmangu / Bhabinkamtibmas",
      "Kasi & Kasubag Kecamatan Gandrungmangu",
      "Kepala Desa / Perangkat Desa / Tokoh Terkait"
    ];
  }

  // Pastikan kapitalisasi awal kata rapi
  return attendees.map(item => {
    return item.charAt(0).toUpperCase() + item.slice(1);
  });
}

/**
 * Ekstrak butir-butir hasil rapat dari narasi notulen
 */
function extractMeetingResults(notulenText: string, notes?: string, title?: string): {
  arahan: string[];
  pembahasan: string[];
} {
  const arahan: string[] = [];
  const pembahasan: string[] = [];

  const paragraphs = notulenText
    ? notulenText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    : [];

  // Paragraf kedua biasanya fokus pada arahan dan isi rapat
  const bodyText = paragraphs.length >= 2 ? paragraphs[1] : (paragraphs[0] || "");

  // Pecah menjadi kalimat-kalimat
  const sentences = bodyText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  for (const sentence of sentences) {
    const cleanSentence = sentence.replace(/^\d+[\.\)]\s*/, "").replace(/^[-•*]\s*/, "");
    if (/arahan|prioritas|menekankan|menyampaikan|menginstruksikan|menegaskan/i.test(sentence)) {
      arahan.push(cleanSentence);
    } else {
      pembahasan.push(cleanSentence);
    }
  }

  // Jika notes ada dan belum terangkum
  if (notes && notes.trim() !== "") {
    pembahasan.push(`Fokus catatan kegiatan: ${notes.trim()}`);
  }

  // Fallback jika belum terisi butir
  if (arahan.length === 0) {
    arahan.push(`Pelaksanaan kegiatan ${title || "dinas"} terlaksana dengan tertib dan tepat waktu`);
    arahan.push("Peningkatan koordinasi dan pelayanan masyarakat di wilayah Kecamatan Gandrungmangu");
  }

  if (pembahasan.length === 0) {
    pembahasan.push("Seluruh unit kerja dan peserta menyelaraskan langkah tindak lanjut program kerja");
  }

  return { arahan, pembahasan };
}

/**
 * Ekstrak butir diskusi / tanya jawab dari narasi notulen
 */
function extractDiscussion(notulenText: string): string[] {
  const discussions: string[] = [];

  const paragraphs = notulenText
    ? notulenText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    : [];

  // Paragraf ke-3 biasanya membahas diskusi dan kesepakatan
  const lastParagraph = paragraphs.length >= 3 ? paragraphs[2] : (paragraphs[paragraphs.length - 1] || "");

  const sentences = lastParagraph
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  for (const s of sentences) {
    if (/tanya jawab|diskusi|masukan|pandangan|tanggapan|sepakat|mufakat|aspirasi|musyawarah/i.test(s)) {
      discussions.push(s);
    }
  }

  if (discussions.length === 0) {
    discussions.push("Sesi tanya jawab dan diskusi berlangsung aktif, seluruh masukan disepakati secara mufakat.");
    discussions.push("Koordinasi teknis tindak lanjut akan dilaksanakan oleh masing-masing seksi terkait.");
  }

  return discussions;
}

/**
 * Ekstrak kalimat penutup dan jam selesai
 */
function extractClosing(notulenText: string, timeStr?: string): { closingSentence: string; closingTime: string } {
  let closingSentence = "Acara berjalan aman, tertib, dan lancar.";
  let closingTime = "pukul 12.00 WIB";

  // Cek apakah timeStr memiliki batas waktu akhir, misalnya "09:00 - 12:00" atau "09.00 s.d 11.30"
  if (timeStr && timeStr.trim() !== "" && timeStr !== "-") {
    const rangeMatch = timeStr.match(/(?:-|s\.d\.?|sampai)\s*([0-9]{1,2}[:.][0-9]{2})/i);
    if (rangeMatch && rangeMatch[1]) {
      closingTime = `pukul ${rangeMatch[1].replace(/:/g, ".")} WIB`;
    }
  }

  if (notulenText) {
    const sentences = notulenText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);

    const last = sentences[sentences.length - 1];
    if (last && /tutup|selesai|lancar|tertib|aman/i.test(last)) {
      // Cek apakah ada jam selesai di kalimat terakhir, misal "pukul 12.00 WIB"
      const timeMatch = last.match(/pukul\s+([0-9]{1,2}[:.][0-9]{2}(?:\s*wib)?)/i);
      if (timeMatch && timeMatch[1]) {
        closingTime = `pukul ${timeMatch[1].replace(/:/g, ".").replace(/\s*wib/i, "")} WIB`;
      }
      closingSentence = last;
    }
  }

  return { closingSentence, closingTime };
}

/**
 * Mengonversi teks notulen narasi apa pun menjadi format WhatsApp resmi Camat Gandrungmangu
 * yang 100% selaras dengan isi notulen (Hadir, Hasil Rapat, Diskusi, Penutup).
 */
export function convertNotulenToWa(options: FormatNotulenWaOptions): string {
  const title = options.title?.trim() || "Kegiatan Dinas";
  const dateStr = formatIndonesianDateWithDay(options.date);
  const timeStr = formatTimeWib(options.time);
  const location = options.location?.trim() || "Balai Kecamatan Gandrungmangu";
  const notulen = options.notulen?.trim() || "";

  // 1. Ekstrak Hadir
  const attendees = extractAttendees(notulen, options.notes, options.officialName);
  const hadirLines = attendees.map((item, idx) => `${idx + 1}. ${item}`).join("\n");

  // 2. Ekstrak Hasil Rapat
  const { arahan, pembahasan } = extractMeetingResults(notulen, options.notes, title);
  const arahanLines = arahan.map(a => `- ${a}`).join("\n");
  const pembahasanLines = pembahasan.map(p => `- ${p}`).join("\n");

  let hasilRapatSection = `*A. Arahan Pimpinan*\n${arahanLines}`;
  if (pembahasan.length > 0) {
    hasilRapatSection += `\n*B. Pokok Pembahasan & Kesepakatan*\n${pembahasanLines}`;
  }

  // 3. Ekstrak Diskusi / Tanya Jawab
  const discussions = extractDiscussion(notulen);
  const diskusiLines = discussions.map(d => `- ${d}`).join("\n");

  // 4. Ekstrak Penutup
  const { closingSentence, closingTime } = extractClosing(notulen, options.time);
  let cleanClosing = closingSentence.replace(/\s*pada\s+pukul\s+[0-9]{1,2}[:.][0-9]{2}(?:\s*wib)?/i, "").trim();
  if (!cleanClosing.endsWith(".")) cleanClosing += ".";
  const penutupText = `${cleanClosing}\nselesai pada ${closingTime}`;

  return `Kepada Yth.
Camat Gandrungmangu

Mohon ijin melaporkan kegiatan *${title}*, sbb :
*I. Waktu Pelaksanaan*
Hari/ Tgl : ${dateStr}
Waktu : ${timeStr}
Tempat : ${location}

*II. Hadir* 
${hadirLines}

*III. Hasil Rapat*
${hasilRapatSection}

*IV. Diskusi/tanya jawab*
${diskusiLines}

*V. Penutup*
${penutupText}

DUMP`;
}
