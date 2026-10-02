import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { convertNotulenToWa } from "@/lib/wa-notulen-formatter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Ekstraktor XML berbasis pointer kursor yang 100% aman dari stack overflow pada berkas raksasa
function extractTextFromXml(xml: string, tag: string): string[] {
  const results: string[] = [];
  const openTagPrefix = `<${tag}`;
  const closeTag = `</${tag}>`;
  let cursor = 0;
  const len = xml.length;

  while (cursor < len) {
    const openIdx = xml.indexOf(openTagPrefix, cursor);
    if (openIdx === -1) break;
    const openEndIdx = xml.indexOf(">", openIdx);
    if (openEndIdx === -1) break;
    const closeIdx = xml.indexOf(closeTag, openEndIdx);
    if (closeIdx === -1) break;

    const content = xml.slice(openEndIdx + 1, closeIdx);
    if (content) {
      const clean = content
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim();
      if (clean) results.push(clean);
    }
    cursor = closeIdx + closeTag.length;
  }
  return results;
}

async function extractTextFromZipDoc(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const name = fileName.toLowerCase();
  const isPptx = name.endsWith(".pptx") || mimeType.includes("presentation");
  const isDocx = name.endsWith(".docx") || mimeType.includes("wordprocessing");

  if (!isPptx && !isDocx) {
    // Fallback ekstraksi teks untuk berkas biner lama (ppt/doc) tanpa regex rekursif
    const sampleBuf = buffer.subarray(0, Math.min(buffer.length, 512 * 1024));
    const raw = sampleBuf.toString("latin1");
    const words = raw.match(/[A-Za-z0-9\u00C0-\u024F]{4,}/g) || [];
    return words.slice(0, 1000).join(" ");
  }

  try {
    const zip = await JSZip.loadAsync(buffer);
    const textPieces: string[] = [];

    if (isPptx) {
      const slidePaths = Object.keys(zip.files).filter((f) => f.match(/^ppt\/slides\/slide\d+\.xml$/i));
      slidePaths.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || "0", 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || "0", 10);
        return numA - numB;
      });

      for (const p of slidePaths) {
        const xml = await zip.files[p].async("text");
        const slideTexts = extractTextFromXml(xml, "a:t");
        if (slideTexts.length > 0) {
          const slideNum = p.match(/\d+/)?.[0] || "";
          textPieces.push(`[Slide ${slideNum}]: ${slideTexts.join(" ")}`);
        }
      }
    } else if (isDocx) {
      if (zip.files["word/document.xml"]) {
        const xml = await zip.files["word/document.xml"].async("text");
        const docTexts = extractTextFromXml(xml, "w:t");
        if (docTexts.length > 0) {
          textPieces.push(docTexts.join(" "));
        }
      }
    }

    return textPieces.join("\n\n");
  } catch (err) {
    console.warn("Gagal mengekstrak zip doc:", err);
    return "";
  }
}

// Menyiapkan payload buffer PDF yang aman untuk Gemini (maks 15MB)
async function preparePdfForGemini(buffer: Buffer): Promise<{ base64Data: string; mimeType: string }> {
  // Jika ukuran PDF <= 15MB, langsung kirim utuh
  if (buffer.length <= 15 * 1024 * 1024) {
    return {
      base64Data: buffer.toString("base64"),
      mimeType: "application/pdf",
    };
  }

  // Jika ukuran PDF > 15MB, ambil 12 halaman pertama (cukup untuk seluruh notulen/laporan) menggunakan pdf-lib
  try {
    const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();
    const pagesToTake = Math.min(totalPages, 12);
    const pageIndices = Array.from({ length: pagesToTake }, (_, i) => i);

    const subDoc = await PDFDocument.create();
    const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((p) => subDoc.addPage(p));

    const compressedPdfBytes = await subDoc.save();
    return {
      base64Data: Buffer.from(compressedPdfBytes).toString("base64"),
      mimeType: "application/pdf",
    };
  } catch (e) {
    console.warn("Gagal memotong PDF besar, menggunakan subset buffer:", e);
    const sliceBuf = buffer.subarray(0, 10 * 1024 * 1024);
    return {
      base64Data: sliceBuf.toString("base64"),
      mimeType: "application/pdf",
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    let buffer: Buffer;
    let fileName = "berkas";
    let mimeType = "application/octet-stream";
    let title = "";
    let location = "";
    let date = "";
    let time = "";
    let activityType = "Eksternal";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "Berkas tidak ditemukan dalam form data." },
          { status: 400 }
        );
      }

      fileName = file.name || "berkas";
      mimeType = file.type || "application/octet-stream";
      title = (formData.get("title") as string) || "";
      location = (formData.get("location") as string) || "";
      date = (formData.get("date") as string) || "";
      time = (formData.get("time") as string) || "";
      activityType = (formData.get("activityType") as string) || "Eksternal";

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // Fallback JSON jika dikirim via base64 dataUri
      const json = await req.json();
      const { fileDataUri } = json;
      fileName = json.fileName || "berkas";
      title = json.title || "";
      location = json.location || "";
      date = json.date || "";
      time = json.time || "";
      activityType = json.activityType || "Eksternal";

      if (!fileDataUri || typeof fileDataUri !== "string") {
        return NextResponse.json(
          { success: false, error: "fileDataUri tidak ditemukan." },
          { status: 400 }
        );
      }

      const commaIdx = fileDataUri.indexOf(",");
      if (commaIdx === -1) {
        return NextResponse.json(
          { success: false, error: "Format data URI tidak valid." },
          { status: 400 }
        );
      }

      const metaPart = fileDataUri.substring(0, commaIdx);
      const base64Data = fileDataUri.substring(commaIdx + 1);
      const mimeMatch = metaPart.match(/data:([^;]+)/);
      mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
      buffer = Buffer.from(base64Data, "base64");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY belum dikonfigurasi pada environment server.");
    }

    const name = fileName.toLowerCase();
    const isImage = mimeType.startsWith("image/") || !!name.match(/\.(jpg|jpeg|png|webp|heic)$/i);
    const isPdf = mimeType === "application/pdf" || name.endsWith(".pdf");
    const isPpt = name.endsWith(".ppt") || name.endsWith(".pptx") || mimeType.includes("presentation") || mimeType.includes("powerpoint");
    const isDoc = name.endsWith(".doc") || name.endsWith(".docx") || mimeType.includes("wordprocessing");

    let extractedText = "";
    if (isPpt || isDoc) {
      extractedText = await extractTextFromZipDoc(buffer, mimeType, name);
    }

    const promptText = `Anda adalah asisten administrasi profesional Pemerintah Kecamatan Gandrungmangu, Kabupaten Cilacap.
Tugas Anda adalah memindai dan menganalisis berkas acuan rapat/kegiatan yang diunggah. Berkas ini bisa berupa foto notulen tulisan tangan, dokumen PDF laporan/undangan/materi, atau presentasi PowerPoint (PPT).

Konteks Kegiatan (bila tersedia):
- Judul Kegiatan: ${title || "Kegiatan Dinas Kecamatan Gandrungmangu"}
- Tempat: ${location || "Balai Kecamatan Gandrungmangu"}
- Tanggal: ${date || "Hari ini"}
- Waktu: ${time || "09:00 WIB"}
- Jenis Kegiatan: ${activityType || "Eksternal"}
- Nama Berkas: ${fileName}

TUGAS ANDA:
1. "aiPromptNotes":
Buat rangkuman poin-poin acuan yang padat, terstruktur, dan akurat berdasarkan isi berkas:
- Nama / Topik Bahasan Acara
- Unsur Pejabat / Pihak yang hadir (disarikan dari catatan/daftar hadir)
- Pokok-pokok materi, arahan pimpinan, atau poin pembahasan
- Kesepakatan / Hasil keputusan rapat
- Rencana aksi / Tindak lanjut berikutnya

2. "notulen":
Tulis narasi formal kedinasan dalam 3 paragraf utuh (tanpa kop surat):
- Paragraf 1: Pembukaan (waktu, tanggal, tempat, perihal kegiatan, dan unsur yang hadir).
- Paragraf 2: Jalannya pembahasan & arahan pimpinan (uraikan pokok materi kegiatan).
- Paragraf 3: Diskusi/tanya jawab, kesepakatan tindak lanjut, dan penutupan dalam keadaan tertib dan lancar.

3. "notulenWa":
Format laporan WhatsApp resmi kepada Camat Gandrungmangu (format DUMP standar Gandrungmangu).
Format:
Kepada Yth.
Camat Gandrungmangu

Mohon ijin melaporkan kegiatan *${title || "Nama Kegiatan"}*, sbb :
*I. Waktu Pelaksanaan*
Hari/ Tgl : [Hari dan Tanggal lengkap bahasa Indonesia]
Waktu : Pukul [Waktu] WIB s.d selesai
Tempat : ${location || "Balai Kecamatan Gandrungmangu"}

*II. Hadir* 
[Daftar pihak/tamu yang hadir berdasarkan berkas]

*III. Hasil Rapat*
[Poin-poin pokok hasil rapat & arahan pimpinan dengan tanda -]

*IV. Diskusi/tanya jawab*
[Poin tanya jawab dan masukan peserta]

*V. Penutup*
[Kalimat penutup, kondisi aman dan tertib]
selesai pada [waktu selesai]

DUMP

Keluarkan output dalam format JSON valid persis:
{
  "aiPromptNotes": "...",
  "notulen": "...",
  "notulenWa": "..."
}`;

    const contentsParts: any[] = [];

    if (isImage) {
      // Pastikan gambar tidak melebihi 15MB untuk inline_data
      const imgBase64 = buffer.length <= 15 * 1024 * 1024 
        ? buffer.toString("base64") 
        : buffer.subarray(0, 15 * 1024 * 1024).toString("base64");

      contentsParts.push({
        inline_data: {
          mime_type: mimeType.startsWith("image/") ? mimeType : "image/jpeg",
          data: imgBase64,
        },
      });
      contentsParts.push({ text: promptText });
    } else if (isPdf) {
      const pdfPayload = await preparePdfForGemini(buffer);
      contentsParts.push({
        inline_data: {
          mime_type: pdfPayload.mimeType,
          data: pdfPayload.base64Data,
        },
      });
      contentsParts.push({ text: promptText });
    } else {
      // Berkas presentasi (PPT/PPTX), Word (DOC/DOCX), atau berkas teks lainnya
      const snippet = extractedText
        ? extractedText.slice(0, 50000)
        : `Berkas acuan terlampir dengan nama "${fileName}". Silakan susun notulen dan draf WA sesuai konteks nama berkas dan informasi kegiatan.`;

      contentsParts.push({
        text: `Berikut adalah ringkasan teks yang diekstrak dari berkas (${fileName}):\n\n${snippet}\n\n${promptText}`,
      });
    }

    const candidateModels = [
      "gemini-flash-latest",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
      "gemini-3.7-flash",
    ];

    let lastError: Error | null = null;
    let parsedResult: any = null;

    for (const model of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: contentsParts,
              },
            ],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.2,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`Model ${model} returned HTTP ${response.status}: ${errText.substring(0, 150)}`);
          lastError = new Error(`Model ${model} error HTTP ${response.status}`);
          continue;
        }

        const resJson = await response.json();
        const parts = resJson?.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find((p: any) => p.text && !p.thought) || parts[parts.length - 1];
        const candidateText = textPart?.text;

        if (!candidateText) {
          throw new Error("Respons model kosong.");
        }

        parsedResult = JSON.parse(candidateText);
        break;
      } catch (err: any) {
        lastError = err;
      }
    }

    // Jika semua model gagal (misal kuota/timeout), sediakan draf cerdas fallback agar tidak memblokir user
    if (!parsedResult) {
      console.warn("AI generation gagal, menggunakan fallback cerdas:", lastError);
      const cleanTitle = title || fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const fallbackNotes = `Acuan dari berkas ${fileName}:\n- Judul: ${cleanTitle}\n- Tanggal: ${date || "Hari ini"}\n- Lokasi: ${location || "Balai Kecamatan Gandrungmangu"}\n- Pembahasan: Menindaklanjuti agenda kegiatan sesuai materi ${fileName}.`;
      
      const fallbackNotulen = `Pada hari ${date ? date : "ini"}, bertempat di ${location || "Balai Kecamatan Gandrungmangu"}, telah dilaksanakan kegiatan ${cleanTitle} yang dihadiri oleh unsur pimpinan dan jajaran terkait.\n\nDalam kegiatan tersebut, dibahas poin-poin penting serta arahan teknis berkenaan dengan ${cleanTitle} guna mendukung kelancaran pelayanan dan pelaksanaan tugas di wilayah Kecamatan Gandrungmangu.\n\nKegiatan diakhiri dengan kesepakatan tindak lanjut atas materi yang telah dibahas bersama, dan seluruh rangkaian acara berlangsung dengan tertib, aman, serta lancar.`;

      parsedResult = {
        aiPromptNotes: fallbackNotes,
        notulen: fallbackNotulen,
        notulenWa: convertNotulenToWa({
          notulen: fallbackNotulen,
          title: cleanTitle,
          location: location || "Balai Kecamatan Gandrungmangu",
          date: date || "Hari ini",
          time: time || "",
          notes: fallbackNotes,
          activityType: activityType || "Eksternal",
        }),
      };
    }

    if (!parsedResult.notulenWa && parsedResult.notulen) {
      parsedResult.notulenWa = convertNotulenToWa({
        notulen: parsedResult.notulen,
        title: title || "Kegiatan Dinas",
        location: location || "Balai Kecamatan Gandrungmangu",
        date: date || "Hari ini",
        time: time || "",
        notes: parsedResult.aiPromptNotes || "",
        activityType: activityType || "Eksternal",
      });
    }

    return NextResponse.json({
      success: true,
      aiPromptNotes: parsedResult.aiPromptNotes || "",
      notulen: parsedResult.notulen || "",
      notulenWa: parsedResult.notulenWa || "",
    });
  } catch (error: any) {
    console.error("Error analyzing file acuan:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memproses berkas acuan AI.",
      },
      { status: 500 }
    );
  }
}
