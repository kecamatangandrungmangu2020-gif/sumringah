'use client';

import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

export type FileCategory = 'image' | 'pdf' | 'spreadsheet' | 'document' | 'archive' | 'other';

export interface TargetFormatOption {
  id: string;
  label: string;
  ext: string;
  desc: string;
  accent?: 'emerald' | 'gold' | 'dark';
}

export interface ConvertedOutput {
  name: string;
  blob: Blob;
  size: number;
  url: string;
  ext: string;
}

export function getFileExtension(name: string): string {
  const parts = name.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export function getBaseName(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(0, idx) : name;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function detectFileCategory(file: File): FileCategory {
  const ext = getFileExtension(file.name);
  const type = (file.type || '').toLowerCase();

  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'svg'].includes(ext)) {
    return 'image';
  }
  if (type === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (['xlsx', 'xls', 'csv', 'ods'].includes(ext) || type.includes('spreadsheet') || type.includes('excel')) {
    return 'spreadsheet';
  }
  if (['docx', 'pptx', 'txt', 'md', 'json', 'html', 'htm', 'xml'].includes(ext) || type.startsWith('text/')) {
    return 'document';
  }
  if (ext === 'zip' || type.includes('zip')) {
    return 'archive';
  }
  return 'other';
}

export function getTargetFormatsForFiles(files: File[]): TargetFormatOption[] {
  if (files.length === 0) {
    return [
      { id: 'webp', label: 'WEBP', ext: 'webp', desc: 'Gambar Ringan', accent: 'emerald' },
      { id: 'png', label: 'PNG', ext: 'png', desc: 'Gambar Tajam', accent: 'emerald' },
      { id: 'jpg', label: 'JPG', ext: 'jpg', desc: 'Foto Standar', accent: 'gold' },
      { id: 'pdf', label: 'PDF', ext: 'pdf', desc: 'Dokumen PDF', accent: 'gold' },
      { id: 'edit-pdf', label: 'EDIT PDF', ext: 'pdf', desc: 'Teks, TTD & Stempel', accent: 'gold' },
      { id: 'xlsx', label: 'XLSX', ext: 'xlsx', desc: 'Excel Sheet', accent: 'emerald' },
      { id: 'csv', label: 'CSV', ext: 'csv', desc: 'Tabel CSV', accent: 'dark' },
      { id: 'zip', label: 'ZIP', ext: 'zip', desc: 'Arsip ZIP', accent: 'dark' },
    ];
  }

  const categories = new Set(files.map(detectFileCategory));
  if (categories.size === 1) {
    const only = Array.from(categories)[0];
    if (only === 'image') {
      return [
        { id: 'webp', label: 'WEBP', ext: 'webp', desc: 'Kompresi Web Modern', accent: 'emerald' },
        { id: 'jpg', label: 'JPG', ext: 'jpg', desc: 'Foto Universal', accent: 'gold' },
        { id: 'png', label: 'PNG', ext: 'png', desc: 'Lossless Transparan', accent: 'emerald' },
        { id: 'pdf', label: 'PDF', ext: 'pdf', desc: files.length > 1 ? 'Gabung ke 1 PDF' : 'Konversi ke PDF', accent: 'gold' },
        { id: 'zip', label: 'ZIP', ext: 'zip', desc: 'Kemas Arsip ZIP', accent: 'dark' },
      ];
    }
    if (only === 'pdf') {
      const opts: TargetFormatOption[] = [
        { id: 'edit-pdf', label: 'EDIT PDF', ext: 'pdf', desc: 'Teks, TTD, Stempel, Sensor', accent: 'gold' },
      ];
      if (files.length > 1) {
        opts.push({ id: 'merge-pdf', label: 'GABUNG PDF', ext: 'pdf', desc: `Satukan ${files.length} PDF`, accent: 'emerald' });
      }
      opts.push(
        { id: 'optimize-pdf', label: 'OPTIMASI PDF', ext: 'pdf', desc: 'Rapikan Struktur PDF', accent: 'emerald' },
        { id: 'split-pdf', label: 'PISAH HALAMAN', ext: 'zip', desc: 'Pecah Tiap Halaman (ZIP)', accent: 'gold' },
        { id: 'zip', label: 'ZIP', ext: 'zip', desc: 'Kemas Arsip ZIP', accent: 'dark' }
      );
      return opts;
    }
    if (only === 'spreadsheet') {
      return [
        { id: 'xlsx', label: 'XLSX', ext: 'xlsx', desc: 'Microsoft Excel', accent: 'emerald' },
        { id: 'csv', label: 'CSV', ext: 'csv', desc: 'Comma Separated', accent: 'gold' },
        { id: 'json', label: 'JSON', ext: 'json', desc: 'Data Terstruktur', accent: 'dark' },
        { id: 'html', label: 'HTML', ext: 'html', desc: 'Tabel Web', accent: 'emerald' },
        { id: 'pdf', label: 'PDF', ext: 'pdf', desc: 'Ringkasan PDF', accent: 'gold' },
      ];
    }
    if (only === 'document') {
      return [
        { id: 'pdf', label: 'PDF', ext: 'pdf', desc: 'Dokumen PDF', accent: 'gold' },
        { id: 'txt', label: 'TXT', ext: 'txt', desc: 'Ekstrak Teks Bersih', accent: 'emerald' },
        { id: 'html', label: 'HTML', ext: 'html', desc: 'Halaman Web', accent: 'dark' },
        { id: 'json', label: 'JSON', ext: 'json', desc: 'Metadata & Teks', accent: 'emerald' },
        { id: 'zip', label: 'ZIP', ext: 'zip', desc: 'Kemas Arsip ZIP', accent: 'dark' },
      ];
    }
    if (only === 'archive') {
      return [
        { id: 'unzip', label: 'EKSTRAK ZIP', ext: 'files', desc: 'Bongkar Semua Isi', accent: 'gold' },
      ];
    }
  }

  // Mixed files
  return [
    { id: 'zip', label: 'ZIP', ext: 'zip', desc: 'Gabung ke Arsip ZIP', accent: 'gold' },
    { id: 'pdf', label: 'PDF', ext: 'pdf', desc: 'Konversi ke PDF', accent: 'emerald' },
  ];
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Gagal memuat gambar: ${file.name}`));
    };
    img.src = url;
  });
}

async function convertImageToFormat(file: File, target: 'png' | 'jpg' | 'webp', quality = 0.88): Promise<Blob> {
  const img = await loadImageElement(file);
  const w = img.naturalWidth || img.width || 1200;
  const h = img.naturalHeight || img.height || 800;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas browser tidak tersedia.');

  if (target === 'jpg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);

  const mime = target === 'png' ? 'image/png' : target === 'webp' ? 'image/webp' : 'image/jpeg';
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Gagal mengonversi ${file.name} ke ${target.toUpperCase()}`));
      },
      mime,
      target === 'png' ? undefined : quality
    );
  });
}

async function convertImagesToSinglePdf(files: File[], quality = 0.9): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  for (let i = 0; i < files.length; i++) {
    if (i > 0) doc.addPage();
    const img = await loadImageElement(files[i]);
    const w = img.naturalWidth || img.width || 1200;
    const h = img.naturalHeight || img.height || 800;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;
    const ratio = Math.min(maxW / w, maxH / h);
    const drawW = w * ratio;
    const drawH = h * ratio;
    const x = (pageWidth - drawW) / 2;
    const y = (pageHeight - drawH) / 2;
    doc.addImage(dataUrl, 'JPEG', x, y, drawW, drawH);
  }
  return doc.output('blob');
}

function extractXmlTags(xml: string, tagName: string): string[] {
  const out: string[] = [];
  const openPrefix = `<${tagName}`;
  const closeTag = `</${tagName}>`;
  let cursor = 0;
  while (cursor < xml.length) {
    const start = xml.indexOf(openPrefix, cursor);
    if (start === -1) break;
    const tagEnd = xml.indexOf('>', start);
    if (tagEnd === -1) break;
    const end = xml.indexOf(closeTag, tagEnd);
    if (end === -1) break;
    const raw = xml.slice(tagEnd + 1, end)
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();
    if (raw) out.push(raw);
    cursor = end + closeTag.length;
  }
  return out;
}

async function extractTextFromDocument(file: File): Promise<string> {
  const ext = getFileExtension(file.name);
  if (ext === 'docx') {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const xml = await zip.files['word/document.xml']?.async('text');
    if (!xml) return '';
    return extractXmlTags(xml, 'w:t').join(' ');
  }
  if (ext === 'pptx') {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const slides = Object.keys(zip.files)
      .filter((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
      .sort((a, b) => parseInt(a.match(/\d+/)?.[0] || '0', 10) - parseInt(b.match(/\d+/)?.[0] || '0', 10));
    const blocks: string[] = [];
    for (const s of slides) {
      const xml = await zip.files[s].async('text');
      const texts = extractXmlTags(xml, 'a:t');
      if (texts.length) blocks.push(`[Slide ${s.match(/\d+/)?.[0]}]\n${texts.join(' ')}`);
    }
    return blocks.join('\n\n');
  }
  return await file.text();
}

function renderTextToPdf(title: string, text: string): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18;
  const maxW = doc.internal.pageSize.getWidth() - margin * 2;
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, margin, 20);
  doc.setLineWidth(0.2);
  doc.line(margin, 23, margin + maxW, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  let y = 31;
  const paragraphs = (text || '(Kosong)').replace(/\r\n/g, '\n').split('\n');
  for (const para of paragraphs) {
    const lines: string[] = doc.splitTextToSize(para || ' ', maxW);
    for (const line of lines) {
      if (y > pageH - 18) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 5.2;
    }
  }
  return doc.output('blob');
}

export async function runOfflineConversion(
  files: File[],
  targetId: string,
  quality = 0.88
): Promise<ConvertedOutput[]> {
  if (files.length === 0) return [];
  const results: ConvertedOutput[] = [];

  const pushOutput = (name: string, blob: Blob, ext: string) => {
    results.push({
      name,
      blob,
      size: blob.size,
      url: URL.createObjectURL(blob),
      ext,
    });
  };

  // 1. Bundle any files into ZIP
  if (targetId === 'zip') {
    const zip = new JSZip();
    for (const f of files) {
      zip.file(f.name, await f.arrayBuffer());
    }
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const outName = files.length === 1 ? `${getBaseName(files[0].name)}.zip` : `arsip-filee-${Date.now()}.zip`;
    pushOutput(outName, blob, 'zip');
    return results;
  }

  // 2. Extract ZIP
  if (targetId === 'unzip') {
    for (const f of files) {
      const zip = await JSZip.loadAsync(await f.arrayBuffer());
      for (const [entryName, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        const blob = await entry.async('blob');
        const cleanName = entryName.split('/').pop() || entryName;
        pushOutput(cleanName, blob, getFileExtension(cleanName) || 'file');
      }
    }
    return results;
  }

  // 3. Merge multiple PDFs
  if (targetId === 'merge-pdf') {
    const merged = await PDFDocument.create();
    for (const f of files) {
      const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
      const copied = await merged.copyPages(src, src.getPageIndices());
      copied.forEach((p) => merged.addPage(p));
    }
    const bytes = await merged.save({ useObjectStreams: true });
    pushOutput(`gabungan-${files.length}-dokumen.pdf`, new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), 'pdf');
    return results;
  }

  // 4. Optimize PDF
  if (targetId === 'optimize-pdf') {
    for (const f of files) {
      const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
      const bytes = await src.save({ useObjectStreams: true });
      pushOutput(`${getBaseName(f.name)}_optimized.pdf`, new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), 'pdf');
    }
    return results;
  }

  // 5. Split PDF into pages (ZIP)
  if (targetId === 'split-pdf') {
    for (const f of files) {
      const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
      const zip = new JSZip();
      const base = getBaseName(f.name);
      for (let i = 0; i < src.getPageCount(); i++) {
        const single = await PDFDocument.create();
        const [page] = await single.copyPages(src, [i]);
        single.addPage(page);
        const bytes = await single.save();
        zip.file(`${base}_hal_${String(i + 1).padStart(2, '0')}.pdf`, bytes);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      pushOutput(`${base}_halaman.zip`, zipBlob, 'zip');
    }
    return results;
  }

  // 6. Multiple Images -> Single PDF
  if (targetId === 'pdf' && files.every((f) => detectFileCategory(f) === 'image')) {
    const blob = await convertImagesToSinglePdf(files, quality);
    const outName = files.length === 1 ? `${getBaseName(files[0].name)}.pdf` : `dokumen-gambar-${files.length}-halaman.pdf`;
    pushOutput(outName, blob, 'pdf');
    return results;
  }

  // 7. Per-file conversions (Images, Spreadsheets, Documents)
  for (const f of files) {
    const cat = detectFileCategory(f);
    const base = getBaseName(f.name);

    if (cat === 'image' && (targetId === 'png' || targetId === 'jpg' || targetId === 'webp')) {
      const blob = await convertImageToFormat(f, targetId, quality);
      pushOutput(`${base}.${targetId}`, blob, targetId);
      continue;
    }

    if (cat === 'spreadsheet') {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];

      if (targetId === 'xlsx') {
        const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        pushOutput(`${base}.xlsx`, new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'xlsx');
      } else if (targetId === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(firstSheet);
        pushOutput(`${base}.csv`, new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }), 'csv');
      } else if (targetId === 'json') {
        const json = XLSX.utils.sheet_to_json(firstSheet);
        pushOutput(`${base}.json`, new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }), 'json');
      } else if (targetId === 'html') {
        const html = XLSX.utils.sheet_to_html(firstSheet);
        pushOutput(`${base}.html`, new Blob([html], { type: 'text/html;charset=utf-8;' }), 'html');
      } else if (targetId === 'pdf') {
        const csvText = XLSX.utils.sheet_to_csv(firstSheet);
        pushOutput(`${base}.pdf`, renderTextToPdf(f.name, csvText), 'pdf');
      }
      continue;
    }

    if (cat === 'document') {
      const text = await extractTextFromDocument(f);
      if (targetId === 'txt') {
        pushOutput(`${base}.txt`, new Blob([text], { type: 'text/plain;charset=utf-8;' }), 'txt');
      } else if (targetId === 'html') {
        const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const html = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${base}</title><style>body{font-family:system-ui,sans-serif;max-width:820px;margin:40px auto;padding:0 20px;line-height:1.65;color:#041E17;background:#FAF8F5;white-space:pre-wrap;}</style></head><body><h1>${base}</h1><p>${escaped}</p></body></html>`;
        pushOutput(`${base}.html`, new Blob([html], { type: 'text/html;charset=utf-8;' }), 'html');
      } else if (targetId === 'json') {
        const payload = { fileName: f.name, size: f.size, convertedAt: new Date().toISOString(), content: text };
        pushOutput(`${base}.json`, new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'json');
      } else if (targetId === 'pdf') {
        pushOutput(`${base}.pdf`, renderTextToPdf(base, text), 'pdf');
      }
      continue;
    }

    // Fallback: PDF for text-like unknown files
    if (targetId === 'pdf') {
      const text = await f.text();
      pushOutput(`${base}.pdf`, renderTextToPdf(base, text), 'pdf');
    }
  }

  return results;
}
