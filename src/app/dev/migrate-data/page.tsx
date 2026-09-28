"use client"

import { useState } from "react"
import { useFirestore, useUser } from "@/firebase"
import { collection, doc, writeBatch } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react"
import { OFFICIALS, SILTAP_DATA, SEKRETARIS_Kecamatan_INSENTIF_DATA } from "@/lib/personel-data"
import Link from "next/link"

export default function MigrateDataPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [status, setStatus] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)

  const runMigration = async () => {
    if (!db) return
    setIsProcessing(true)
    setStatus("Memulai migrasi ke Firestore...")

    try {
      const batch = writeBatch(db)

      // 1. Migrate Officials to 'personnel'
      OFFICIALS.forEach((item) => {
        const ref = doc(collection(db, "personnel"))
        batch.set(ref, {
          ...item,
          name: item.name.toUpperCase(),
          jabatan: item.jabatan.toUpperCase(),
          active: true,
          createdAt: new Date().toISOString()
        })
      })

      // 2. Migrate Siltap to 'siltap'
      SILTAP_DATA.forEach((item) => {
        const ref = doc(collection(db, "siltap"))
        batch.set(ref, { ...item, createdAt: new Date().toISOString() })
      })

      // 3. Migrate SKRETARIS Kecamatan Insentif to 'SKRETARIS Kecamatan_insentif'
      SEKRETARIS_Kecamatan_INSENTIF_DATA.forEach((item) => {
        const ref = doc(collection(db, "SKRETARIS Kecamatan_insentif"))
        batch.set(ref, { ...item, createdAt: new Date().toISOString() })
      })

      await batch.commit()
      setStatus("✅ Migrasi Berhasil! Semua data master kini tersimpan di Firestore.")
    } catch (error: any) {
      console.error(error)
      setStatus("❌ Gagal: " + error.message + ". Pastikan Anda memiliki akses Admin.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto space-y-6">
      <header className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" asChild><Link href="/dashboard/"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <h1 className="text-sm font-bold uppercase">Setup Utility</h1>
      </header>

      <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-xl font-black uppercase">Migrasi Database</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed font-bold uppercase">
              Klik tombol di bawah untuk memindahkan data master dari file statis ke database Firestore.
              Gunakan akun Admin resmi untuk menjalankan proses ini.
            </p>
          </div>

          <Button
            onClick={runMigration}
            disabled={isProcessing}
            className="w-full h-14 rounded-2xl font-black uppercase text-lg shadow-xl shadow-primary/20"
          >
            {isProcessing ? <Loader2 className="animate-spin mr-2" /> : "Mulai Migrasi Sekarang"}
          </Button>

          {status && (
            <div className={`p-4 rounded-2xl text-xs font-bold uppercase flex items-center gap-2 ${status.includes('Berhasil') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-100 border'}`}>
              {status}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}