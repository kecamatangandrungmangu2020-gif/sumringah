import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { terbilang, loadImage } from "./pdf-utils";

const LOGO_CILACAP_FALLBACK = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lambang_Kabupaten_Cilacap.png/120px-Lambang_Kabupaten_Cilacap.png";

export interface TransactionItem {
  jenisBarang: string;
  banyaknya: number | string;
  satuan: string;
  hargaSatuan: number | string;
  jumlah: number | string;
}

export interface NotaFakturData {
  tanggal: string;
  namaToko: string;
  namaPemilik: string;
  alamatToko?: string;
  noTeleponToko?: string;
  KaryawanNama: string;
  KaryawanJabatan?: string;
  kepalaKecamatanNama?: string;
  noNota?: string;
  noFaktur?: string;
  items: TransactionItem[];
}

export interface StrukBelanjaData {
  tanggal: string;
  jam: string;
  menit: string;
  detik: string;
  namaToko: string;
  alamatToko: string;
  noTelepon?: string;
  namaKasir?: string;
  noStruk?: string;
  bayarTunai?: number | string;
  items: TransactionItem[];
}

const formatDateIndo = (dateStr: string) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return format(d, "d MMMM yyyy", { locale: localeID });
  } catch {
    return dateStr;
  }
};

/**
 * GENERATE NOTA PESANAN & FAKTUR PENGIRIMAN BARANG
 * Sesuai format fisik:
 * - Halaman 1: NOTA PESANAN (Kop Surat Pemdes Gandrungmangu, Kepada Toko, Tabel Rincian, TTD Yang Menerima & Yang Memesan)
 * - Halaman 2: FAKTUR PENGIRIMAN BARANG (Dasar Pesanan, Kepada Kepala Kecamatan, Tabel Rincian, TTD Yang Menerima & Yang Mengirim)
 */
export const generateNotaDanFakturPDF = async (
  data: NotaFakturData,
  logoBase64?: string | null
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 20;
  const tableWidth = 170; // 210 - 40
  const tanggalFormatIndo = formatDateIndo(data.tanggal);

  // Filter valid items
  const validItems = data.items.filter(
    (it) => it.jenisBarang && it.jenisBarang.trim() !== ""
  );
  if (validItems.length === 0) {
    validItems.push({
      jenisBarang: "Foto Copy Undangan dan Materi",
      banyaknya: 280,
      satuan: "buah",
      hargaSatuan: 300,
      jumlah: 84000,
    });
  }

  const grandTotal = validItems.reduce((acc, curr) => {
    const val = typeof curr.jumlah === "number" ? curr.jumlah : parseInt(String(curr.jumlah).replace(/\D/g, "")) || 0;
    return acc + val;
  }, 0);

  // Load Logo for Kop Surat (Page 1)
  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith("data:image"))
    ? logoBase64
    : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);

  // Column definitions
  // Total width: 170mm
  // No: 12mm, Barang: 68mm, Banyaknya: 38mm, Satuan: 24mm, Jumlah: 28mm
  const colX = {
    no: margin,                    // 20
    barang: margin + 12,           // 32
    banyaknya: margin + 12 + 68,   // 100
    satuan: margin + 12 + 68 + 38, // 138
    jumlah: margin + 12 + 68 + 38 + 24, // 162
    end: margin + tableWidth,      // 190
  };

  const colW = {
    no: 12,
    barang: 68,
    banyaknya: 38,
    satuan: 24,
    jumlah: 28,
  };

  const minRows = 7;
  const totalRowsCount = Math.max(validItems.length, minRows);
  const rowHeight = 8.5;
  const headerHeight = 12;
  const tableContentHeight = totalRowsCount * rowHeight;
  const totalTableHeight = headerHeight + tableContentHeight;

  // =========================================================================
  // HALAMAN 1: NOTA PESANAN (KOP SURAT LENGKAP)
  // =========================================================================

  // 1. KOP SURAT
  if (logoImg) {
    try {
      doc.addImage(logoImg, "PNG", margin, 10, 16, 20);
    } catch (e) {
      console.error("Kop Logo Error:", e);
    }
  }

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("PEMERINTAH KABUPATEN CILACAP", (pageWidth / 2) + 8, 14, { align: "center" });

  doc.setFontSize(18);
  doc.text("KECAMATAN GANDRUNGMANGU", (pageWidth / 2) + 8, 21, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.text("Jalan Pertiwi No.01 Gandrungmangu, Gandrungmangu, Cilacap, Jawa Tengah 53254", (pageWidth / 2) + 8, 26.5, { align: "center" });
  doc.text("Telepon. (0280) 5265001, Faksimile (0280) 5265001, Laman : gandrungmangu.cilacapkab.go.id", (pageWidth / 2) + 8, 31, { align: "center" });
  doc.text("Pos - el : kecamatan.gandrungmangu2020@gmail.com", (pageWidth / 2) + 8, 35.5, { align: "center" });

  // Double Line Kop
  doc.setLineWidth(0.8);
  doc.line(margin, 38.5, pageWidth - margin, 38.5);
  doc.setLineWidth(0.2);
  doc.line(margin, 39.5, pageWidth - margin, 39.5);

  // 2. KEPADA (TUAN TOKO) - RIGHT ALIGNED BLOCK
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text("Kepada :", 138, 43);
  doc.text(`Yth.Tuan ${data.namaPemilik || ""}`, 134, 48);
  doc.text(`Toko " ${data.namaToko || ""} "`, 147, 53);
  doc.text("Di-", 143, 58);

  const lokasiToko = (data.alamatToko && data.alamatToko.trim() !== "")
    ? data.alamatToko.toUpperCase()
    : "GANDRUNGMANGU";
  doc.setFont("times", "bold");
  doc.text(lokasiToko, 152, 63);
  const wLokasi = doc.getTextWidth(lokasiToko);
  doc.setLineWidth(0.3);
  doc.line(152, 63.8, 152 + wLokasi, 63.8);

  // 3. JUDUL DOKUMEN & PEMBUKA
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.text("NOTA PESANAN", margin, 68);
  doc.line(margin, 68.8, margin + doc.getTextWidth("NOTA PESANAN"), 68.8);

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text("Harap dikirim kepada kami :", margin, 74.5);

  // 4. TABEL NOTA PESANAN
  const table1Top = 78;

  // Outer double line border for crisp authentic print style
  doc.setLineWidth(0.4);
  doc.rect(margin, table1Top, tableWidth, totalTableHeight);
  doc.setLineWidth(0.15);
  doc.rect(margin - 0.4, table1Top - 0.4, tableWidth + 0.8, totalTableHeight + 0.8);

  // Horizontal Header Split Lines
  doc.setLineWidth(0.3);
  doc.line(margin, table1Top + headerHeight, colX.end, table1Top + headerHeight); // Bottom of header
  doc.line(colX.satuan, table1Top + 6, colX.end, table1Top + 6); // Sub-header separator for "H a r g a"

  // Vertical Column Separators in Header & Body
  doc.line(colX.barang, table1Top, colX.barang, table1Top + totalTableHeight);
  doc.line(colX.banyaknya, table1Top, colX.banyaknya, table1Top + totalTableHeight);
  doc.line(colX.satuan, table1Top, colX.satuan, table1Top + totalTableHeight);
  doc.line(colX.jumlah, table1Top + 6, colX.jumlah, table1Top + totalTableHeight);

  // Header Texts
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("No", colX.no + colW.no / 2, table1Top + 7.5, { align: "center" });
  doc.text("Jenis Barang", colX.barang + colW.barang / 2, table1Top + 7.5, { align: "center" });
  doc.text("Banyaknya", colX.banyaknya + colW.banyaknya / 2, table1Top + 7.5, { align: "center" });
  doc.text("H a r g a", colX.satuan + (colW.satuan + colW.jumlah) / 2, table1Top + 4.5, { align: "center" });
  doc.text("Satuan", colX.satuan + colW.satuan / 2, table1Top + 10.2, { align: "center" });
  doc.text("Jumlah", colX.jumlah + colW.jumlah / 2, table1Top + 10.2, { align: "center" });

  // Data Rows & Empty Grid Lines
  let currentY = table1Top + headerHeight;
  for (let i = 0; i < totalRowsCount; i++) {
    const item = validItems[i];
    const rowBottomY = currentY + rowHeight;

    // Draw row bottom line
    doc.setLineWidth(0.2);
    doc.line(margin, rowBottomY, colX.end, rowBottomY);

    if (item) {
      doc.setFont("times", "bold");
      doc.setFontSize(9.5);
      // Col 1: No
      doc.text(String(i + 1), colX.no + colW.no / 2, currentY + 5.5, { align: "center" });

      // Col 2: Jenis Barang (with word wrap if needed)
      const namaLines = doc.splitTextToSize(item.jenisBarang || "", colW.barang - 4);
      if (namaLines.length > 1) {
        doc.text(namaLines[0], colX.barang + 2, currentY + 4);
        doc.text(namaLines[1], colX.barang + 2, currentY + 7.5);
      } else {
        doc.text(item.jenisBarang || "", colX.barang + 2, currentY + 5.5);
      }

      // Col 3: Banyaknya
      doc.setFont("times", "normal");
      const unitText = item.satuan ? `${item.banyaknya} ${item.satuan}` : `${item.banyaknya}`;
      doc.text(unitText, colX.banyaknya + colW.banyaknya / 2, currentY + 5.5, { align: "center" });

      // Col 4: Satuan (Numeric)
      const hrgNum = typeof item.hargaSatuan === "number" ? item.hargaSatuan : parseInt(String(item.hargaSatuan).replace(/\D/g, "")) || 0;
      doc.text(hrgNum.toLocaleString("id-ID"), colX.satuan + colW.satuan - 3, currentY + 5.5, { align: "right" });

      // Col 5: Jumlah (Numeric)
      const jmlNum = typeof item.jumlah === "number" ? item.jumlah : parseInt(String(item.jumlah).replace(/\D/g, "")) || (hrgNum * Number(item.banyaknya || 1));
      doc.text(jmlNum.toLocaleString("id-ID"), colX.jumlah + colW.jumlah - 3, currentY + 5.5, { align: "right" });
    }

    currentY += rowHeight;
  }

  // Bottom Summary Box (JUMLAH | Rp  84,000)
  const summary1Y = table1Top + totalTableHeight;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("JUMLAH", colX.satuan + colW.satuan / 2, summary1Y + 5, { align: "center" });

  // Bordered Box for Rp amount
  const sumBox1H = 7.5;
  doc.setLineWidth(0.4);
  doc.rect(colX.jumlah, summary1Y, colW.jumlah, sumBox1H);
  doc.setLineWidth(0.15);
  doc.rect(colX.jumlah - 0.3, summary1Y - 0.3, colW.jumlah + 0.6, sumBox1H + 0.6);

  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  doc.text("Rp", colX.jumlah + 2.5, summary1Y + 5.2);
  doc.text(grandTotal.toLocaleString("id-ID"), colX.jumlah + colW.jumlah - 2.5, summary1Y + 5.2, { align: "right" });

  // 5. TANDA TANGAN NOTA PESANAN
  const sign1DateY = summary1Y + 16;
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text(`Gandrungmangu, ${tanggalFormatIndo}`, 155, sign1DateY, { align: "center" });

  const sign1TitleY = sign1DateY + 6;
  doc.text("Yang Menerima", 55, sign1TitleY, { align: "center" });
  doc.text("Yang Memesan", 155, sign1TitleY, { align: "center" });

  const sign1NameY = sign1TitleY + 23;
  const ownerName = (data.namaPemilik || "DEDI").toUpperCase();
  const pemesanName = (data.KaryawanNama || "TEDY TRISNANTO").toUpperCase();

  doc.setFont("times", "bold");
  doc.text(ownerName, 55, sign1NameY, { align: "center" });
  const wOwn = doc.getTextWidth(ownerName);
  doc.setLineWidth(0.3);
  doc.line(55 - wOwn / 2, sign1NameY + 0.8, 55 + wOwn / 2, sign1NameY + 0.8);

  doc.text(pemesanName, 155, sign1NameY, { align: "center" });
  const wPem = doc.getTextWidth(pemesanName);
  doc.line(155 - wPem / 2, sign1NameY + 0.8, 155 + wPem / 2, sign1NameY + 0.8);

  // =========================================================================
  // HALAMAN 2: FAKTUR PENGIRIMAN BARANG
  // =========================================================================
  doc.addPage("a4", "portrait");

  // 1. DASAR PESANAN & KEPADA
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text(`Dasar Pesanan tanggal : ${tanggalFormatIndo}`, margin, 20);
  const wDasar = doc.getTextWidth(`Dasar Pesanan tanggal : ${tanggalFormatIndo}`);
  doc.setLineWidth(0.25);
  doc.line(margin, 20.8, margin + wDasar, 20.8);

  // Kepada Kepala Kecamatan (Right aligned block)
  doc.text("Kepada :", 138, 26);
  doc.text("Yth. CAMAT GANDRUNGMANGU", 134, 31);
  doc.text("Di-", 143, 36);

  doc.setFont("times", "bold");
  doc.text("GANDRUNGMANGU", 148, 41);
  const wRk = doc.getTextWidth("GANDRUNGMANGU");
  doc.setLineWidth(0.3);
  doc.line(148, 41.8, 148 + wRk, 41.8);

  // 2. JUDUL DOKUMEN & PEMBUKA
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("FAKTUR PENGIRIMAN BARANG", pageWidth / 2, 51, { align: "center" });
  const wFakturTitle = doc.getTextWidth("FAKTUR PENGIRIMAN BARANG");
  doc.line(pageWidth / 2 - wFakturTitle / 2, 51.8, pageWidth / 2 + wFakturTitle / 2, 51.8);

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text("Harap diterima dengan baik kiriman barang sebagai berikut :", margin, 58.5);

  // 3. TABEL FAKTUR PENGIRIMAN BARANG
  const table2Top = 62;

  // Outer double line border
  doc.setLineWidth(0.4);
  doc.rect(margin, table2Top, tableWidth, totalTableHeight);
  doc.setLineWidth(0.15);
  doc.rect(margin - 0.4, table2Top - 0.4, tableWidth + 0.8, totalTableHeight + 0.8);

  // Horizontal Header Split Lines
  doc.setLineWidth(0.3);
  doc.line(margin, table2Top + headerHeight, colX.end, table2Top + headerHeight);
  doc.line(colX.satuan, table2Top + 6, colX.end, table2Top + 6);

  // Vertical Column Separators
  doc.line(colX.barang, table2Top, colX.barang, table2Top + totalTableHeight);
  doc.line(colX.banyaknya, table2Top, colX.banyaknya, table2Top + totalTableHeight);
  doc.line(colX.satuan, table2Top, colX.satuan, table2Top + totalTableHeight);
  doc.line(colX.jumlah, table2Top + 6, colX.jumlah, table2Top + totalTableHeight);

  // Header Texts (Notice: "Nama Barang" in Faktur!)
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("No", colX.no + colW.no / 2, table2Top + 7.5, { align: "center" });
  doc.text("Nama Barang", colX.barang + colW.barang / 2, table2Top + 7.5, { align: "center" });
  doc.text("Banyaknya", colX.banyaknya + colW.banyaknya / 2, table2Top + 7.5, { align: "center" });
  doc.text("H a r g a", colX.satuan + (colW.satuan + colW.jumlah) / 2, table2Top + 4.5, { align: "center" });
  doc.text("Satuan", colX.satuan + colW.satuan / 2, table2Top + 10.2, { align: "center" });
  doc.text("Jumlah", colX.jumlah + colW.jumlah / 2, table2Top + 10.2, { align: "center" });

  // Data Rows & Empty Grid Lines
  currentY = table2Top + headerHeight;
  for (let i = 0; i < totalRowsCount; i++) {
    const item = validItems[i];
    const rowBottomY = currentY + rowHeight;

    doc.setLineWidth(0.2);
    doc.line(margin, rowBottomY, colX.end, rowBottomY);

    if (item) {
      doc.setFont("times", "bold");
      doc.setFontSize(9.5);
      // Col 1: No
      doc.text(String(i + 1), colX.no + colW.no / 2, currentY + 5.5, { align: "center" });

      // Col 2: Nama Barang
      const namaLines = doc.splitTextToSize(item.jenisBarang || "", colW.barang - 4);
      if (namaLines.length > 1) {
        doc.text(namaLines[0], colX.barang + 2, currentY + 4);
        doc.text(namaLines[1], colX.barang + 2, currentY + 7.5);
      } else {
        doc.text(item.jenisBarang || "", colX.barang + 2, currentY + 5.5);
      }

      // Col 3: Banyaknya
      doc.setFont("times", "normal");
      const unitText = item.satuan ? `${item.banyaknya} ${item.satuan}` : `${item.banyaknya}`;
      doc.text(unitText, colX.banyaknya + colW.banyaknya / 2, currentY + 5.5, { align: "center" });

      // Col 4: Satuan
      const hrgNum = typeof item.hargaSatuan === "number" ? item.hargaSatuan : parseInt(String(item.hargaSatuan).replace(/\D/g, "")) || 0;
      doc.text(hrgNum.toLocaleString("id-ID"), colX.satuan + colW.satuan - 3, currentY + 5.5, { align: "right" });

      // Col 5: Jumlah
      const jmlNum = typeof item.jumlah === "number" ? item.jumlah : parseInt(String(item.jumlah).replace(/\D/g, "")) || (hrgNum * Number(item.banyaknya || 1));
      doc.text(jmlNum.toLocaleString("id-ID"), colX.jumlah + colW.jumlah - 3, currentY + 5.5, { align: "right" });
    }

    currentY += rowHeight;
  }

  // Bottom Summary Box (Jumlah Rp. | Rp  84,000)
  const summary2Y = table2Top + totalTableHeight;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("Jumlah Rp.", colX.satuan + colW.satuan / 2, summary2Y + 5, { align: "center" });

  const sumBox2H = 7.5;
  doc.setLineWidth(0.4);
  doc.rect(colX.jumlah, summary2Y, colW.jumlah, sumBox2H);
  doc.setLineWidth(0.15);
  doc.rect(colX.jumlah - 0.3, summary2Y - 0.3, colW.jumlah + 0.6, sumBox2H + 0.6);

  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  doc.text("Rp", colX.jumlah + 2.5, summary2Y + 5.2);
  doc.text(grandTotal.toLocaleString("id-ID"), colX.jumlah + colW.jumlah - 2.5, summary2Y + 5.2, { align: "right" });

  // 4. TANDA TANGAN FAKTUR PENGIRIMAN
  const sign2DateY = summary2Y + 16;
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text(`Gandrungmangu, ${tanggalFormatIndo}`, 155, sign2DateY, { align: "center" });

  const sign2TitleY = sign2DateY + 6;
  doc.text("Yang menerima", 55, sign2TitleY, { align: "center" });
  doc.text("Yang mengirim,", 155, sign2TitleY, { align: "center" });

  const sign2NameY = sign2TitleY + 23;
  const kadesName = (data.kepalaKecamatanNama || "ASMARUL FUADI").toUpperCase();
  const senderName = (data.namaPemilik || "DEDI").toUpperCase();

  doc.setFont("times", "bold");
  doc.text(kadesName, 55, sign2NameY, { align: "center" });
  const wKad = doc.getTextWidth(kadesName);
  doc.setLineWidth(0.3);
  doc.line(55 - wKad / 2, sign2NameY + 0.8, 55 + wKad / 2, sign2NameY + 0.8);

  doc.text(senderName, 155, sign2NameY, { align: "center" });
  const wSend = doc.getTextWidth(senderName);
  doc.line(155 - wSend / 2, sign2NameY + 0.8, 155 + wSend / 2, sign2NameY + 0.8);

  return doc.output("blob");
};

/**
 * GENERATE STRUK BELANJA KASIR (THERMAL 80MM)
 */
export const generateStrukBelanjaPDF = async (data: StrukBelanjaData): Promise<Blob> => {
  const validItems = data.items.filter(
    (it) => it.jenisBarang && it.jenisBarang.trim() !== ""
  );
  if (validItems.length === 0) {
    validItems.push({
      jenisBarang: "Belanja Barang",
      banyaknya: 1,
      satuan: "Pcs",
      hargaSatuan: 10000,
      jumlah: 10000,
    });
  }

  const grandTotal = validItems.reduce((acc, curr) => {
    const val = typeof curr.jumlah === "number" ? curr.jumlah : parseInt(String(curr.jumlah).replace(/\D/g, "")) || 0;
    return acc + val;
  }, 0);

  const totalQty = validItems.reduce((acc, curr) => {
    const q = typeof curr.banyaknya === "number" ? curr.banyaknya : parseFloat(String(curr.banyaknya)) || 1;
    return acc + q;
  }, 0);

  const payNom = data.bayarTunai ? (typeof data.bayarTunai === "number" ? data.bayarTunai : parseInt(String(data.bayarTunai).replace(/\D/g, "")) || grandTotal) : grandTotal;
  const changeNom = Math.max(0, payNom - grandTotal);

  // Dynamic Height based on item count
  const estimatedHeight = Math.max(140, 100 + validItems.length * 10);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, estimatedHeight],
  });

  const pageWidth = 80;
  const margin = 4;
  const contentWidth = pageWidth - margin * 2;
  let y = 7;

  // Header Toko
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  const tokoName = (data.namaToko || "MINIMARKET GANDRUNGMANGU JAYA").toUpperCase();
  doc.text(tokoName, pageWidth / 2, y, { align: "center" });
  y += 4.5;

  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  const addrLines = doc.splitTextToSize(data.alamatToko || "Kec. Gandrungmangu, Kab. Cilacap", contentWidth);
  addrLines.forEach((l: string) => {
    doc.text(l, pageWidth / 2, y, { align: "center" });
    y += 3.8;
  });

  if (data.noTelepon) {
    doc.text(`Telp: ${data.noTelepon}`, pageWidth / 2, y, { align: "center" });
    y += 3.8;
  }

  // Separator ganda
  const lineSeparator = "=".repeat(38);
  const dashedSeparator = "-".repeat(38);

  doc.setFontSize(7.5);
  doc.text(lineSeparator, pageWidth / 2, y, { align: "center" });
  y += 3.8;

  // Waktu dan Info Transaksi
  const pad = (n: string | number) => String(n).padStart(2, "0");
  const timeStr = `${pad(data.jam || "00")}:${pad(data.menit || "00")}:${pad(data.detik || "00")}`;
  const dateStr = data.tanggal ? format(new Date(data.tanggal), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy");
  const noStruk = data.noStruk || `TRX${dateStr.replace(/\//g, "")}-${pad(data.jam || "12")}${pad(data.menit || "00")}`;

  doc.text(`Tgl: ${dateStr} ${timeStr}`, margin, y);
  y += 3.5;
  doc.text(`No : ${noStruk}`, margin, y);
  y += 3.5;
  doc.text(`Kasir: ${data.namaKasir || "KASIR 01"}`, margin, y);
  y += 3.8;

  doc.text(dashedSeparator, pageWidth / 2, y, { align: "center" });
  y += 4;

  // Daftar Item
  validItems.forEach((it, idx) => {
    const qty = String(it.banyaknya || 1);
    const unit = it.satuan ? ` ${it.satuan}` : "";
    const hrg = typeof it.hargaSatuan === "number" ? it.hargaSatuan : parseInt(String(it.hargaSatuan).replace(/\D/g, "")) || 0;
    const sub = typeof it.jumlah === "number" ? it.jumlah : parseInt(String(it.jumlah).replace(/\D/g, "")) || (parseInt(qty) * hrg);

    // Baris 1: Nama Barang
    doc.setFont("courier", "bold");
    const nameLine = `${idx + 1}. ${(it.jenisBarang || "").toUpperCase()}`;
    const splitName = doc.splitTextToSize(nameLine, contentWidth);
    splitName.forEach((l: string) => {
      doc.text(l, margin, y);
      y += 3.5;
    });

    // Baris 2: Qty x Harga = Subtotal
    doc.setFont("courier", "normal");
    const qtyPrice = `   ${qty}${unit} x ${hrg.toLocaleString("id-ID")}`;
    const subStr = `Rp ${sub.toLocaleString("id-ID")}`;
    doc.text(qtyPrice, margin, y);
    doc.text(subStr, pageWidth - margin, y, { align: "right" });
    y += 4.2;
  });

  doc.text(dashedSeparator, pageWidth / 2, y, { align: "center" });
  y += 4;

  // Total & Pembayaran
  doc.setFont("courier", "bold");
  doc.setFontSize(8.5);
  doc.text("TOTAL BELANJA", margin, y);
  doc.text(`Rp ${grandTotal.toLocaleString("id-ID")}`, pageWidth - margin, y, { align: "right" });
  y += 4.5;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.text("TUNAI / CASH", margin, y);
  doc.text(`Rp ${payNom.toLocaleString("id-ID")}`, pageWidth - margin, y, { align: "right" });
  y += 4;

  doc.text("KEMBALI", margin, y);
  doc.text(`Rp ${changeNom.toLocaleString("id-ID")}`, pageWidth - margin, y, { align: "right" });
  y += 4;

  doc.text(`TOTAL ITEM : ${totalQty} Qty`, margin, y);
  y += 4;

  doc.setFontSize(7.5);
  doc.text(lineSeparator, pageWidth / 2, y, { align: "center" });
  y += 4.5;

  // Footer Struk
  doc.setFont("courier", "bold");
  doc.text("TERIMA KASIH ATAS KUNJUNGAN ANDA", pageWidth / 2, y, { align: "center" });
  y += 3.8;
  doc.setFont("courier", "normal");
  doc.setFontSize(6.8);
  doc.text("Barang yang sudah dibeli", pageWidth / 2, y, { align: "center" });
  y += 3.2;
  doc.text("tidak dapat ditukar/dikembalikan", pageWidth / 2, y, { align: "center" });

  return doc.output("blob");
};
