'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
  Clock,
  ShieldCheck,
  PhoneCall,
} from 'lucide-react';
import { PresentationSheet, CardSilhouetteOverlay } from './PresentationSheet';
import {
  staggerContainer,
  listItemStagger,
  VIEWPORT_ONCE,
} from './motion-variants';

export function PengaduanSection() {
  const [jenis, setJenis] = useState<'pengaduan' | 'informasi'>('pengaduan');
  const [form, setForm] = useState({ nama: '', nik: '', nohp: '', email: '', subjek: '', isi: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim() || !form.nohp.trim() || !form.subjek.trim() || !form.isi.trim()) {
      setError('Nama, No. HP, Subjek, dan Isi wajib diisi.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/pengaduan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, jenis }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setForm({ nama: '', nik: '', nohp: '', email: '', subjek: '', isi: '' });
      } else {
        setError(json.message || 'Gagal mengirim. Silakan coba lagi.');
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const slaItems = [
    { label: 'Pengaduan Darurat', time: '1 x 24 Jam', code: '01' },
    { label: 'Pengaduan Umum', time: '3 x 24 Jam', code: '02' },
    { label: 'Permintaan Informasi', time: '5 x 24 Jam', code: '03' },
  ];

  return (
    <PresentationSheet
      id="pengaduan"
      sectionNumber="06"
      deckLabel="Partisipasi & Siaga"
    >
      {/* Top Ocean Panoramic Banner */}
      <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-r from-[#041E17] via-[#064E3B] to-[#065F46] text-white p-6 sm:p-8 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <CardSilhouetteOverlay pattern="waves" />
        <div className="relative z-10 space-y-1.5 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/15 font-mono text-[10px] uppercase tracking-[0.18em] text-[#C8A253]">
            <MessageSquare className="h-3 w-3" />
            Pusat Interaksi &amp; Layanan Cepat
          </span>
          <h2 className="font-hero font-bold text-2xl sm:text-3xl tracking-tight text-white">
            Pengaduan &amp; Permintaan Informasi Warga
          </h2>
          <p className="font-hero text-xs sm:text-sm text-[#F5E9CC]/85">
            Sampaikan keluhan, masukan, atau permintaan informasi resmi. Tim Kecamatan Gandrungmangu siap merespons secara transparan.
          </p>
        </div>
        <a
          href="https://wa.me/6208950881484?text=Halo,%20saya%20ingin%20menyampaikan%20pengaduan%20kepada%20Kecamatan%20Gandrungmangu."
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#C8A253] hover:bg-white text-[#041E17] font-hero text-xs font-bold uppercase tracking-wider shrink-0 transition-all"
        >
          <PhoneCall className="h-4 w-4" />
          <span>WhatsApp 0895-0881-1484</span>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KIRI (4 cols): Info Layanan & SLA Dotted-Leader */}
        <motion.div
          variants={staggerContainer(0.08, 0.04)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="lg:col-span-4 space-y-4"
        >
          <div className="rounded-[22px] bg-[#FAF8F5] dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-hero font-bold text-sm sm:text-base text-[#041E17] dark:text-white">
                Standar Waktu Respons
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#065F46] text-white font-mono text-[9.5px] font-bold uppercase">
                SLA Resmi
              </span>
            </div>

            <div className="space-y-3">
              {slaItems.map((item) => (
                <motion.div
                  key={item.code}
                  variants={listItemStagger}
                  className="flex items-center gap-3 pb-2.5 border-b border-dashed border-slate-300/80 dark:border-white/15 last:border-0 last:pb-0"
                >
                  <span className="h-7 w-7 rounded-full bg-[#041E17] dark:bg-[#065F46] text-white flex items-center justify-center shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-hero text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1">
                    {item.label}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#065F46] dark:text-[#C8A253] shrink-0">
                    {item.time}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] bg-[#F3EFE6] dark:bg-[#0f2230] border border-[#E5C882]/60 dark:border-cyan-800/30 p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#065F46] dark:text-[#E5C882]">
              <ShieldCheck className="h-4 w-4" />
              <h4 className="font-hero font-bold text-xs uppercase tracking-wider">
                Jaminan Kerahasiaan
              </h4>
            </div>
            <p className="font-hero text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Identitas pelapor dilindungi penuh dan laporan langsung diteruskan kepada petugas berwenang di lingkungan Kecamatan Gandrungmangu.
            </p>
          </div>
        </motion.div>

        {/* KANAN (8 cols): Form Pengaduan */}
        <div className="lg:col-span-8">
          {success ? (
            <div className="rounded-[24px] bg-[#FAF8F5] dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 p-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-hero text-xl font-bold text-[#041E17] dark:text-white">
                {jenis === 'informasi' ? 'Permintaan Informasi Terkirim!' : 'Pengaduan Anda Terkirim!'}
              </h3>
              <p className="font-hero text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-sm mx-auto">
                Terima kasih. Tim kami akan segera menindaklanjuti dan menghubungi Anda melalui WhatsApp atau email yang diberikan.
              </p>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#041E17] hover:bg-[#065F46] text-white font-hero font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Kirim Laporan Lainnya
              </button>
            </div>
          ) : (
            <div className="rounded-[24px] bg-[#FAF8F5] dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 p-5 sm:p-7 space-y-5">
              {/* Tab Switcher */}
              <div className="flex gap-2 p-1.5 rounded-full bg-white dark:bg-[#0A1F1A] border border-slate-200/80 dark:border-white/10">
                {[
                  { value: 'pengaduan' as const, label: 'Pengaduan Masyarakat' },
                  { value: 'informasi' as const, label: 'Permintaan Informasi' },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setJenis(tab.value)}
                    className={`flex-1 py-2.5 rounded-full font-hero text-xs font-bold transition-all duration-200 cursor-pointer ${
                      jenis === tab.value
                        ? 'bg-[#041E17] dark:bg-[#065F46] text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-[#041E17] dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#041E17] dark:text-slate-200 mb-1.5">
                      Nama Lengkap <span className="text-rose-500">*</span>
                    </label>
                    <input
                      name="nama"
                      value={form.nama}
                      onChange={handleChange}
                      required
                      placeholder="Nama lengkap Anda"
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#0A1F1A] border border-slate-200/90 dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#041E17] dark:text-slate-200 mb-1.5">
                      NIK (Opsional)
                    </label>
                    <input
                      name="nik"
                      value={form.nik}
                      onChange={handleChange}
                      maxLength={16}
                      placeholder="16 digit NIK (opsional)"
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#0A1F1A] border border-slate-200/90 dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#041E17] dark:text-slate-200 mb-1.5">
                      No. HP / WhatsApp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      name="nohp"
                      value={form.nohp}
                      onChange={handleChange}
                      required
                      type="tel"
                      placeholder="08xx-xxxx-xxxx"
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#0A1F1A] border border-slate-200/90 dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#041E17] dark:text-slate-200 mb-1.5">
                      Email (Opsional)
                    </label>
                    <input
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      type="email"
                      placeholder="email@contoh.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#0A1F1A] border border-slate-200/90 dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#041E17] dark:text-slate-200 mb-1.5">
                    Subjek / Judul <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="subjek"
                    value={form.subjek}
                    onChange={handleChange}
                    required
                    placeholder={
                      jenis === 'informasi'
                        ? 'Contoh: Permintaan data kependudukan Kecamatan'
                        : 'Contoh: Laporan pelayanan atau infrastruktur wilayah'
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#0A1F1A] border border-slate-200/90 dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#041E17] dark:text-slate-200 mb-1.5">
                    {jenis === 'informasi' ? 'Detail Informasi yang Diminta' : 'Uraian Pengaduan'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    name="isi"
                    value={form.isi}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder={
                      jenis === 'informasi'
                        ? 'Jelaskan informasi yang Anda butuhkan secara rinci...'
                        : 'Jelaskan masalah yang terjadi secara rinci (lokasi, waktu, kronologi)...'
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#0A1F1A] border border-slate-200/90 dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all resize-none leading-relaxed"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full neu-btn-primary font-hero font-bold text-xs uppercase tracking-wider disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>
                      {submitting
                        ? 'Mengirim...'
                        : jenis === 'informasi'
                          ? 'Kirim Permintaan'
                          : 'Kirim Pengaduan'}
                    </span>
                  </button>
                  <p className="font-hero text-slate-500 dark:text-slate-400 text-[11px]">
                    Data Anda dilindungi dan hanya digunakan untuk keperluan pelayanan.
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </PresentationSheet>
  );
}
