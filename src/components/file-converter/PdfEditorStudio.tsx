'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import {
  X,
  Download,
  Type,
  Highlighter,
  EyeOff,
  Eraser,
  PenTool,
  Stamp,
  Image as ImageIcon,
  RotateCw,
  Trash2,
  ArrowUp,
  ArrowDown,
  MousePointer2,
  Undo2,
  ZoomIn,
  ZoomOut,
  Loader2,
  CheckCircle2,
  Droplets,
  FileText,
  ExternalLink,
} from 'lucide-react';

type ToolMode = 'select' | 'text' | 'highlight' | 'redact' | 'whiteout' | 'draw' | 'stamp' | 'image';

interface PageState {
  originalIndex: number; // 0-based index in source PDF
  rotation: number; // 0, 90, 180, 270
}

interface PdfAnnotation {
  id: string;
  pageKey: number; // matches PageState.originalIndex
  type: 'text' | 'highlight' | 'redact' | 'whiteout' | 'draw' | 'stamp' | 'image';
  // Normalized coordinates (0..1 relative to rendered page width/height)
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  points?: Array<{ x: number; y: number }>;
  strokeWidth?: number;
  imageDataUrl?: string;
}

const STAMP_PRESETS = ['DISETUJUI', 'ARSIP KECAMATAN', 'RAHASIA', 'SELESAI', 'SALINAN'];

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

function hexToRgbNorm(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return { r: 0.02, g: 0.12, b: 0.09 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

function loadPdfJsFromCdn(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Browser only'));
    if (window.pdfjsLib) return resolve(window.pdfjsLib);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js gagal dimuat.'));
      }
    };
    script.onerror = () => reject(new Error('Gagal memuat renderer PDF.js.'));
    document.head.appendChild(script);
  });
}

export function PdfEditorStudio({
  file,
  onClose,
}: {
  file: File;
  onClose: () => void;
}) {
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfJsDoc, setPdfJsDoc] = useState<any>(null);
  const [pages, setPages] = useState<PageState[]>([]);
  const [activePagePos, setActivePagePos] = useState(0);
  const [zoom, setZoom] = useState(1.15);
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');

  // Active tool & properties
  const [tool, setTool] = useState<ToolMode>('text');
  const [textDraft, setTextDraft] = useState('Teks Baru');
  const [fontSize, setFontSize] = useState(15);
  const [color, setColor] = useState('#041E17');
  const [bold, setBold] = useState(false);
  const [stampText, setStampText] = useState('DISETUJUI');
  const [watermarkText, setWatermarkText] = useState('');
  const [showWatermarkInput, setShowWatermarkInput] = useState(false);

  // Annotations
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 595, height: 842 });

  // Pointer drawing / dragging state
  const [draftBox, setDraftBox] = useState<{ startX: number; startY: number; curX: number; curY: number } | null>(null);
  const [draftDraw, setDraftDraw] = useState<Array<{ x: number; y: number }> | null>(null);
  const [draggingAnn, setDraggingAnn] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 1. Load PDF bytes & initialize pdf-lib page list + PDF.js renderer
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setRenderError('');
      try {
        const buf = await file.arrayBuffer();
        if (cancelled) return;
        setPdfBytes(buf);

        const libDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
        const count = libDoc.getPageCount();
        const initialPages: PageState[] = Array.from({ length: count }, (_, idx) => ({
          originalIndex: idx,
          rotation: 0,
        }));
        setPages(initialPages);
        setActivePagePos(0);

        try {
          const pdfjs = await loadPdfJsFromCdn();
          const loadingTask = pdfjs.getDocument({ data: buf.slice(0) });
          const doc = await loadingTask.promise;
          if (!cancelled) setPdfJsDoc(doc);
        } catch (cdnErr: any) {
          console.warn('PDF.js CDN unavailable:', cdnErr);
          if (!cancelled) setRenderError('Pratinjau kanvas PDF memerlukan koneksi internet untuk memuat PDF.js, namun penyimpanan & pengaturan halaman tetap berfungsi.');
        }
      } catch (err: any) {
        if (!cancelled) setRenderError(err?.message || 'Gagal membuka berkas PDF.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  const activePage = pages[activePagePos] || null;

  // 2. Render active page on canvas
  const renderPage = useCallback(async () => {
    if (!pdfJsDoc || !activePage || !canvasRef.current) return;
    try {
      const page = await pdfJsDoc.getPage(activePage.originalIndex + 1);
      const viewport = page.getViewport({
        scale: zoom * 1.35,
        rotation: (page.rotate + activePage.rotation) % 360,
      });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setCanvasSize({ width: viewport.width, height: viewport.height });

      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.warn('Render page error:', err);
    }
  }, [pdfJsDoc, activePage, zoom]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  const getNormalizedPoint = (e: React.PointerEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handleOverlayPointerDown = (e: React.PointerEvent) => {
    if (!activePage) return;
    const pt = getNormalizedPoint(e);

    if (tool === 'select') {
      setSelectedId(null);
      return;
    }

    if (tool === 'text') {
      const newAnn: PdfAnnotation = {
        id: `ann-${Date.now()}`,
        pageKey: activePage.originalIndex,
        type: 'text',
        x: pt.x,
        y: pt.y,
        text: textDraft.trim() || 'Teks Baru',
        fontSize,
        color,
        bold,
      };
      setAnnotations((prev) => [...prev, newAnn]);
      setSelectedId(newAnn.id);
      setTool('select');
      return;
    }

    if (tool === 'stamp') {
      const newAnn: PdfAnnotation = {
        id: `ann-${Date.now()}`,
        pageKey: activePage.originalIndex,
        type: 'stamp',
        x: Math.max(0.05, pt.x - 0.12),
        y: Math.max(0.05, pt.y - 0.03),
        text: stampText,
        color: stampText === 'RAHASIA' ? '#dc2626' : '#065F46',
      };
      setAnnotations((prev) => [...prev, newAnn]);
      setSelectedId(newAnn.id);
      setTool('select');
      return;
    }

    if (tool === 'highlight' || tool === 'redact' || tool === 'whiteout') {
      setDraftBox({ startX: pt.x, startY: pt.y, curX: pt.x, curY: pt.y });
      return;
    }

    if (tool === 'draw') {
      setDraftDraw([pt]);
    }
  };

  const handleOverlayPointerMove = (e: React.PointerEvent) => {
    const pt = getNormalizedPoint(e);

    if (draggingAnn) {
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === draggingAnn.id
            ? {
                ...a,
                x: Math.max(0, Math.min(0.95, pt.x - draggingAnn.offsetX)),
                y: Math.max(0, Math.min(0.95, pt.y - draggingAnn.offsetY)),
              }
            : a
        )
      );
      return;
    }

    if (draftBox) {
      setDraftBox((prev) => (prev ? { ...prev, curX: pt.x, curY: pt.y } : null));
      return;
    }

    if (draftDraw) {
      setDraftDraw((prev) => (prev ? [...prev, pt] : null));
    }
  };

  const handleOverlayPointerUp = () => {
    if (draggingAnn) {
      setDraggingAnn(null);
      return;
    }

    if (draftBox && activePage) {
      const x = Math.min(draftBox.startX, draftBox.curX);
      const y = Math.min(draftBox.startY, draftBox.curY);
      const w = Math.abs(draftBox.curX - draftBox.startX);
      const h = Math.abs(draftBox.curY - draftBox.startY);
      if (w > 0.01 && h > 0.008) {
        const newAnn: PdfAnnotation = {
          id: `ann-${Date.now()}`,
          pageKey: activePage.originalIndex,
          type: tool as 'highlight' | 'redact' | 'whiteout',
          x,
          y,
          w,
          h,
          color: tool === 'highlight' ? '#facc15' : tool === 'redact' ? '#000000' : '#ffffff',
        };
        setAnnotations((prev) => [...prev, newAnn]);
        setSelectedId(newAnn.id);
      }
      setDraftBox(null);
      return;
    }

    if (draftDraw && activePage) {
      if (draftDraw.length > 1) {
        const newAnn: PdfAnnotation = {
          id: `ann-${Date.now()}`,
          pageKey: activePage.originalIndex,
          type: 'draw',
          x: 0,
          y: 0,
          points: draftDraw,
          color,
          strokeWidth: 2.5,
        };
        setAnnotations((prev) => [...prev, newAnn]);
        setSelectedId(newAnn.id);
      }
      setDraftDraw(null);
    }
  };

  const handleInsertImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const imgFile = e.target.files?.[0];
    if (!imgFile || !activePage) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newAnn: PdfAnnotation = {
        id: `ann-${Date.now()}`,
        pageKey: activePage.originalIndex,
        type: 'image',
        x: 0.35,
        y: 0.35,
        w: 0.28,
        h: 0.16,
        imageDataUrl: reader.result as string,
      };
      setAnnotations((prev) => [...prev, newAnn]);
      setSelectedId(newAnn.id);
      setTool('select');
    };
    reader.readAsDataURL(imgFile);
    e.target.value = '';
  };

  // Page operations
  const handleRotatePage = (pos: number) => {
    setPages((prev) =>
      prev.map((p, idx) => (idx === pos ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const handleMovePage = (pos: number, dir: -1 | 1) => {
    const nextPos = pos + dir;
    if (nextPos < 0 || nextPos >= pages.length) return;
    setPages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(pos, 1);
      copy.splice(nextPos, 0, item);
      return copy;
    });
    if (activePagePos === pos) setActivePagePos(nextPos);
  };

  const handleDeletePage = (pos: number) => {
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((_, idx) => idx !== pos));
    setActivePagePos((cur) => Math.max(0, Math.min(cur, pages.length - 2)));
  };

  const handleUndo = () => {
    setAnnotations((prev) => prev.slice(0, -1));
    setSelectedId(null);
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    setAnnotations((prev) => prev.filter((a) => a.id !== selectedId));
    setSelectedId(null);
  };

  // Export final modified PDF with pdf-lib
  const handleSavePdf = async () => {
    if (!pdfBytes || pages.length === 0) return;
    setSaving(true);
    setSavedNotice('');
    try {
      const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const outDoc = await PDFDocument.create();
      const fontRegular = await outDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await outDoc.embedFont(StandardFonts.HelveticaBold);

      for (const pageItem of pages) {
        const [copied] = await outDoc.copyPages(srcDoc, [pageItem.originalIndex]);
        if (pageItem.rotation !== 0) {
          const curAngle = copied.getRotation().angle;
          copied.setRotation(degrees((curAngle + pageItem.rotation) % 360));
        }
        outDoc.addPage(copied);

        const { width, height } = copied.getSize();
        const pageAnns = annotations.filter((a) => a.pageKey === pageItem.originalIndex);

        // Optional diagonal watermark across all pages
        if (watermarkText.trim()) {
          copied.drawText(watermarkText.trim().toUpperCase(), {
            x: width * 0.16,
            y: height * 0.42,
            size: Math.min(width, height) * 0.085,
            font: fontBold,
            color: rgb(0.02, 0.37, 0.27),
            opacity: 0.16,
            rotate: degrees(32),
          });
        }

        for (const ann of pageAnns) {
          if (ann.type === 'whiteout' || ann.type === 'redact' || ann.type === 'highlight') {
            const rx = ann.x * width;
            const rw = (ann.w || 0.15) * width;
            const rh = (ann.h || 0.05) * height;
            const ry = height - (ann.y * height) - rh;
            const c = hexToRgbNorm(ann.color || '#ffffff');
            copied.drawRectangle({
              x: rx,
              y: ry,
              width: rw,
              height: rh,
              color: rgb(c.r, c.g, c.b),
              opacity: ann.type === 'highlight' ? 0.35 : 1,
            });
          } else if (ann.type === 'text' && ann.text) {
            const c = hexToRgbNorm(ann.color || '#041E17');
            const fs = ann.fontSize || 14;
            const tx = ann.x * width;
            const ty = height - (ann.y * height) - fs;
            copied.drawText(ann.text, {
              x: tx,
              y: Math.max(8, ty),
              size: fs,
              font: ann.bold ? fontBold : fontRegular,
              color: rgb(c.r, c.g, c.b),
            });
          } else if (ann.type === 'stamp' && ann.text) {
            const c = hexToRgbNorm(ann.color || '#065F46');
            const fs = 16;
            const textW = fontBold.widthOfTextAtSize(ann.text, fs);
            const padX = 12;
            const padY = 8;
            const rx = ann.x * width;
            const ry = height - (ann.y * height) - (fs + padY * 2);
            copied.drawRectangle({
              x: rx,
              y: ry,
              width: textW + padX * 2,
              height: fs + padY * 2,
              borderColor: rgb(c.r, c.g, c.b),
              borderWidth: 2,
              opacity: 0.08,
              color: rgb(c.r, c.g, c.b),
            });
            copied.drawText(ann.text, {
              x: rx + padX,
              y: ry + padY + 2,
              size: fs,
              font: fontBold,
              color: rgb(c.r, c.g, c.b),
            });
          } else if (ann.type === 'draw' && ann.points && ann.points.length > 1) {
            const c = hexToRgbNorm(ann.color || '#041E17');
            for (let i = 1; i < ann.points.length; i++) {
              const p0 = ann.points[i - 1];
              const p1 = ann.points[i];
              copied.drawLine({
                start: { x: p0.x * width, y: height - p0.y * height },
                end: { x: p1.x * width, y: height - p1.y * height },
                thickness: ann.strokeWidth || 2.2,
                color: rgb(c.r, c.g, c.b),
              });
            }
          } else if (ann.type === 'image' && ann.imageDataUrl) {
            try {
              const isPng = ann.imageDataUrl.startsWith('data:image/png');
              const embedded = isPng
                ? await outDoc.embedPng(ann.imageDataUrl)
                : await outDoc.embedJpg(ann.imageDataUrl);
              const iw = (ann.w || 0.25) * width;
              const ih = (ann.h || 0.15) * height;
              const ix = ann.x * width;
              const iy = height - (ann.y * height) - ih;
              copied.drawImage(embedded, { x: ix, y: iy, width: iw, height: ih });
            } catch (imgErr) {
              console.warn('Skip unsupported image format:', imgErr);
            }
          }
        }
      }

      const savedBytes = await outDoc.save({ useObjectStreams: true });
      const blob = new Blob([savedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const base = file.name.replace(/\.pdf$/i, '');
      a.href = url;
      a.download = `${base}_edited.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setSavedNotice(`PDF "${base}_edited.pdf" berhasil disimpan & diunduh!`);
    } catch (err: any) {
      setRenderError(err?.message || 'Gagal menyimpan PDF hasil edit.');
    } finally {
      setSaving(false);
    }
  };

  const activePageAnnotations = activePage
    ? annotations.filter((a) => a.pageKey === activePage.originalIndex)
    : [];

  const selectedAnn = annotations.find((a) => a.id === selectedId) || null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FAF8F5] dark:bg-[#05110E] text-[#041E17] dark:text-[#FAF8F5]">
      {/* Top Studio Header */}
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-[#041E17] via-[#064E3B] to-[#065F46] text-white border-b border-[#C8A253]/35 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-[#C8A253] text-[#041E17] flex items-center justify-center shrink-0 font-black">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-hero text-sm sm:text-base font-extrabold truncate">
                PDF Editor Studio
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-white/15 border border-[#E5C882]/40 font-mono text-[9.5px] font-bold text-[#E5C882]">
                KILLERPDF WEB
              </span>
            </div>
            <p className="font-mono text-[10px] text-[#F5E9CC]/80 truncate">{file.name} • {pages.length} Halaman</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/SteveTheKiller/KillerPDF/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 font-hero text-[10.5px] font-semibold text-[#F5E9CC]"
          >
            <span>KillerPDF Desktop</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            type="button"
            disabled={saving || loading}
            onClick={handleSavePdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C8A253] hover:bg-[#E5C882] text-[#041E17] font-hero text-xs font-extrabold shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span>{saving ? 'Menyimpan...' : 'Simpan & Unduh PDF'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/12 hover:bg-rose-500/80 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Tutup Editor PDF"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Toolbar (Tools + Options) */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-white dark:bg-[#0A1F1A] border-b border-[#E6E0D3] dark:border-[#C8A253]/20">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'select', icon: MousePointer2, label: 'Geser' },
            { id: 'text', icon: Type, label: 'Teks' },
            { id: 'whiteout', icon: Eraser, label: 'Tipe-X' },
            { id: 'highlight', icon: Highlighter, label: 'Stabilo' },
            { id: 'redact', icon: EyeOff, label: 'Sensor' },
            { id: 'draw', icon: PenTool, label: 'TTD / Coret' },
            { id: 'stamp', icon: Stamp, label: 'Stempel' },
          ].map((item) => {
            const Icon = item.icon;
            const active = tool === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTool(item.id as ToolMode)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-hero text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#065F46] text-white shadow-sm'
                    : 'bg-[#F3EFE6] dark:bg-white/10 text-[#041E17] dark:text-[#FAF8F5] hover:bg-[#E5C882]/35'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleInsertImageFile}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F3EFE6] dark:bg-white/10 hover:bg-[#E5C882]/35 text-[#041E17] dark:text-[#FAF8F5] font-hero text-xs font-bold cursor-pointer"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Sisip Gambar</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWatermarkInput((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-hero text-xs font-bold cursor-pointer ${
              watermarkText
                ? 'bg-[#C8A253] text-[#041E17]'
                : 'bg-[#F3EFE6] dark:bg-white/10 text-[#041E17] dark:text-[#FAF8F5]'
            }`}
          >
            <Droplets className="h-3.5 w-3.5" />
            <span>Watermark</span>
          </button>
        </div>

        {/* Right Controls: Undo, Delete, Zoom */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={annotations.length === 0}
            className="p-2 rounded-xl bg-[#F3EFE6] dark:bg-white/10 hover:bg-[#E5C882]/30 disabled:opacity-40 cursor-pointer"
            title="Undo anotasi terakhir"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          {selectedId && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-100 text-rose-700 font-hero text-xs font-bold cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus Item
            </button>
          )}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#F3EFE6] dark:bg-white/10 font-mono text-xs font-bold">
            <button type="button" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))} className="p-0.5 cursor-pointer">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-1">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.15).toFixed(2)))} className="p-0.5 cursor-pointer">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Contextual Sub-Toolbar for Text / Stamp / Watermark / Selected Text */}
      {(tool === 'text' || tool === 'draw' || tool === 'stamp' || showWatermarkInput || selectedAnn?.type === 'text') && (
        <div className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-2 bg-[#F3EFE6] dark:bg-[#064E3B]/35 border-b border-[#E6E0D3] dark:border-[#C8A253]/20 text-xs">
          {(tool === 'text' || selectedAnn?.type === 'text') && (
            <>
              <input
                type="text"
                value={selectedAnn?.type === 'text' ? selectedAnn.text || '' : textDraft}
                onChange={(e) => {
                  const val = e.target.value;
                  if (selectedAnn?.type === 'text') {
                    setAnnotations((prev) => prev.map((a) => (a.id === selectedAnn.id ? { ...a, text: val } : a)));
                  } else {
                    setTextDraft(val);
                  }
                }}
                placeholder="Ketik teks lalu klik di halaman PDF..."
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#05110E] border border-[#C8A253]/40 text-xs font-semibold min-w-[220px]"
              />
              <label className="flex items-center gap-1.5 font-mono font-bold">
                Ukuran:
                <input
                  type="number"
                  min={8}
                  max={48}
                  value={selectedAnn?.type === 'text' ? selectedAnn.fontSize || 14 : fontSize}
                  onChange={(e) => {
                    const fs = Number(e.target.value) || 14;
                    if (selectedAnn?.type === 'text') {
                      setAnnotations((prev) => prev.map((a) => (a.id === selectedAnn.id ? { ...a, fontSize: fs } : a)));
                    } else {
                      setFontSize(fs);
                    }
                  }}
                  className="w-14 px-2 py-1 rounded-lg bg-white dark:bg-[#05110E] border border-[#C8A253]/40"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  if (selectedAnn?.type === 'text') {
                    setAnnotations((prev) => prev.map((a) => (a.id === selectedAnn.id ? { ...a, bold: !a.bold } : a)));
                  } else {
                    setBold((b) => !b);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg font-extrabold border cursor-pointer ${
                  (selectedAnn?.type === 'text' ? selectedAnn.bold : bold)
                    ? 'bg-[#065F46] text-white border-[#065F46]'
                    : 'bg-white dark:bg-[#05110E] border-[#C8A253]/40'
                }`}
              >
                B
              </button>
            </>
          )}

          {(tool === 'text' || tool === 'draw' || selectedAnn?.type === 'text') && (
            <label className="flex items-center gap-1.5 font-hero font-bold">
              Warna:
              <input
                type="color"
                value={selectedAnn?.type === 'text' ? selectedAnn.color || '#041E17' : color}
                onChange={(e) => {
                  const c = e.target.value;
                  if (selectedAnn?.type === 'text') {
                    setAnnotations((prev) => prev.map((a) => (a.id === selectedAnn.id ? { ...a, color: c } : a)));
                  } else {
                    setColor(c);
                  }
                }}
                className="h-7 w-9 rounded cursor-pointer border-0"
              />
            </label>
          )}

          {tool === 'stamp' && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-hero font-bold">Pilih Stempel:</span>
              {STAMP_PRESETS.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStampText(st)}
                  className={`px-2.5 py-1 rounded-full font-mono text-[10px] font-bold cursor-pointer ${
                    stampText === st ? 'bg-[#065F46] text-white' : 'bg-white dark:bg-[#05110E] border border-[#C8A253]/40'
                  }`}
                >
                  {st}
                </button>
              ))}
              <span className="text-[11px] opacity-75">(Klik pada halaman untuk menempel stempel)</span>
            </div>
          )}

          {showWatermarkInput && (
            <div className="flex items-center gap-2">
              <span className="font-hero font-bold">Teks Watermark (Semua Halaman):</span>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="Contoh: ARSIP KECAMATAN"
                className="px-3 py-1 rounded-xl bg-white dark:bg-[#05110E] border border-[#C8A253]/40 text-xs font-semibold"
              />
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      {savedNotice && (
        <div className="shrink-0 px-4 py-2 bg-[#065F46] text-white font-hero text-xs font-bold flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#E5C882]" />
          <span>{savedNotice}</span>
        </div>
      )}
      {renderError && (
        <div className="shrink-0 px-4 py-2 bg-amber-100 text-amber-900 font-hero text-xs font-semibold text-center">
          {renderError}
        </div>
      )}

      {/* Main Split Area: Left Page Strip + Center Interactive Canvas */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Page Strip */}
        <aside className="w-44 sm:w-52 shrink-0 bg-white dark:bg-[#0A1F1A] border-r border-[#E6E0D3] dark:border-[#C8A253]/20 overflow-y-auto p-3 space-y-2">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#065F46] dark:text-[#E5C882] px-1">
            Daftar Halaman ({pages.length})
          </div>
          {pages.map((p, idx) => {
            const isActive = idx === activePagePos;
            const count = annotations.filter((a) => a.pageKey === p.originalIndex).length;
            return (
              <div
                key={`${p.originalIndex}-${idx}`}
                onClick={() => setActivePagePos(idx)}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#065F46] text-white border-[#C8A253] shadow-md'
                    : 'bg-[#FAF8F5] dark:bg-[#05110E] border-[#E6E0D3] dark:border-white/10 hover:border-[#C8A253]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-hero text-xs font-extrabold">Hal. {idx + 1}</span>
                  {count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full font-mono text-[9px] font-bold ${isActive ? 'bg-[#C8A253] text-[#041E17]' : 'bg-[#F3EFE6] text-[#065F46]'}`}>
                      {count} edit
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleMovePage(idx, -1); }}
                      disabled={idx === 0}
                      className="p-1 rounded-lg bg-black/10 hover:bg-black/20 disabled:opacity-30 cursor-pointer"
                      title="Geser ke atas"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleMovePage(idx, 1); }}
                      disabled={idx === pages.length - 1}
                      className="p-1 rounded-lg bg-black/10 hover:bg-black/20 disabled:opacity-30 cursor-pointer"
                      title="Geser ke bawah"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRotatePage(idx); }}
                      className="p-1 rounded-lg bg-black/10 hover:bg-black/20 cursor-pointer"
                      title="Putar 90°"
                    >
                      <RotateCw className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeletePage(idx); }}
                    disabled={pages.length <= 1}
                    className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Hapus halaman"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </aside>

        {/* Center Canvas Workspace */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center bg-[#EFE9DC]/65 dark:bg-[#03120E]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#065F46] dark:text-[#E5C882]" />
              <p className="font-hero text-xs font-bold">Memuat halaman PDF...</p>
            </div>
          ) : (
            <div
              className="relative shadow-2xl bg-white select-none"
              style={{ width: canvasSize.width, height: canvasSize.height }}
            >
              <canvas ref={canvasRef} className="block w-full h-full" />

              {/* Watermark Preview */}
              {watermarkText.trim() && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                  <span className="font-hero font-black uppercase text-4xl sm:text-6xl text-[#065F46]/15 -rotate-30 tracking-widest">
                    {watermarkText}
                  </span>
                </div>
              )}

              {/* Interactive Annotation Layer */}
              <div
                ref={overlayRef}
                onPointerDown={handleOverlayPointerDown}
                onPointerMove={handleOverlayPointerMove}
                onPointerUp={handleOverlayPointerUp}
                className="absolute inset-0 touch-none"
                style={{
                  cursor:
                    tool === 'select'
                      ? 'default'
                      : tool === 'text'
                      ? 'text'
                      : 'crosshair',
                }}
              >
                {/* Vector SVG Layer for Freehand Drawings & Draft Box */}
                <svg className="pointer-events-none absolute inset-0 w-full h-full">
                  {activePageAnnotations
                    .filter((a) => a.type === 'draw' && a.points && a.points.length > 1)
                    .map((a) => (
                      <polyline
                        key={a.id}
                        fill="none"
                        stroke={a.color || '#041E17'}
                        strokeWidth={a.strokeWidth || 2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={a.points!.map((p) => `${p.x * canvasSize.width},${p.y * canvasSize.height}`).join(' ')}
                      />
                    ))}

                  {draftDraw && draftDraw.length > 1 && (
                    <polyline
                      fill="none"
                      stroke={color}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={draftDraw.map((p) => `${p.x * canvasSize.width},${p.y * canvasSize.height}`).join(' ')}
                    />
                  )}
                </svg>

                {/* Draft Rectangle Preview */}
                {draftBox && (
                  <div
                    className="pointer-events-none absolute border-2 border-dashed border-[#065F46]"
                    style={{
                      left: `${Math.min(draftBox.startX, draftBox.curX) * 100}%`,
                      top: `${Math.min(draftBox.startY, draftBox.curY) * 100}%`,
                      width: `${Math.abs(draftBox.curX - draftBox.startX) * 100}%`,
                      height: `${Math.abs(draftBox.curY - draftBox.startY) * 100}%`,
                      background:
                        tool === 'highlight'
                          ? 'rgba(250, 204, 21, 0.35)'
                          : tool === 'redact'
                          ? 'rgba(0,0,0,0.85)'
                          : 'rgba(255,255,255,0.92)',
                    }}
                  />
                )}

                {/* Rendered Interactive Annotations */}
                {activePageAnnotations
                  .filter((a) => a.type !== 'draw')
                  .map((ann) => {
                    const isSelected = ann.id === selectedId;
                    const startDrag = (e: React.PointerEvent) => {
                      e.stopPropagation();
                      setSelectedId(ann.id);
                      const pt = getNormalizedPoint(e);
                      setDraggingAnn({ id: ann.id, offsetX: pt.x - ann.x, offsetY: pt.y - ann.y });
                    };

                    if (ann.type === 'highlight' || ann.type === 'redact' || ann.type === 'whiteout') {
                      return (
                        <div
                          key={ann.id}
                          onPointerDown={startDrag}
                          className={`absolute cursor-move ${isSelected ? 'ring-2 ring-[#C8A253]' : ''}`}
                          style={{
                            left: `${ann.x * 100}%`,
                            top: `${ann.y * 100}%`,
                            width: `${(ann.w || 0.15) * 100}%`,
                            height: `${(ann.h || 0.05) * 100}%`,
                            background:
                              ann.type === 'highlight'
                                ? 'rgba(250, 204, 21, 0.38)'
                                : ann.type === 'redact'
                                ? '#000000'
                                : '#ffffff',
                          }}
                        />
                      );
                    }

                    if (ann.type === 'text') {
                      return (
                        <div
                          key={ann.id}
                          onPointerDown={startDrag}
                          className={`absolute px-1 cursor-move whitespace-nowrap ${
                            isSelected ? 'ring-2 ring-[#C8A253] bg-[#FAF8F5]/70 rounded' : ''
                          }`}
                          style={{
                            left: `${ann.x * 100}%`,
                            top: `${ann.y * 100}%`,
                            fontSize: `${(ann.fontSize || 14) * zoom * 1.15}px`,
                            color: ann.color || '#041E17',
                            fontWeight: ann.bold ? 800 : 500,
                            lineHeight: 1.1,
                          }}
                        >
                          {ann.text}
                        </div>
                      );
                    }

                    if (ann.type === 'stamp') {
                      return (
                        <div
                          key={ann.id}
                          onPointerDown={startDrag}
                          className={`absolute px-3 py-1.5 rounded-md border-2 font-mono font-black tracking-widest cursor-move ${
                            isSelected ? 'ring-2 ring-[#C8A253]' : ''
                          }`}
                          style={{
                            left: `${ann.x * 100}%`,
                            top: `${ann.y * 100}%`,
                            color: ann.color || '#065F46',
                            borderColor: ann.color || '#065F46',
                            background: 'rgba(6, 95, 70, 0.08)',
                            fontSize: `${15 * zoom}px`,
                          }}
                        >
                          {ann.text}
                        </div>
                      );
                    }

                    if (ann.type === 'image' && ann.imageDataUrl) {
                      return (
                        <img
                          key={ann.id}
                          src={ann.imageDataUrl}
                          alt="Sisipan"
                          onPointerDown={startDrag}
                          className={`absolute object-contain cursor-move ${isSelected ? 'ring-2 ring-[#C8A253]' : ''}`}
                          style={{
                            left: `${ann.x * 100}%`,
                            top: `${ann.y * 100}%`,
                            width: `${(ann.w || 0.25) * 100}%`,
                            height: `${(ann.h || 0.15) * 100}%`,
                          }}
                        />
                      );
                    }

                    return null;
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
