"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Calendar, FileUp, Map, User } from "lucide-react"
import { cn } from "@/lib/utils"
import * as React from "react"

export function BottomNav() {
  const pathname = usePathname()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const navItems = [
    { label: "Beranda", icon: LayoutDashboard, href: "/dashboard/" },
    { label: "Agenda", icon: Calendar, href: "/agenda/" },
    { label: "Kegiatan", icon: FileUp, href: "/kegiatan/" },
    { label: "SPPD", icon: Map, href: "/sppd/" },
    { label: "Profil", icon: User, href: "/profile/" },
  ]

  if (!mounted) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#0A1F1A]/95 backdrop-blur-xl px-2 pb-safe-area-inset-bottom md:hidden shadow-[0_-8px_30px_rgba(4,30,23,0.08)]">
      <div className="flex justify-around py-2.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard/" && pathname.startsWith(item.href.replace(/\/$/, "")))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-2xl transition-all active:scale-95 relative",
                isActive
                  ? "text-[#065F46] dark:text-[#E5C882]"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              <item.icon className={cn("h-5 w-5 transition-transform", isActive && "stroke-[2.5px] scale-110")} />
              <span className={cn("font-hero text-[9px] uppercase tracking-wider font-bold", isActive ? "opacity-100" : "opacity-75")}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -top-0.5 w-1.5 h-1.5 rounded-full bg-[#C8A253] shadow-[0_0_6px_#C8A253]" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
