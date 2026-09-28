'use client';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import {
  LayoutDashboard,
  FileText,
  MessageSquareWarning,
  Megaphone,
  Home,
  Newspaper,
  Menu,
  X,
  BarChart3,
  Info,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard Utama' },
  { href: '/pelayanan-Kecamatan', icon: BookOpen, label: 'Pelayanan Kecamatan' },
  { href: '/statistik', icon: BarChart3, label: 'Statistik Kecamatan' },
  { href: '/profil-Kecamatan', icon: Info, label: 'Profil Kecamatan' },
  { href: '/BeritaKecamatan', icon: Newspaper, label: 'Berita Kecamatan' },
  { href: '/layanan-surat', icon: FileText, label: 'Layanan Surat' },
  { href: '/pengaduan', icon: MessageSquareWarning, label: 'Pengaduan Warga' },
  { href: '/pengumuman', icon: Megaphone, label: 'Pengumuman' },
];

function MobileHeader() {
  const { toggleSidebar, openMobile } = useSidebar();

  return (
    <header className="md:hidden sticky top-0 z-40 w-full h-16 bg-primary flex items-center justify-between px-6 shadow-md text-white border-b border-white/10">
      <Logo />
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="text-white hover:bg-white/10"
      >
        {openMobile ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>
    </header>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { auth, user } = useFirebase();

  const handleLogout = async () => {
    if (auth) await signOut(auth);
  };

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-white/10 bg-primary">
        <SidebarHeader className="p-8">
          <Logo />
        </SidebarHeader>
        <SidebarContent className="px-6">
          <div className="mb-6 px-4">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Navigasi Portal</p>
          </div>
          <SidebarMenu className="gap-3">
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Halaman Depan" className="rounded-2xl h-12 transition-all hover:bg-white/5">
                <Link href="/" className="flex items-center gap-3">
                  <Home className="text-white/40" />
                  <span className="font-bold">Beranda Publik</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  className="rounded-2xl h-12 transition-all data-[active=true]:bg-secondary data-[active=true]:text-primary-foreground"
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className={pathname === item.href ? 'text-primary-foreground' : 'text-white/40'} />
                    <span className="font-bold">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-8">
          <div className="bg-white/5 rounded-3xl p-5 border border-white/10 space-y-4">
            <p className="text-[9px] text-white/40 font-black text-center uppercase tracking-widest leading-relaxed">
              Pelayanan Mandiri Digital Gandrungmangu
            </p>
            {user ? (
              <Button
                onClick={handleLogout}
                className="w-full justify-center bg-secondary text-primary-foreground rounded-2xl hover:bg-yellow-600 transition-all font-black shadow-lg shadow-secondary/20 uppercase tracking-widest"
              >
                KELUAR
              </Button>
            ) : (
              <Button
                asChild
                className="w-full justify-center bg-secondary text-primary-foreground rounded-2xl hover:bg-yellow-600 transition-all font-black shadow-lg shadow-secondary/20 uppercase tracking-widest"
              >
                <Link href="/portal">MASUK</Link>
              </Button>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background flex flex-col min-h-screen">
        <MobileHeader />
        <main className="max-w-[1400px] mx-auto w-full p-4 md:p-12 flex-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}