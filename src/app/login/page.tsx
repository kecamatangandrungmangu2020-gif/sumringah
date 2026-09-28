"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, LogIn, Loader2, KeyRound, Mail, AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import Link from "next/link"

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(6, "Password minimal 6 karakter."),
})

/**
 * Halaman Login Khusus Sistem Utama
 */
export default function LoginPage() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    // Redirect jika sudah login
    if (user && !isUserLoading) {
      router.push("/admin/")
    }
  }, [user, isUserLoading, router])

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    if (!auth) return
    setIsProcessing(true)
    try {
      // 1. Otentikasi langsung ke Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, values.email.trim(), values.password)

      // 2. Simpan profil / jejak login ke Firestore jika ada koneksi
      if (db && userCredential?.user) {
        try {
          await setDoc(doc(db, "users", userCredential.user.uid), {
            id: userCredential.user.uid,
            email: values.email.trim().toLowerCase(),
            lastLogin: new Date().toISOString()
          }, { merge: true })
        } catch {
          // Abaikan jika Firestore sedang tidak tersedia, sesi login tetap valid
        }
      }

      toast({
        title: "Login Berhasil",
        description: `Selamat datang, ${userCredential.user.email}. Membuka Dashboard Admin...`,
      })

      router.push("/admin/")
    } catch (error: any) {
      console.error("Login Error:", error)
      let errorMsg = "Terjadi kesalahan saat memproses login."
      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-login-credentials'
      ) {
        errorMsg = "Email atau kata sandi tidak cocok dengan akun di Firebase Authentication."
      } else if (error.code === 'auth/user-disabled') {
        errorMsg = "Akun ini telah dinonaktifkan di Firebase Authentication."
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = "Terlalu banyak percobaan gagal. Silakan coba beberapa saat lagi."
      } else if (error.code === 'auth/network-request-failed') {
        errorMsg = "Koneksi jaringan gagal. Periksa koneksi internet Anda."
      } else if (error.message) {
        errorMsg = error.message
      }

      toast({
        variant: "destructive",
        title: "Gagal Masuk",
        description: errorMsg,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-primary/5">
      <Card className="w-full max-w-md shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-card">
        <CardHeader className="text-center space-y-4 pb-4 pt-12 relative">
          <Button variant="ghost" size="icon" asChild className="absolute left-6 top-6 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
            <Link href="/" title="Kembali ke Halaman Awal">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Kembali ke Halaman Awal</span>
            </Link>
          </Button>
          <div className="mx-auto h-20 w-20 rounded-[2rem] bg-primary flex items-center justify-center shadow-2xl shadow-primary/30">
            <Home className="text-primary-foreground h-10 w-10" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black tracking-tighter uppercase text-primary">SISTEM UTAMA</CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Masuk Menggunakan Akun Firebase Administrator</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-8 sm:p-10 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Email Admin</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Email terdaftar di Firebase..."
                          {...field}
                          className="h-12 rounded-xl pl-10 text-sm border-primary/10 bg-muted/30"
                          autoComplete="off"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Kata Sandi</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="******"
                          {...field}
                          className="h-12 rounded-xl pl-10 pr-11 text-sm border-primary/10 bg-muted/30"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary focus:outline-none p-1 transition-colors"
                          tabIndex={-1}
                          aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-14 text-base font-black uppercase gap-3 shadow-lg active:scale-95 transition-all rounded-2xl mt-4 text-white bg-primary hover:bg-primary/90 shadow-primary/20"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    Masuk ke Sistem Utama
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="space-y-3">
            <div className="p-4 bg-muted/40 rounded-xl flex items-start gap-3 border border-dashed border-border">
              <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase">
                Gunakan email dan kata sandi yang telah didaftarkan pada Firebase Authentication untuk mengakses Sistem Utama.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
