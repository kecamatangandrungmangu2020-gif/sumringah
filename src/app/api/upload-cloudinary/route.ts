import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'zqw5r6ay';
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'sistem_giat';

    const contentType = req.headers.get('content-type') || '';
    let uploadBody: FormData;

    if (contentType.includes('multipart/form-data')) {
      const incomingFormData = await req.formData();
      const file = incomingFormData.get('file');

      if (!file) {
        return NextResponse.json({ success: false, error: 'Tidak ada file yang diunggah.' }, { status: 400 });
      }

      uploadBody = new FormData();
      uploadBody.append('file', file);
      uploadBody.append('upload_preset', preset);
      uploadBody.append('folder', 'informasi_desa');
    } else {
      const json = await req.json();
      if (!json.file) {
        return NextResponse.json({ success: false, error: 'File base64 atau URL tidak ditemukan.' }, { status: 400 });
      }

      uploadBody = new FormData();
      uploadBody.append('file', json.file);
      uploadBody.append('upload_preset', preset);
      uploadBody.append('folder', 'informasi_desa');
    }

    const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: uploadBody,
    });

    const data = await cloudinaryRes.json();

    if (!cloudinaryRes.ok || !data.secure_url) {
      console.error('[Cloudinary Upload Error]', data);
      return NextResponse.json({
        success: false,
        error: data.error?.message || 'Gagal mengunggah foto ke Cloudinary.',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
      format: data.format,
      width: data.width,
      height: data.height,
    });
  } catch (err: any) {
    console.error('[Upload Cloudinary API Exception]', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Terjadi kesalahan internal saat mengunggah foto.',
    }, { status: 500 });
  }
}
