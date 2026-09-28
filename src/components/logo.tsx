import { Building2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2 text-primary", className)}>
      <Building2 className="h-7 w-7" />
      <span className="text-xl font-bold tracking-tight">KecamatanKU</span>
    </Link>
  );
}

export default Logo;
