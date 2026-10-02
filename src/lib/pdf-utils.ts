
import { jsPDF } from "jspdf"
import { format, getDate, getMonth, getYear, addMinutes as dateAddMinutes } from "date-fns"
import { id as localeID } from "date-fns/locale"

const LOGO_CILACAP_FALLBACK = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lambang_Kabupaten_Cilacap.png/120px-Lambang_Kabupaten_Cilacap.png";

export const CAMAT_INFO = {
  jabatan: "CAMAT GANDRUNGMANGU",
  nama: "FATHAN ADY CHANDRA, S.STP., M.M.",
  pangkat: "Pembina Tingkat I",
  nip: "NIP. 19810509 199912 1 001",
};

export const getRomanMonth = (dateStr: string) => {
  if (!dateStr) return "I";
  const month = new Date(dateStr).getMonth() + 1
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]
  return roman[month - 1]
}

/**
 * Konversi angka menjadi teks terbilang bahasa Indonesia.
 * Mendukung ribuan, jutaan, hingga miliaran.
 */
export const terbilang = (n: number): string => {
  if (n === 0) return "nol";
  const satuan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  let temp = "";
  if (n < 12) {
    temp = " " + satuan[n];
  } else if (n < 20) {
    temp = terbilang(n - 10) + " belas";
  } else if (n < 100) {
    temp = terbilang(Math.floor(n / 10)) + " puluh";
    if (n % 10 !== 0) temp += " " + terbilang(n % 10);
  } else if (n < 200) {
    temp = " seratus";
    if (n - 100 !== 0) temp += " " + terbilang(n - 100);
  } else if (n < 1000) {
    temp = terbilang(Math.floor(n / 100)) + " ratus";
    if (n % 100 !== 0) temp += " " + terbilang(n % 100);
  } else if (n < 2000) {
    temp = " seribu";
    if (n - 1000 !== 0) temp += " " + terbilang(n - 1000);
  } else if (n < 1000000) {
    temp = terbilang(Math.floor(n / 1000)) + " ribu";
    if (n % 1000 !== 0) temp += " " + terbilang(n % 1000);
  } else if (n < 1000000000) {
    temp = terbilang(Math.floor(n / 1000000)) + " juta";
    if (n % 1000000 !== 0) temp += " " + terbilang(n % 1000000);
  } else if (n < 1000000000000) {
    temp = terbilang(Math.floor(n / 1000000000)) + " miliar";
    if (n % 1000000000 !== 0) temp += " " + terbilang(n % 1000000000);
  }
  return temp.trim();
};

const hitungLamaHari = (mulai: string, selesai: string): number => {
  const start = new Date(mulai);
  const end = new Date(selesai);
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((utcEnd - utcStart) / (1000 * 60 * 60 * 24)) + 1;
};

export const loadImage = (url: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export const addKopSuratSync = (doc: jsPDF, img: HTMLImageElement | null, margin: number, pageWidth: number) => {
  if (img) {
    try {
      doc.addImage(img, 'PNG', margin, 10, 18, 22);
    } catch (e) {
      console.error("PDF Logo Error:", e);
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PEMERINTAH KABUPATEN CILACAP", pageWidth / 2 + 10, 14, { align: "center" });
  doc.setFontSize(18);
  doc.text("KECAMATAN GANDRUNGMANGU", pageWidth / 2 + 10, 21, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Jalan Pertiwi No.01 Gandrungmangu, Gandrungmangu, Cilacap, Jawa Tengah 53254", pageWidth / 2 + 10, 26.5, { align: "center" });
  doc.text("Telepon. (0280) 5265001, Faksimile (0280) 5265001, Laman : gandrungmangu.cilacapkab.go.id", pageWidth / 2 + 10, 31, { align: "center" });
  doc.text("Pos - el : kecamatan.gandrungmangu2020@gmail.com", pageWidth / 2 + 10, 35.5, { align: "center" });
  doc.setLineWidth(0.8);
  doc.line(margin, 39.5, pageWidth - margin, 39.5);
  doc.setLineWidth(0.2);
  doc.line(margin, 40.5, pageWidth - margin, 40.5);
}

export const formatTanggalSurat = (startDate: Date, endDate?: Date) => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  const startDay = format(start, "d", { locale: localeID });
  const startMonthYear = format(start, "MMMM yyyy", { locale: localeID });
  if (!end || start.toDateString() === end.toDateString()) {
    return `pada tanggal ${format(start, "d MMMM yyyy", { locale: localeID })}`;
  }
  const endDay = format(end, "d", { locale: localeID });
  const endMonthYear = format(end, "MMMM yyyy", { locale: localeID });
  if (start.getMonth() !== end.getMonth() || start.getFullYear() !== end.getFullYear()) {
    return `pada tanggal ${startDay} ${format(start, "MMMM", { locale: localeID })} s.d ${format(end, "d MMMM yyyy", { locale: localeID })}`;
  }
  return `pada tanggal ${startDay} s.d ${endDay} ${startMonthYear}`;
};

const formatDateIndo = (dateStr: string) => {
  if (!dateStr || dateStr === "-" || dateStr === "") return "-";
  try {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    return format(dateObj, "d MMMM yyyy", { locale: localeID });
  } catch (e) {
    return dateStr;
  }
};

export const formatWaktuSurat = (timeStr?: string): string => {
  if (!timeStr || typeof timeStr !== "string" || timeStr.trim() === "" || timeStr === "-") {
    return "Pukul 08.00 WIB s.d selesai";
  }
  const clean = timeStr.trim();

  // Jika sudah lengkap diawali dengan 'Pukul'
  if (clean.toLowerCase().startsWith("pukul")) {
    return clean.replace(/(\d{1,2}):(\d{2})/g, "$1.$2");
  }

  // Standarkan pemisah jam titik dua menjadi titik (misal 08:00 -> 08.00)
  const dotTime = clean.replace(/(\d{1,2}):(\d{2})/g, "$1.$2");

  if (dotTime.toLowerCase().includes("wib")) {
    if (dotTime.toLowerCase().includes("selesai") || dotTime.includes("-")) {
      return `Pukul ${dotTime}`;
    }
    return `Pukul ${dotTime} s.d selesai`;
  }

  return `Pukul ${dotTime} WIB s.d selesai`;
};

export const generateNotulenPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  const labelWidth = 30;
  const valueStartX = margin + labelWidth + 3;
  const valueWidth = contentWidth - labelWidth - 3;
  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);
  addKopSuratSync(doc, logoImg, margin, pageWidth);
  const displayDate = formatDateIndo(values.date);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("NOTA DINAS", pageWidth / 2, 60, { align: "center" });
  doc.setFontSize(11);
  let currentY = 75;
  const addLabeledRow = (label: string, text: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, currentY);
    doc.text(":", margin + labelWidth, currentY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text || "-", valueWidth);
    lines.forEach((line: string, i: number) => {
      doc.text(line, valueStartX, currentY + (i * 5));
    });
    currentY += Math.max(lines.length * 5, 5) + 2;
  };
  addLabeledRow("Kegiatan", values.title);
  addLabeledRow("Tanggal", displayDate);
  addLabeledRow("Waktu", formatWaktuSurat(values.time));
  addLabeledRow("Tempat", values.location);
  doc.setLineWidth(0.1);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const descriptionText = values.description || "(Belum ada isi ringkasan)";
  const paragraphs = descriptionText.split('\n').filter((p: string) => p.trim() !== '');
  const lineHeightFactor = 1.15;
  paragraphs.forEach((para: string) => {
    const lines = doc.splitTextToSize(para, contentWidth);
    const textBlockHeight = doc.getTextDimensions(lines, { maxWidth: contentWidth }).h * lineHeightFactor;
    if (currentY + textBlockHeight > pageHeight - 50) {
      doc.addPage();
      addKopSuratSync(doc, logoImg, margin, pageWidth);
      currentY = 40;
    }
    doc.text(lines, margin, currentY, { align: "justify", maxWidth: contentWidth, lineHeightFactor: lineHeightFactor });
    currentY += textBlockHeight + 4;
  });
  const signatureBlockHeight = 40;
  if (currentY + signatureBlockHeight > pageHeight - margin) {
    doc.addPage();
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    currentY = 40;
  }
  const signatureName = values.officialName?.split(" - ")[0]?.toUpperCase() || "PELAKSANA KEGIATAN";
  const signatureX = pageWidth - margin - 50;
  const signatureY = currentY + 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Notulis", signatureX, signatureY, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(signatureName, signatureX, signatureY + 22, { align: "center" });
  const nameWidth = doc.getTextWidth(signatureName);
  doc.line(signatureX - (nameWidth / 2), signatureY + 23, signatureX + (nameWidth / 2), signatureY + 23);
  return doc.output("blob");
}

export const generateBASTPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  const d = new Date(values.date);
  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);
  addKopSuratSync(doc, logoImg, margin, pageWidth);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const titleY = 56;
  const titleText = [
    "BERITA ACARA SERAH TERIMA 100 % PEKERJAAN PELAKSANA KEGIATAN",
    "ANGGARAN KEPADA PEMEGANG KEKUASAAN PENGELOLAAN KEUANGAN Kecamatan"
  ];
  doc.text(titleText[0], pageWidth / 2, titleY, { align: "center" });
  doc.text(titleText[1], pageWidth / 2, titleY + 5, { align: "center" });
  const numY = titleY + 15;
  const numText = `Nomor : ..... / BA / ${getRomanMonth(values.date)} / ${getYear(d)}`;
  doc.text(numText, pageWidth / 2, numY, { align: "center" });
  const textWidth = doc.getTextWidth(numText);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - textWidth / 2, numY + 1, pageWidth / 2 + textWidth / 2, numY + 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const openingY = numY + 12;
  const openingText = `Pada hari ini ${format(d, "EEEE", { locale: localeID })} tanggal ${terbilang(getDate(d))} bulan ${format(d, "MMMM", { locale: localeID })} tahun ${terbilang(getYear(d))} bertempat di Kecamatan Gandrungmangu, kami yang bertanda tangan dibawah ini :`;
  const splitOpening = doc.splitTextToSize(openingText, contentWidth);
  doc.text(splitOpening, margin, openingY, { align: "justify", maxWidth: contentWidth });
  let currentY = openingY + (splitOpening.length * 5) + 6;
  const labelWidth = 25;
  const dotX = margin + labelWidth + 5;
  const addIdentitas = (num: string, name: string, job: string, role: string) => {
    doc.setFont("helvetica", "normal");
    doc.text(num, margin, currentY);
    doc.text("Nama", margin + 8, currentY);
    doc.text(":", dotX, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(name.toUpperCase(), dotX + 3, currentY);
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.text("Jabatan", margin + 8, currentY);
    doc.text(":", dotX, currentY);
    doc.text(job, dotX + 3, currentY);
    currentY += 6;
    doc.text("Alamat", margin + 8, currentY);
    doc.text(":", dotX, currentY);
    const alamatFull = `Kecamatan Gandrungmangu Kecamatan Gandrungmangu yang selanjutnya disebut ${role}`;
    const splitAlamat = doc.splitTextToSize(alamatFull, contentWidth - labelWidth - 15);
    doc.text(splitAlamat, dotX + 3, currentY);
    currentY += (splitAlamat.length * 5) + 4;
  };
  const officialName = values.officialName?.split(" - ")[0] || "PETUGAS";
  const officialJob = values.officialName?.split(" - ")[1] || "Karyawan Kecamatan";
  addIdentitas("I", officialName, `Pelaksana Kegiatan Anggaran (${officialJob})`, "PIHAK KESATU");
  addIdentitas("II", "FATHAN ADY CHANDRA, S.STP., M.M.", "Pemegang Kekuasaan Pengelolaan Keuangan Kecamatan", "PIHAK KEDUA");
  currentY += 2;
  const midText = "Dengan ini menyatakan bahwa PIHAK KESATU telah menyerahkan barang/pekerjaan kepada PIHAK KEDUA dan PIHAK KEDUA telah menerima barang/pekerjaan dari PIHAK KESATU berupa :";
  const splitMid = doc.splitTextToSize(midText, contentWidth);
  doc.text(splitMid, margin, currentY, { align: "justify", maxWidth: contentWidth });
  currentY += (splitMid.length * 5) + 8;
  const colW = [12, 105, 30, 33];
  const tableHeaders = ["NO", "NAMA KEGIATAN", "VOLUME", "TTD"];
  const headerH = 10;
  const rowH = 20;
  doc.setFont("helvetica", "bold");
  let hX = margin;
  tableHeaders.forEach((h, i) => {
    doc.rect(hX, currentY, colW[i], headerH);
    doc.text(h, hX + colW[i] / 2, currentY + 6.5, { align: "center" });
    hX += colW[i];
  });
  currentY += headerH;
  doc.setFont("helvetica", "normal");
  let rX = margin;
  doc.rect(rX, currentY, colW[0], rowH);
  doc.text("1", rX + colW[0] / 2, currentY + rowH / 2 + 1.5, { align: "center" });
  rX += colW[0];
  doc.rect(rX, currentY, colW[1], rowH);
  const splitKegiatan = doc.splitTextToSize(values.title || "-", colW[1] - 6);
  doc.text(splitKegiatan, rX + 3, currentY + (rowH / 2) - ((splitKegiatan.length - 1) * 2.5) + 1);
  rX += colW[1];
  doc.rect(rX, currentY, colW[2], rowH);
  doc.text("1 Kegiatan", rX + colW[2] / 2, currentY + rowH / 2 + 1.5, { align: "center" });
  rX += colW[2];
  doc.rect(rX, currentY, colW[3], rowH);
  currentY += rowH + 15;
  doc.text(`Gandrungmangu, ${format(d, "d MMMM yyyy", { locale: localeID })}`, pageWidth - margin, currentY, { align: "right" });
  const signY = currentY + 10;
  doc.setFont("helvetica", "bold");
  doc.text("PIHAK KEDUA", margin + 35, signY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text("Pemegang Kekuasaan", margin + 35, signY + 5, { align: "center" });
  doc.text("Pengelolaan Keuangan Kecamatan", margin + 35, signY + 10, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text("PIHAK KESATU", pageWidth - margin - 35, signY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text("Pelaksana Kegiatan Anggaran", pageWidth - margin - 35, signY + 5, { align: "center" });
  const nameY = signY + 32;
  doc.setFont("helvetica", "bold");
  doc.text("FATHAN ADY CHANDRA, S.STP., M.M.", margin + 35, nameY, { align: "center" });
  const w1 = doc.getTextWidth("FATHAN ADY CHANDRA, S.STP., M.M.");
  doc.line(margin + 35 - w1 / 2, nameY + 1, margin + 35 + w1 / 2, nameY + 1);
  doc.setFont("helvetica", "normal");
  doc.text("Pembina Tingkat I", margin + 35, nameY + 5, { align: "center" });
  doc.text("NIP. 19810509 199912 1 001", margin + 35, nameY + 9.5, { align: "center" });
  const sigName = officialName.toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.text(sigName, pageWidth - margin - 35, nameY, { align: "center" });
  const w2 = doc.getTextWidth(sigName);
  doc.line(pageWidth - margin - 35 - w2 / 2, nameY + 1, pageWidth - margin - 35 + w2 / 2, nameY + 1);
  return doc.output("blob");
}

export const generateDokumentasiPDF = async (values: any, sectionTitle: string, files: File[], logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);
  const addPageHeader = () => {
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("LAPORAN DOKUMENTASI", pageWidth / 2, 52, { align: "center" });
    doc.setFontSize(12);
    doc.text(sectionTitle.toUpperCase(), pageWidth / 2, 58, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("RINCIAN KEGIATAN", margin, 68);
    doc.setFont("helvetica", "normal");
    doc.text("Kegiatan", margin, 74);
    doc.text(":", margin + 25, 74);
    doc.text(values.title || "-", margin + 28, 74);
    doc.text("Tanggal", margin, 80);
    doc.text(":", margin + 25, 80);
    doc.text(formatDateIndo(values.date), margin + 28, 80);
    doc.text("Waktu", margin, 86);
    doc.text(":", margin + 25, 86);
    doc.text(formatWaktuSurat(values.time), margin + 28, 86);
    doc.text("Tempat", margin, 92);
    doc.text(":", margin + 25, 92);
    doc.text(values.location || "-", margin + 28, 92);
    doc.setLineWidth(0.1);
    doc.line(margin, 96, pageWidth - margin, 96);
    return 104;
  };
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };
  let currentY = addPageHeader();
  for (let f = 0; f < files.length; f++) {
    const file = files[f];
    const base64 = await fileToBase64(file);
    const imgProps = doc.getImageProperties(base64);
    const imgWidth = contentWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    if (currentY + imgHeight > pageHeight - 20) {
      doc.addPage();
      currentY = addPageHeader();
    }
    doc.addImage(base64, 'JPEG', margin, currentY, imgWidth, imgHeight);
    currentY += imgHeight + 10;
  }
  return doc.output("blob");
}

export const generateSiltapPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);

  const colW = [10, 40, 55, 25, 40];
  const rowH = 12;
  const headers = ["NO", "NAMA", "JABATAN", "NOMINAL", "TTD"];

  const drawHeader = (startY: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    let hX = margin;
    headers.forEach((h, i) => {
      doc.rect(hX, startY, colW[i], 10);
      doc.text(h, hX + colW[i] / 2, startY + 6.5, { align: "center" });
      hX += colW[i];
    });
    return startY + 10;
  }

  addKopSuratSync(doc, logoImg, margin, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(values.title.toUpperCase(), pageWidth / 2, 56, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Bulan : ${values.month}`, margin, 66);

  let currentY = 71;
  currentY = drawHeader(currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  let totalSiltap = 0;
  const totalItems = values.data.length;
  const signatureSpace = 65;

  values.data.forEach((item: any, i: number) => {
    totalSiltap += (item.nominal || 0);
    const splitJabatan = doc.splitTextToSize(item.jabatan || "", colW[2] - 4);
    const splitNama = doc.splitTextToSize(item.name || "", colW[1] - 4);
    const itemHeight = Math.max(rowH, splitJabatan.length * 5 + 4, splitNama.length * 5 + 4);

    const remainingRows = totalItems - i;
    const neededSpaceForRemainder = (remainingRows * itemHeight) + signatureSpace;
    const spaceLeft = pageHeight - currentY;

    if (remainingRows <= 3 && spaceLeft < neededSpaceForRemainder) {
      doc.addPage();
      addKopSuratSync(doc, logoImg, margin, pageWidth);
      currentY = 40;
      currentY = drawHeader(currentY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }
    else if (currentY + itemHeight > pageHeight - 20) {
      doc.addPage();
      addKopSuratSync(doc, logoImg, margin, pageWidth);
      currentY = 40;
      currentY = drawHeader(currentY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }

    const startY = currentY;
    let rX = margin;

    doc.rect(rX, startY, colW[0], itemHeight);
    doc.text((i + 1).toString(), rX + colW[0] / 2, startY + (itemHeight / 2) + 1.5, { align: "center" });
    rX += colW[0];

    doc.rect(rX, startY, colW[1], itemHeight);
    doc.text(splitNama, rX + 2, startY + 5);
    rX += colW[1];

    doc.rect(rX, startY, colW[2], itemHeight);
    doc.text(splitJabatan, rX + 2, startY + 5);
    rX += colW[2];

    doc.rect(rX, startY, colW[3], itemHeight);
    doc.text((item.nominal || 0).toLocaleString('id-ID'), rX + colW[3] - 2, startY + (itemHeight / 2) + 1.5, { align: "right" });
    rX += colW[3];

    doc.rect(rX, startY, colW[4], itemHeight);
    const signX = (i % 2 === 0) ? rX + 3 : rX + (colW[4] / 2);
    doc.setFontSize(8);
    doc.text(`${i + 1}. .......`, signX, startY + (itemHeight / 2) + 1);
    doc.setFontSize(10);

    currentY += itemHeight;
  });

  // BARIS TOTAL
  const totalH = 10;
  if (currentY + totalH > pageHeight - 20) {
    doc.addPage();
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    currentY = 40;
    currentY = drawHeader(currentY);
  }

  const startTotalY = currentY;
  const totalLabelW = colW[0] + colW[1] + colW[2];
  doc.setFont("helvetica", "bold");
  doc.rect(margin, startTotalY, totalLabelW, totalH);
  doc.text("TOTAL", margin + totalLabelW / 2, startTotalY + 6.5, { align: "center" });

  doc.rect(margin + totalLabelW, startTotalY, colW[3], totalH);
  doc.text(totalSiltap.toLocaleString('id-ID'), margin + totalLabelW + colW[3] - 2, startTotalY + 6.5, { align: "right" });

  doc.rect(margin + totalLabelW + colW[3], startTotalY, colW[4], totalH);
  currentY += totalH;

  if (currentY > pageHeight - 65) {
    doc.addPage();
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    currentY = 40;
  }

  currentY += 15;
  const sigX = pageWidth - margin - 65;
  doc.setFont("helvetica", "normal");
  doc.text(`Gandrungmangu, ${formatDateIndo(values.date)}`, sigX, currentY);
  doc.setFont("helvetica", "bold");
  doc.text("CAMAT GANDRUNGMANGU", sigX, currentY + 6);
  currentY += 25;
  doc.text("FATHAN ADY CHANDRA, S.STP., M.M.", sigX, currentY);
  const nW = doc.getTextWidth("FATHAN ADY CHANDRA, S.STP., M.M.");
  doc.line(sigX, currentY + 1, sigX + nW, currentY + 1);
  doc.setFont("helvetica", "normal");
  doc.text("Pembina Tingkat I", sigX, currentY + 5);
  doc.text("NIP. 19810509 199912 1 001", sigX, currentY + 9.5);

  return doc.output("blob");
}

export const generateInsentifPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 15;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);
  const nom = parseInt(values.nominal) || 0;
  const taxPercent = parseInt(values.tax) || 0;
  const taxVal = Math.round(nom * (taxPercent / 100));
  const netVal = nom - taxVal;

  addKopSuratSync(doc, logoImg, margin, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`TANDA TERIMA INSENTIF ${values.category.toUpperCase()}`, pageWidth / 2, 56, { align: "center" });

  let currentY = 66;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Bulan : ${values.month}`, margin, currentY);
  currentY += 5;

  const colW = [10, 40, 40, 22, 18, 22, 28];
  const rowH = 10;
  const headers = ["NO", "NAMA", "JABATAN", "NOMINAL", "PAJAK", "DITERIMA", "TTD"];

  const drawHeader = (startY: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    let hX = margin;
    headers.forEach((h, i) => {
      doc.rect(hX, startY, colW[i], 10);
      doc.text(h, hX + colW[i] / 2, startY + 6.5, { align: "center" });
      hX += colW[i];
    });
    return startY + 10;
  }

  currentY = drawHeader(currentY);

  const kuota = values.jumlahOrang || 0;
  const totalItems = kuota;
  const signatureSpace = 65;

  let currentNominalTotal = 0;
  let currentTaxTotal = 0;
  let currentNetTotal = 0;

  for (let i = 0; i < totalItems; i++) {
    const p = values.participants?.[i] || { name: "", position: "" };

    if (p.name) {
      currentNominalTotal += nom;
      currentTaxTotal += taxVal;
      currentNetTotal += netVal;
    }

    const remainingRows = totalItems - i;
    const neededSpaceForRemainder = (remainingRows * rowH) + signatureSpace;
    const spaceLeft = pageHeight - currentY;

    if (remainingRows <= 3 && spaceLeft < neededSpaceForRemainder) {
      doc.addPage();
      addKopSuratSync(doc, logoImg, margin, pageWidth);
      currentY = 40;
      currentY = drawHeader(currentY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }
    else if (currentY + rowH > pageHeight - 20) {
      doc.addPage();
      addKopSuratSync(doc, logoImg, margin, pageWidth);
      currentY = 40;
      currentY = drawHeader(currentY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }

    let rX = margin;
    colW.forEach((w) => { doc.rect(rX, currentY, w, rowH); rX += w; });

    let cX = margin;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text((i + 1).toString(), cX + colW[0] / 2, currentY + 6.5, { align: "center" });
    cX += colW[0];

    doc.setFontSize(8);
    doc.text((p.name || "").toUpperCase(), cX + 2, currentY + 6.5, { maxWidth: colW[1] - 4 });
    cX += colW[1];
    doc.text((p.position || "").toUpperCase(), cX + 2, currentY + 6.5, { maxWidth: colW[2] - 4 });
    cX += colW[2];

    doc.setFontSize(9);
    if (p.name) {
      doc.text(nom.toLocaleString('id-ID'), cX + colW[3] - 2, currentY + 6.5, { align: "right" });
      cX += colW[3];
      doc.text(taxVal.toLocaleString('id-ID'), cX + colW[4] - 2, currentY + 6.5, { align: "right" });
      cX += colW[4];
      doc.text(netVal.toLocaleString('id-ID'), cX + colW[5] - 2, currentY + 6.5, { align: "right" });
      cX += colW[5];
    } else {
      cX += colW[3] + colW[4] + colW[5];
    }

    doc.setFontSize(8);
    const signX = (i % 2 === 0) ? cX + 2 : cX + (colW[6] / 2);
    doc.text(`${i + 1}. .......`, signX, currentY + 6.5);
    currentY += rowH;
  }

  // BARIS TOTAL UNTUK INSENTIF
  const totalH = 10;
  if (currentY + totalH > pageHeight - 20) {
    doc.addPage();
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    currentY = 40;
    currentY = drawHeader(currentY);
  }

  const startTotalY = currentY;
  const totalLabelW = colW[0] + colW[1] + colW[2];
  doc.setFont("helvetica", "bold");
  doc.rect(margin, startTotalY, totalLabelW, totalH);
  doc.text("TOTAL", margin + totalLabelW / 2, startTotalY + 6.5, { align: "center" });

  let totalCX = margin + totalLabelW;
  doc.rect(totalCX, startTotalY, colW[3], totalH);
  doc.text(currentNominalTotal.toLocaleString('id-ID'), totalCX + colW[3] - 2, startTotalY + 6.5, { align: "right" });
  totalCX += colW[3];

  doc.rect(totalCX, startTotalY, colW[4], totalH);
  doc.text(currentTaxTotal.toLocaleString('id-ID'), totalCX + colW[4] - 2, startTotalY + 6.5, { align: "right" });
  totalCX += colW[4];

  doc.rect(totalCX, startTotalY, colW[5], totalH);
  doc.text(currentNetTotal.toLocaleString('id-ID'), totalCX + colW[5] - 2, startTotalY + 6.5, { align: "right" });
  totalCX += colW[5];

  doc.rect(totalCX, startTotalY, colW[6], totalH);
  currentY += totalH;

  if (currentY > pageHeight - 65) {
    doc.addPage();
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    currentY = 40;
  }

  currentY += 15;
  const sigX = pageWidth - margin - 65;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Gandrungmangu, ${formatDateIndo(values.date)}`, sigX, currentY);
  doc.setFont("helvetica", "bold");
  doc.text("CAMAT GANDRUNGMANGU", sigX, currentY + 6);
  currentY += 25;
  doc.text("FATHAN ADY CHANDRA, S.STP., M.M.", sigX, currentY);
  const nW = doc.getTextWidth("FATHAN ADY CHANDRA, S.STP., M.M.");
  doc.line(sigX, currentY + 1, sigX + nW, currentY + 1);
  doc.setFont("helvetica", "normal");
  doc.text("Pembina Tingkat I", sigX, currentY + 5);
  doc.text("NIP. 19810509 199912 1 001", sigX, currentY + 9.5);
  return doc.output("blob");
}

export const generateHonorNarasumberPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const d = values.date ? new Date(values.date) : new Date();
  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);
  addKopSuratSync(doc, logoImg, margin, pageWidth);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const docHeading = (values.docTitle || "TANDA TERIMA HONORARIUM NARASUMBER").toUpperCase();
  doc.text(docHeading, pageWidth / 2, 56, { align: "center" });
  let currentY = 66;
  doc.setFontSize(10);
  const addHeaderRow = (label: string, text: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, currentY);
    doc.text(":", margin + 30, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(text || "-", margin + 33, currentY);
    currentY += 6;
  };
  addHeaderRow("Kegiatan", values.title);
  addHeaderRow("Hari / Tanggal", format(d, "EEEE, d MMMM yyyy", { locale: localeID }));
  addHeaderRow("Waktu", formatWaktuSurat(values.time));
  addHeaderRow("Tempat", values.location || "Balai Kecamatan Gandrungmangu");
  currentY += 4;
  const colW = [8, 40, 36, 24, 18, 24, 30];
  const headers = ["NO", "NAMA", "JABATAN", "HONOR", "PAJAK", "DITERIMA", "TANDA TANGAN"];
  const drawHeader = (startY: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    let hX = margin;
    headers.forEach((h, i) => {
      doc.rect(hX, startY, colW[i], 10);
      doc.text(h, hX + colW[i] / 2, startY + 6.5, { align: "center" });
      hX += colW[i];
    });
    return startY + 10;
  };
  currentY = drawHeader(currentY);
  doc.setFont("helvetica", "normal");
  const totalNarsum = values.narsum.length;
  values.narsum.forEach((item: any, i: number) => {
    const nom = parseInt(item.nominal) || 0;
    const taxPercent = parseInt(item.tax) || 0;
    const taxVal = Math.round(nom * (taxPercent / 100));
    const netVal = nom - taxVal;
    const splitName = doc.splitTextToSize((item.name || "").toUpperCase(), colW[1] - 4);
    const splitPos = doc.splitTextToSize((item.position || "").toUpperCase(), colW[2] - 4);
    const itemHeight = Math.max(12, splitName.length * 5 + 4, splitPos.length * 5 + 4);
    const isLast = i === totalNarsum - 1;
    const threshold = isLast ? pageHeight - 65 : pageHeight - 20;
    if (currentY + itemHeight > threshold) {
      doc.addPage();
      addKopSuratSync(doc, logoImg, margin, pageWidth);
      currentY = 40;
      currentY = drawHeader(currentY);
      doc.setFont("helvetica", "normal");
    }
    let cX = margin;
    doc.rect(cX, currentY, colW[0], itemHeight);
    doc.setFontSize(9);
    doc.text((i + 1).toString(), cX + colW[0] / 2, currentY + itemHeight / 2 + 1.5, { align: "center" });
    cX += colW[0];
    doc.rect(cX, currentY, colW[1], itemHeight);
    const nameOffsetY = currentY + (itemHeight - (splitName.length - 1) * 4) / 2 + 1.5;
    doc.text(splitName, cX + 2, nameOffsetY);
    cX += colW[1];
    doc.rect(cX, currentY, colW[2], itemHeight);
    const posOffsetY = currentY + (itemHeight - (splitPos.length - 1) * 4) / 2 + 1.5;
    doc.text(splitPos, cX + 2, posOffsetY);
    cX += colW[2];
    doc.rect(cX, currentY, colW[3], itemHeight);
    doc.setFontSize(8.5);
    doc.text(`Rp. ${nom.toLocaleString('id-ID')}`, cX + colW[3] / 2, currentY + itemHeight / 2 + 1.5, { align: "center" });
    cX += colW[3];
    doc.rect(cX, currentY, colW[4], itemHeight);
    doc.text(`Rp. ${taxVal.toLocaleString('id-ID')}`, cX + colW[4] / 2, currentY + itemHeight / 2 + 1.5, { align: "center" });
    cX += colW[4];
    doc.rect(cX, currentY, colW[5], itemHeight);
    doc.text(`Rp. ${netVal.toLocaleString('id-ID')}`, cX + colW[5] / 2, currentY + itemHeight / 2 + 1.5, { align: "center" });
    cX += colW[5];
    doc.rect(cX, currentY, colW[6], itemHeight);
    const isOdd = (i % 2 === 0);
    const signX = isOdd ? cX + 2 : cX + (colW[6] / 2);
    doc.setFontSize(8);
    doc.text(`${i + 1}. ....................`, signX, currentY + itemHeight / 2 + 1);
    doc.setFontSize(9);
    currentY += itemHeight;
  });
  if (currentY > pageHeight - 65) {
    doc.addPage();
    addKopSuratSync(doc, logoImg, margin, pageWidth);
    currentY = 40;
  }
  currentY += 15;
  const sigX = pageWidth - margin - 65;
  doc.text(`Gandrungmangu, ${formatDateIndo(values.date)}`, sigX, currentY);
  doc.setFont("helvetica", "bold");
  doc.text("CAMAT GANDRUNGMANGU", sigX, currentY + 6);
  currentY += 25;
  doc.text("FATHAN ADY CHANDRA, S.STP., M.M.", sigX, currentY);
  const nW = doc.getTextWidth("FATHAN ADY CHANDRA, S.STP., M.M.");
  doc.line(sigX, currentY + 1, sigX + nW, currentY + 1);
  doc.setFont("helvetica", "normal");
  doc.text("Pembina Tingkat I", sigX, currentY + 5);
  doc.text("NIP. 19810509 199912 1 001", sigX, currentY + 9.5);
  return doc.output("blob");
}

export const generateHonorKegiatanPDF = generateHonorNarasumberPDF;

export const generateSuratTugasPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const d = values.startDate ? new Date(values.startDate) : new Date();
  let currentY = 75;
  const logoSource = logoBase64 && logoBase64.length > 50 && logoBase64.startsWith("data:image") ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);
  const ensurePageSpace = (neededHeight = 20) => {
    if (currentY + neededHeight > pageHeight - margin) {
      doc.addPage();
      currentY = 25;
      addHeader(true);
    }
  };
  const parsePerson = (value?: string) => {
    if (!value) return { name: "-", job: "-" };
    const parts = value.split(" - ").map((v) => v.trim());
    return { name: parts[0] || "-", job: parts[1] || "-" };
  };
  const addHeader = (isNewPage = false) => {
    if (!isNewPage) {
      addKopSuratSync(doc, logoImg, margin, pageWidth);
      currentY = 56;
    } else {
      currentY = 25;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("SURAT TUGAS", pageWidth / 2, currentY, { align: "center" });
    currentY += 5;
    const nomorSurat = values.letterNumber || ".....";
    doc.setFontSize(11);
    doc.text(`Nomor : ${nomorSurat}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 14;
  };
  const drawDasar = () => {
    ensurePageSpace(40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Dasar", margin, currentY);
    doc.text(":", margin + 25, currentY);
    const numberX = margin + 28;
    const textX = margin + 35;
    const textWidth = pageWidth - textX - margin;
    const items = values.dasar ? values.dasar.split("\n").filter(Boolean) : [
      "Peraturan Bupati Cilacap Nomor 2 Tahun 2024 tentang Perjalanan Dinas.",
      "Peraturan Kecamatan Gandrungmangu nomor 07 tahun 2025 tentang Anggaran Pendapatan dan Belanja Kecamatan (APBDes) Tahun Anggaran 2026.",
    ];
    items.forEach((item: string, index: number) => {
      ensurePageSpace(20);
      const lines = doc.splitTextToSize(item, textWidth);
      doc.text(`${index + 1}.`, numberX, currentY);
      doc.text(lines, textX, currentY, { align: "justify", maxWidth: textWidth, lineHeightFactor: 1.5 });
      currentY += lines.length * 6;
    });
    currentY += 6;
    doc.setFont("helvetica", "bold");
    doc.text("MEMERINTAHKAN:", pageWidth / 2, currentY, { align: "center" });
    currentY += 10;
  };
  const drawKepada = () => {
    ensurePageSpace(30);
    doc.setFont("helvetica", "normal");
    doc.text("Kepada", margin, currentY);
    doc.text(":", margin + 25, currentY);
    const renderPerson = (index: number, person: any) => {
      const numberX = margin + 28;
      const labelX = margin + 34;
      const colonX = margin + 60;
      const valueX = margin + 63;
      doc.setFont("helvetica", "normal");
      doc.text(`${index}.`, numberX, currentY);
      doc.text("Nama", labelX, currentY);
      doc.text(":", colonX, currentY);
      doc.setFont("helvetica", "bold");
      doc.text(String(person.name || "-").toUpperCase(), valueX, currentY);
      currentY += 6;
      doc.setFont("helvetica", "normal");
      doc.text("Jabatan", labelX, currentY);
      doc.text(":", colonX, currentY);
      doc.text(String(person.job || "-"), valueX, currentY);
      currentY += 8;
    };
    const official = parsePerson(values.officialName);
    renderPerson(1, official);
    const companions = (values.companions || "").split("\n").filter(Boolean);
    companions.forEach((item: string, i: number) => {
      const person = parsePerson(item);
      renderPerson(i + 2, person);
    });
    currentY += 4;
  };
  const drawUntuk = () => {
    ensurePageSpace(50);
    doc.setFont("helvetica", "normal");
    doc.text("Untuk", margin, currentY);
    doc.text(":", margin + 25, currentY);
    const numberX = margin + 28;
    const textX = margin + 35;
    const textWidth = pageWidth - textX - margin;
    const kegiatanDate = formatTanggalSurat(values.startDate, values.endDate);
    const items = [
      `Melaksanakan tugas dalam rangka ${values.description || "-"} ${kegiatanDate} di ${values.destination || "-"}.`,
      "Melaksanakan tugas dengan penuh rasa tanggungjawab sesuai dengan peraturan perundang-undangan yang berlaku;",
      "Melaporkan hasilnya setelah melaksanakan tugas;",
      "Surat ini digunakan untuk melengkapi administrasi pertanggungjawaban keuangan perjalanan dinas.",
    ];
    items.forEach((item, index) => {
      ensurePageSpace(20);
      const lines = doc.splitTextToSize(item, textWidth);
      doc.text(`${index + 1}.`, numberX, currentY);
      doc.text(lines, textX, currentY, { align: "justify", maxWidth: textWidth, lineHeightFactor: 1.5 });
      currentY += lines.length * 6;
    });
    currentY += 4;
  };
  const drawSignature = () => {
    ensurePageSpace(45);
    const sigX = pageWidth - margin - 65;
    doc.setFont("helvetica", "normal");
    doc.text(`Gandrungmangu, ${format(d, "d MMMM yyyy", { locale: localeID })}`, sigX, currentY);
    doc.setFont("helvetica", "bold");
    doc.text("CAMAT GANDRUNGMANGU", sigX, currentY + 6);
    currentY += 28;
    doc.text("FATHAN ADY CHANDRA, S.STP., M.M.", sigX, currentY);
    const width = doc.getTextWidth("FATHAN ADY CHANDRA, S.STP., M.M.");
    doc.line(sigX, currentY + 1, sigX + width, currentY + 1);
    doc.setFont("helvetica", "normal");
    doc.text("Pembina Tingkat I", sigX, currentY + 5);
    doc.text("NIP. 19810509 199912 1 001", sigX, currentY + 9.5);
  };
  addHeader();
  drawDasar();
  drawKepada();
  drawUntuk();
  drawSignature();
  return doc.output("blob");
};

export const generateSPPDPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  const d = values.startDate ? new Date(values.startDate) : new Date();
  const midX = pageWidth / 2;
  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);
  addKopSuratSync(doc, logoImg, margin, pageWidth);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const topInfoY = 46;
  doc.text("Lembar ke", pageWidth - 70, topInfoY);
  doc.text(":", pageWidth - 45, topInfoY);
  doc.text("Kode No", pageWidth - 70, topInfoY + 4);
  doc.text(":", pageWidth - 45, topInfoY + 4);
  doc.text("Nomor", pageWidth - 70, topInfoY + 8);
  doc.text(":", pageWidth - 45, topInfoY + 8);
  doc.text(values.documentNumber || "-", pageWidth - 42, topInfoY + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("SURAT PERJALANAN DINAS (SPD)", pageWidth / 2, 65, { align: "center" });
  let currentY = 72;
  const col1W = 8;
  const col2W = 80;
  const col3W = contentWidth - col1W - col2W;
  const rowH = 7;
  const addRow = (no: string, label: string, val: string) => {
    const splitVal = doc.splitTextToSize(val || "-", col3W - 4);
    const splitLabel = doc.splitTextToSize(label || "-", col2W - 4);
    const lineHeight = 4.5;
    const textHeight = Math.max(splitVal.length, splitLabel.length) * lineHeight;
    const h = Math.max(rowH, textHeight + 4);
    doc.rect(margin, currentY, col1W, h);
    doc.text(no, margin + 2, currentY + 4);
    doc.rect(margin + col1W, currentY, col2W, h);
    doc.text(splitLabel, margin + col1W + 2, currentY + 4);
    doc.rect(margin + col1W + col2W, currentY, col3W, h);
    doc.text(splitVal, margin + col1W + col2W + 2, currentY + 4);
    currentY += h;
  };
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const officialName = (values.officialName || "PERSONEL").split(' - ')[0].toUpperCase();
  const officialJob = (values.officialName || "JABATAN").split(' - ')[1] || "Karyawan Kecamatan";
  const lamaHari = hitungLamaHari(values.startDate, values.endDate);
  addRow("1", "Pejabat berwenang yang memberi perintah", "CAMAT GANDRUNGMANGU");
  addRow("2", "Nama / NIP Pegawai yang diperintah", officialName);
  addRow("3", "a. Pangkat dan Golongan", "-");
  addRow("", "b. Jabatan / Instansi", officialJob);
  addRow("", "c. Tingkat Biaya Perjalanan Dinas", "-");
  addRow("4", "Maksud Perjalanan Dinas", values.description || "-");
  addRow("5", "Alat angkut yang dipergunakan", "Kendaraan Pribadi / Umum");
  addRow("6", "a. Tempat Berangkat", "Kecamatan Gandrungmangu");
  addRow("", "b. Tempat Tujuan", values.destination || "-");
  addRow("7", "a. Lamanya perjalanan dinas", `${lamaHari} (${terbilang(lamaHari)}) hari`);
  addRow("", "b. Tanggal berangkat", formatDateIndo(values.startDate));
  addRow("", "c. Tanggal harus kembali", formatDateIndo(values.endDate));
  addRow("8", "Pengikut: Nama", values.companions ? values.companions.split('\n').join(', ') : "-");
  addRow("9", "Pembebanan Anggaran", "APBDes Kecamatan Gandrungmangu 2026");
  addRow("", "a. Instansi", "Pemerintah Kecamatan Gandrungmangu");
  addRow("", "b. Akun", "Belanja Perjalanan Dinas");
  addRow("10", "Keterangan Lain-lain", "-");
  currentY += 15;
  const sigX = pageWidth - margin - 65;
  doc.text(`Dikeluarkan di : Gandrungmangu`, sigX, currentY);
  doc.text(`Pada Tanggal   : ${format(d, "d MMMM yyyy", { locale: localeID })}`, sigX, currentY + 5);
  doc.setFont("helvetica", "bold");
  doc.text("CAMAT GANDRUNGMANGU", sigX, currentY + 12);
  currentY += 32;
  doc.text("FATHAN ADY CHANDRA, S.STP., M.M.", sigX, currentY);
  const nW = doc.getTextWidth("FATHAN ADY CHANDRA, S.STP., M.M.");
  doc.line(sigX, currentY + 1, sigX + nW, currentY + 1);
  doc.setFont("helvetica", "normal");
  doc.text("Pembina Tingkat I", sigX, currentY + 5);
  doc.text("NIP. 19810509 199912 1 001", sigX, currentY + 9.5);
  doc.addPage();
  currentY = margin;
  const colW2 = (pageWidth - (margin * 2)) / 2;
  const rowH2 = 48;
  doc.setLineWidth(0.2);
  doc.rect(margin, margin, pageWidth - (margin * 2), rowH2 * 4 + 10 + 30);
  doc.line(midX, margin, midX, margin + (rowH2 * 4));
  for (let i = 1; i <= 4; i++) {
    doc.line(margin, margin + (rowH2 * i), pageWidth - margin, margin + (rowH2 * i));
  }
  doc.line(margin, margin + (rowH2 * 4) + 10, pageWidth - margin, margin + (rowH2 * 4) + 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("I.", midX + 2, margin + 5);
  doc.text("Berangkat dari : Kecamatan Gandrungmangu", midX + 7, margin + 5);
  doc.text("(Tempat Kedudukan)", midX + 7, margin + 9);
  doc.text("Ke", midX + 7, margin + 14);
  doc.text(":", midX + 28, margin + 14);
  doc.text(values.destination || "-", midX + 31, margin + 14);
  doc.text("Pada tanggal", midX + 7, margin + 19);
  doc.text(":", midX + 28, margin + 19);
  doc.text(formatDateIndo(values.startDate), midX + 31, margin + 19);
  doc.setFont("helvetica", "bold");
  doc.text("CAMAT GANDRUNGMANGU", midX + colW2 / 2, margin + 23, { align: "center" });
  doc.text("FATHAN ADY CHANDRA, S.STP., M.M.", midX + colW2 / 2, margin + 35, { align: "center" });
  const wH1 = doc.getTextWidth("FATHAN ADY CHANDRA, S.STP., M.M.");
  doc.line(midX + colW2 / 2 - wH1 / 2, margin + 36, midX + colW2 / 2 + wH1 / 2, margin + 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Pembina Tingkat I", midX + colW2 / 2, margin + 40, { align: "center" });
  doc.text("NIP. 19810509 199912 1 001", midX + colW2 / 2, margin + 44, { align: "center" });
  doc.setFontSize(9);
  const noX = margin + 2;
  const labelX = margin + 6;
  const dotX = margin + 28;
  const valueX = margin + 32;
  const rNoX = midX + 2;
  const rLabelX = midX + 6;
  const rDotX = midX + 28;
  const rValueX = midX + 32;
  let y2 = margin + rowH2;
  doc.text("II.", noX, y2 + 5);
  doc.text("Tiba di", labelX, y2 + 5);
  doc.text(":", dotX, y2 + 5);
  doc.text(values.destination || "-", valueX, y2 + 5);
  doc.text("Pada tanggal", labelX, y2 + 10);
  doc.text(":", dotX, y2 + 10);
  doc.text(formatDateIndo(values.startDate), valueX, y2 + 10);
  doc.text("Berangkat dari", rLabelX, y2 + 5);
  doc.text(":", rDotX, y2 + 5);
  doc.text("Kecamatan Gandrungmangu", rValueX, y2 + 5);
  doc.text("Ke", rLabelX, y2 + 10);
  doc.text(":", rDotX, y2 + 10);
  doc.text(values.destination || "-", rValueX, y2 + 10);
  doc.text("Pada tanggal", rLabelX, y2 + 15);
  doc.text(":", rDotX, y2 + 15);
  doc.text(formatDateIndo(values.endDate), rValueX, y2 + 15);
  y2 += rowH2;
  doc.text("III.", noX, y2 + 5);
  doc.text("Tiba di", labelX, y2 + 5);
  doc.text(":", dotX, y2 + 5);
  doc.text("", valueX, y2 + 5);
  doc.text("Pada tanggal", labelX, y2 + 10);
  doc.text(":", dotX, y2 + 10);
  doc.text("", valueX, y2 + 10);
  doc.text("Berangkat dari", rLabelX, y2 + 5);
  doc.text(":", rDotX, y2 + 5);
  doc.text("", rValueX, y2 + 5);
  doc.text("Ke", rLabelX, y2 + 10);
  doc.text(":", rDotX, y2 + 10);
  doc.text("", rValueX, y2 + 10);
  doc.text("Pada tanggal", rLabelX, y2 + 15);
  doc.text(":", rDotX, y2 + 15);
  doc.text("", rValueX, y2 + 15);
  y2 += rowH2;
  const ivNoX = margin + 2;
  const ivLabelX = margin + 6;
  const ivDotX = margin + 28;
  const ivValueX = margin + 32;
  doc.text("IV.", ivNoX, y2 + 5);
  doc.text("Tiba kembali di", ivLabelX, y2 + 5);
  doc.text(":", ivDotX, y2 + 5);
  doc.text("Kecamatan Gandrungmangu", ivValueX, y2 + 5);
  doc.setFontSize(8);
  doc.text("(Tempat Kedudukan)", ivValueX, y2 + 9);
  doc.setFontSize(9);
  doc.text("Pada tanggal", ivLabelX, y2 + 15);
  doc.text(":", ivDotX, y2 + 15);
  doc.text(formatDateIndo(values.endDate), ivValueX, y2 + 15);
  doc.setFont("helvetica", "bold");
  doc.text("CAMAT GANDRUNGMANGU", margin + colW2 / 2, y2 + 23, { align: "center" });
  doc.text("FATHAN ADY CHANDRA, S.STP., M.M.", margin + colW2 / 2, y2 + 35, { align: "center" });
  const wH2 = doc.getTextWidth("FATHAN ADY CHANDRA, S.STP., M.M.");
  doc.line(margin + colW2 / 2 - wH2 / 2, y2 + 36, margin + colW2 / 2 + wH2 / 2, y2 + 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Pembina Tingkat I", margin + colW2 / 2, y2 + 40, { align: "center" });
  doc.text("NIP. 19810509 199912 1 001", margin + colW2 / 2, y2 + 44, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const verifyText = "Telah diperiksa with keterangan bahwa perjalanan tersebut di atas benar-benar dilakukan atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.";
  const splitVerify = doc.splitTextToSize(verifyText, colW2 - 10);
  doc.text(splitVerify, midX + 5, y2 + 5, { align: "justify", maxWidth: colW2 - 10, lineHeightFactor: 1.15 });
  y2 += rowH2;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("V. CATATAN LAIN-LAIN", margin + 2, y2 + 7);
  y2 += 10;
  doc.text("VI. PERHATIAN", margin + 2, y2 + 5);
  doc.setFontSize(9);
  const attentionText = "Pejabat yang berwenang menerbitkan SPPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat/tiba, serta bendaharawan pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila Negara menderita rugi akibat kesalahan, kelalaian dan kealpaannya.";
  const splitAttention = doc.splitTextToSize(attentionText, pageWidth - (margin * 2) - 10);
  doc.text(splitAttention, margin + 5, y2 + 10, { align: "justify", maxWidth: pageWidth - (margin * 2) - 10, lineHeightFactor: 1.15 });
  return doc.output("blob");
}

export const generateRAPDF = async (values: any, logoBase64?: string | null): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
  const logoImg = await loadImage(logoSource);

  addKopSuratSync(doc, logoImg, margin, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RUNDOWN KEGIATAN", pageWidth / 2, 56, { align: "center" });

  let currentY = 70;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Nama Kegiatan :", margin, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(values.title || "-", margin + 35, currentY);
  currentY += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Hari/Tanggal     :", margin, currentY);
  doc.setFont("helvetica", "normal");
  // Update format: Kamis, 04 Juni 2026
  const displayDate = values.date ? format(new Date(values.date), "EEEE, dd MMMM yyyy", { locale: localeID }) : "-";
  doc.text(displayDate, margin + 35, currentY);
  currentY += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Waktu                 :", margin, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(formatWaktuSurat(values.time), margin + 35, currentY);
  currentY += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Tempat             :", margin, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(values.location || "-", margin + 35, currentY);
  currentY += 10;

  // Table Configuration
  const colW = [12, 45, 113];
  const rowH = 10;
  const headers = ["No", "Waktu", "Uraian Kegiatan"];

  doc.setFont("helvetica", "bold");
  let hX = margin;
  headers.forEach((h, i) => {
    doc.rect(hX, currentY, colW[i], rowH);
    doc.text(h, hX + colW[i] / 2, currentY + 6.5, { align: "center" });
    hX += colW[i];
  });
  currentY += rowH;

  // Rundown Calculation Logic
  const startTime = values.time || "08:00";
  const [h, m] = startTime.split(':').map(Number);
  let baseDate = new Date();
  baseDate.setHours(h || 8, m || 0, 0, 0);

  const formatT = (d: Date) => format(d, "HH.mm");

  const items = [
    { label: "Registrasi Peserta", duration: 30 },
    { label: "Pembukaan", duration: 30 },
    { label: "Doa dan Menyanyikan Lagu Indonesia Raya", duration: 15 },
    { label: "Sambutan-sambutan", duration: 45 },
    { label: "Pelaksanaan Kegiatan Inti", duration: 60 },
    { label: "Diskusi dan Tanya Jawab", duration: 30 },
    { label: "Penutup", duration: 30 },
    { label: "Selesai", duration: 0 }
  ];

  doc.setFont("helvetica", "normal");
  items.forEach((item, i) => {
    let rX = margin;
    const start = formatT(baseDate);

    if (item.duration > 0) {
      const nextDate = dateAddMinutes(baseDate, item.duration);
      const range = `${start} – ${formatT(nextDate)}`;

      doc.rect(rX, currentY, colW[0], rowH);
      doc.text((i + 1).toString(), rX + colW[0] / 2, currentY + 6.5, { align: "center" });
      rX += colW[0];

      doc.rect(rX, currentY, colW[1], rowH);
      doc.text(range, rX + colW[1] / 2, currentY + 6.5, { align: "center" });
      rX += colW[1];

      doc.rect(rX, currentY, colW[2], rowH);
      doc.text(item.label, rX + 3, currentY + 6.5);

      baseDate = nextDate;
    } else {
      // Last row (Selesai)
      doc.rect(rX, currentY, colW[0], rowH);
      doc.text((i + 1).toString(), rX + colW[0] / 2, currentY + 6.5, { align: "center" });
      rX += colW[0];

      doc.rect(rX, currentY, colW[1], rowH);
      doc.text(start, rX + colW[1] / 2, currentY + 6.5, { align: "center" });
      rX += colW[1];

      doc.rect(rX, currentY, colW[2], rowH);
      doc.text(item.label, rX + 3, currentY + 6.5);
    }

    currentY += rowH;
  });

  return doc.output("blob");
}
