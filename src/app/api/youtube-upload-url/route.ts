import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Konfigurasi YOUTUBE_CLIENT_ID atau YOUTUBE_CLIENT_SECRET belum ada di server." },
        { status: 500 }
      );
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: "YOUTUBE_REFRESH_TOKEN belum diset di .env / .env.local. Silakan masukkan Refresh Token yang didapatkan dari Google OAuth Playground." },
        { status: 400 }
      );
    }

    const { title, description, fileSize, fileType } = await req.json();

    // 1. Dapatkan access_token baru menggunakan refresh_token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("[YouTube OAuth Error]", tokenData);
      return NextResponse.json(
        {
          error:
            tokenData.error_description ||
            tokenData.error ||
            "Gagal menukar Refresh Token dengan Access Token Google.",
        },
        { status: 401 }
      );
    }

    const accessToken = tokenData.access_token;

    const requestOrigin =
      req.headers.get("origin") ||
      (req.headers.get("referer") ? new URL(req.headers.get("referer")!).origin : null) ||
      "http://localhost:3000";

    // 2. Inisiasi Resumable Upload Session ke YouTube Data API v3
    // Menggunakan uploadType=resumable, status unlisted, dan menyertakan Origin browser untuk CORS
    const youtubeInitResponse = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": fileType || "video/mp4",
          "X-Upload-Content-Length": String(fileSize || 0),
          Origin: requestOrigin,
        },
        body: JSON.stringify({
          snippet: {
            title: (title || "Video Berita Gandrungmangu").slice(0, 100),
            description: (description || "Dokumentasi dan publikasi kegiatan Kecamatan Gandrungmangu.").slice(0, 5000),
            categoryId: "22", // People & Blogs
          },
          status: {
            privacyStatus: "unlisted",
            selfDeclaredMadeForKids: false,
          },
        }),
      }
    );

    const uploadUrl = youtubeInitResponse.headers.get("location");

    if (!youtubeInitResponse.ok || !uploadUrl) {
      const errText = await youtubeInitResponse.text();
      console.error("[YouTube Init Upload Error]", youtubeInitResponse.status, errText);
      return NextResponse.json(
        { error: `Gagal membuat sesi upload YouTube: ${errText || youtubeInitResponse.statusText}` },
        { status: youtubeInitResponse.status }
      );
    }

    // Kembalikan Resumable Upload URL dan accessToken langsung ke frontend
    return NextResponse.json({
      success: true,
      uploadUrl,
      accessToken,
    });
  } catch (error: any) {
    console.error("[YouTube Upload URL Route Error]", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
