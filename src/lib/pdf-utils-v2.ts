
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { addKopSuratSync, loadImage, formatWaktuSurat } from "./pdf-utils";

const LOGO_CILACAP_FALLBACK = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lambang_Kabupaten_Cilacap.png/120px-Lambang_Kabupaten_Cilacap.png";

interface Participant {
    name: string;
    jabatan: string;
    category: string;
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
    const colW = [12, 75, 55, 38];
    const baseRowHeight = 12;
    const tableHeaders = ["NO", "NAMA", "JABATAN", "TTD"];

    const drawTableHeader = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        let hX = margin;
        tableHeaders.forEach((header, i) => {
            doc.rect(hX, currentY, colW[i], 12);
            doc.text(header, hX + colW[i] / 2, currentY + 8, { align: "center" });
            hX += colW[i];
        });
        currentY += 12;
    };

    drawTableHeader();

    for (let i = 0; i < values.participants.length; i++) {
        const p = values.participants[i];

        const nameLines = doc.splitTextToSize((p.name || "").toUpperCase(), colW[1] - 4);
        const positionLines = doc.splitTextToSize((p.jabatan || "").toUpperCase(), colW[2] - 4);
        const lineCount = Math.max(nameLines.length, positionLines.length, 1);
        const rowHeight = Math.max(baseRowHeight, (lineCount * 5) + 2);

        if (currentY + rowHeight > pageHeight - 20) {
            doc.addPage();
            addKopSuratSync(doc, logoImg, margin, pageWidth);
            currentY = 40;
            drawTableHeader();
        }

        const startY = currentY;
        let rX = margin;
        colW.forEach(w => {
            doc.rect(rX, startY, w, rowHeight);
            rX += w;
        });

        const textY = startY + rowHeight / 2;
        let cX = margin;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        doc.text((i + 1).toString(), cX + colW[0] / 2, textY, { align: "center", baseline: "middle" });
        cX += colW[0];

        doc.text(nameLines, cX + 2, textY, { baseline: "middle" });
        cX += colW[1];

        doc.text(positionLines, cX + 2, textY, { maxWidth: colW[2] - 4, baseline: "middle" });
        cX += colW[2];

        const signX = (i % 2 === 0) ? cX + 2 : cX + (colW[3] / 2);
        doc.setFontSize(8);
        doc.text(`${i + 1}. .......`, signX, textY, { baseline: "middle" });

        currentY += rowHeight;
    }

    if (currentY > pageHeight - 60) {
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
    const colW = [12, 75, 60, 33]; // NO, NAMA PESERTA, ALAMAT, TTD
    const baseRowHeight = 10;
    const tableHeaders = ["NO", "NAMA PESERTA", "ALAMAT", "TTD"];

    const drawTableHeader = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        let hX = margin;
        tableHeaders.forEach((header, i) => {
            doc.rect(hX, currentY, colW[i], 10);
            doc.text(header, hX + colW[i] / 2, currentY + 6.5, { align: "center" });
            hX += colW[i];
        });
        currentY += 10;
    };

    drawTableHeader();

    const quota = values.quota || 30;
    const totalItems = Math.max(values.participants.length, quota);

    for (let i = 0; i < totalItems; i++) {
        const p = values.participants[i] || { name: "", jabatan: "" };

        const nameLines = doc.splitTextToSize((p.name || "").toUpperCase(), colW[1] - 4);
        const addressLines = doc.splitTextToSize((p.jabatan || "").toUpperCase(), colW[2] - 4);
        const lineCount = Math.max(nameLines.length, addressLines.length, 1);
        const rowHeight = Math.max(baseRowHeight, (lineCount * 5) + 2);

        if (currentY + rowHeight > pageHeight - 20) {
            doc.addPage();
            addKopSuratSync(doc, logoImg, margin, pageWidth);
            currentY = 40;
            drawTableHeader();
        }

        let rX = margin;
        doc.rect(rX, currentY, colW[0], rowHeight);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text((i + 1).toString(), rX + colW[0] / 2, currentY + rowHeight / 2 + 1.5, { align: "center" });
        rX += colW[0];

        doc.rect(rX, currentY, colW[1], rowHeight);
        doc.text(nameLines, rX + 2, currentY + 5);
        rX += colW[1];

        doc.rect(rX, currentY, colW[2], rowHeight);
        doc.text(addressLines, rX + 2, currentY + 5);
        rX += colW[2];

        doc.rect(rX, currentY, colW[3], rowHeight);
        const signX = (i % 2 === 0) ? rX + 2 : rX + (colW[3] / 2);
        doc.setFontSize(8);
        doc.text(`${i + 1}. .......`, signX, currentY + rowHeight / 2 + 1.5);

        currentY += rowHeight;
    }

    if (currentY > pageHeight - 60) {
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

    return doc.output("blob");
}
