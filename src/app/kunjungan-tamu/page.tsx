import React from 'react';
import { KunjunganTamuPortal } from '@/components/kunjungan-tamu/KunjunganTamuPortal';
import { InputChannel } from '@/types/kunjungan-tamu';

export default async function KunjunganTamuPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const params = await searchParams;
  const channel: InputChannel =
    params?.channel === 'front_office'
      ? 'front_office'
      : params?.channel === 'kiosk'
        ? 'kiosk'
        : 'mandiri_hp';

  return <KunjunganTamuPortal initialChannel={channel} />;
}
