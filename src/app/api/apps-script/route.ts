import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_CONFIG } from '@/lib/google-config';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const resp = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn('[api/apps-script] Google Apps Script HTTP status:', resp.status);
      return NextResponse.json({
        success: false,
        error: `Google Apps Script returned HTTP ${resp.status}`,
      });
    }

    const text = await resp.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      console.warn('[api/apps-script] Response is not JSON:', text.substring(0, 300));
      return NextResponse.json({
        success: false,
        error: 'Respons dari Google Apps Script tidak valid.',
      });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[api/apps-script] Error proxying to Apps Script:', err?.message);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Gagal menghubungi server Google Apps Script.',
    });
  }
}
