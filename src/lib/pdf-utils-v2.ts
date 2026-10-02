
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { addKopSuratSync, loadImage, formatWaktuSurat } from "./pdf-utils";

const LOGO_CILACAP_FALLBACK = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lambang_Kabupaten_Cilacap.png/120px-Lambang_Kabupaten_Cilacap.png";

interface Participant {
    name: string;
    jabatan: string;
    category?: string;
    gender?: string;
    lp?: string;
    jenisKelamin?: string;
    [key: string]: any;
}

interface PDFData {
    kegiatan: string;
    tanggal: string;
    participants: Participant[];
    nominal?: string;
    tax?: string;
    mainTitle?: string;
    location?: string;
    time?: string;
    quota?: number;
}

export const generateDaftarHadirPDF = async (values: PDFData, logoBase64?: string | null): Promise<Blob> => {
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);
    const d = values.tanggal ? new Date(values.tanggal) : new Date();

    const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
    const logoImg = await loadImage(logoSource);

    addKopSuratSync(doc, logoImg, margin, pageWidth);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(values.mainTitle || "DAFTAR HADIR", pageWidth / 2, 56, { align: "center" });

    let currentY = 68;
    doc.setFontSize(11);

    const addHeaderDetail = (label: string, text: string) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, currentY);
        doc.text(":", margin + 35, currentY);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(text || "-", contentWidth - 38);
        doc.text(lines, margin + 38, currentY);
        currentY += (lines.length * 6) + 1;
    }

    addHeaderDetail("Kegiatan", values.kegiatan);
    addHeaderDetail("Hari / Tanggal", format(d, "EEEE, d MMMM yyyy", { locale: localeID }));
    addHeaderDetail("Waktu", formatWaktuSurat(values.time));
    addHeaderDetail("Tempat", values.location || "Balai Kecamatan Gandrungmangu");

    currentY += 8;
    // Lebar kolom total: 180mm (pageWidth 210 - margin 2x15)
    // NO: 10, NAMA: 62, L/P: 10, JABATAN: 66, TTD: 32
    const colW = [10, 62, 10, 66, 32];
    const headerHeight = 10;
    const tableHeaders = ["NO", "NAMA", "L/P", "JABATAN", "TTD"];

    const tableFontSize = 9;
    const lineSpacing = 3.8;
    const fontCapHeight = 2.4;
    const minRowHeight = 11;
    const verticalPadding = 5.2;

    const drawTableHeader = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        let hX = margin;
        tableHeaders.forEach((header, i) => {
            doc.rect(hX, currentY, colW[i], headerHeight);
            doc.text(header, hX + colW[i] / 2, currentY + (headerHeight / 2) + 1.2, { align: "center" });
            hX += colW[i];
        });
        currentY += headerHeight;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(tableFontSize);
    };

    const getRankWeight = (jabatan?: string) => {
        const j = (jabatan || "").toUpperCase().trim();
        if (!j) return 999;
        if (
            (j === "CAMAT" || j.startsWith("CAMAT") || j.includes("CAMAT GANDRUNGMANGU") || j.includes("PLT. CAMAT") || j.includes("PJ. CAMAT")) &&
            !j.includes("SEKRETARIS") && !j.includes("SEKCAM") && !j.includes("AJUDAN") && !j.includes("PENGEMUDI") && !j.includes("SOPIR") && !j.includes("DRIVER") && !j.includes("STAF")
        ) return 1;
        if (j.includes("SEKRETARIS KECAMATAN") || j.includes("SEKCAM") || j.includes("SEKRETARIS")) return 2;
        if ((j.startsWith("KASI ") || j === "KASI" || j.includes("KASI ") || j.includes("KEPALA SEKSI")) && !j.includes("KASUBBAG") && !j.includes("KASUBAG")) return 3;
        if (j.includes("KASUBBAG") || j.includes("KASUBAG") || j.includes("KEPALA SUB BAGIAN") || j.includes("KEPALA SUBBAGIAN") || j.includes("KEPALA SUB")) return 4;
        return 10;
    };

    // Urutkan participants: Camat, Sekretaris, Kasi, Kasubbag, lalu staf/lainnya
    const sortedParticipants = [...values.participants].sort((a, b) => {
        const hasNameA = Boolean(a && a.name && a.name.trim() !== "");
        const hasNameB = Boolean(b && b.name && b.name.trim() !== "");
        if (!hasNameA && !hasNameB) return 0;
        if (!hasNameA) return 1;
        if (!hasNameB) return -1;
        const wA = getRankWeight(a.jabatan);
        const wB = getRankWeight(b.jabatan);
        if (wA !== wB) return wA - wB;
        return (a.name || "").localeCompare(b.name || "");
    });

    drawTableHeader();

    for (let i = 0; i < sortedParticipants.length; i++) {
        const p = sortedParticipants[i];

        doc.setFont("helvetica", "normal");
        doc.setFontSize(tableFontSize);

        const nameLines: string[] = doc.splitTextToSize((p.name || "").toUpperCase(), colW[1] - 4);
        const positionLines: string[] = doc.splitTextToSize((p.jabatan || "").toUpperCase(), colW[3] - 4);
        const maxLines = Math.max(nameLines.length, positionLines.length, 1);
        const textBlockHeight = (maxLines - 1) * lineSpacing + fontCapHeight;
        const rowHeight = Math.max(minRowHeight, textBlockHeight + verticalPadding);

        if (currentY + rowHeight > pageHeight - 20) {
            doc.addPage();
            addKopSuratSync(doc, logoImg, margin, pageWidth);
            currentY = 40;
            drawTableHeader();
            doc.setFont("helvetica", "normal");
            doc.setFontSize(tableFontSize);
        }

        const startY = currentY;
        let rX = margin;
        colW.forEach(w => {
            doc.rect(rX, startY, w, rowHeight);
            rX += w;
        });

        // Helper render teks presisi di tengah-tengah kolom secara vertikal
        const renderCenteredLines = (lines: string[], x: number, align: "left" | "center" = "left") => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(tableFontSize);
            const n = Math.max(lines.length, 1);
            const blockH = (n - 1) * lineSpacing + fontCapHeight;
            const topY = startY + (rowHeight - blockH) / 2;
            const firstBaseline = topY + fontCapHeight - 0.2;
            for (let k = 0; k < lines.length; k++) {
                doc.text(lines[k], x, firstBaseline + (k * lineSpacing), { align });
            }
        };

        let cX = margin;

        // NO
        renderCenteredLines([(i + 1).toString()], cX + colW[0] / 2, "center");
        cX += colW[0];

        // NAMA
        renderCenteredLines(nameLines, cX + 2, "left");
        cX += colW[1];

        // L/P
        const rawLp = String(
            p.gender ||
            p.lp ||
            p.jenisKelamin ||
            p["Jenis Kelamin"] ||
            p["jenis kelamin"] ||
            p.jk ||
            ""
        ).trim().toUpperCase();
        let displayLp = "";
        if (rawLp === "L" || rawLp.startsWith("LAKI") || rawLp === "PRIA" || rawLp === "MALE" || rawLp === "M") {
            displayLp = "L";
        } else if (rawLp === "P" || rawLp.startsWith("PEREMPUAN") || rawLp.startsWith("WANITA") || rawLp === "FEMALE" || rawLp === "F") {
            displayLp = "P";
        } else if (rawLp.startsWith("L")) {
            displayLp = "L";
        } else if (rawLp.startsWith("P")) {
            displayLp = "P";
        } else {
            displayLp = rawLp;
        }
        renderCenteredLines([displayLp], cX + colW[2] / 2, "center");
        cX += colW[2];

        // JABATAN
        renderCenteredLines(positionLines, cX + 2, "left");
        cX += colW[3];

        // TTD
        const signX = (i % 2 === 0) ? cX + 2 : cX + (colW[4] / 2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const signY = startY + (rowHeight / 2) + 1.0;
        doc.text(`${i + 1}. .......`, signX, signY);

        currentY += rowHeight;
    }

    if (currentY > pageHeight - 65) {
        doc.addPage();
        addKopSuratSync(doc, logoImg, margin, pageWidth);
        currentY = 40;
    }

    currentY += 15;
    const sigX = pageWidth - margin - 65;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Gandrungmangu, ${format(d, "d MMMM yyyy", { locale: localeID })}`, sigX, currentY);
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

export const generateDaftarHadirPesertaPDF = async (values: PDFData, logoBase64?: string | null): Promise<Blob> => {
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);
    const d = values.tanggal ? new Date(values.tanggal) : new Date();

    const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
    const logoImg = await loadImage(logoSource);

    addKopSuratSync(doc, logoImg, margin, pageWidth);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(values.mainTitle || "DAFTAR HADIR PESERTA", pageWidth / 2, 56, { align: "center" });

    let currentY = 68;
    doc.setFontSize(11);

    const addHeaderDetail = (label: string, text: string) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, currentY);
        doc.text(":", margin + 35, currentY);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(text || "-", contentWidth - 38);
        doc.text(lines, margin + 38, currentY);
        currentY += (lines.length * 6) + 1;
    }

    addHeaderDetail("Kegiatan", values.kegiatan);
    addHeaderDetail("Hari / Tanggal", format(d, "EEEE, d MMMM yyyy", { locale: localeID }));
    addHeaderDetail("Waktu", formatWaktuSurat(values.time));
    addHeaderDetail("Tempat", values.location || "Balai Kecamatan Gandrungmangu");

    currentY += 8;
    const colW = [10, 75, 63, 32]; // NO, NAMA PESERTA, ALAMAT, TTD
    const headerHeight = 10;
    const tableHeaders = ["NO", "NAMA PESERTA", "ALAMAT", "TTD"];

    const tableFontSize = 9;
    const lineSpacing = 3.8;
    const fontCapHeight = 2.4;
    const minRowHeight = 10;
    const verticalPadding = 5.2;

    const drawTableHeader = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        let hX = margin;
        tableHeaders.forEach((header, i) => {
            doc.rect(hX, currentY, colW[i], headerHeight);
            doc.text(header, hX + colW[i] / 2, currentY + (headerHeight / 2) + 1.2, { align: "center" });
            hX += colW[i];
        });
        currentY += headerHeight;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(tableFontSize);
    };

    drawTableHeader();

    const quota = values.quota || 30;
    const totalItems = Math.max(values.participants.length, quota);

    for (let i = 0; i < totalItems; i++) {
        const p = values.participants[i] || { name: "", jabatan: "" };

        doc.setFont("helvetica", "normal");
        doc.setFontSize(tableFontSize);

        const nameLines: string[] = doc.splitTextToSize((p.name || "").toUpperCase(), colW[1] - 4);
        const addressLines: string[] = doc.splitTextToSize((p.jabatan || "").toUpperCase(), colW[2] - 4);
        const maxLines = Math.max(nameLines.length, addressLines.length, 1);
        const textBlockHeight = (maxLines - 1) * lineSpacing + fontCapHeight;
        const rowHeight = Math.max(minRowHeight, textBlockHeight + verticalPadding);

        if (currentY + rowHeight > pageHeight - 20) {
            doc.addPage();
            addKopSuratSync(doc, logoImg, margin, pageWidth);
            currentY = 40;
            drawTableHeader();
            doc.setFont("helvetica", "normal");
            doc.setFontSize(tableFontSize);
        }

        const startY = currentY;
        let rX = margin;
        colW.forEach(w => {
            doc.rect(rX, startY, w, rowHeight);
            rX += w;
        });

        const renderCenteredLines = (lines: string[], x: number, align: "left" | "center" = "left") => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(tableFontSize);
            const n = Math.max(lines.length, 1);
            const blockH = (n - 1) * lineSpacing + fontCapHeight;
            const topY = startY + (rowHeight - blockH) / 2;
            const firstBaseline = topY + fontCapHeight - 0.2;
            for (let k = 0; k < lines.length; k++) {
                doc.text(lines[k], x, firstBaseline + (k * lineSpacing), { align });
            }
        };

        let cX = margin;

        // NO
        renderCenteredLines([(i + 1).toString()], cX + colW[0] / 2, "center");
        cX += colW[0];

        // NAMA
        renderCenteredLines(nameLines, cX + 2, "left");
        cX += colW[1];

        // ALAMAT
        renderCenteredLines(addressLines, cX + 2, "left");
        cX += colW[2];

        // TTD
        const signX = (i % 2 === 0) ? cX + 2 : cX + (colW[3] / 2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const signY = startY + (rowHeight / 2) + 1.0;
        doc.text(`${i + 1}. .......`, signX, signY);

        currentY += rowHeight;
    }

    if (currentY > pageHeight - 65) {
        doc.addPage();
        addKopSuratSync(doc, logoImg, margin, pageWidth);
        currentY = 40;
    }

    currentY += 15;
    const sigX = pageWidth - margin - 65;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Gandrungmangu, ${format(d, "d MMMM yyyy", { locale: localeID })}`, sigX, currentY);
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

export const generateDaftarHadirBalitaPDF = async (values: PDFData, logoBase64?: string | null): Promise<Blob> => {
    return generateDaftarHadirPesertaPDF(values, logoBase64);
}

export const generateUangSakuPDF = async (values: PDFData, logoBase64?: string | null): Promise<Blob> => {
    const doc = new jsPDF();
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const d = values.tanggal ? new Date(values.tanggal) : new Date();

    const logoSource = (logoBase64 && logoBase64.length > 50 && logoBase64.startsWith('data:image')) ? logoBase64 : LOGO_CILACAP_FALLBACK;
    const logoImg = await loadImage(logoSource);

    const nom = parseInt(values.nominal || "0") || 100000;
    const taxPercent = parseInt(values.tax || "0") || 0;
    const taxVal = Math.round(nom * (taxPercent / 100));
    const netVal = nom - taxVal;

    const colW = [8, 35, 35, 22, 18, 22, 45];
    const baseRowHeight = 12;
    const headers = ["NO", "NAMA", "JABATAN", "NOMINAL", "PAJAK", "DITERIMA", "TTD"];

    let currentY = 0;

    const drawTableHeader = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        let hX = margin;
        headers.forEach((h, i) => {
            doc.rect(hX, currentY, colW[i], 10);
            doc.text(h, hX + colW[i] / 2, currentY + 6.5, { align: "center" });
            hX += colW[i];
        });
        currentY += 10;
    };

    addKopSuratSync(doc, logoImg, margin, pageWidth);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("TANDA TERIMA UANG SAKU PESERTA", pageWidth / 2, 56, { align: "center" });
    currentY = 66;

    doc.setFontSize(10);
    const addHeaderRow = (label: string, text: string) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, currentY);
        doc.text(":", margin + 30, currentY);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(text || "-", pageWidth - margin - (margin + 33));
        doc.text(lines, margin + 33, currentY);
        currentY += (lines.length * 6);
    };
    addHeaderRow("Kegiatan", values.kegiatan);
    addHeaderRow(
        "Hari / Tanggal",
        format(d, "EEEE, d MMMM yyyy", { locale: localeID })
    );
    addHeaderRow("Waktu", formatWaktuSurat(values.time));
    addHeaderRow("Tempat", values.location || "Balai Kecamatan Gandrungmangu");
    currentY += 4;
    drawTableHeader();

    for (let i = 0; i < values.participants.length; i++) {
        const p = values.participants[i];
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const nameText = (p.name || "").toUpperCase();
        const maxNameWidth = colW[1] - 4;
        const nameLines = doc.splitTextToSize(nameText, maxNameWidth);
        const positionText = (p.jabatan || "").toUpperCase();
        const maxPositionWidth = colW[2] - 4;
        const positionLines = doc.splitTextToSize(positionText, maxPositionWidth);

        const lineHeight = 4;
        const verticalPadding = 6;
        const lineCount = Math.max(nameLines.length, positionLines.length, 1);
        const rowHeight = Math.max(baseRowHeight, (lineCount * lineHeight) + verticalPadding);

        if (currentY + rowHeight > pageHeight - 20) {
            doc.addPage();
            addKopSuratSync(doc, logoImg, margin, pageWidth);
            currentY = 50;
            drawTableHeader();
        }
        const startY = currentY;
        let rX = margin;
        colW.forEach((w) => {
            doc.rect(rX, startY, w, rowHeight);
            rX += w;
        });

        let cX = margin;
        const centerY = startY + (rowHeight / 2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text((i + 1).toString(), cX + (colW[0] / 2), centerY, { align: "center", baseline: "middle" });
        cX += colW[0];

        doc.setFontSize(8);
        doc.text(nameLines, cX + 2, centerY - ((nameLines.length - 1) * lineHeight / 2), { baseline: "middle" });
        cX += colW[1];

        doc.text(positionLines, cX + 2, centerY - ((positionLines.length - 1) * lineHeight / 2), { baseline: "middle" });
        cX += colW[2];

        doc.setFontSize(9);
        doc.text(nom.toLocaleString("id-ID"), cX + colW[3] - 2, centerY, { align: "right", baseline: "middle" });
        doc.text(taxVal.toLocaleString("id-ID"), cX + colW[3] + colW[4] - 2, centerY, { align: "right", baseline: "middle" });
        doc.text(netVal.toLocaleString("id-ID"), cX + colW[3] + colW[4] + colW[5] - 2, centerY, { align: "right", baseline: "middle" });

        cX += colW[3] + colW[4] + colW[5];
        const signX = (i % 2 === 0) ? cX + 3 : cX + (colW[6] / 2);
        doc.text(`${i + 1}. .......`, signX, centerY, { baseline: "middle" });
        currentY += rowHeight;
    }

    const totalPeserta = values.participants.length;
    const totalNominal = nom * totalPeserta;
    const totalPajak = taxVal * totalPeserta;
    const totalDiterima = netVal * totalPeserta;
    const totalHeight = 10;
    const mergeWidth = colW[0] + colW[1] + colW[2];

    if (currentY + totalHeight > pageHeight - 20) {
        doc.addPage();
        addKopSuratSync(doc, logoImg, margin, pageWidth);
        currentY = 50;
        drawTableHeader();
    }

    doc.setFont("helvetica", "bold");
    doc.rect(margin, currentY, mergeWidth, totalHeight);
    doc.text("TOTAL", margin + (mergeWidth / 2), currentY + (totalHeight / 2), { align: "center", baseline: "middle" });

    doc.rect(margin + mergeWidth, currentY, colW[3], totalHeight);
    doc.text(totalNominal.toLocaleString("id-ID"), margin + mergeWidth + colW[3] - 2, currentY + (totalHeight / 2), { align: "right", baseline: "middle" });

    doc.rect(margin + mergeWidth + colW[3], currentY, colW[4], totalHeight);
    doc.text(totalPajak.toLocaleString("id-ID"), margin + mergeWidth + colW[3] + colW[4] - 2, currentY + (totalHeight / 2), { align: "right", baseline: "middle" });

    doc.rect(margin + mergeWidth + colW[3] + colW[4], currentY, colW[5], totalHeight);
    doc.text(totalDiterima.toLocaleString("id-ID"), margin + mergeWidth + colW[3] + colW[4] + colW[5] - 2, currentY + (totalHeight / 2), { align: "right", baseline: "middle" });

    doc.rect(margin + mergeWidth + colW[3] + colW[4] + colW[5], currentY, colW[6], totalHeight);

    currentY += totalHeight + 10;
    const sigX = pageWidth - 70;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Gandrungmangu, ${format(d, "d MMMM yyyy", { locale: localeID })}`, sigX, currentY);
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
