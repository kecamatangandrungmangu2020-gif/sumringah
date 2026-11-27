"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Loader2, Plane, Printer, Map, LayoutList, PieChart } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SppdUpload } from "@/components/sppd/SppdUpload"
import { SppdCetakForm } from "@/components/sppd/SppdCetakForm"
import { SppdRekap } from "@/components/sppd/SppdRekap"
import { useUser } from "@/firebase"

export default function SppdPage() {
  const { user, isUserLoading } = useUser()
  const [activeTab, setActiveTab] = useState("pengajuan")

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#065F46] dark:text-[#E5C882]" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4 p-4 text-center">
        <h2 className="text-xl font-bold text-[#065F46] dark:text-[#E5C882]">Akses Dibatasi</h2>
        <p className="text-muted-foreground">Silakan login untuk mengelola Manajemen SPPD.</p>
        <Button asChild variant="default" className="bg-[#065F46] hover:bg-[#041E17] text-white">
          <Link href="/login">Login Sekarang</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="hover:bg-[#065F46]/10">
          <Link href="/">
            <ChevronLeft className="h-6 w-6 text-[#065F46] dark:text-[#E5C882]" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-black text-[#065F46] dark:text-[#E5C882] uppercase tracking-tight">Manajemen SPPD</h1>
          <p className="text-xs text-muted-foreground">Sistem Pengelolaan Biaya & Cetak Dokumen Dinas</p>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full h-14 mb-8 bg-[#F3EFE6]/80 dark:bg-white/5 p-1.5 rounded-2xl border border-[#065F46]/15 dark:border-[#C8A253]/20">
          <TabsTrigger value="pengajuan" className="rounded-xl gap-2 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 data-[state=active]:bg-[#065F46] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <Map className="h-4 w-4" />
            Pengajuan
          </TabsTrigger>
          <TabsTrigger value="cetak" className="rounded-xl gap-2 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 data-[state=active]:bg-[#065F46] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <Printer className="h-4 w-4" />
            Cetak
          </TabsTrigger>
          <TabsTrigger value="rekap" className="rounded-xl gap-2 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 data-[state=active]:bg-[#065F46] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <PieChart className="h-4 w-4" />
            Rekapitulasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pengajuan" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-card p-6 rounded-3xl border shadow-xl border-[#065F46]/15 dark:border-[#C8A253]/20">
            <div className="mb-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#065F46]/10 dark:bg-[#065F46]/30 flex items-center justify-center">
                <Plane className="h-5 w-5 text-[#065F46] dark:text-[#E5C882]" />
              </div>
              <div>
                <h3 className="font-black text-lg text-[#065F46] dark:text-[#E5C882] uppercase leading-tight">Form Pengajuan</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Input rincian biaya perjalanan dinas</p>
              </div>
            </div>
            <SppdUpload onSuccess={() => setActiveTab("rekap")} />
          </div>
        </TabsContent>

        <TabsContent value="cetak" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-card p-6 rounded-3xl border shadow-xl border-[#065F46]/15 dark:border-[#C8A253]/20">
             <div className="mb-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#065F46]/10 dark:bg-[#065F46]/30 flex items-center justify-center">
                <Printer className="h-5 w-5 text-[#065F46] dark:text-[#E5C882]" />
              </div>
              <div>
                <h3 className="font-black text-lg text-[#065F46] dark:text-[#E5C882] uppercase leading-tight">Cetak Dokumen</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Cetak Surat Tugas & SPPD Format PDF</p>
              </div>
            </div>
            <SppdCetakForm />
          </div>
        </TabsContent>

        <TabsContent value="rekap" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-2">
              <PieChart className="h-5 w-5 text-[#065F46] dark:text-[#E5C882]" />
              <h4 className="font-black text-[#065F46] dark:text-[#E5C882] uppercase tracking-wider text-sm">Rekapitulasi Administrasi SPPD</h4>
            </div>
            <SppdRekap />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
