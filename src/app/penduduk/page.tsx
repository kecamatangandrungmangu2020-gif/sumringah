'use client';

import { PageHeader } from '@/components/page-header';
import { ResidentList } from './_components/resident-list';

export default function AdminPendudukPage() {
  return (
    <div className="p-6 md:p-8 space-y-6 pb-16 max-w-7xl mx-auto">
      <PageHeader
        title="Database Kependudukan"
        description="Manajemen data penduduk Kecamatan Gandrungmangu. Gunakan fitur pencarian untuk menemukan data warga dengan cepat."
      />

      <ResidentList />
    </div>
  );
}

