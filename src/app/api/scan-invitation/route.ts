import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { fileDataUri } = await req.json();

    if (!fileDataUri || typeof fileDataUri !== "string") {
      return NextResponse.json({
        success: false,
        error: "File data URI tidak ditemukan.",
      }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY belum dikonfigurasi pada environment server.");
    }

    // Pisahkan MIME type dan base64 payload
    const matches = fileDataUri.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches) {
      throw new Error("Format fileDataUri tidak valid. Harus diawali data:<mimetype>;base64,...");
    }
    const mimeType = matches[1];
    const base64Data = matches[2];

    const promptText = `Anda adalah asisten administrasi cerdas untuk instansi pemerintahan di Indonesia (Kecamatan & Kecamatan).
Tugas Anda adalah memindai dan menganalisis surat undangan resmi (baik dalam format PDF maupun Gambar/Foto scan) dan mengekstrak rincian acara ke dalam format JSON:

Format JSON yang WAJIB dihasilkan:
{
  "eventTitle": "Nama atau perihal acara utama yang jelas dan informatif",
  "eventDate": "YYYY-MM-DD (contoh: 2026-07-29)",
  "eventTime": "HH:mm (contoh: 13:00)",
  "eventLocation": "Tempat pelaksanaan acara",
  "eventNotes": "Catatan tambahan serta rincian agenda pembahasan",
  "eventType": "Internal" atau "Eksternal"
}

PANDUAN EKSTRAKSI:
- eventDate WAJIB berformat ISO YYYY-MM-DD. Ubah nama bulan Indonesia ke angka (Januari=01, Februari=02, Maret=03, April=04, Mei=05, Juni=06, Juli=07, Agustus=08, September=09, Oktober=10, November=11, Desember=12). Jika tahun tidak tertera, gunakan tahun 2026.
- eventTime WAJIB berformat HH:mm (24 jam). Contoh: "Pukul 13.00 WIB s/d selesai" menjadi "13:00".
- eventTitle harus informatif dan memuat tujuan/perihal kegiatan (contoh: "Pertemuan Kecamatan I - Kegiatan Pengembangan Infrastruktur Sosial Wilayah (PISEW) Tahun 2026").
- eventNotes sertakan catatan kehadiran ("Dimohon hadir tepat waktu") dan butir-butir agenda yang dibahas (1. Pengenalan ..., 2. Sosialisasi ..., dst) jika ada.
- eventType pilih "Eksternal" jika melibatkan pihak luar Kecamatan, kecamatan lain, kementerian/program nasional seperti PISEW, atau "Internal" jika murni kegiatan kantor kecamatan/Kecamatan sendiri.
- Kembalikan HANYA JSON murni tanpa awalan atau akhiran markdown.`;

    const candidateModels = [
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
      "gemini-3.7-flash",
    ];

    let lastError: Error | null = null;
    let parsedResult = null;

    for (const model of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data,
                    },
                  },
                  {
                    text: promptText,
                  },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.1,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`Model ${model} returned HTTP ${response.status}: ${errText.substring(0, 150)}`);
          lastError = new Error(`Model ${model} error HTTP ${response.status}`);
          continue; // Coba model berikutnya jika terjadi 503 / 429 / 404
        }

        const resJson = await response.json();
        const parts = resJson?.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find((p: any) => p.text && !p.thought) || parts[parts.length - 1];
        const candidateText = textPart?.text;

        if (!candidateText) {
          continue;
        }

        try {
          parsedResult = JSON.parse(candidateText.trim());
        } catch {
          const cleaned = candidateText.replace(/```json/g, "").replace(/```/g, "").trim();
          parsedResult = JSON.parse(cleaned);
        }

        if (parsedResult) {
          // Sukses!
          return NextResponse.json({
            success: true,
            data: parsedResult,
            modelUsed: model,
          });
        }
      } catch (modelErr: any) {
        console.warn(`Error with ${model}:`, modelErr?.message);
        lastError = modelErr;
      }
    }

    if (!parsedResult) {
      throw lastError || new Error("Semua model AI sedang sibuk. Silakan coba sesaat lagi.");
    }
  } catch (error: any) {
    console.error("Scan Invitation API Error:", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Gagal memindai dokumen undangan.",
    }, { status: 500 });
  }
}
