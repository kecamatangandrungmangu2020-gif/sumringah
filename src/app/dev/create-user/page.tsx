
"use client"

import { useState } from "react"
import { auth, firestore as db } from "@/firebase"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth"
import { doc, getDocs, collection, updateDoc } from "firebase/firestore"
import { Loader2, ArrowLeft, RefreshCw, AlertCircle, Info, LogOut, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function CreateUserPage() {
  const [logs, setLogs] = useState<{ msg: string, type: 'info' | 'success' | 'error' | 'warn' }[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    setLogs(prev => [{ msg: `${new Date().toLocaleTimeString()} - ${msg}`, type }, ...prev])
  }

  const runProcess = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    setIsDone(false)
    setLogs([])

    const adminEmail = auth.currentUser?.email;
    addLog(`🚀 Memulai sinkronisasi kredensial (Admin: ${adminEmail})...`, "info")

    try {
      const personelRef = collection(db, "personel")
      const snapshot = await getDocs(personelRef)

      if (snapshot.empty) {
        addLog("❌ Tidak ada data personel ditemukan di Firestore.", "error")
        setIsProcessing(false)
        return
      }

      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      addLog(`📊 Ditemukan ${users.length} data. Memproses antrean...`, "info")

      for (const u of users as any[]) {
        const username = (u.username || "unknown").toLowerCase().trim()
        const email = `${username}@gandrungmangu.id`
        const password = u.password || "password123"

        addLog(`⏳ Sinkronisasi: [${username.toUpperCase()}]...`)
        await sleep(500);

        try {
          let finalUid = "";

          try {
            // Coba daftarkan akun baru
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            finalUid = userCredential.user.uid;
            addLog(`✅ Auth: [${username}] BARU didaftarkan.`, 'success')
          } catch (authErr: any) {
            // Jika sudah ada, coba dapatkan UID-nya dengan login sementara
            if (authErr.code === 'auth/email-already-in-use' || authErr.code === 'auth/email-already-exists') {
              try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password)
                finalUid = userCredential.user.uid;
                addLog(`ℹ️ Auth: [${username}] sudah ada di sistem.`, 'info')
              } catch (loginErr: any) {
                addLog(`⚠️ Auth: Password [${username}] di Database berbeda dengan sistem login.`, 'warn')
                // Lewati update karena kita tidak bisa verifikasi identitas
                continue;
              }
            } else {
              throw authErr
            }
          }

          // Update UID ke Firestore jika berhasil didapat
          if (finalUid) {
            // Karena rules mengizinkan Admin atau Pemilik mengupdate, dan sekarang kita sedang login sebagai user tersebut
            await updateDoc(doc(db, "personel", u.id), {
              uid: finalUid,
              email: email,
              username: username,
              updated_at: new Date().toISOString()
            });
            addLog(`📝 Firestore: UID [${username}] diperbarui.`, 'success');
          }

          // JANGAN SIGNOUT DI SINI AGAR TIDAK MEMUTUS SESI Loop
          // Cukup lanjut ke iterasi berikutnya, signIn berikutnya akan otomatis menggantikan user aktif.

        } catch (err: any) {
          addLog(`❌ ERROR [${username}]: ${err.message}`, "error")
        }
      }

    } catch (globalErr: any) {
      addLog(`💥 GAGAL TOTAL: ${globalErr.message}`, "error")
    }

    // Akhiri dengan Sign Out total demi keamanan
    await signOut(auth);
    addLog("🏁 Semua proses selesai. Sesi telah dibersihkan demi keamanan.", "info")
    setIsProcessing(false)
    setIsDone(true)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/dashboard/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900">Credential Sync Tool</h1>
        </div>
        <Button onClick={runProcess} disabled={isProcessing} className="rounded-xl gap-2 font-black uppercase shadow-lg shadow-primary/20 bg-primary">
          {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
          Jalankan Sinkronisasi
        </Button>
      </div>

      <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-black text-amber-800 uppercase">Perhatian:</p>
            <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase">
              1. Alat ini mendaftarkan akun di sistem login berdasarkan data Username di Manajemen Akun.<br />
              2. Setelah selesai, sesi admin akan otomatis logout. Silakan login kembali untuk masuk Panel Monitoring.<br />
              3. Jika muncul "Missing Permissions", pastikan Anda menjalankan ini dalam kondisi Login sebagai Admin.
            </p>
          </div>
        </div>
      </div>

      {isDone && (
        <div className="p-6 bg-slate-900 text-white rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 animate-in zoom-in-95 border-t-8 border-primary">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-black uppercase">Sinkronisasi Selesai</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sesi Anda telah kedaluwarsa demi keamanan.</p>
            </div>
          </div>
          <Button asChild variant="secondary" className="rounded-xl font-black uppercase text-[10px] h-11 px-8">
            <Link href="/login/">Masuk Kembali</Link>
          </Button>
        </div>
      )}

      <div className="bg-white rounded-3xl border shadow-xl p-6 h-[500px] overflow-y-auto space-y-2 font-mono text-[10px] relative">
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b pb-2 mb-4 flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[8px]">
          <Info className="h-3 w-3" /> Log Aktivitas
        </div>
        {logs.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <RefreshCw className="h-10 w-10 text-slate-100 mx-auto" />
            <p className="text-slate-300 italic uppercase tracking-widest">Siap memproses data...</p>
          </div>
        )}
        {logs.map((log, i) => (
          <div key={i} className={`p-3 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-left-1 duration-300 ${log.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' :
            log.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' :
              log.type === 'warn' ? 'bg-yellow-50 border-yellow-100 text-yellow-700' :
                'bg-slate-50 border-slate-100 text-slate-600'
            }`}>
            <span className="shrink-0 font-black">[{log.type.toUpperCase()}]</span>
            <span className="font-bold">{log.msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
