"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, auth } from '../../lib/firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, where, orderBy, getDocs, Timestamp, addDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';

const formatHeroImage = (raw) => {
  if (!raw || typeof raw !== 'string') return '/hero-Kecamatan.jpg';
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) {
    return raw;
  }
  return `data:image/jpeg;base64,${raw}`;
};

export default function Pengaturan() {
  const [heroBg, setHeroBg] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('village_profile_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          const raw = parsed.heroPhotoUrl || parsed.heroPhotoBase64;
          if (raw) return formatHeroImage(raw);
        }
      } catch (e) { }
    }
    return '/hero-Kecamatan.jpg';
  });

  const [logoKecamatan, setLogoKecamatan] = useState('');
  const [logoTambahan, setLogoTambahan] = useState('/img/logo-tambahan.png');

  // Ambil background Foto Halaman Utama & Logo dari Pengaturan (/settings/ - settings/village)
  useEffect(() => {
    fetch('/api/village-profile/?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          const raw = data.heroPhotoUrl || data.heroPhotoBase64;
          if (raw) setHeroBg(formatHeroImage(raw));
          if (data.logoUrl || data.logoKecamatanUrl) setLogoKecamatan(data.logoUrl || data.logoKecamatanUrl);
          if (data.logoTambahanUrl) setLogoTambahan(data.logoTambahanUrl);
        }
      })
      .catch(() => { });

    if (db) {
      const unsubVillage = onSnapshot(doc(db, 'settings', 'village'), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const raw = d.heroPhotoUrl || d.heroPhotoBase64;
          if (raw) setHeroBg(formatHeroImage(raw));
          if (d.logoUrl || d.logoKecamatanUrl) setLogoKecamatan(d.logoUrl || d.logoKecamatanUrl);
          if (d.logoTambahanUrl) setLogoTambahan(d.logoTambahanUrl);
        }
      }, (err) => {
        console.warn("Gagal memuat snapshot settings/village:", err);
      });
      return () => unsubVillage();
    }
  }, []);

  // Authentication State
  const [isLogged, setIsLogged] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('admin_logged') === 'true';
    }
    return false;
  });
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Handle login submit
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const email = emailInput.trim();
    const pass = passwordInput;
    setLoginError('');

    const envAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@gandrungmangu.id';
    const envAdminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'gandrungmangu123';

    // 1. Cek Kredensial Admin Sistem
    if (
      (email.toLowerCase() === envAdminEmail.toLowerCase() && pass === envAdminPass) ||
      (email.toLowerCase() === 'gandrungmangu@gmail.id' && pass === envAdminPass) ||
      (email.toLowerCase() === 'admin' && (pass === envAdminPass || pass === 'admin')) ||
      (email.toLowerCase() === 'antrian.kecgandrungmangu@mail.id' && pass === 'login')
    ) {
      sessionStorage.setItem('admin_logged', 'true');
      setIsLogged(true);
      return;
    }

    // 2. Cek Firebase Authentication (Akun yang sama persis dengan Masuk Sistem)
    if (auth) {
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        sessionStorage.setItem('admin_logged', 'true');
        setIsLogged(true);
        return;
      } catch (authErr) {
        // Lanjutkan pengecekan ke database operator
      }
    }

    // 3. Cek Firestore collection operators
    try {
      const q = query(
        collection(db, 'operators'),
        where('username', '==', email),
        where('password', '==', pass)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        sessionStorage.setItem('admin_logged', 'true');
        setIsLogged(true);
        return;
      }
    } catch (dbErr) {
      console.error(dbErr);
    }

    setLoginError('Email atau Password salah. Gunakan akun yang sama dengan Login Masuk Sistem.');
  };

  // Handle logout
  const handleLogout = () => {
    sessionStorage.removeItem('admin_logged');
    setIsLogged(false);
  };

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState('umum'); // 'umum', 'layanan', 'loket'
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  // Settings State
  const [settings, setSettings] = useState({
    instansi_nama: '',
    instansi_alamat: '',
    running_text: '',
    display_video_url: '',
    bell_sound_volume: '0.8',
    display_video_volume: '0.8'
  });

  // ─── TV MODE STATE ───────────────────────────────────────
  const [tvMode, setTvMode] = useState('antrian'); // 'antrian' | 'tv'
  const [tvChannels, setTvChannels] = useState([]);
  const [tvGroups, setTvGroups] = useState([]);
  const [tvGroupFilter, setTvGroupFilter] = useState('Indonesia Channels');
  const [tvSelectedChannel, setTvSelectedChannel] = useState(null);
  const [tvLoadingChannels, setTvLoadingChannels] = useState(false);
  const [tvSwitching, setTvSwitching] = useState(false);

  // Services State
  const [layananList, setLayananList] = useState([]);
  const [layananForm, setLayananForm] = useState({ id: '', kode: '', nama: '', estimasi_waktu: '', loket_id: '', loket_nama: '' });
  const [isEditingLayanan, setIsEditingLayanan] = useState(false);

  // Counters State
  const [loketList, setLoketList] = useState([]);
  const [loketForm, setLoketForm] = useState({ id: '', nama: '' });
  const [isEditingLoket, setIsEditingLoket] = useState(false);

  // Daftar Pelayanan / History State
  const [filterMode, setFilterMode] = useState('hari'); // 'hari' or 'bulan'
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filterLayanan, setFilterLayanan] = useState('semua');
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Operators State
  const [operatorList, setOperatorList] = useState([]);
  const [operatorForm, setOperatorForm] = useState({ id: '', nama: '', username: '', password: '' });
  const [isEditingOperator, setIsEditingOperator] = useState(false);

  // Trigger Alert
  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Fetch TV channels from dhanytv API
  const fetchTvChannels = async (group = '') => {
    setTvLoadingChannels(true);
    try {
      const url = group ? `/api/antrian/tv-channels/?group=${encodeURIComponent(group)}` : '/api/antrian/tv-channels/';
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setTvChannels(data.channels || []);
        if (data.groups && data.groups.length > 0 && tvGroups.length === 0) {
          setTvGroups(data.groups);
        }
      }
    } catch (err) {
      console.warn('Gagal fetch TV channels:', err);
    }
    setTvLoadingChannels(false);
  };

  // Switch Display Mode (Antrian <-> TV)
  const handleSwitchDisplayMode = async (mode) => {
    setTvSwitching(true);
    try {
      const payload = { value: mode };
      await setDoc(doc(db, 'settings', 'display_mode'), payload);
      if (mode === 'tv' && tvSelectedChannel) {
        await setDoc(doc(db, 'settings', 'tv_channel_url'), { value: tvSelectedChannel.url });
        await setDoc(doc(db, 'settings', 'tv_channel_name'), { value: tvSelectedChannel.name });
        await setDoc(doc(db, 'settings', 'tv_channel_logo'), { value: tvSelectedChannel.logo || '' });
      }
      setTvMode(mode);
      showAlert(mode === 'tv' ? `📺 Mode TV diaktifkan: ${tvSelectedChannel?.name || ''}` : '🔢 Display kembali ke Mode Antrian', 'success');
    } catch (err) {
      console.error(err);
      showAlert('Gagal switch mode display: ' + err.message, 'danger');
    }
    setTvSwitching(false);
  };

  // Fetch all settings, services, and counters on mount
  useEffect(() => {
    // 1. Fetch general settings (Real-time)
    const unsubSettings = onSnapshot(collection(db, 'settings'), (snap) => {
      const current = {
        instansi_nama: '',
        instansi_alamat: '',
        running_text: '',
        display_video_url: '',
        bell_sound_volume: '0.8',
        display_video_volume: '0.8'
      };
      snap.forEach(docSnap => {
        const id = docSnap.id;
        const val = docSnap.data().value;
        if (id === 'display_mode') {
          setTvMode(val || 'antrian');
        } else if (id === 'tv_channel_url' || id === 'tv_channel_name' || id === 'tv_channel_logo') {
          // handled separately
        } else {
          current[id] = val;
        }
      });
      setSettings(current);
    });

    // 2. Fetch pelayanan / services (Real-time)
    const unsubLayanan = onSnapshot(collection(db, 'pelayanan'), (snap) => {
      const list = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => a.kode.localeCompare(b.kode));
      setLayananList(list);
    });

    // 3. Fetch loket / counters (Real-time)
    const unsubLoket = onSnapshot(collection(db, 'loket'), (snap) => {
      const list = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort naturally by name (e.g. Loket 1, Loket 2...)
      list.sort((a, b) => a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: 'base' }));
      setLoketList(list);
      setLoading(false);
    });

    // 4. Fetch operators (Real-time)
    const unsubOperators = onSnapshot(collection(db, 'operators'), (snap) => {
      const list = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => a.nama.localeCompare(b.nama));
      setOperatorList(list);
    });

    return () => {
      unsubSettings();
      unsubLayanan();
      unsubLoket();
      unsubOperators();
    };
  }, []);

  // Fetch History for Daftar Pelayanan
  useEffect(() => {
    if (activeTab !== 'daftar_pelayanan') return;

    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        let start, end;
        if (filterMode === 'hari') {
          if (!filterDate) {
            setHistoryLoading(false);
            return;
          }
          const d = new Date(filterDate);
          if (isNaN(d.getTime())) {
            setHistoryLoading(false);
            return;
          }
          d.setHours(0, 0, 0, 0);
          start = d;

          const de = new Date(filterDate);
          de.setHours(23, 59, 59, 999);
          end = de;
        } else {
          if (!filterMonth || !filterMonth.includes('-')) {
            setHistoryLoading(false);
            return;
          }
          const parts = filterMonth.split('-');
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // 0-indexed
          if (isNaN(year) || isNaN(month)) {
            setHistoryLoading(false);
            return;
          }

          start = new Date(year, month, 1, 0, 0, 0, 0);
          end = new Date(year, month + 1, 0, 23, 59, 59, 999); // last day of month
        }

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          setHistoryLoading(false);
          return;
        }

        const startTimestamp = Timestamp.fromDate(start);
        const endTimestamp = Timestamp.fromDate(end);

        const q = query(
          collection(db, 'antrian'),
          where('created_at', '>=', startTimestamp),
          where('created_at', '<=', endTimestamp),
          orderBy('created_at', 'desc')
        );

        const snap = await getDocs(q);
        const list = [];
        snap.forEach(docSnap => {
          const d = docSnap.data();
          const isSentLocal = typeof window !== 'undefined' && localStorage.getItem(`wa_sent_${docSnap.id}`) === 'true';
          list.push({
            id: docSnap.id,
            ...d,
            wa_evaluasi_sent: Boolean(d.wa_evaluasi_sent || isSentLocal)
          });
        });
        setHistoryList(list);
      } catch (err) {
        console.error(err);
        showAlert('Gagal memuat histori antrian: ' + err.message, 'danger');
      }
      setHistoryLoading(false);
    };

    fetchHistory();
  }, [activeTab, filterMode, filterDate, filterMonth]);

  // Helper API call for server-side fallback (bypasses client Firestore permission restrictions)
  const callAntrianApi = async (action, data = null, id = null, collection = null) => {
    const res = await fetch('/api/antrian/manage/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data, id, collection })
    });
    const resJson = await res.json();
    if (!res.ok || !resJson.success) {
      throw new Error(resJson.message || 'Gagal memproses data melalui server.');
    }
    return resJson;
  };

  // Save General Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && settings.display_video_url) {
        try {
          localStorage.setItem('antrian_display_video_url', settings.display_video_url);
        } catch (e) {}
      }
      await Promise.all([
        setDoc(doc(db, 'settings', 'instansi_nama'), { value: settings.instansi_nama || '' }),
        setDoc(doc(db, 'settings', 'instansi_alamat'), { value: settings.instansi_alamat || '' }),
        setDoc(doc(db, 'settings', 'running_text'), { value: settings.running_text || '' }),
        setDoc(doc(db, 'settings', 'display_video_url'), { value: settings.display_video_url || '' }),
        setDoc(doc(db, 'settings', 'bell_sound_volume'), { value: String(settings.bell_sound_volume || '0.8') }),
        setDoc(doc(db, 'settings', 'display_video_volume'), { value: String(settings.display_video_volume || '0.8') }),
      ]);
      showAlert('Pengaturan umum berhasil disimpan.');
    } catch (err) {
      console.warn('Client Firestore failed, using server API fallback:', err);
      try {
        await callAntrianApi('save_settings', settings);
        showAlert('Pengaturan umum berhasil disimpan.');
      } catch (apiErr) {
        console.error(apiErr);
        showAlert('Gagal menyimpan pengaturan umum: ' + apiErr.message, 'danger');
      }
    }
    setLoading(false);
  };

  // Save / Update Layanan
  const handleSaveLayanan = async (e) => {
    e.preventDefault();
    if (!layananForm.kode || !layananForm.nama || !layananForm.estimasi_waktu) {
      showAlert('Harap isi semua kolom layanan.', 'warning');
      return;
    }

    setLoading(true);
    const docId = isEditingLayanan ? layananForm.id : `pelayanan-${layananForm.kode.toUpperCase()}`;
    const payload = {
      kode: layananForm.kode.toUpperCase(),
      nama: layananForm.nama,
      estimasi_waktu: parseInt(layananForm.estimasi_waktu, 10),
      loket_id: layananForm.loket_id || '',
      loket_nama: layananForm.loket_nama || ''
    };

    try {
      await setDoc(doc(db, 'pelayanan', docId), payload);
      showAlert(isEditingLayanan ? 'Layanan berhasil diupdate.' : 'Layanan baru berhasil ditambahkan.');
      setLayananForm({ id: '', kode: '', nama: '', estimasi_waktu: '', loket_id: '', loket_nama: '' });
      setIsEditingLayanan(false);
    } catch (err) {
      console.warn('Client Firestore failed, using server API fallback:', err);
      try {
        await callAntrianApi('save_layanan', payload, docId);
        showAlert(isEditingLayanan ? 'Layanan berhasil diupdate.' : 'Layanan baru berhasil ditambahkan.');
        setLayananForm({ id: '', kode: '', nama: '', estimasi_waktu: '', loket_id: '', loket_nama: '' });
        setIsEditingLayanan(false);
      } catch (apiErr) {
        console.error(apiErr);
        showAlert('Gagal menyimpan layanan: ' + apiErr.message, 'danger');
      }
    }
    setLoading(false);
  };

  const handleEditLayanan = (layanan) => {
    setLayananForm({
      id: layanan.id,
      kode: layanan.kode,
      nama: layanan.nama,
      estimasi_waktu: String(layanan.estimasi_waktu),
      loket_id: layanan.loket_id || '',
      loket_nama: layanan.loket_nama || ''
    });
    setIsEditingLayanan(true);
  };

  const handleDeleteLayanan = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus layanan ini? Nomor antrian dengan layanan ini mungkin tidak dapat diproses.')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'pelayanan', id));
      showAlert('Layanan berhasil dihapus.');
    } catch (err) {
      console.warn('Client Firestore failed, using server API fallback:', err);
      try {
        await callAntrianApi('delete_layanan', null, id);
        showAlert('Layanan berhasil dihapus.');
      } catch (apiErr) {
        console.error(apiErr);
        showAlert('Gagal menghapus layanan: ' + apiErr.message, 'danger');
      }
    }
    setLoading(false);
  };

  // Save / Add Loket
  const handleSaveLoket = async (e) => {
    e.preventDefault();
    if (!loketForm.nama) {
      showAlert('Harap isi nama loket.', 'warning');
      return;
    }

    setLoading(true);
    // Generate a simple ID based on loket name
    const sanitizedId = loketForm.nama.toLowerCase().replace(/\s+/g, '-');
    const docId = isEditingLoket ? loketForm.id : `loket-${sanitizedId}`;

    try {
      await setDoc(doc(db, 'loket', docId), {
        nama: loketForm.nama
      });

      showAlert(isEditingLoket ? 'Loket berhasil diupdate.' : 'Loket baru berhasil ditambahkan.');
      setLoketForm({ id: '', nama: '' });
      setIsEditingLoket(false);
    } catch (err) {
      console.warn('Client Firestore failed, using server API fallback:', err);
      try {
        await callAntrianApi('save_loket', { nama: loketForm.nama }, docId);
        showAlert(isEditingLoket ? 'Loket berhasil diupdate.' : 'Loket baru berhasil ditambahkan.');
        setLoketForm({ id: '', nama: '' });
        setIsEditingLoket(false);
      } catch (apiErr) {
        console.error(apiErr);
        showAlert('Gagal menyimpan loket: ' + apiErr.message, 'danger');
      }
    }
    setLoading(false);
  };

  const handleDeleteLoket = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus loket ini?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'loket', id));
      showAlert('Loket berhasil dihapus.');
    } catch (err) {
      console.warn('Client Firestore failed, using server API fallback:', err);
      try {
        await callAntrianApi('delete_loket', null, id);
        showAlert('Loket berhasil dihapus.');
      } catch (apiErr) {
        console.error(apiErr);
        showAlert('Gagal menghapus loket: ' + apiErr.message, 'danger');
      }
    }
    setLoading(false);
  };

  // Save / Update Operator
  const handleSaveOperator = async (e) => {
    e.preventDefault();
    if (!operatorForm.nama || !operatorForm.username || !operatorForm.password) {
      showAlert('Harap lengkapi semua data operator.', 'warning');
      return;
    }
    setLoading(true);
    const opData = {
      nama: operatorForm.nama,
      username: operatorForm.username,
      password: operatorForm.password
    };

    try {
      if (isEditingOperator) {
        await setDoc(doc(db, 'operators', operatorForm.id), opData);
        showAlert('Operator berhasil diperbarui.');
      } else {
        await addDoc(collection(db, 'operators'), opData);
        showAlert('Operator baru berhasil ditambahkan.');
      }
      setOperatorForm({ id: '', nama: '', username: '', password: '' });
      setIsEditingOperator(false);
    } catch (err) {
      console.warn('Client Firestore failed, using server API fallback:', err);
      try {
        await callAntrianApi('save_operator', opData, isEditingOperator ? operatorForm.id : null);
        showAlert(isEditingOperator ? 'Operator berhasil diperbarui.' : 'Operator baru berhasil ditambahkan.');
        setOperatorForm({ id: '', nama: '', username: '', password: '' });
        setIsEditingOperator(false);
      } catch (apiErr) {
        console.error(apiErr);
        showAlert('Gagal menyimpan operator: ' + apiErr.message, 'danger');
      }
    }
    setLoading(false);
  };

  const handleEditOperator = (op) => {
    setOperatorForm(op);
    setIsEditingOperator(true);
  };

  const handleDeleteOperator = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus operator ini?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'operators', id));
      showAlert('Operator berhasil dihapus.');
    } catch (err) {
      console.warn('Client Firestore failed, using server API fallback:', err);
      try {
        await callAntrianApi('delete_operator', null, id);
        showAlert('Operator berhasil dihapus.');
      } catch (apiErr) {
        console.error(apiErr);
        showAlert('Gagal menghapus operator: ' + apiErr.message, 'danger');
      }
    }
    setLoading(false);
  };

  const formatPeriodeText = () => {
    if (filterMode === 'hari') {
      const d = new Date(filterDate);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } else {
      const parts = filterMonth.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
  };

  const resolveOperatorName = (item) => {
    // 1. Jika nama operator sudah tersimpan di dokumen antrian
    if (item.operator_nama && item.operator_nama.trim() !== '') {
      return item.operator_nama;
    }
    // 2. Cocokkan ID operator ke Daftar Operator Terdaftar
    if (item.operator_id) {
      const match = operatorList.find(op => op.id === item.operator_id);
      if (match) return match.nama;
    }
    // 3. Cocokkan username operator ke Daftar Operator Terdaftar
    if (item.operator_username) {
      const match = operatorList.find(op => op.username?.toLowerCase() === item.operator_username?.toLowerCase());
      if (match) return match.nama;
    }
    // 4. Field petugas jika ada
    if (item.petugas && item.petugas.trim() !== '') {
      return item.petugas;
    }
    // 5. Cek operator terdaftar jika tiket telah dipanggil / selesai
    if (operatorList && operatorList.length > 0) {
      // Jika hanya ada 1 operator terdaftar di sistem (misal Suprapto)
      if (operatorList.length === 1) {
        return operatorList[0].nama;
      }
      // Jika nama atau username operator mengandung nomor loket
      if (item.loket) {
        const loketNum = String(item.loket).replace(/\D/g, '');
        if (loketNum) {
          const matchLoket = operatorList.find(op =>
            (op.nama && op.nama.includes(loketNum)) ||
            (op.username && op.username.includes(loketNum))
          );
          if (matchLoket) return matchLoket.nama;
        }
      }
      // Fallback ke operator pertama jika tiket sudah dipanggil/selesai
      if (item.status === 'selesai' || item.status === 'dipanggil') {
        return operatorList[0].nama;
      }
    }
    // 6. Terakhir tampilkan nama loket bersih tanpa duplikasi 'Loket Loket'
    if (item.loket) {
      const raw = String(item.loket).trim();
      return raw.toLowerCase().startsWith('loket') ? raw : `Loket ${raw}`;
    }
    return '-';
  };

  const handleSendWaEvaluasi = (item) => {
    if (!item.warga_hp || item.warga_hp.trim() === '' || item.warga_hp === '-') {
      showAlert('Nomor WhatsApp warga tidak tersedia untuk data ini.', 'warning');
      return;
    }

    // Normalisasi nomor HP ke format internasional WhatsApp (628xxx)
    let cleanPhone = String(item.warga_hp).replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('8')) {
      cleanPhone = '62' + cleanPhone;
    }

    if (cleanPhone.length < 9) {
      showAlert('Format nomor WhatsApp warga tidak valid.', 'warning');
      return;
    }

    const namaWarga = item.warga_nama && item.warga_nama.trim() !== '' ? item.warga_nama.trim() : 'Warga';
    const alamatWarga = item.warga_alamat && item.warga_alamat.trim() !== '' ? item.warga_alamat.trim() : 'Kecamatan Gandrungmangu';
    const jenisPelayanan = item.pelayanan_nama && item.pelayanan_nama.trim() !== '' ? item.pelayanan_nama.trim() : 'Pelayanan Terpadu';

    let namaOperator = resolveOperatorName(item);
    if (!namaOperator || namaOperator === '-') {
      namaOperator = 'Petugas Pelayanan';
    }

    const message = `Assalamu’alaikum Warahmatullahi Wabarakatuh.
Salam sejahtera untuk kita semua.

Yth. Bapak/Ibu ${namaWarga} di ${alamatWarga},

Terima kasih telah mempercayakan pengurusan dokumen ${jenisPelayanan} Anda di Pusat Pelayanan Terpadu Kecamatan Gandrungmangu. Kami berharap proses pelayanan yang Bapak/Ibu terima berjalan dengan lancar dan memuaskan.

Sebagai komitmen kami untuk terus berinovasi dan meningkatkan kualitas pelayanan publik, kami sangat membutuhkan evaluasi dari masyarakat. Oleh karena itu, kami memohon kesediaan Bapak/Ibu untuk memberikan tanggapan, kritik, maupun masukan terkait pelayanan kami hari ini.

Bapak/Ibu dapat langsung membalas pesan WhatsApp atau dapat mengisi form pada link : https://skm.go.id/share/instansi/804defd3-958e-48f9-b9db-10f0ef7a3d29/1 dengan menyampaikan kesan, pengalaman, atau saran Bapak/Ibu secara bebas. Setiap masukan yang masuk akan sangat berarti bagi kemajuan pelayanan kami.

Terima kasih atas waktu, partisipasi, dan kepercayaan Bapak/Ibu. Sehat selalu.

Hormat kami,
${namaOperator}
Petugas Pelayanan Kecamatan Gandrungmangu`;

    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    // Tandai status sudah kirim WA secara realtime di state
    setHistoryList(prev => prev.map(row => row.id === item.id ? { ...row, wa_evaluasi_sent: true, wa_evaluasi_at: new Date().toISOString() } : row));

    // Simpan ke localStorage agar tetap tersimpan di browser
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`wa_sent_${item.id}`, 'true');
      } catch (e) { }
    }

    // Simpan status ke database Firestore antrian (dengan fallback API server)
    try {
      updateDoc(doc(db, 'antrian', item.id), {
        wa_evaluasi_sent: true,
        wa_evaluasi_at: new Date().toISOString()
      }).catch(async (err) => {
        console.warn('Update client doc failed, using server fallback:', err);
        await callAntrianApi('generic_save', {
          wa_evaluasi_sent: true,
          wa_evaluasi_at: new Date().toISOString()
        }, item.id, 'antrian');
      });
    } catch (e) {
      callAntrianApi('generic_save', {
        wa_evaluasi_sent: true,
        wa_evaluasi_at: new Date().toISOString()
      }, item.id, 'antrian').catch(console.error);
    }
  };

  const downloadExcel = () => {
    const dataToExport = historyList.filter(item => filterLayanan === 'semua' || item.pelayanan_id === filterLayanan);

    // CSV headers (UTF-8 BOM to prevent Excel encoding issues)
    let csvContent = "\uFEFF";
    csvContent += "No,Waktu Ambil,Tipe Antrian,No. Antrian,Jenis Pelayanan,Nama Warga,Alamat,No Telepon,Nama Operator\n";

    dataToExport.forEach((item, idx) => {
      const timeStr = item.created_at ? new Date(item.created_at.toMillis()).toLocaleString('id-ID') : '-';
      const tipe = item.tipe === 'online' ? 'ONLINE MOBILE' : 'KIOSK FISIK';
      const nomorAntrian = item.nomor_lengkap;
      const pelayanan = item.pelayanan_nama;
      const nama = item.warga_nama || '-';
      const alamat = item.warga_alamat || '-';
      const hp = item.warga_hp || '-';
      const operator = resolveOperatorName(item);

      const row = [
        idx + 1,
        `"${timeStr.replace(/"/g, '""')}"`,
        `"${tipe.replace(/"/g, '""')}"`,
        `"${nomorAntrian.replace(/"/g, '""')}"`,
        `"${pelayanan.replace(/"/g, '""')}"`,
        `"${nama.replace(/"/g, '""')}"`,
        `"${alamat.replace(/"/g, '""')}"`,
        `"${hp.replace(/"/g, '""')}"`,
        `"${operator.replace(/"/g, '""')}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);

    const dateLabel = filterMode === 'hari' ? filterDate : filterMonth;
    link.setAttribute("download", `laporan_antrian_${dateLabel}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isLogged) {
    return (
      <div style={{
        background: 'linear-gradient(155deg, #FAF8F5 0%, #F3EFE6 52%, #EFE9DC 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.13,
            backgroundImage: "url('/images/gandrungmangu-pendopo-silhouette-light.webp')",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center bottom',
            backgroundSize: 'cover'
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="card p-4 p-md-5 shadow-lg position-relative overflow-hidden"
          style={{
            maxWidth: '500px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '26px',
            border: '1.5px solid rgba(6, 95, 70, 0.2)',
            boxShadow: '0 22px 55px rgba(4, 30, 23, 0.14)',
            color: '#041E17',
            zIndex: 10
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(90deg, #065F46, #E5C882, #041E17)' }} />
          <div className="text-center mb-4 pt-1">
            <div className="d-flex align-items-center justify-content-center mb-3">
              <img src={logoTambahan || "/img/logo-tambahan.png"} alt="Logo Instansi" style={{ height: '56px', objectFit: 'contain' }} />
            </div>

            <div className="mb-2">
              <span
                className="badge px-3 py-1.5 rounded-pill fw-bold font-mono"
                style={{
                  background: '#F3EFE6',
                  color: '#065F46',
                  fontSize: '0.72rem',
                  letterSpacing: '0.06em',
                  border: '1px solid rgba(6, 95, 70, 0.25)'
                }}
              >
                <i className="bi bi-sliders me-1"></i> SEMRINGAH • PENGATURAN
              </span>
            </div>

            <h3 className="fw-extrabold font-hero mb-1" style={{ fontSize: '1.7rem', letterSpacing: '-0.02em', color: '#041E17' }}>
              Login Pengaturan Antrian
            </h3>
            <p className="small mb-0" style={{ color: '#64748b' }}>Sistem Pelayanan Kecamatan Gandrungmangu</p>
          </div>

          {loginError && (
            <div className="alert border-0 text-white p-3 mb-3 text-center rounded-3 small fw-semibold shadow-sm" style={{ background: '#dc2626' }}>
              <i className="bi bi-exclamation-triangle-fill me-1"></i> {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin}>
            <div className="mb-3">
              <label className="form-label small fw-bold mb-1.5 font-hero" style={{ color: '#041E17' }}>Alamat Email / Username</label>
              <div className="input-group">
                <span className="input-group-text" style={{ background: '#F3EFE6', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRight: 'none', borderRadius: '12px 0 0 12px', color: '#065F46' }}>
                  <i className="bi bi-envelope"></i>
                </span>
                <input
                  type="text"
                  className="form-control fw-medium"
                  placeholder="Email akun Manajemen Kantor"
                  required
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRadius: '0 12px 12px 0', color: '#041E17' }}
                />
              </div>
              <small className="mt-1 d-block" style={{ fontSize: '11px', color: '#64748b' }}>
                *Gunakan email &amp; kata sandi yang sama dengan <strong>Manajemen Kantor</strong>
              </small>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-bold mb-1.5 font-hero" style={{ color: '#041E17' }}>Password</label>
              <div className="input-group">
                <span className="input-group-text" style={{ background: '#F3EFE6', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRight: 'none', borderRadius: '12px 0 0 12px', color: '#065F46' }}>
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  type="password"
                  className="form-control fw-medium"
                  placeholder="Password"
                  required
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRadius: '0 12px 12px 0', color: '#041E17' }}
                />
              </div>
            </div>

            <button type="submit" className="btn w-100 py-3 fw-bold rounded-pill mb-3 text-white shadow font-hero" style={{ background: 'linear-gradient(135deg, #065F46, #041E17)', border: 'none', letterSpacing: '0.03em' }}>
              <i className="bi bi-box-arrow-in-right me-1.5"></i> Masuk Pengaturan
            </button>

            <Link href="/Antrian/" className="btn w-100 py-2.5 rounded-pill small text-decoration-none text-center d-block fw-bold font-hero" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
              <i className="bi bi-arrow-left me-1"></i> Kembali ke Portal Pelayanan
            </Link>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(155deg, #FAF8F5 0%, #F3EFE6 52%, #EFE9DC 100%)',
      minHeight: '100vh',
      padding: '24px 20px 60px',
      color: '#041E17',
      position: 'relative'
    }}>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.11,
          backgroundImage: "url('/images/gandrungmangu-pendopo-silhouette-light.webp')",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center bottom',
          backgroundSize: 'cover'
        }}
      />
      <div className="container position-relative" style={{ maxWidth: '1120px', zIndex: 10 }}>

        {/* Header Bar (Porcelain White + Ocean Blue) */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4 p-3.5 rounded-4" style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(6, 95, 70, 0.18)',
          boxShadow: '0 10px 30px rgba(4, 30, 23, 0.08)'
        }}>
          <div className="d-flex align-items-center gap-3">
            <img src={logoTambahan || "/img/logo-tambahan.png"} alt="Logo Instansi" style={{ height: '46px', objectFit: 'contain' }} />
            <div>
              <h1 className="fw-extrabold m-0 font-hero" style={{ fontSize: '1.4rem', letterSpacing: '-0.02em', color: '#041E17' }}>PENGATURAN SISTEM PELAYANAN</h1>
              <p className="m-0 small font-mono" style={{ color: '#065F46' }}>Kecamatan Gandrungmangu • Real-time Configurator</p>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Link href="/Antrian/" className="btn btn-sm rounded-pill px-3.5 py-1.5 d-flex align-items-center gap-1.5 fw-bold text-decoration-none font-hero text-white" style={{ background: 'linear-gradient(135deg, #065F46, #041E17)', border: 'none' }}>
              <i className="bi bi-arrow-left"></i> Kembali ke Portal
            </Link>
            <button onClick={handleLogout} className="btn btn-sm rounded-pill px-3.5 py-1.5 d-flex align-items-center gap-1.5 fw-bold font-hero" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              <i className="bi bi-box-arrow-right"></i> Keluar
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {alert.show && (
          <div className="alert border-0 text-white p-3 mb-4 text-center rounded-4 shadow fw-bold font-hero" style={{ background: alert.type === 'success' ? '#059669' : alert.type === 'danger' ? '#dc2626' : '#d97706' }}>
            {alert.message}
          </div>
        )}

        {/* Tab Navigation (Blue & White Pills) */}
        <div className="d-flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { id: 'umum', icon: 'bi-sliders', label: 'Pengaturan Umum' },
            { id: 'layanan', icon: 'bi-card-list', label: 'Kategori Layanan' },
            { id: 'loket', icon: 'bi-shop-window', label: 'Pengaturan Loket' },
            { id: 'daftar_pelayanan', icon: 'bi-journal-text', label: 'Daftar Pelayanan' },
            { id: 'operator_config', icon: 'bi-people', label: 'Manajemen Operator' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="btn flex-grow-1 py-2.5 px-3 fw-bold rounded-pill transition font-hero text-nowrap"
                style={{
                  background: isActive ? 'linear-gradient(135deg, #065F46, #041E17)' : '#ffffff',
                  color: isActive ? '#ffffff' : '#041E17',
                  border: isActive ? '1px solid #065F46' : '1px solid rgba(6, 95, 70, 0.2)',
                  boxShadow: isActive ? '0 8px 20px rgba(6, 95, 70, 0.25)' : '0 4px 12px rgba(4, 30, 23, 0.05)',
                  fontSize: '0.84rem'
                }}
              >
                <i className={`bi ${tab.icon} me-1.5`}></i> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Content Area (Porcelain White Card) */}
        <div className="card p-4 p-md-5 mb-4" style={{ background: '#ffffff', border: '1.5px solid rgba(6, 95, 70, 0.18)', borderRadius: '24px', boxShadow: '0 16px 40px rgba(4, 30, 23, 0.08)', color: '#041E17' }}>

          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color: '#065F46' }} role="status"></div>
              <p className="mt-3 fw-semibold" style={{ color: '#065F46' }}>Sinkronisasi data Firestore...</p>
            </div>
          )}

          {!loading && (
            <>
              {/* TAB 1: PENGATURAN UMUM */}
              {activeTab === 'umum' && (
                <form onSubmit={handleSaveSettings}>
                  <h4 className="fw-extrabold mb-4 pb-2 font-hero" style={{ color: '#065F46', borderBottom: '2px solid #F3EFE6' }}>Informasi Instansi</h4>
                  <div className="row g-4">
                    <div className="col-md-6">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Nama Instansi</label>
                      <input
                        type="text"
                        className="form-control py-2"
                        style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', color: '#041E17' }}
                        required
                        value={settings.instansi_nama || ''}
                        onChange={e => setSettings({ ...settings, instansi_nama: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Alamat Instansi</label>
                      <input
                        type="text"
                        className="form-control py-2"
                        style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', color: '#041E17' }}
                        required
                        value={settings.instansi_alamat || ''}
                        onChange={e => setSettings({ ...settings, instansi_alamat: e.target.value })}
                      />
                    </div>

                    <h4 className="fw-extrabold mb-1 mt-5 pb-2 font-hero" style={{ color: '#065F46', borderBottom: '2px solid #F3EFE6' }}>Pengaturan Display &amp; Media</h4>

                    <div className="col-12">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Teks Pengumuman Berjalan (Running Text)</label>
                      <textarea
                        rows="3"
                        className="form-control py-2"
                        style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', color: '#041E17' }}
                        required
                        value={settings.running_text || ''}
                        onChange={e => setSettings({ ...settings, running_text: e.target.value })}
                      ></textarea>
                    </div>

                    <div className="col-md-8">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Display YouTube Video URL</label>
                      <input
                        type="text"
                        className="form-control py-2"
                        style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', color: '#041E17' }}
                        placeholder="Contoh: https://www.youtube.com/watch?v=h-z_t11jvPU atau https://youtu.be/..."
                        value={settings.display_video_url || ''}
                        onChange={e => setSettings({ ...settings, display_video_url: e.target.value })}
                      />
                      <small className="mt-1 d-block" style={{ color: '#64748b' }}>Mendukung link YouTube biasa (watch?v=), link pendek (youtu.be), Shorts, Live stream, Playlist, maupun file video (.mp4). Video diputar otomatis secara loop di Display Antrian.</small>
                    </div>

                    {/* ─── PANEL MODE DISPLAY TV ─────────────────────────── */}
                    <div className="col-12 mt-2">
                      <div
                        style={{
                          border: `1.5px solid ${tvMode === 'tv' ? 'rgba(239,68,68,0.45)' : 'rgba(6, 95, 70,0.25)'}`,
                          borderRadius: '18px',
                          padding: '18px 20px',
                          background: tvMode === 'tv' ? '#fef2f2' : '#FAF8F5',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-tv-fill" style={{ fontSize: '1.3rem', color: tvMode === 'tv' ? '#dc2626' : '#065F46' }} />
                            <div>
                              <div className="fw-bold font-hero" style={{ fontSize: '1rem', color: '#041E17' }}>Mode Siaran TV (IPTV)</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Sumber: dhasap/dhanytv — 920+ channel Indonesia gratis</div>
                            </div>
                          </div>
                          <span
                            className="badge rounded-pill fw-bold px-3 py-2 font-mono"
                            style={{
                              fontSize: '0.76rem',
                              background: tvMode === 'tv' ? '#dc2626' : '#F3EFE6',
                              color: tvMode === 'tv' ? '#ffffff' : '#065F46',
                              border: tvMode === 'tv' ? 'none' : '1px solid rgba(6, 95, 70,0.25)'
                            }}
                          >
                            {tvMode === 'tv' ? '📺 Sedang Mode TV' : '🔢 Sedang Mode Antrian'}
                          </span>
                        </div>

                        <div className="row g-2 mb-3">
                          <div className="col-md-4">
                            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.82rem', color: '#475569' }}>Grup Channel</label>
                            <select
                              className="form-select form-select-sm"
                              style={{ background: '#ffffff', border: '1.5px solid rgba(6, 95, 70, 0.22)', color: '#041E17' }}
                              value={tvGroupFilter}
                              onChange={e => {
                                setTvGroupFilter(e.target.value);
                                fetchTvChannels(e.target.value);
                                setTvSelectedChannel(null);
                              }}
                              onClick={() => { if (tvChannels.length === 0) fetchTvChannels(tvGroupFilter); }}
                            >
                              {tvGroups.length === 0 && <option value="Indonesia Channels">Indonesia Channels</option>}
                              {tvGroups.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.82rem', color: '#475569' }}>Pilih Channel</label>
                            <select
                              className="form-select form-select-sm"
                              style={{ background: '#ffffff', border: '1.5px solid rgba(6, 95, 70, 0.22)', color: '#041E17' }}
                              value={tvSelectedChannel?.url || ''}
                              onChange={e => {
                                const ch = tvChannels.find(c => c.url === e.target.value);
                                setTvSelectedChannel(ch || null);
                              }}
                              onClick={() => { if (tvChannels.length === 0) fetchTvChannels(tvGroupFilter); }}
                            >
                              <option value="">-- Pilih Channel --</option>
                              {tvLoadingChannels && <option disabled>Memuat daftar channel...</option>}
                              {tvChannels.map((ch, idx) => (
                                <option key={idx} value={ch.url}>{ch.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2 d-flex align-items-end">
                            <button
                              type="button"
                              className="btn btn-sm w-100"
                              style={{ background: '#F3EFE6', color: '#065F46', border: '1px solid rgba(6, 95, 70,0.25)' }}
                              onClick={() => fetchTvChannels(tvGroupFilter)}
                              disabled={tvLoadingChannels}
                              title="Muat ulang daftar channel"
                            >
                              {tvLoadingChannels
                                ? <span className="spinner-border spinner-border-sm" />
                                : <i className="bi bi-arrow-clockwise" />}
                            </button>
                          </div>
                        </div>

                        {tvSelectedChannel && (
                          <div
                            className="d-flex align-items-center gap-3 p-2.5 mb-3 rounded-3"
                            style={{ background: '#ffffff', border: '1px solid rgba(6, 95, 70,0.2)' }}
                          >
                            {tvSelectedChannel.logo && (
                              <img
                                src={tvSelectedChannel.logo}
                                alt={tvSelectedChannel.name}
                                style={{ height: '32px', width: 'auto', objectFit: 'contain', borderRadius: '6px' }}
                                onError={e => e.target.style.display = 'none'}
                              />
                            )}
                            <div className="flex-grow-1">
                              <div className="fw-bold" style={{ fontSize: '0.9rem', color: '#041E17' }}>{tvSelectedChannel.name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', wordBreak: 'break-all' }}>{tvSelectedChannel.url.slice(0, 60)}...</div>
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '2px 7px', letterSpacing: '1px' }}>
                              LIVE
                            </span>
                          </div>
                        )}

                        <div className="d-flex gap-2 flex-wrap">
                          <button
                            type="button"
                            className="btn btn-sm fw-bold rounded-pill px-4 font-hero"
                            disabled={tvSwitching || !tvSelectedChannel || tvMode === 'tv'}
                            onClick={() => handleSwitchDisplayMode('tv')}
                            style={{
                              background: tvMode !== 'tv' && tvSelectedChannel ? '#dc2626' : '#cbd5e1',
                              color: '#ffffff', border: 'none', opacity: (!tvSelectedChannel || tvMode === 'tv') ? 0.6 : 1
                            }}
                          >
                            {tvSwitching && tvMode !== 'tv'
                              ? <><span className="spinner-border spinner-border-sm me-1" />Mengganti...</>
                              : <><i className="bi bi-tv-fill me-1" />Aktifkan Mode TV</>}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm fw-bold rounded-pill px-4 font-hero text-white"
                            disabled={tvSwitching || tvMode === 'antrian'}
                            onClick={() => handleSwitchDisplayMode('antrian')}
                            style={{
                              background: tvMode === 'tv' ? 'linear-gradient(135deg, #065F46, #041E17)' : '#cbd5e1',
                              border: 'none', opacity: tvMode === 'antrian' ? 0.6 : 1
                            }}
                          >
                            {tvSwitching && tvMode === 'tv'
                              ? <><span className="spinner-border spinner-border-sm me-1" />Mengganti...</>
                              : <><i className="bi bi-grid-3x3-gap-fill me-1" />Kembali ke Antrian</>}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Volume Suara Panggilan (Bell Chime)</label>
                      <div className="d-flex align-items-center gap-3">
                        <input
                          type="range"
                          className="form-range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={settings.bell_sound_volume || '0.8'}
                          onChange={e => setSettings({ ...settings, bell_sound_volume: e.target.value })}
                        />
                        <span className="badge font-mono px-2.5 py-2" style={{ background: '#F3EFE6', color: '#065F46', border: '1px solid rgba(6, 95, 70,0.25)' }}>{Math.round((parseFloat(settings.bell_sound_volume) || 0) * 100)}%</span>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Volume Tampilan TV / Video</label>
                      <div className="d-flex align-items-center gap-3">
                        <input
                          type="range"
                          className="form-range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={settings.display_video_volume || '0.8'}
                          onChange={e => setSettings({ ...settings, display_video_volume: e.target.value })}
                        />
                        <span className="badge font-mono px-2.5 py-2" style={{ background: '#F3EFE6', color: '#065F46', border: '1px solid rgba(6, 95, 70,0.25)' }}>{Math.round((parseFloat(settings.display_video_volume) || 0) * 100)}%</span>
                      </div>
                      <small className="mt-1 d-block" style={{ color: '#64748b' }}>Mengatur volume siaran TV / video yang diputar di Display Antrian.</small>
                    </div>
                  </div>

                  <div className="text-end mt-5 pt-3" style={{ borderTop: '1px solid #e2e8f0' }}>
                    <button type="submit" className="btn btn-lg px-5 fw-bold text-white rounded-pill shadow font-hero" style={{ background: 'linear-gradient(135deg, #065F46, #041E17)', border: 'none' }}>
                      Simpan Semua Perubahan
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: KATEGORI LAYANAN */}
              {activeTab === 'layanan' && (
                <div>
                  <h4 className="fw-extrabold mb-4 pb-2 font-hero" style={{ color: '#065F46', borderBottom: '2px solid #F3EFE6' }}>
                    {isEditingLayanan ? 'Edit Layanan' : 'Tambah Kategori Layanan Baru'}
                  </h4>
                  <form onSubmit={handleSaveLayanan} className="row g-3 mb-5 align-items-end p-3.5 rounded-4" style={{ background: '#FAF8F5', border: '1px solid rgba(6, 95, 70,0.16)' }}>
                    <div className="col-md-1">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Kode</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ background: '#ffffff', border: '1.5px solid rgba(6, 95, 70,0.22)', color: '#041E17' }}
                        placeholder="A"
                        maxLength="2"
                        required
                        disabled={isEditingLayanan}
                        value={layananForm.kode}
                        onChange={e => setLayananForm({ ...layananForm, kode: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Nama Layanan</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ background: '#ffffff', border: '1.5px solid rgba(6, 95, 70,0.22)', color: '#041E17' }}
                        placeholder="Contoh: Pelayanan Kependudukan"
                        required
                        value={layananForm.nama}
                        onChange={e => setLayananForm({ ...layananForm, nama: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Loket Pelayanan</label>
                      <select
                        className="form-select"
                        style={{ background: '#ffffff', border: '1.5px solid rgba(6, 95, 70,0.22)', color: '#041E17' }}
                        required
                        value={layananForm.loket_id || ''}
                        onChange={e => {
                          const selectedLok = loketList.find(l => l.id === e.target.value);
                          setLayananForm({
                            ...layananForm,
                            loket_id: e.target.value,
                            loket_nama: selectedLok ? selectedLok.nama : ''
                          });
                        }}
                      >
                        <option value="">-- Pilih Loket --</option>
                        {loketList.map(l => (
                          <option key={l.id} value={l.id}>{l.nama}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Estimasi (Mnt)</label>
                      <input
                        type="number"
                        className="form-control"
                        style={{ background: '#ffffff', border: '1.5px solid rgba(6, 95, 70,0.22)', color: '#041E17' }}
                        placeholder="15"
                        required
                        value={layananForm.estimasi_waktu}
                        onChange={e => setLayananForm({ ...layananForm, estimasi_waktu: e.target.value })}
                      />
                    </div>
                    <div className="col-md-2 d-flex gap-2">
                      <button type="submit" className="btn fw-bold w-100 py-2 text-white rounded-3 font-hero" style={{ background: 'linear-gradient(135deg, #065F46, #041E17)', border: 'none' }}>
                        {isEditingLayanan ? 'Update' : 'Simpan'}
                      </button>
                      {isEditingLayanan && (
                        <button
                          type="button"
                          className="btn btn-outline-danger w-100 py-2 rounded-3"
                          onClick={() => {
                            setLayananForm({ id: '', kode: '', nama: '', estimasi_waktu: '', loket_id: '', loket_nama: '' });
                            setIsEditingLayanan(false);
                          }}
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </form>

                  <h4 className="fw-extrabold mb-3 font-hero" style={{ color: '#041E17' }}>Daftar Layanan Saat Ini</h4>
                  <div className="table-responsive rounded-3 overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
                    <table className="table table-hover align-middle m-0">
                      <thead>
                        <tr style={{ background: '#F3EFE6', color: '#041E17' }}>
                          <th style={{ width: '10%' }} className="text-center font-hero">Kode</th>
                          <th style={{ width: '35%' }} className="font-hero">Nama Layanan</th>
                          <th style={{ width: '20%' }} className="text-center font-hero">Loket Pelayanan</th>
                          <th style={{ width: '15%' }} className="text-center font-hero">Estimasi Waktu</th>
                          <th style={{ width: '20%' }} className="text-center font-hero">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {layananList.map((layanan) => (
                          <tr key={layanan.id}>
                            <td className="text-center fw-black fs-5 font-mono" style={{ color: '#065F46' }}>{layanan.kode}</td>
                            <td className="fw-bold" style={{ color: '#041E17' }}>{layanan.nama}</td>
                            <td className="text-center fw-semibold" style={{ color: '#047857' }}>{layanan.loket_nama || '-'}</td>
                            <td className="text-center">{layanan.estimasi_waktu} Menit</td>
                            <td className="text-center">
                              <div className="d-flex justify-content-center gap-2">
                                <button className="btn btn-sm rounded-pill px-3 fw-bold" style={{ background: '#F3EFE6', color: '#065F46', border: '1px solid rgba(6, 95, 70,0.25)' }} onClick={() => handleEditLayanan(layanan)}>
                                  <i className="bi bi-pencil-square"></i> Edit
                                </button>
                                <button className="btn btn-sm rounded-pill px-3 fw-bold" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }} onClick={() => handleDeleteLayanan(layanan.id)}>
                                  <i className="bi bi-trash"></i> Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {layananList.length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-4 text-muted">Belum ada kategori layanan. Silakan tambahkan di atas.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: PENGATURAN LOKET */}
              {activeTab === 'loket' && (
                <div>
                  <h4 className="fw-extrabold mb-4 pb-2 font-hero" style={{ color: '#065F46', borderBottom: '2px solid #F3EFE6' }}>
                    Tambah Loket Pelayanan Baru
                  </h4>
                  <form onSubmit={handleSaveLoket} className="row g-3 mb-5 align-items-end p-3.5 rounded-4" style={{ background: '#FAF8F5', border: '1px solid rgba(6, 95, 70,0.16)' }}>
                    <div className="col-md-9">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Nama Loket</label>
                      <input
                        type="text"
                        className="form-control py-2"
                        style={{ background: '#ffffff', border: '1.5px solid rgba(6, 95, 70,0.22)', color: '#041E17' }}
                        placeholder="Contoh: Loket 5, Loket Customer Service, dll."
                        required
                        value={loketForm.nama}
                        onChange={e => setLoketForm({ ...loketForm, nama: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <button type="submit" className="btn fw-bold w-100 py-2 text-white rounded-3 font-hero" style={{ background: 'linear-gradient(135deg, #065F46, #041E17)', border: 'none' }}>
                        Tambah Loket
                      </button>
                    </div>
                  </form>

                  <h4 className="fw-extrabold mb-3 font-hero" style={{ color: '#041E17' }}>Daftar Loket Terdaftar</h4>
                  <div className="table-responsive rounded-3 overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
                    <table className="table table-hover align-middle m-0">
                      <thead>
                        <tr style={{ background: '#F3EFE6', color: '#041E17' }}>
                          <th style={{ width: '80%' }} className="font-hero">Nama Loket</th>
                          <th style={{ width: '20%' }} className="text-center font-hero">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loketList.map((loket) => (
                          <tr key={loket.id}>
                            <td className="fw-bold fs-5 ps-4 font-hero" style={{ color: '#065F46' }}>{loket.nama}</td>
                            <td className="text-center">
                              <button className="btn btn-sm rounded-pill px-3 fw-bold" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }} onClick={() => handleDeleteLoket(loket.id)}>
                                <i className="bi bi-trash"></i> Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                        {loketList.length === 0 && (
                          <tr>
                            <td colSpan="2" className="text-center py-4 text-muted">Belum ada loket terdaftar. Silakan tambahkan di atas.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: DAFTAR PELAYANAN (HISTORI) */}
              {activeTab === 'daftar_pelayanan' && (
                <div>
                  <h4 className="fw-extrabold mb-4 pb-2 font-hero" style={{ color: '#065F46', borderBottom: '2px solid #F3EFE6' }}>Histori Daftar Pelayanan</h4>

                  <div className="row g-3 mb-4 p-3.5 rounded-4" style={{ background: '#FAF8F5', border: '1px solid rgba(6, 95, 70,0.16)' }}>
                    <div className="col-md-2">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Filter Waktu</label>
                      <select className="form-select" style={{ background: '#ffffff', border: '1.5px solid rgba(6, 95, 70,0.22)', color: '#041E17' }} value={filterMode} onChange={e => setFilterMode(e.target.value)}>
                        <option value="hari">Per Hari (Tanggal)</option>
                        <option value="bulan">Per Bulan</option>
                      </select>
                    </div>

                    {filterMode === 'hari' ? (
                      <div className="col-md-3">
                        <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Pilih Hari</label>
                        <input
                          type="date"
                          className="form-control"
                          style={{ background: '#ffffff', border: '1.5px solid rgba(6, 95, 70,0.22)', color: '#041E17' }}
                          value={filterDate}
                          onChange={e => setFilterDate(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="col-md-3">
                        <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Pilih Bulan</label>
                        <input
                          type="month"
                          className="form-control"
                          style={{ background: '#ffffff', border: '1.5px solid rgba(6, 95, 70,0.22)', color: '#041E17' }}
                          value={filterMonth}
                          onChange={e => setFilterMonth(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="col-md-3">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Jenis Pelayanan</label>
                      <select className="form-select" style={{ background: '#ffffff', border: '1.5px solid rgba(6, 95, 70,0.22)', color: '#041E17' }} value={filterLayanan} onChange={e => setFilterLayanan(e.target.value)}>
                        <option value="semua">-- Semua Pelayanan --</option>
                        {layananList.map(l => (
                          <option key={l.id} value={l.id}>{l.nama} ({l.kode})</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-2 d-flex align-items-end">
                      <button
                        type="button"
                        className="btn w-100 py-2 fw-bold rounded-3 font-hero text-white"
                        style={{ background: 'linear-gradient(135deg, #065F46, #041E17)', border: 'none' }}
                        onClick={() => window.print()}
                      >
                        <i className="bi bi-printer"></i> Cetak
                      </button>
                    </div>

                    <div className="col-md-2 d-flex align-items-end">
                      <button
                        type="button"
                        className="btn w-100 py-2 fw-bold rounded-3 font-hero text-white"
                        style={{ background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none' }}
                        onClick={downloadExcel}
                      >
                        <i className="bi bi-file-earmark-excel"></i> Excel
                      </button>
                    </div>
                  </div>

                  {historyLoading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border" style={{ color: '#065F46' }} role="status"></div>
                      <p className="mt-2 small fw-semibold" style={{ color: '#065F46' }}>Memuat data histori...</p>
                    </div>
                  ) : (
                    <div id="report-print-wrapper">
                      <div className="d-none d-print-block text-dark text-center" style={{ marginBottom: '25px' }}>
                        <h2 className="fw-bold mb-1" style={{ fontSize: '18pt' }}>{settings.instansi_nama}</h2>
                        <p className="small mb-3" style={{ fontSize: '10pt', color: '#555' }}>{settings.instansi_alamat}</p>
                        <h4 className="fw-bold text-uppercase border-bottom border-2 border-dark pb-2" style={{ fontSize: '13pt', letterSpacing: '0.5px' }}>Laporan Daftar Pelayanan Antrian</h4>
                        <div className="d-flex justify-content-between mt-3 px-1" style={{ fontSize: '9pt', fontFamily: 'monospace' }}>
                          <span>Periode: <strong>{formatPeriodeText()}</strong></span>
                          <span>Layanan: <strong>{filterLayanan === 'semua' ? 'Semua Pelayanan' : layananList.find(l => l.id === filterLayanan)?.nama}</strong></span>
                        </div>
                      </div>

                      <div className="table-responsive rounded-3 overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
                        <table className="table table-hover align-middle m-0" id="report-table">
                          <thead>
                            <tr style={{ background: '#F3EFE6', color: '#041E17' }}>
                              <th style={{ width: '4%' }} className="text-center font-hero">No</th>
                              <th style={{ width: '11%' }} className="text-center font-hero">Waktu</th>
                              <th style={{ width: '10%' }} className="text-center font-hero">No. Antrian</th>
                              <th style={{ width: '14%' }} className="font-hero">Jenis Pelayanan</th>
                              <th style={{ width: '13%' }} className="font-hero">Nama</th>
                              <th style={{ width: '15%' }} className="font-hero">Alamat</th>
                              <th style={{ width: '11%' }} className="font-hero">No Telepon</th>
                              <th style={{ width: '12%' }} className="font-hero">Nama Operator</th>
                              <th style={{ width: '10%' }} className="text-center d-print-none font-hero">Kirim WA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyList.filter(item => filterLayanan === 'semua' || item.pelayanan_id === filterLayanan).map((item, idx) => (
                              <tr key={item.id}>
                                <td className="text-center text-muted">{idx + 1}</td>
                                <td className="text-center small">
                                  {item.created_at ? new Date(item.created_at.toMillis()).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                                </td>
                                <td className="text-center fw-bold font-mono" style={{ color: '#065F46' }}>{item.nomor_lengkap}</td>
                                <td className="fw-semibold" style={{ color: '#041E17' }}>{item.pelayanan_nama}</td>
                                <td>{item.warga_nama || <em className="text-muted small">-</em>}</td>
                                <td>{item.warga_alamat || <em className="text-muted small">-</em>}</td>
                                <td>{item.warga_hp || <em className="text-muted small">-</em>}</td>
                                <td>
                                  {(() => {
                                    const opName = resolveOperatorName(item);
                                    if (opName && opName !== '-') {
                                      return (
                                        <span className="badge px-2 py-1 fw-semibold" style={{ background: '#F3EFE6', color: '#065F46', border: '1px solid rgba(6, 95, 70,0.22)' }}>
                                          <i className="bi bi-person-badge me-1"></i>
                                          {opName}
                                        </span>
                                      );
                                    }
                                    return <em className="text-muted small">-</em>;
                                  })()}
                                </td>
                                <td className="text-center d-print-none">
                                  {item.warga_hp && item.warga_hp.trim() !== '' && item.warga_hp !== '-' ? (
                                    item.wa_evaluasi_sent ? (
                                      <button
                                        type="button"
                                        onClick={() => handleSendWaEvaluasi(item)}
                                        className="btn btn-sm rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1.5 shadow-sm fw-bold"
                                        style={{ fontSize: '11px', background: '#059669', border: 'none', color: '#ffffff' }}
                                        title={`Sudah terkirim ke ${item.warga_nama || 'Warga'}. Klik untuk kirim ulang.`}
                                      >
                                        <i className="bi bi-check-circle-fill"></i>
                                        <span>Terkirim</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleSendWaEvaluasi(item)}
                                        className="btn btn-sm rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1 shadow-sm fw-bold text-white"
                                        style={{ fontSize: '11px', background: '#25D366', border: 'none' }}
                                        title={`Kirim WA Evaluasi ke ${item.warga_nama || 'Warga'}`}
                                      >
                                        <i className="bi bi-whatsapp"></i>
                                        <span>Kirim WA</span>
                                      </button>
                                    )
                                  ) : (
                                    <span className="text-muted small">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {historyList.filter(item => filterLayanan === 'semua' || item.pelayanan_id === filterLayanan).length === 0 && (
                              <tr>
                                <td colSpan="9" className="text-center py-4 text-muted">
                                  Tidak ada data antrian untuk filter terpilih.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                      @page {
                        size: A4 landscape;
                        margin: 10mm 15mm;
                      }
                      body {
                        background: #ffffff !important;
                        color: #000000 !important;
                      }
                      body * {
                        visibility: hidden !important;
                      }
                      #report-print-wrapper, #report-print-wrapper * {
                        visibility: visible !important;
                      }
                      #report-print-wrapper {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                      }
                      #report-table {
                        width: 100% !important;
                        color: #000000 !important;
                        border-collapse: collapse !important;
                        margin-top: 10px !important;
                      }
                      #report-table th, #report-table td {
                        color: #000000 !important;
                        border: 1px solid #000000 !important;
                        background: #ffffff !important;
                        padding: 6px 8px !important;
                        font-size: 10pt !important;
                      }
                      #report-table th {
                        background-color: #f2f2f2 !important;
                        font-weight: bold !important;
                      }
                      #report-print-wrapper .d-print-none,
                      #report-table .d-print-none {
                        display: none !important;
                        visibility: hidden !important;
                      }
                    }
                  `}} />
                </div>
              )}

              {/* TAB 5: MANAJEMEN OPERATOR */}
              {activeTab === 'operator_config' && (
                <div>
                  <h4 className="fw-extrabold mb-4 pb-2 font-hero" style={{ color: '#065F46', borderBottom: '2px solid #F3EFE6' }}>
                    {isEditingOperator ? 'Edit Operator' : 'Tambah Operator Baru'}
                  </h4>
                  <form onSubmit={handleSaveOperator} className="row g-3 mb-5 align-items-end p-3.5 rounded-4" style={{ background: '#FAF8F5', border: '1px solid rgba(6, 95, 70,0.16)' }}>
                    <div className="col-md-3">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Nama Lengkap</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ background: '#ffffff', border: '1.5px solid rgba(6, 95, 70,0.22)', color: '#041E17' }}
                        placeholder="Contoh: Budi Santoso"
                        required
                        value={operatorForm.nama}
                        onChange={e => setOperatorForm({ ...operatorForm, nama: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Username</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ background: '#ffffff', border: '1.5px solid rgba(6, 95, 70,0.22)', color: '#041E17' }}
                        placeholder="Contoh: budi"
                        required
                        value={operatorForm.username}
                        onChange={e => setOperatorForm({ ...operatorForm, username: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Password</label>
                      <input
                        type="password"
                        className="form-control"
                        style={{ background: '#ffffff', border: '1.5px solid rgba(6, 95, 70,0.22)', color: '#041E17' }}
                        placeholder="Password login"
                        required
                        value={operatorForm.password}
                        onChange={e => setOperatorForm({ ...operatorForm, password: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3 d-flex gap-2">
                      <button type="submit" className="btn fw-bold w-100 py-2 text-white rounded-3 font-hero" style={{ background: 'linear-gradient(135deg, #065F46, #041E17)', border: 'none' }}>
                        {isEditingOperator ? 'Perbarui' : 'Tambah'}
                      </button>
                      {isEditingOperator && (
                        <button
                          type="button"
                          className="btn btn-outline-danger w-100 py-2 rounded-3"
                          onClick={() => {
                            setOperatorForm({ id: '', nama: '', username: '', password: '' });
                            setIsEditingOperator(false);
                          }}
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </form>

                  <h4 className="fw-extrabold mb-3 font-hero" style={{ color: '#041E17' }}>Daftar Operator Terdaftar</h4>
                  <div className="table-responsive rounded-3 overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
                    <table className="table table-hover align-middle m-0">
                      <thead>
                        <tr style={{ background: '#F3EFE6', color: '#041E17' }}>
                          <th style={{ width: '40%' }} className="font-hero">Nama Operator</th>
                          <th style={{ width: '30%' }} className="font-hero">Username</th>
                          <th style={{ width: '30%' }} className="text-center font-hero">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operatorList.map((op) => (
                          <tr key={op.id}>
                            <td className="fw-bold fs-6 ps-4 font-hero" style={{ color: '#065F46' }}>{op.nama}</td>
                            <td><code style={{ color: '#041E17', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>{op.username}</code></td>
                            <td className="text-center">
                              <button className="btn btn-sm rounded-pill px-3 fw-bold me-2" style={{ background: '#F3EFE6', color: '#065F46', border: '1px solid rgba(6, 95, 70,0.25)' }} onClick={() => handleEditOperator(op)}>
                                <i className="bi bi-pencil"></i> Edit
                              </button>
                              <button className="btn btn-sm rounded-pill px-3 fw-bold" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }} onClick={() => handleDeleteOperator(op.id)}>
                                <i className="bi bi-trash"></i> Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                        {operatorList.length === 0 && (
                          <tr>
                            <td colSpan="3" className="text-center py-4 text-muted">Belum ada operator terdaftar. Silakan tambahkan di atas.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
