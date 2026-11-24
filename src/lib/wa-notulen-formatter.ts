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

interface StructuredSections {
  hasStructure: boolean;
  hadir: string[];
  hasil: string[];
  diskusi: string[];
  penutup: string[];
}

/**
 * Deteksi apakah teks Isi Notulen sudah memiliki struktur bagian (II. Hadir, III. Hasil Rapat / Kegiatan, IV. Diskusi/tanya jawab, V. Penutup)
 */
function parseStructuredNotulen(notulenText: string): StructuredSections {
  const result: StructuredSections = {
    hasStructure: false,
    hadir: [],
    hasil: [],
    diskusi: [],
    penutup: [],
  };
  if (!notulenText || !notulenText.trim()) return result;

  const lines = notulenText.replace(/\r\n/g, "\n").split("\n").map(l => l.trim()).filter(Boolean);
  let activeSection: "none" | "waktu" | "hadir" | "hasil" | "diskusi" | "penutup" = "none";
  let matchedHeadingCount = 0;

  for (const rawLine of lines) {
    const stripped = rawLine.replace(/^[*_#\s]+|[*_#\s]+$/g, "").trim();
    const withoutRoman = stripped.replace(/^(?:I|II|III|IV|V|VI|\d+)[\.\)]\s*/i, "").trim();

    if (/^(?:waktu\s+pelaksanaan)\s*:?$/i.test(withoutRoman)) {
      activeSection = "waktu";
      matchedHeadingCount++;
      continue;
    }
    if (/^(?:hadir|daftar\s+hadir|peserta\s+hadir|kehadiran)\s*:?/i.test(withoutRoman) && withoutRoman.length < 60) {
      activeSection = "hadir";
      matchedHeadingCount++;
      const inlineVal = withoutRoman.replace(/^(?:hadir|daftar\s+hadir|peserta\s+hadir|kehadiran)\s*[:=\-]?\s*/i, "").trim();
      if (inlineVal) {
        inlineVal.split(/[,;]|(?:\s+dan\s+)/i).map(s => s.trim()).filter(Boolean).forEach(s => result.hadir.push(s));
      }
      continue;
    }
    if (/^(?:hasil\s+rapat|hasil\s+kegiatan|pokok\s+bahasan|materi\s+rapat|pembahasan|uraian\s+kegiatan|jalannya\s+rapat|kegiatan)\s*:?/i.test(withoutRoman) && withoutRoman.length < 60) {
      activeSection = "hasil";
      matchedHeadingCount++;
      const inlineVal = withoutRoman.replace(/^(?:hasil\s+rapat|hasil\s+kegiatan|pokok\s+bahasan|materi\s+rapat|pembahasan|uraian\s+kegiatan|jalannya\s+rapat|kegiatan)\s*[:=\-]?\s*/i, "").trim();
      if (inlineVal) result.hasil.push(inlineVal);
      continue;
    }
    if (/^(?:diskusi|tanya\s*jawab|diskusi\s*\/\s*tanya\s*jawab|diskusi\s+dan\s+tanya\s*jawab|masukan\s+dan\s+saran|kesepakatan\s+dan\s+tindak\s+lanjut)\s*:?/i.test(withoutRoman) && withoutRoman.length < 70) {
      activeSection = "diskusi";
      matchedHeadingCount++;
      const inlineVal = withoutRoman.replace(/^(?:diskusi(?:\s*[\/&]\s*tanya\s*jawab|\s+dan\s+tanya\s*jawab)?|tanya\s*jawab|masukan\s+dan\s+saran|kesepakatan\s+dan\s+tindak\s+lanjut)\s*[:=\-]?\s*/i, "").trim();
      if (inlineVal) result.diskusi.push(inlineVal);
      continue;
    }
    if (/^(?:penutup)\s*:?/i.test(withoutRoman) && withoutRoman.length < 40) {
      activeSection = "penutup";
      matchedHeadingCount++;
      const inlineVal = withoutRoman.replace(/^penutup\s*[:=\-]?\s*/i, "").trim();
      if (inlineVal) result.penutup.push(inlineVal);
      continue;
    }
    if (/^dump$/i.test(stripped)) {
      activeSection = "none";
      continue;
    }

    if (activeSection === "hadir") {
      const cleaned = rawLine.replace(/^(?:\d+[\.\)]|[-•*])\s*/, "").trim();
      if (cleaned) result.hadir.push(cleaned);
    } else if (activeSection === "hasil") {
      result.hasil.push(rawLine);
    } else if (activeSection === "diskusi") {
      const cleaned = rawLine.replace(/^[-•*]\s*/, "").trim();
      if (cleaned) result.diskusi.push(cleaned);
    } else if (activeSection === "penutup") {
      result.penutup.push(rawLine);
    }
  }

  result.hasStructure = matchedHeadingCount >= 2 || result.hasil.length > 0 || result.diskusi.length > 0;
  return result;
}

/**
 * Pecah blok teks menjadi butir kalimat / baris yang bersih
 */
function splitIntoCleanPoints(text: string): string[] {
  if (!text || !text.trim()) return [];
  const rawLines = text.replace(/\r\n/g, "\n").split("\n").map(l => l.trim()).filter(Boolean);
  const points: string[] = [];

  for (const line of rawLines) {
    // Jika baris sudah berupa daftar bernomor atau bullet, simpan utuh per baris
    if (/^(?:\d+[\.\)]|[a-zA-Z][\.\)]|[-•*])\s+/.test(line)) {
      const clean = line.replace(/^[-•*]\s+/, "").trim();
      if (clean) points.push(clean);
    } else {
      // Pecah narasi per kalimat
      const sentences = line
        .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
        .map(s => s.trim())
        .filter(s => s.length > 5);
      if (sentences.length > 0) {
        points.push(...sentences);
      } else if (line.length > 5) {
        points.push(line);
      }
    }
  }
  return points;
}

/**
 * Cek apakah sebuah kalimat adalah kalimat penutup acara
 */
function isClosingSentence(sentence: string): boolean {
  return /(?:kegiatan\s+(?:ditutup|diakhiri|berakhir|berlangsung|berjalan)|acara\s+(?:ditutup|diakhiri|berakhir|berlangsung|berjalan)|seluruh\s+rangkaian\s+(?:acara|kegiatan)|demikian\s+laporan|tertib,\s*aman,?\s*(?:dan|serta)\s*lancar|aman,\s*tertib,?\s*(?:dan|serta)\s*lancar|selesai\s+pada\s+pukul)/i.test(sentence);
}

/**
 * Cek apakah sebuah kalimat adalah kalimat diskusi / tanya jawab / masukan / kesepakatan tindak lanjut
 */
function isDiscussionSentence(sentence: string): boolean {
  return /(?:tanya\s*jawab|sesi\s+diskusi|diskusi|masukan|usulan|mengusulkan|bertanya|pertanyaan|tanggapan|menanggapi|pandangan|aspirasi|musyawarah|disepakati|kesepakatan|tindak\s+lanjut|menindaklanjuti|saran\s+dari|peserta\s+menyampaikan)/i.test(sentence);
}

/**
 * Ekstrak daftar pihak yang hadir dari teks narasi notulen atau catatan
 */
function extractAttendees(notulenText: string, notes?: string, officialName?: string, structured?: StructuredSections): string[] {
  if (structured && structured.hadir.length > 0) {
    return structured.hadir.map(item => item.charAt(0).toUpperCase() + item.slice(1));
  }

  const attendees: string[] = [];

  // 1. Prioritaskan ekstrak langsung dari teks Isi Notulen (paragraf 1)
  if (notulenText) {
    const matchHadirNotulen = notulenText.match(/(?:dihadiri\s+oleh|turut\s+hadir|pertemuan\s+ini\s+dihadiri\s+oleh|kegiatan\s+ini\s+dihadiri\s+oleh|dihadiri)\s+([^.\n]+)/i);
    if (matchHadirNotulen && matchHadirNotulen[1]) {
      const rawClause = matchHadirNotulen[1]
        .replace(/^(?:antara\s+lain|yaitu|meliputi)\s+/i, "")
        .replace(/\b(?:guna|dalam\s+rangka|untuk|demi)\b.*$/i, "");

      const items = rawClause
        .split(/[,;]|(?:\s+dan\s+)|(?:\s+serta\s+)/i)
        .map(s => s.trim().replace(/^(?:para|unsur)\s+/i, ""))
        .filter(s => s.length > 2 && !s.toLowerCase().startsWith("memperkuat"));

      if (items.length > 0) {
        attendees.push(...items);
      }
    }
  }

  // 2. Fallback ke catatan manual jika di Isi Notulen belum menyebut daftar hadir
  if (attendees.length === 0 && notes) {
    const matchHadirNotes = notes.match(/(?:hadir|dihadiri|peserta)\s*[:=]\s*([^\n]+)/i);
    if (matchHadirNotes && matchHadirNotes[1]) {
      const items = matchHadirNotes[1]
        .split(/[,;]|(?:\s+dan\s+)|(?:\s+serta\s+)/i)
        .map(s => s.trim().replace(/\.$/, ""))
        .filter(s => s.length > 2);
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

  // 4. Fallback terakhir jika benar-benar kosong
  if (attendees.length === 0) {
    return [
      "Sekcam Gandrungmangu / yang mewakili",
      "Kasi & Kasubag Kecamatan Gandrungmangu",
      "Unsur instansi / peserta undangan terkait"
    ];
  }

  return attendees.map(item => item.charAt(0).toUpperCase() + item.slice(1));
}

/**
 * Ekstrak butir-butir III. Hasil Rapat dan IV. Diskusi/tanya jawab secara akurat dari Isi Notulen
 */
function extractResultsAndDiscussion(
  notulenText: string,
  structured: StructuredSections,
  title?: string
): {
  hasilRapatLines: string[];
  discussionLines: string[];
} {
  // Mode 1: Isi Notulen sudah terstruktur dengan bagian Hasil Rapat / Diskusi
  if (structured.hasStructure && (structured.hasil.length > 0 || structured.diskusi.length > 0)) {
    const hasilRapatLines = structured.hasil.map(line => {
      // Pertahankan sub-heading (misal *A. ...* atau A. ...) tanpa ditambah tanda - ganda
      if (/^[*_].+[*_]$/.test(line) || /^[A-Z]\.\s+/.test(line)) {
        return line.startsWith("*") ? line : `*${line}*`;
      }
      const clean = line.replace(/^[-•*]\s+/, "").trim();
      return `- ${clean}`;
    });

    const discussionLines = structured.diskusi.length > 0
      ? structured.diskusi.map(d => `- ${d.replace(/^[-•*]\s+/, "").trim()}`)
      : ["- Tidak ada catatan tanya jawab khusus; seluruh poin pembahasan diterima dan disepakati bersama."];

    return { hasilRapatLines, discussionLines };
  }

  // Mode 2: Isi Notulen berbentuk narasi paragraf (2, 3, 4+ paragraf)
  const paragraphs = notulenText
    ? notulenText.replace(/\r\n/g, "\n").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    : [];

  const hasilPoints: string[] = [];
  const diskusiPoints: string[] = [];

  if (paragraphs.length === 1) {
    // Hanya 1 paragraf: ambil semua kalimat setelah pembukaan
    const points = splitIntoCleanPoints(paragraphs[0]);
    for (const pt of points) {
      if (isClosingSentence(pt)) continue;
      if (isDiscussionSentence(pt)) {
        diskusiPoints.push(pt);
      } else if (!/^pada\s+hari\b/i.test(pt)) {
        hasilPoints.push(pt);
      }
    }
    if (hasilPoints.length === 0 && points.length > 0) {
      hasilPoints.push(...points.filter(p => !isClosingSentence(p)));
    }
  } else if (paragraphs.length === 2) {
    // 2 paragraf: paragraf 2 berisi hasil rapat & diskusi/penutup
    const points = splitIntoCleanPoints(paragraphs[1]);
    for (const pt of points) {
      if (isClosingSentence(pt)) continue;
      if (isDiscussionSentence(pt)) {
        diskusiPoints.push(pt);
      } else {
        hasilPoints.push(pt);
      }
    }
    // Jika paragraf 1 punya kalimat substansi selain pembukaan/hadir
    const p1Points = splitIntoCleanPoints(paragraphs[0]).slice(1);
    for (const pt of p1Points) {
      if (!/^(?:pertemuan|kegiatan)\s+ini\s+dihadiri/i.test(pt) && !isClosingSentence(pt)) {
        hasilPoints.unshift(pt);
      }
    }
  } else if (paragraphs.length >= 3) {
    // 3+ paragraf:
    // - Paragraf tengah (index 1 .. length-2) adalah pokok Hasil Rapat
    // - Paragraf terakhir (index length-1) biasanya Diskusi / Tanya Jawab / Kesepakatan + Penutup
    const middleParagraphs = paragraphs.slice(1, paragraphs.length - 1);
    for (const para of middleParagraphs) {
      const points = splitIntoCleanPoints(para);
      for (const pt of points) {
        if (isClosingSentence(pt)) continue;
        if (/^(?:pada\s+sesi\s+(?:diskusi|tanya\s*jawab)|dalam\s+sesi\s+(?:diskusi|tanya\s*jawab))/i.test(pt)) {
          diskusiPoints.push(pt);
        } else {
          hasilPoints.push(pt);
        }
      }
    }

    const lastParaPoints = splitIntoCleanPoints(paragraphs[paragraphs.length - 1]);
    for (const pt of lastParaPoints) {
      if (isClosingSentence(pt)) continue;
      if (isDiscussionSentence(pt) || diskusiPoints.length === 0) {
        diskusiPoints.push(pt);
      } else {
        hasilPoints.push(pt);
      }
    }
  }

  // Susun Hasil Rapat langsung dari poin-poin Isi Notulen (tanpa menyisipkan teks generik palsu)
  const hasilRapatLines = hasilPoints.length > 0
    ? hasilPoints.map(p => `- ${p.replace(/^[-•*]\s+/, "").trim()}`)
    : [`- Pelaksanaan agenda ${title || "kegiatan dinas"} berjalan sesuai rencana.`];

  // Susun Diskusi/Tanya Jawab langsung dari Isi Notulen
  const discussionLines = diskusiPoints.length > 0
    ? diskusiPoints.map(d => `- ${d.replace(/^[-•*]\s+/, "").trim()}`)
    : ["- Sesi diskusi dan tanya jawab berlangsung aktif serta menyepakati tindak lanjut bersama."];

  return { hasilRapatLines, discussionLines };
}

/**
 * Ekstrak kalimat penutup dan jam selesai
 */
function extractClosing(notulenText: string, timeStr?: string, structured?: StructuredSections): { closingSentence: string; closingTime: string } {
  let closingSentence = "Demikian laporan kegiatan ini disampaikan, acara berjalan aman, tertib, dan lancar.";
  let closingTime = "";

  if (timeStr && timeStr.trim() !== "" && timeStr !== "-") {
    const rangeMatch = timeStr.match(/(?:-|s\.d\.?|sampai)\s*([0-9]{1,2}[:.][0-9]{2})/i);
    if (rangeMatch && rangeMatch[1]) {
      closingTime = `pukul ${rangeMatch[1].replace(/:/g, ".")} WIB`;
    }
  }

  if (structured && structured.penutup.length > 0) {
    closingSentence = structured.penutup.join(" ");
  } else if (notulenText) {
    const points = splitIntoCleanPoints(notulenText);
    const lastClosing = [...points].reverse().find(s => isClosingSentence(s));
    if (lastClosing) {
      const timeMatch = lastClosing.match(/pukul\s+([0-9]{1,2}[:.][0-9]{2}(?:\s*wib)?)/i);
      if (timeMatch && timeMatch[1]) {
        closingTime = `pukul ${timeMatch[1].replace(/:/g, ".").replace(/\s*wib/i, "")} WIB`;
      }
      closingSentence = lastClosing;
    }
  }

  return { closingSentence, closingTime };
}

/**
 * Mengonversi teks Isi Notulen (baik narasi paragraf maupun format berpoin/seksi)
 * menjadi format WhatsApp resmi Camat Gandrungmangu yang 100% selaras dengan Isi Notulen.
 */
export function convertNotulenToWa(options: FormatNotulenWaOptions): string {
  const title = options.title?.trim() || "Kegiatan Dinas";
  const dateStr = formatIndonesianDateWithDay(options.date);
  const timeStr = formatTimeWib(options.time);
  const location = options.location?.trim() || "Balai Kecamatan Gandrungmangu";
  const notulen = options.notulen?.trim() || "";

  const structured = parseStructuredNotulen(notulen);

  // 1. Ekstrak II. Hadir
  const attendees = extractAttendees(notulen, options.notes, options.officialName, structured);
  const hadirLines = attendees.map((item, idx) => `${idx + 1}. ${item}`).join("\n");

  // 2. Ekstrak III. Hasil Rapat & IV. Diskusi/tanya jawab langsung dari Isi Notulen
  const { hasilRapatLines, discussionLines } = extractResultsAndDiscussion(notulen, structured, title);

  // 3. Ekstrak V. Penutup
  const { closingSentence, closingTime } = extractClosing(notulen, options.time, structured);
  let cleanClosing = closingSentence.replace(/\s*selesai\s+pada\s+pukul\s+[0-9]{1,2}[:.][0-9]{2}(?:\s*wib)?\.?/i, "").trim();
  if (cleanClosing && !cleanClosing.endsWith(".")) cleanClosing += ".";
  const penutupText = closingTime
    ? `${cleanClosing}\nselesai pada ${closingTime}`
    : cleanClosing;

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
${hasilRapatLines.join("\n")}

*IV. Diskusi/tanya jawab*
${discussionLines.join("\n")}

*V. Penutup*
${penutupText}

DUMP`;
}
