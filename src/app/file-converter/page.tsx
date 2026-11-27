'use client';

import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Archive,
  Download,
  Trash2,
  Sparkles,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Layers,
  PenTool,
} from 'lucide-react';
import { BackgroundPattern } from '@/components/landing/BackgroundPattern';
import { NightModeSwitch } from '@/components/ui/NightModeSwitch';
import { PdfEditorStudio } from '@/components/file-converter/PdfEditorStudio';
import {
  ConvertedOutput,
  detectFileCategory,
  formatBytes,
  getTargetFormatsForFiles,
  runOfflineConversion,
} from '@/lib/filee-converter';

export default function FileConverterPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [quality, setQuality] = useState(0.88);
  const [convertingFormat, setConvertingFormat] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<ConvertedOutput[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingPdfFile, setEditingPdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetFormats = useMemo(() => getTargetFormatsForFiles(files), [files]);

  const handleAddFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    if (arr.length === 0) return;
    setErrorMsg('');
    setFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const unique = arr.filter((f) => !existingKeys.has(`${f.name}-${f.size}`));
      return [...prev, ...unique];
    });
  };

  const handleRemoveFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearAll = () => {
    outputs.forEach((o) => URL.revokeObjectURL(o.url));
    setFiles([]);
    setOutputs([]);
    setErrorMsg('');
  };

  const handleConvert = async (targetId: string) => {
    if (files.length === 0) {
      setErrorMsg('Pilih atau seret minimal 1 berkas terlebih dahulu.');
      return;
    }
    if (targetId === 'edit-pdf') {
      const pdfFile = files.find((f) => detectFileCategory(f) === 'pdf');
      if (!pdfFile) {
        setErrorMsg('Pilih minimal 1 berkas PDF untuk dibuka di PDF Editor Studio.');
        return;
      }
      setErrorMsg('');
      setEditingPdfFile(pdfFile);
      return;
    }
    setErrorMsg('');
    setConvertingFormat(targetId);
    try {
      outputs.forEach((o) => URL.revokeObjectURL(o.url));
      const res = await runOfflineConversion(files, targetId, quality);
      if (res.length === 0) {
        setErrorMsg('Format target tidak mendukung jenis berkas yang dipilih.');
      } else {
        setOutputs(res);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengonversi berkas. Pastikan format berkas valid.');
    } finally {
      setConvertingFormat(null);
    }
  };

  const handleDownload = (out: ConvertedOutput) => {
    const a = document.createElement('a');
    a.href = out.url;
    a.download = out.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = () => {
    outputs.forEach((out, idx) => {
      setTimeout(() => handleDownload(out), idx * 180);
    });
  };

  const getCategoryIcon = (file: File) => {
    const cat = detectFileCategory(file);
    if (cat === 'image') return <ImageIcon className="h-4 w-4 text-[#065F46] dark:text-[#E5C882]" />;
    if (cat === 'spreadsheet') return <FileSpreadsheet className="h-4 w-4 text-[#065F46] dark:text-[#E5C882]" />;
    if (cat === 'archive') return <Archive className="h-4 w-4 text-[#C8A253]" />;
    return <FileText className="h-4 w-4 text-[#065F46] dark:text-[#E5C882]" />;
  };

  return (
    <div className="relative min-h-screen bg-[#FAF8F5] dark:bg-[#05110E] text-[#041E17] dark:text-[#FAF8F5] transition-colors duration-300 overflow-x-clip">
      <BackgroundPattern />

      {/* Top Floating Porcelain Capsule Header */}
      <header className="sticky top-0 z-40 px-3 sm:px-6 pt-2.5 pb-1.5">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3 px-4 h-12 sm:h-13 rounded-full bg-white/95 dark:bg-[#0A1F1A]/95 backdrop-blur-xl border border-[#E6E0D3] dark:border-[#C8A253]/20 shadow-[0_8px_24px_rgba(4,30,23,0.07)]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href="/admin/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#065F46] hover:bg-[#041E17] text-white font-hero text-xs font-bold transition-all shadow-sm shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke Admin</span>
            </Link>
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <span className="font-hero font-extrabold text-sm text-[#041E17] dark:text-white leading-none truncate">
                Filee Web • Konverter &amp; Editor PDF
              </span>
              <span className="hidden lg:inline-block font-mono text-[9.5px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-[#F3EFE6] dark:bg-white/10 text-[#065F46] dark:text-[#E5C882]">
                100% Lokal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://github.com/KnifeLemon/Filee/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3EFE6] hover:bg-[#C8A253] text-[#041E17] dark:bg-white/10 dark:text-[#E5C882] dark:hover:bg-[#C8A253] dark:hover:text-[#041E17] border border-[#C8A253]/30 font-hero text-[11px] font-bold transition-all"
            >
              <Sparkles className="h-3 w-3" />
              <span>Filee Desktop</span>
              <ExternalLink className="h-3 w-3 opacity-75" />
            </a>
            <NightModeSwitch size="sm" />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-3 sm:px-6 py-2.5 sm:py-3.5 space-y-3.5">
        {/* Compact Sovereign Banner */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-2xl sm:rounded-[22px] px-5 py-3.5 sm:px-6 sm:py-4 bg-gradient-to-br from-[#065F46] via-[#064E3B] to-[#041E17] text-white border border-[#C8A253]/30 shadow-[0_14px_36px_rgba(4,30,23,0.18)]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-2 bottom-0 w-28 h-28 opacity-[0.13] bg-no-repeat bg-contain bg-right-bottom"
            style={{ backgroundImage: "url('/images/gandrungmangu-semringah-silhouette.webp')" }}
          />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-hero text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  Seret. Jatuhkan. <span className="text-[#E5C882]">Terkonversi.</span>
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/12 border border-[#E5C882]/35 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#E5C882]">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Filee + KillerPDF • Offline</span>
                </span>
              </div>
              <p className="font-hero text-xs text-[#F5E9CC]/90 leading-snug max-w-3xl">
                Konversi cepat Gambar (PNG/JPG/WEBP/PDF), <strong className="text-[#E5C882]">Edit PDF Studio</strong> (teks, TTD, stempel, whiteout, sensor, putar/hapus halaman), Gabung/Pisah PDF, Excel/CSV/JSON, DOCX/PPTX, hingga ZIP — langsung di browser.
              </p>
            </div>

            <div className="flex flex-wrap lg:justify-end gap-1.5 lg:max-w-sm">
              {['Edit PDF Studio', 'Gambar ↔ PDF', 'Gabung & Pisah PDF', 'Excel ↔ CSV/JSON', 'DOCX/PPTX → PDF', 'ZIP & Unzip'].map((badge) => (
                <span
                  key={badge}
                  className="px-2.5 py-1 rounded-full bg-[#041E17]/65 border border-[#C8A253]/30 font-mono text-[9.5px] font-semibold text-[#F5E9CC]"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Main Workspace: Drop Zone + Format Picker (Fits 1 Screen) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left 7 Cols: Drag & Drop + File Queue */}
          <div className="lg:col-span-7 space-y-3.5">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.length) handleAddFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl sm:rounded-[22px] text-center border-2 border-dashed transition-all duration-300 ${
                files.length > 0 ? 'px-5 py-4 sm:py-5' : 'px-6 py-7 sm:py-9'
              } ${
                isDragging
                  ? 'border-[#C8A253] bg-[#F3EFE6] dark:bg-[#064E3B]/40 scale-[1.01] shadow-xl'
                  : 'border-[#C8A253]/50 bg-white dark:bg-[#0A1F1A] hover:border-[#065F46] dark:hover:border-[#E5C882] shadow-sm'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) handleAddFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <motion.div
                animate={{ y: isDragging ? -5 : [0, -3, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                className={`mx-auto rounded-2xl bg-gradient-to-br from-[#065F46] to-[#041E17] text-[#E5C882] flex items-center justify-center shadow-md border border-[#C8A253]/40 ${
                  files.length > 0 ? 'mb-2.5 h-11 w-11' : 'mb-3 h-14 w-14'
                }`}
              >
                <UploadCloud className={files.length > 0 ? 'h-5 w-5' : 'h-7 w-7'} />
              </motion.div>
              <h2 className="font-hero text-base sm:text-lg font-extrabold text-[#041E17] dark:text-white">
                {isDragging ? 'Lepaskan Berkas di Sini!' : 'Seret & Jatuhkan Berkas ke Sini'}
              </h2>
              <p className="mt-1 font-hero text-xs text-slate-600 dark:text-slate-300">
                Atau <span className="font-bold text-[#065F46] dark:text-[#E5C882] underline">klik untuk memilih berkas</span> (mendukung banyak berkas sekaligus)
              </p>
              <p className="mt-2 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                PNG • JPG • WEBP • PDF • XLSX • CSV • DOCX • PPTX • TXT • JSON • ZIP
              </p>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="rounded-2xl sm:rounded-[22px] bg-white dark:bg-[#0A1F1A] border border-[#E6E0D3] dark:border-[#C8A253]/20 p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E6E0D3]/80 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#065F46] dark:text-[#E5C882]" />
                    <h3 className="font-hero text-xs sm:text-sm font-extrabold text-[#041E17] dark:text-white">
                      Berkas Siap Diproses ({files.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Bersihkan
                  </button>
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {files.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#05110E] border border-[#E6E0D3]/80 dark:border-white/10"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-lg bg-[#F3EFE6] dark:bg-[#064E3B]/60 flex items-center justify-center shrink-0">
                          {getCategoryIcon(file)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-hero text-xs font-bold text-[#041E17] dark:text-white truncate">{file.name}</p>
                          <p className="font-mono text-[9.5px] text-slate-500 dark:text-slate-400">
                            {formatBytes(file.size)} • {detectFileCategory(file).toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {detectFileCategory(file) === 'pdf' && (
                          <button
                            type="button"
                            onClick={() => setEditingPdfFile(file)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#C8A253] to-[#9A742B] hover:brightness-110 text-[#041E17] font-hero text-[10.5px] font-extrabold shadow-sm cursor-pointer transition-all"
                            title="Buka di PDF Editor Studio"
                          >
                            <PenTool className="h-3 w-3" />
                            <span>Edit PDF</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="h-7 w-7 rounded-full hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 flex items-center justify-center shrink-0 cursor-pointer"
                          title="Hapus berkas"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quality Slider for Images */}
                {files.some((f) => detectFileCategory(f) === 'image') && (
                  <div className="pt-2 border-t border-[#E6E0D3]/80 dark:border-white/10 flex items-center justify-between gap-4">
                    <span className="font-hero text-xs font-bold text-[#041E17] dark:text-slate-200">
                      Kualitas Gambar: <span className="font-mono text-[#065F46] dark:text-[#E5C882]">{Math.round(quality * 100)}%</span>
                    </span>
                    <input
                      type="range"
                      min="0.4"
                      max="1"
                      step="0.05"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-36 accent-[#065F46]"
                    />
                  </div>
                )}
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-hero text-xs font-semibold">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Right 5 Cols: Filee Format Target Action Panel */}
          <div className="lg:col-span-5 space-y-3.5">
            <div className="rounded-2xl sm:rounded-[22px] bg-white dark:bg-[#0A1F1A] border border-[#E6E0D3] dark:border-[#C8A253]/20 p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#C8A253]">
                    Filee Target Format
                  </span>
                  <h3 className="font-hero text-sm sm:text-base font-extrabold text-[#041E17] dark:text-white leading-tight">
                    Pilih Format Tujuan
                  </h3>
                </div>
                <span className="h-8 w-8 rounded-full bg-[#F3EFE6] dark:bg-[#064E3B] text-[#065F46] dark:text-[#E5C882] flex items-center justify-center">
                  <RefreshCw className={`h-3.5 w-3.5 ${convertingFormat ? 'animate-spin' : ''}`} />
                </span>
              </div>

              <p className="font-hero text-[11.5px] text-slate-600 dark:text-slate-300 leading-snug">
                {files.length > 0
                  ? 'Klik format di bawah untuk memproses berkas secara instan:'
                  : 'Tambahkan berkas di sebelah kiri, pilihan format yang cocok akan tampil otomatis.'}
              </p>

              <div className="grid grid-cols-2 gap-2">
                {targetFormats.map((fmt) => {
                  const isBusy = convertingFormat === fmt.id;
                  const isGold = fmt.accent === 'gold';
                  return (
                    <motion.button
                      key={fmt.id}
                      type="button"
                      disabled={files.length === 0 || Boolean(convertingFormat)}
                      whileHover={files.length > 0 ? { y: -2, scale: 1.015 } : undefined}
                      whileTap={files.length > 0 ? { scale: 0.97 } : undefined}
                      onClick={() => handleConvert(fmt.id)}
                      className={`px-3 py-2.5 rounded-xl text-left border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isGold
                          ? 'bg-gradient-to-br from-[#C8A253] to-[#9A742B] text-[#041E17] border-[#E5C882]/70 shadow-sm'
                          : 'bg-gradient-to-br from-[#065F46] to-[#041E17] text-white border-[#C8A253]/30 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono text-xs sm:text-[13px] font-black tracking-wider">{fmt.label}</span>
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : fmt.id === 'edit-pdf' ? (
                          <PenTool className="h-3.5 w-3.5 opacity-90" />
                        ) : (
                          <Sparkles className="h-3 w-3 opacity-80" />
                        )}
                      </div>
                      <p className={`mt-0.5 font-hero text-[10px] font-semibold leading-tight ${isGold ? 'text-[#041E17]/80' : 'text-[#F5E9CC]/85'}`}>
                        {fmt.desc}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Converted Results Panel */}
            <AnimatePresence>
              {outputs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl sm:rounded-[22px] bg-gradient-to-br from-[#064E3B] to-[#041E17] text-white border border-[#C8A253]/40 p-4 shadow-xl space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#E5C882]" />
                      <div>
                        <h3 className="font-hero text-xs sm:text-sm font-extrabold">Konversi Selesai ({outputs.length})</h3>
                        <p className="font-mono text-[9.5px] text-[#F5E9CC]/80">Siap diunduh ke perangkat</p>
                      </div>
                    </div>
                    {outputs.length > 1 && (
                      <button
                        type="button"
                        onClick={handleDownloadAll}
                        className="px-2.5 py-1 rounded-full bg-[#C8A253] hover:bg-[#E5C882] text-[#041E17] font-hero text-[10.5px] font-extrabold cursor-pointer"
                      >
                        Unduh Semua
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {outputs.map((out, idx) => (
                      <div
                        key={`${out.name}-${idx}`}
                        className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-white/10 border border-white/15"
                      >
                        <div className="min-w-0">
                          <p className="font-hero text-xs font-bold text-white truncate">{out.name}</p>
                          <p className="font-mono text-[9.5px] text-[#E5C882]">{formatBytes(out.size)} • {out.ext.toUpperCase()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownload(out)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#C8A253] text-[#041E17] font-hero text-[10.5px] font-extrabold shrink-0 transition-colors cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                          Unduh
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {editingPdfFile && (
        <PdfEditorStudio
          file={editingPdfFile}
          onClose={() => setEditingPdfFile(null)}
        />
      )}
    </div>
  );
}
