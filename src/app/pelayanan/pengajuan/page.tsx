'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPengajuanSuratPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pelayanan');
  }, [router]);

  return null;
}


