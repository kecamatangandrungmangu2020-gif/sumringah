import { CATEGORY_META, KunjunganTamuRecord, STATUS_META } from '@/types/kunjungan-tamu';

export function printKunjunganReceipt(record: KunjunganTamuRecord, mode: 'resi' | 'disposisi' = 'resi') {
  if (typeof window === 'undefined') return;

  const catMeta = CATEGORY_META[record.category];
  const statusMeta = STATUS_META[record.status];
  const asalText =
    record.visitor.asal_desa_instansi === 'INSTANSI_LUAR'
      ? record.visitor.asal_manual || 'Instansi / Luar Wilayah'
      : record.visitor.asal_desa_instansi;

  const createdFormatted = new Date(record.created_at).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const detailList = Object.entries(record.details || {})
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => ({
      label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value: String(v),
    }));

  // MODE THERMAL RECEIPT (58mm / 80mm) untuk Bukti Tanda Terima
  if (mode === 'resi') {
    const detailRowsThermal = detailList
      .map(
        (d) => `
        <div class="kv">
          <span class="k">${d.label}</span>
          <span class="v">${d.value}</span>
        </div>`
      )
      .join('');

    const thermalHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Struk Tanda Terima - ${record.ticket_id}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      color: #000000;
    }
    body {
      width: 72mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 3mm 2.5mm 6mm;
      font-family: 'Courier New', Courier, 'Lucida Console', monospace;
      font-size: 11px;
      line-height: 1.35;
      background: #ffffff;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .upper { text-transform: uppercase; }
    .kop-sub { font-size: 9.5px; letter-spacing: 0.4px; }
    .kop-main { font-size: 13px; font-weight: 800; letter-spacing: 0.5px; margin-top: 1px; }
    .kop-addr { font-size: 9px; margin-top: 2px; }
    .dash { border-top: 1px dashed #000; margin: 6px 0; }
    .double { border-top: 2px double #000; margin: 6px 0; }
    .ticket-box {
      border: 1.5px solid #000;
      padding: 5px 4px;
      margin: 6px 0;
      text-align: center;
    }
    .ticket-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.8px; }
    .ticket-num { font-size: 16px; font-weight: 900; letter-spacing: 1px; margin-top: 2px; }
    .ticket-time { font-size: 9.5px; margin-top: 2px; }
    .sec-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      margin: 4px 0 3px;
      letter-spacing: 0.4px;
    }
    .kv {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 6px;
      margin-bottom: 2.5px;
      font-size: 10.5px;
    }
    .kv .k {
      flex: 0 0 38%;
      font-weight: 700;
    }
    .kv .v {
      flex: 1;
      text-align: right;
      word-break: break-word;
    }
    .sign-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-top: 10px;
      text-align: center;
      font-size: 9.5px;
    }
    .sign-col { flex: 1; }
    .sign-gap { height: 28px; }
    .footer {
      margin-top: 8px;
      font-size: 9px;
      text-align: center;
      line-height: 1.35;
    }
    .cut-hint {
      margin-top: 8px;
      text-align: center;
      font-size: 8.5px;
      letter-spacing: 1px;
    }
    @media print {
      body {
        width: 100%;
        padding: 2mm 2mm 5mm;
      }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="kop-sub bold upper">Pemerintah Kabupaten Cilacap</div>
    <div class="kop-main upper">Kecamatan Gandrungmangu</div>
    <div class="kop-addr">Jl. Gandrungmangu No. 01, Cilacap</div>
    <div class="kop-addr bold">Pelayanan SEMRINGAH • Front Office</div>
  </div>

  <div class="double"></div>

  <div class="center bold upper" style="font-size: 11px;">Bukti Tanda Terima Kunjungan</div>

  <div class="ticket-box">
    <div class="ticket-lbl upper">Kode Tiket / Resi</div>
    <div class="ticket-num">${record.ticket_id}</div>
    <div class="ticket-time">${createdFormatted} WIB</div>
  </div>

  <div class="sec-title">Identitas Pengunjung</div>
  <div class="kv"><span class="k">Nama</span><span class="v bold">${record.visitor.nama}</span></div>
  <div class="kv"><span class="k">WhatsApp</span><span class="v">${record.visitor.whatsapp}</span></div>
  <div class="kv"><span class="k">Asal</span><span class="v">${asalText}</span></div>

  <div class="dash"></div>

  <div class="sec-title">Keperluan &amp; Tujuan</div>
  <div class="kv"><span class="k">Kategori</span><span class="v bold">${catMeta.shortLabel}</span></div>
  <div class="kv"><span class="k">Tujuan</span><span class="v bold">${record.target_section}</span></div>
  <div class="kv"><span class="k">Status</span><span class="v">${statusMeta.label}</span></div>
  ${detailRowsThermal}

  <div class="dash"></div>

  <div class="sign-row">
    <div class="sign-col">
      <div>Pengirim/Tamu</div>
      <div class="sign-gap"></div>
      <div class="bold">(${record.visitor.nama.slice(0, 16)})</div>
    </div>
    <div class="sign-col">
      <div>Petugas FO</div>
      <div class="sign-gap"></div>
      <div class="bold">(................)</div>
    </div>
  </div>

  <div class="dash"></div>

  <div class="footer">
    Simpan struk ini untuk lacak status<br/>
    di menu <strong>Kunjungan Tamu</strong><br/>
    Terima kasih atas kunjungan Anda.
  </div>
  <div class="cut-hint">- - - - - - - - - - - - - - - -</div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=360,height=640');
    if (w) {
      w.document.open();
      w.document.write(thermalHtml);
      w.document.close();
    }
    return;
  }

  // MODE LEMBAR DISPOSISI (A4 / A5 untuk Arsip Kantor)
  const detailEntries = detailList
    .map((d) => `<tr><td class="lbl">${d.label}</td><td class="sep">:</td><td>${d.value}</td></tr>`)
    .join('');

  const disposisiHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Lembar Disposisi - ${record.ticket_id}</title>
  <style>
    * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
    body { margin: 0; padding: 24px; color: #041E17; background: #fff; }
    .sheet { max-width: 720px; margin: 0 auto; border: 2px solid #041E17; border-radius: 12px; padding: 24px 28px; }
    .kop { text-align: center; border-bottom: 3px double #041E17; padding-bottom: 12px; margin-bottom: 16px; }
    .kop h2 { margin: 0; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; }
    .kop h1 { margin: 2px 0; font-size: 19px; letter-spacing: 1.5px; text-transform: uppercase; color: #065F46; }
    .kop p { margin: 2px 0 0; font-size: 11px; color: #475569; }
    .title-bar { display: flex; justify-content: space-between; align-items: center; background: #FAF8F5; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
    .title-bar .doc-title { font-size: 14px; font-weight: 800; text-transform: uppercase; }
    .title-bar .ticket { font-family: 'Consolas', monospace; font-size: 18px; font-weight: 800; color: #065F46; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12.5px; }
    td { padding: 5px 4px; vertical-align: top; }
    td.lbl { width: 34%; font-weight: 700; color: #334155; }
    td.sep { width: 14px; text-align: center; }
    .sec-head { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #065F46; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 14px 0 8px; }
    .disposisi-box { border: 1px dashed #64748b; border-radius: 8px; padding: 12px; min-height: 95px; margin-top: 12px; font-size: 12px; color: #475569; }
    .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; text-align: center; font-size: 12px; }
    .sign-space { height: 58px; }
    @media print { body { padding: 0; } .sheet { border-width: 1.5px; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="kop">
      <h2>Pemerintah Kabupaten Cilacap</h2>
      <h1>Kecamatan Gandrungmangu</h1>
      <p>Jl. Gandrungmangu No. 01, Gandrungmangu, Cilacap 53254 • Pelayanan SEMRINGAH</p>
    </div>

    <div class="title-bar">
      <div>
        <div class="doc-title">Lembar Disposisi &amp; Kendali Front Office</div>
        <div style="font-size:11px;color:#475569;margin-top:2px;">${createdFormatted} WIB</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;">Kode Tiket / Resi</div>
        <div class="ticket">${record.ticket_id}</div>
      </div>
    </div>

    <div class="sec-head">1. Identitas Pengunjung / Pengirim</div>
    <table>
      <tr><td class="lbl">Nama Lengkap</td><td class="sep">:</td><td><strong>${record.visitor.nama}</strong></td></tr>
      <tr><td class="lbl">Nomor WhatsApp</td><td class="sep">:</td><td>${record.visitor.whatsapp}</td></tr>
      <tr><td class="lbl">Asal Desa / Instansi</td><td class="sep">:</td><td>${asalText}</td></tr>
    </table>

    <div class="sec-head">2. Rincian Keperluan &amp; Tujuan</div>
    <table>
      <tr><td class="lbl">Kategori Keperluan</td><td class="sep">:</td><td><strong>${catMeta.label}</strong></td></tr>
      <tr><td class="lbl">Tujuan Pejabat / Seksi</td><td class="sep">:</td><td><strong>${record.target_section}</strong></td></tr>
      <tr><td class="lbl">Status Saat Ini</td><td class="sep">:</td><td>${statusMeta.label}</td></tr>
      ${detailEntries}
    </table>

    <div class="sec-head">3. Catatan Disposisi Camat / Sekcam / Kasi</div>
    <div class="disposisi-box">Catatan tindak lanjut / arahan pejabat:</div>

    <div class="sign-grid">
      <div>
        <div>Pengunjung / Pengirim,</div>
        <div class="sign-space"></div>
        <div><strong>(${record.visitor.nama})</strong></div>
      </div>
      <div>
        <div>Petugas Front Office,</div>
        <div class="sign-space"></div>
        <div><strong>(........................................)</strong></div>
      </div>
    </div>
  </div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=820,height=720');
  if (w) {
    w.document.open();
    w.document.write(disposisiHtml);
    w.document.close();
  }
}
