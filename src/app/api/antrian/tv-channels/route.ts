import { NextResponse } from 'next/server';

const M3U_OTT_URL = 'https://raw.githubusercontent.com/dhasap/dhanytv/main/dhanytv-ott.m3u';
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 menit

// In-memory cache agar tidak fetch berulang
let cachedChannels: Channel[] | null = null;
let cacheTimestamp = 0;

export interface Channel {
  name: string;
  url: string;
  logo: string;
  group: string;
  tvgId: string;
}

function parseM3U(raw: string): Channel[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const channels: Channel[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('#EXTINF')) continue;

    // Parse EXTINF attributes
    const nameMatch = line.match(/,(.+)$/);
    const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
    const groupMatch = line.match(/group-title="([^"]*)"/i);
    const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);

    const name = nameMatch ? nameMatch[1].trim() : 'Tanpa Nama';
    const logo = logoMatch ? logoMatch[1] : '';
    const group = groupMatch ? groupMatch[1] : 'Lainnya';
    const tvgId = tvgIdMatch ? tvgIdMatch[1] : '';

    // Cari URL stream di baris berikutnya (skip baris yang dimulai dengan #)
    let url = '';
    let j = i + 1;
    while (j < lines.length) {
      const nextLine = lines[j];
      if (nextLine.startsWith('#EXTINF')) break;
      if (!nextLine.startsWith('#') && (nextLine.startsWith('http://') || nextLine.startsWith('https://'))) {
        url = nextLine;
        break;
      }
      j++;
    }

    if (!url) continue;

    // Filter hanya channel HLS (m3u8) yang langsung bisa diputar di browser
    // Skip DASH (mpd), DRM (clearkey), atau URL yang tidak jelas
    const isHLS = url.includes('.m3u8') || url.includes('m3u8');
    const isDASH = url.includes('.mpd') || url.includes('mpd');
    if (isDASH) continue; // skip DASH/DRM

    // Skip channel yang butuh header khusus (biasanya dari dens.tv yang CORS-ketat)
    // Tetapi tetap sertakan karena browser akan mencoba
    channels.push({ name, url, logo, group, tvgId });
  }

  return channels;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupFilter = searchParams.get('group') || '';

    // Gunakan cache jika masih valid
    const now = Date.now();
    if (cachedChannels && (now - cacheTimestamp) < CACHE_DURATION_MS) {
      const result = groupFilter
        ? cachedChannels.filter(c => c.group.toLowerCase() === groupFilter.toLowerCase())
        : cachedChannels;

      const groups = [...new Set(cachedChannels.map(c => c.group))].sort();
      return NextResponse.json({ success: true, channels: result, groups, cached: true });
    }

    // Fetch dari GitHub
    const res = await fetch(M3U_OTT_URL, {
      next: { revalidate: 600 }, // ISR cache 10 menit
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AntrianDisplay/1.0)' }
    });

    if (!res.ok) {
      throw new Error(`Gagal fetch M3U: ${res.status}`);
    }

    const rawM3U = await res.text();
    const channels = parseM3U(rawM3U);

    // Simpan ke cache
    cachedChannels = channels;
    cacheTimestamp = now;

    const groups = [...new Set(channels.map(c => c.group))].sort();
    const result = groupFilter
      ? channels.filter(c => c.group.toLowerCase() === groupFilter.toLowerCase())
      : channels;

    return NextResponse.json({
      success: true,
      channels: result,
      groups,
      total: channels.length,
      cached: false
    });
  } catch (error) {
    console.error('TV Channels API error:', error);

    // Kembalikan channel fallback yang sudah diketahui stabil
    const fallbackChannels: Channel[] = [
      { name: 'TVRI Nasional', url: 'https://ott-balancer.tvri.go.id/live/eds/Nasional/hls/Nasional.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/id/6/61/TVRI_2019.png', group: 'Indonesia Channels', tvgId: 'TVRI.id' },
      { name: 'Metro TV', url: 'https://edge.medcom.id/live-edge/smil:metro.smil/playlist.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/id/2/26/Metro_TV_2010.svg', group: 'Indonesia Channels', tvgId: 'MetroTV.id' },
      { name: 'RCTI HD', url: 'https://mncmedia.malingtv.workers.dev/rcti.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/id/c/ce/RCTI_2019.png', group: 'Indonesia Channels', tvgId: 'RCTI.id' },
      { name: 'MNC TV HD', url: 'https://mncmedia.malingtv.workers.dev/mnctv.m3u8', logo: '', group: 'Indonesia Channels', tvgId: 'MNCTV.id' },
      { name: 'iNews HD', url: 'https://live.i-news.tv/hls/stream.m3u8', logo: '', group: 'Indonesia Channels', tvgId: 'iNews.id' },
    ];

    return NextResponse.json({
      success: true,
      channels: fallbackChannels,
      groups: ['Indonesia Channels'],
      total: fallbackChannels.length,
      cached: false,
      fallback: true
    });
  }
}
