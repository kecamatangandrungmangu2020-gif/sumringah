"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FileUp, Map, User } from "lucide-react"
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
    { label: "Dokumentasi", icon: FileUp, href: "/kegiatan/" },
    { label: "SPPD", icon: Map, href: "/sppd/" },
    { label: "Data Kecamatan", icon: User, href: "/profile/" },
  ]

  if (!mounted) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card px-4 pb-safe-area-inset-bottom md:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
      <div className="flex justify-around py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard/" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1.5 px-4 py-1 transition-all active:scale-90 relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-6 w-6 transition-transform", isActive && "stroke-[2.5px] scale-110")} />
              <span className={cn("text-[9px] uppercase tracking-wider font-black", isActive ? "opacity-100" : "opacity-60")}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -top-1 w-1 h-1 rounded-full bg-primary animate-pulse" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}