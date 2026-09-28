"use client";

import { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';

const formatHeroImage = (raw) => {
  if (!raw || typeof raw !== 'string') return '/hero-Kecamatan.jpg';
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) {
    return raw;
  }
  return `data:image/jpeg;base64,${raw}`;
};

export default function Operator() {
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

  const [logoKecamatan, setLogoKecamatan] = useState('/img/Logo.png');
  const [logoTambahan, setLogoTambahan] = useState('/img/cilacap-bercahaya.png');

  // Ambil background Foto Halaman Utama & Logo dari Pengaturan (/settings/ - settings/village)
  useEffect(() => {
    // 1. Fetch cepat dari API /api/village-profile/
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

    // 2. Real-time snapshot dari Firestore settings/village
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

  const [pelayananList, setPelayananList] = useState([]);
  const [loketList, setLoketList] = useState(['Loket 1', 'Loket 2', 'Loket 3', 'Loket 4']);

  const [selectedLayanan, setSelectedLayanan] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('op_layanan') || 'semua';
    }
    return 'semua';
  });
  const [selectedLoket, setSelectedLoket] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('op_loket') || '';
    }
    return '';
  });
  const [isLogged, setIsLogged] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('op_logged') === 'true';
    }
    return false;
  });

  // Authentication & Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [operatorNama, setOperatorNama] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('op_nama') || '';
    }
    return '';
  });
  const [loginError, setLoginError] = useState('');

  // Switch Loket Modal States
  const [showSwitchLoketModal, setShowSwitchLoketModal] = useState(false);
  const [tempLoket, setTempLoket] = useState('');
  const [tempLayanan, setTempLayanan] = useState('');
  const [tempOperator, setTempOperator] = useState('');

  // Operator List dari Daftar Terdaftar
  const [operatorList, setOperatorList] = useState([]);
  const [selectedOpId, setSelectedOpId] = useState('');

  // Queues & Stats States
  const [waitingQueues, setWaitingQueues] = useState([]);
  const [waitingQueuesA, setWaitingQueuesA] = useState([]);
  const [waitingQueuesB, setWaitingQueuesB] = useState([]);
  const [waitingQueuesC, setWaitingQueuesC] = useState([]);
  const [currentQueue, setCurrentQueue] = useState(null);
  const [stats, setStats] = useState({ waiting: 0, waitingA: 0, waitingB: 0, waitingC: 0, served: 0 });
  const [lastCompleted, setLastCompleted] = useState(null);
  const [selectedBerkasModal, setSelectedBerkasModal] = useState(null);
  const [activeTab, setActiveTab] = useState('semua'); // 'semua', 'pelayanan-A', 'pelayanan-B', 'pelayanan-C'
  const [showWaModal, setShowWaModal] = useState(false);
  const [completedForWa, setCompletedForWa] = useState(null);

  useEffect(() => {
    // Fetch pelayanan
    const pRef = collection(db, 'pelayanan');
    getDocs(pRef).then(snap => {
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setPelayananList(data);
    });

    // Fetch loket (Real-time)
    const unsubLoket = onSnapshot(collection(db, 'loket'), (snap) => {
      if (!snap.empty) {
        const list = [];
        snap.forEach(d => {
          if (d.data().nama) {
            list.push(d.data().nama);
          }
        });
        list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        setLoketList(list);
      }
    });

    // Fetch operators dari Daftar Operator Terdaftar (Real-time)
    const unsubOperators = onSnapshot(collection(db, 'operators'), (snap) => {
      if (!snap.empty) {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
        setOperatorList(list);

        // Auto-sinkronkan jika operatorNama saat ini masih kosong / default / belum sesuai operator terdaftar
        setOperatorNama(prev => {
          if (!prev || prev === '' || prev === 'Admin Sistem' || prev === 'Operator' || prev === 'Operator Loket') {
            const defaultOp = list[0]?.nama || 'Operator Loket';
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('op_nama', defaultOp);
            }
            return defaultOp;
          }
          return prev;
        });
      }
    });

    return () => {
      unsubLoket();
      unsubOperators();
    };
  }, []);

  const isMultiService = selectedLayanan === 'semua' || !selectedLayanan;

  useEffect(() => {
    if (!isLogged) return;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startOfDay = Timestamp.fromDate(now);

    const q = query(
      collection(db, 'antrian'),
      where('created_at', '>=', startOfDay),
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      let allWait = [];
      let waitA = [];
      let waitB = [];
      let waitC = [];
      let current = null;
      let served = 0;
      let totalWait = 0;
      let totalWaitA = 0;
      let totalWaitB = 0;
      let totalWaitC = 0;
      let lastComp = null;

      snap.forEach(docSnap => {
        const isSentLocal = typeof window !== 'undefined' && localStorage.getItem(`wa_sent_${docSnap.id}`) === 'true';
        const data = { 
          id: docSnap.id, 
          ...docSnap.data(),
          wa_evaluasi_sent: Boolean(docSnap.data().wa_evaluasi_sent || isSentLocal)
        };

        if (data.status === 'menunggu') {
          totalWait++;
          allWait.push(data);

          if (data.pelayanan_id === 'pelayanan-A' || data.kode === 'A') {
            waitA.push(data);
            totalWaitA++;
          } else if (data.pelayanan_id === 'pelayanan-B' || data.kode === 'B') {
            waitB.push(data);
            totalWaitB++;
          } else if (data.pelayanan_id === 'pelayanan-C' || data.kode === 'C') {
            waitC.push(data);
            totalWaitC++;
          }
        }
        if (data.status === 'dipanggil' && data.loket === selectedLoket) {
          current = data;
        }
        if (data.status === 'selesai' && data.loket === selectedLoket) {
          served++;
          lastComp = data;
        }
      });

      setWaitingQueues(allWait);
      setWaitingQueuesA(waitA);
      setWaitingQueuesB(waitB);
      setWaitingQueuesC(waitC);
      setCurrentQueue(current);
      setStats({ waiting: totalWait, waitingA: totalWaitA, waitingB: totalWaitB, waitingC: totalWaitC, served });
      setLastCompleted(lastComp);
    });

    return () => unsubscribe();
  }, [isLogged, selectedLayanan, selectedLoket]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedLoket || !username.trim() || !password) {
      setLoginError('Harap isi Username/Email, Password, dan Pilih Loket.');
      return;
    }

    const currentLayanan = selectedLayanan || 'semua';
    const uname = username.trim();
    setLoginError('');

    // 1. Cek Firestore collection operators TERLEBIH DAHULU agar sesuai dengan Daftar Operator Terdaftar
    try {
      const q = query(
        collection(db, 'operators'),
        where('username', '==', uname),
        where('password', '==', password)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const opDoc = snap.docs[0].data();
        const finalOpNama = opDoc.nama || uname;
        setOperatorNama(finalOpNama);
        sessionStorage.setItem('op_logged', 'true');
        sessionStorage.setItem('op_layanan', currentLayanan);
        sessionStorage.setItem('op_loket', selectedLoket);
        sessionStorage.setItem('op_nama', finalOpNama);
        setSelectedLayanan(currentLayanan);
        setIsLogged(true);
        return;
      }
    } catch (err) {
      console.error('Gagal verifikasi operator Firestore:', err);
    }

    const envAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@gandrungmangu.id';
    const envAdminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'gandrungmangu123';

    // 2. Cek Kredensial Admin Sistem
    if (
      (uname.toLowerCase() === envAdminEmail.toLowerCase() && password === envAdminPass) ||
      (uname.toLowerCase() === 'gandrungmangu@gmail.id' && password === envAdminPass) ||
      (uname.toLowerCase() === 'admin' && (password === envAdminPass || password === 'admin')) ||
      (uname.toLowerCase() === 'antrian.kecgandrungmangu@mail.id' && password === 'login')
    ) {
      // Prioritaskan nama operator yang dipilih dari dropdown / terdaftar
      const foundOp = operatorList.find(op => op.id === selectedOpId) || operatorList.find(op => op.username?.toLowerCase() === uname.toLowerCase());
      const opNama = foundOp?.nama || (operatorList.length > 0 ? operatorList[0].nama : 'Operator Loket');
      setOperatorNama(opNama);
      sessionStorage.setItem('op_logged', 'true');
      sessionStorage.setItem('op_layanan', currentLayanan);
      sessionStorage.setItem('op_loket', selectedLoket);
      sessionStorage.setItem('op_nama', opNama);
      setSelectedLayanan(currentLayanan);
      setIsLogged(true);
      return;
    }

    // 3. Cek Firebase Authentication (Login yang sama dengan Masuk Sistem)
    if (auth) {
      try {
        const userCred = await signInWithEmailAndPassword(auth, uname, password);
        const foundOp = operatorList.find(op => op.id === selectedOpId) || operatorList.find(op => op.username?.toLowerCase() === uname.toLowerCase());
        const opNama = foundOp?.nama || userCred.user?.displayName || userCred.user?.email || (operatorList.length > 0 ? operatorList[0].nama : 'Operator Loket');
        setOperatorNama(opNama);
        sessionStorage.setItem('op_logged', 'true');
        sessionStorage.setItem('op_layanan', currentLayanan);
        sessionStorage.setItem('op_loket', selectedLoket);
        sessionStorage.setItem('op_nama', opNama);
        setSelectedLayanan(currentLayanan);
        setIsLogged(true);
        return;
      } catch (authErr) {
        // Coba lanjut ke operator db
      }
    }

    setLoginError('Username atau Password operator salah. Gunakan akun yang terdaftar pada Daftar Operator Terdaftar.');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('op_logged');
    sessionStorage.removeItem('op_layanan');
    sessionStorage.removeItem('op_loket');
    sessionStorage.removeItem('op_nama');

    setUsername('');
    setPassword('');
    setSelectedOpId('');
    setIsLogged(false);
  };

  const handleOpenSwitchModal = () => {
    setTempLoket(selectedLoket || (loketList.length > 0 ? loketList[0] : 'Loket 1'));
    setTempLayanan(selectedLayanan || 'semua');
    setTempOperator(operatorNama || (operatorList.length > 0 ? operatorList[0].nama : 'Operator Loket'));
    setShowSwitchLoketModal(true);
  };

  const handleApplySwitchLoket = () => {
    if (!tempLoket) {
      alert('Harap pilih loket terlebih dahulu.');
      return;
    }
    const newLayanan = tempLayanan || 'semua';
    const newOperator = tempOperator || operatorNama || (operatorList.length > 0 ? operatorList[0].nama : 'Operator Loket');
    setSelectedLoket(tempLoket);
    setSelectedLayanan(newLayanan);
    setOperatorNama(newOperator);
    sessionStorage.setItem('op_loket', tempLoket);
    sessionStorage.setItem('op_layanan', newLayanan);
    sessionStorage.setItem('op_nama', newOperator);
    setShowSwitchLoketModal(false);
  };

  const getCurrentOperatorName = () => {
    if (operatorNama && operatorNama !== 'Admin Sistem' && operatorNama !== 'Operator' && operatorNama !== 'Operator Loket') {
      return operatorNama;
    }
    const sessionOp = typeof window !== 'undefined' ? sessionStorage.getItem('op_nama') : '';
    if (sessionOp && sessionOp !== 'Admin Sistem' && sessionOp !== 'Operator' && sessionOp !== 'Operator Loket') {
      return sessionOp;
    }
    if (operatorList && operatorList.length > 0) {
      return operatorList[0].nama;
    }
    return operatorNama || 'Operator Loket';
  };

  const layaniSekarang = async (queueToCall) => {
    const currentOp = getCurrentOperatorName();
    if (currentQueue) {
      // Selesaikan yang lama
      await updateDoc(doc(db, 'antrian', currentQueue.id), {
        status: 'selesai',
        selesai_at: Timestamp.now(),
        operator_nama: currentOp,
        loket: selectedLoket
      });
    }

    // Panggil yang baru
    await updateDoc(doc(db, 'antrian', queueToCall.id), {
      status: 'dipanggil',
      loket: selectedLoket,
      panggil_at: Timestamp.now(),
      panggil_ulang: 0,
      operator_nama: currentOp
    });
  };

  const panggilBerikutnya = async () => {
    let listToCall = waitingQueues;
    if (selectedLayanan === 'pelayanan-A') listToCall = waitingQueuesA;
    else if (selectedLayanan === 'pelayanan-B') listToCall = waitingQueuesB;
    else if (selectedLayanan === 'pelayanan-C') listToCall = waitingQueuesC;

    if (listToCall.length > 0) {
      await layaniSekarang(listToCall[0]);
    } else {
      alert('Tidak ada antrian yang menunggu.');
    }
  };

  const panggilBerikutnyaA = async () => {
    if (waitingQueuesA.length > 0) {
      await layaniSekarang(waitingQueuesA[0]);
    } else {
      alert('Tidak ada antrian Legalisasi (A) yang menunggu.');
    }
  };

  const panggilBerikutnyaB = async () => {
    if (waitingQueuesB.length > 0) {
      await layaniSekarang(waitingQueuesB[0]);
    } else {
      alert('Tidak ada antrian Kependudukan (B) yang menunggu.');
    }
  };

  const panggilBerikutnyaC = async () => {
    if (waitingQueuesC.length > 0) {
      await layaniSekarang(waitingQueuesC[0]);
    } else {
      alert('Tidak ada antrian E-KTP (C) yang menunggu.');
    }
  };

  const panggilUlang = async () => {
    if (currentQueue) {
      const currentOp = getCurrentOperatorName();
      await updateDoc(doc(db, 'antrian', currentQueue.id), {
        panggil_ulang: currentQueue.panggil_ulang + 1,
        panggil_at: Timestamp.now(),
        operator_nama: currentOp,
        loket: selectedLoket
      });
    }
  };

  const lewatkan = async () => {
    if (currentQueue) {
      const currentOp = getCurrentOperatorName();
      await updateDoc(doc(db, 'antrian', currentQueue.id), {
        status: 'lewat',
        operator_nama: currentOp,
        loket: selectedLoket
      });
    }
  };

  const selesaikan = async () => {
    if (currentQueue) {
      const currentOp = getCurrentOperatorName();
      const isSentLocal = typeof window !== 'undefined' && localStorage.getItem(`wa_sent_${currentQueue.id}`) === 'true';
      const finishedItem = {
        ...currentQueue,
        status: 'selesai',
        operator_nama: currentOp,
        loket: selectedLoket,
        wa_evaluasi_sent: Boolean(currentQueue.wa_evaluasi_sent || isSentLocal)
      };

      try {
        await updateDoc(doc(db, 'antrian', currentQueue.id), {
          status: 'selesai',
          selesai_at: Timestamp.now(),
          operator_nama: currentOp,
          loket: selectedLoket
        });
      } catch (err) {
        console.warn('Update client doc status selesai failed, trying API fallback:', err);
        try {
          await fetch('/api/antrian/manage/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'generic_save',
              collection: 'antrian',
              id: currentQueue.id,
              data: {
                status: 'selesai',
                selesai_at: new Date().toISOString(),
                operator_nama: currentOp,
                loket: selectedLoket
              }
            })
          });
        } catch (apiErr) {
          console.error('API server fallback failed:', apiErr);
        }
      }

      // Tampilkan popup modal Kirim WA untuk antrian yang selesai
      setCompletedForWa(finishedItem);
      setShowWaModal(true);
    }
  };

  const handleSendWaEvaluasi = async (item) => {
    if (!item) return;
    if (!item.warga_hp || item.warga_hp.trim() === '' || item.warga_hp === '-') {
      alert('Nomor WhatsApp warga tidak tersedia untuk data antrian ini.');
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
      alert('Format nomor WhatsApp warga tidak valid.');
      return;
    }

    const namaWarga = item.warga_nama && item.warga_nama.trim() !== '' ? item.warga_nama.trim() : 'Warga';
    const alamatWarga = item.warga_alamat && item.warga_alamat.trim() !== '' ? item.warga_alamat.trim() : 'Kecamatan Gandrungmangu';
    const jenisPelayanan = item.pelayanan_nama && item.pelayanan_nama.trim() !== '' 
      ? item.pelayanan_nama.trim() 
      : (pelayananList.find(p => p.id === item.pelayanan_id)?.nama || 'Pelayanan Terpadu');
    
    let namaOp = item.operator_nama || getCurrentOperatorName();
    if (!namaOp || namaOp === '-' || namaOp === 'Operator Loket') {
      namaOp = operatorNama || 'Petugas Pelayanan';
    }

    const message = `Assalamu’alaikum Warahmatullahi Wabarakatuh.
Salam sejahtera untuk kita semua.

Yth. Bapak/Ibu ${namaWarga} di ${alamatWarga},

Terima kasih telah mempercayakan pengurusan dokumen ${jenisPelayanan} Anda di Pusat Pelayanan Terpadu Kecamatan Gandrungmangu. Kami berharap proses pelayanan yang Bapak/Ibu terima berjalan dengan lancar dan memuaskan.

Sebagai komitmen kami untuk terus berinovasi dan meningkatkan kualitas pelayanan publik, kami sangat membutuhkan evaluasi dari masyarakat. Oleh karena itu, kami memohon kesediaan Bapak/Ibu untuk memberikan tanggapan, kritik, maupun masukan terkait pelayanan kami hari ini.

Bapak/Ibu dapat langsung membalas pesan WhatsApp ini dengan menyampaikan kesan, pengalaman, atau saran Bapak/Ibu secara bebas. Setiap masukan yang masuk akan sangat berarti bagi kemajuan pelayanan kami.

Terima kasih atas waktu, partisipasi, dan kepercayaan Bapak/Ibu. Sehat selalu.

Hormat kami,
${namaOp}
Petugas Pelayanan Kecamatan Gandrungmangu`;

    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    // Tandai status di state lokal modal & antrian aktif
    setCompletedForWa(prev => prev && prev.id === item.id ? { ...prev, wa_evaluasi_sent: true } : prev);
    setCurrentQueue(prev => prev && prev.id === item.id ? { ...prev, wa_evaluasi_sent: true } : prev);

    // Simpan ke localStorage agar di halaman /Antrian/pengaturan/ dan /Antrian/operator/ langsung terverifikasi
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`wa_sent_${item.id}`, 'true');
      } catch (e) {}
    }

    // Simpan ke database Firestore antrian (dengan fallback API server)
    try {
      await updateDoc(doc(db, 'antrian', item.id), {
        wa_evaluasi_sent: true,
        wa_evaluasi_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Update client doc failed, using server fallback:', err);
      try {
        await fetch('/api/antrian/manage/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generic_save',
            collection: 'antrian',
            id: item.id,
            data: {
              wa_evaluasi_sent: true,
              wa_evaluasi_at: new Date().toISOString()
            }
          })
        });
      } catch (apiErr) {
        console.error('API server fallback failed:', apiErr);
      }
    }
  };

  // Filter queues list to display in the right panel table based on selectedLayanan or activeTab
  const getDisplayQueueList = () => {
    if (selectedLayanan === 'pelayanan-A') return waitingQueuesA;
    if (selectedLayanan === 'pelayanan-B') return waitingQueuesB;
    if (selectedLayanan === 'pelayanan-C') return waitingQueuesC;

    if (activeTab === 'pelayanan-A') return waitingQueuesA;
    if (activeTab === 'pelayanan-B') return waitingQueuesB;
    if (activeTab === 'pelayanan-C') return waitingQueuesC;
    return waitingQueues;
  };

  if (!isLogged) {
    return (
      <div style={{
        backgroundImage: `linear-gradient(rgba(10, 15, 29, 0.84), rgba(10, 15, 29, 0.94)), url("${heroBg}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'var(--font-outfit), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        transition: 'background-image 0.5s ease-in-out'
      }}>
        <div className="card text-white p-4 p-md-5 shadow-lg antrian-glass" style={{
          maxWidth: '520px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)'
        }}>
          <div className="text-center mb-4">
            <div className="d-flex align-items-center justify-content-center mb-3">
              <img src={logoTambahan || "/img/logo-tambahan.png"} alt="Logo Gandrungmangu" style={{ height: '60px', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))' }} />
            </div>

            {/* Slogan Badge */}
            <div className="mb-2">
              <span
                className="badge px-3 py-1.5 rounded-pill fw-bold shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  color: '#0f172a',
                  fontSize: '0.78rem',
                  letterSpacing: '0.3px',
                  border: '1px solid #fef08a'
                }}
              >
                <i className="bi bi-stars me-1"></i> "SEMAngat memberIkan pelayanan NGgawe bungAH"
              </span>
            </div>

            <h3 className="fw-bold text-white mb-1" style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
              Konsol Petugas Loket
            </h3>
            <p className="text-white-50 small mb-0">Sistem Antrian Kecamatan Gandrungmangu</p>
          </div>

          {loginError && (
            <div className="alert border-0 text-white p-3 mb-3 text-center rounded-3 small fw-semibold shadow-sm" style={{ background: 'rgba(239, 68, 68, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
              <i className="bi bi-exclamation-triangle-fill me-1"></i> {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            {operatorList.length > 0 && (
              <div className="mb-3">
                <label className="form-label text-white-50 small fw-bold mb-1.5">
                  <i className="bi bi-person-badge text-warning me-1"></i> Pilih Petugas / Operator Terdaftar
                </label>
                <select
                  className="form-select text-white fw-medium mb-1"
                  value={selectedOpId}
                  onChange={(e) => {
                    const opId = e.target.value;
                    setSelectedOpId(opId);
                    const found = operatorList.find(o => o.id === opId);
                    if (found) {
                      setUsername(found.username);
                      if (found.password) {
                        setPassword(found.password);
                      }
                    }
                  }}
                  style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px' }}
                >
                  <option value="" className="bg-dark text-white">-- Pilih Dari Daftar Operator Terdaftar --</option>
                  {operatorList.map(op => (
                    <option key={op.id} value={op.id} className="bg-dark text-white">
                      {op.nama} ({op.username})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-3">
              <label className="form-label text-white-50 small fw-bold mb-1.5">Username / Email Masuk Sistem</label>
              <div className="input-group">
                <span className="input-group-text text-info" style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRight: 'none', borderRadius: '12px 0 0 12px' }}>
                  <i className="bi bi-person"></i>
                </span>
                <input
                  type="text"
                  className="form-control text-white fw-medium"
                  placeholder="Username / Email akun Masuk Sistem"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '0 12px 12px 0' }}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label text-white-50 small fw-bold mb-1.5">Kata Sandi</label>
              <div className="input-group">
                <span className="input-group-text text-info" style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRight: 'none', borderRadius: '12px 0 0 12px' }}>
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  type="password"
                  className="form-control text-white fw-medium"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '0 12px 12px 0' }}
                />
              </div>
            </div>

            <div className="row g-2 mb-4">
              <div className="col-md-6">
                <label className="form-label text-white-50 small fw-bold mb-1.5">Pilih Loket</label>
                <select
                  className="form-select text-white fw-medium"
                  required
                  value={selectedLoket}
                  onChange={e => setSelectedLoket(e.target.value)}
                  style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px' }}
                >
                  <option value="" className="bg-dark text-white">-- Pilih Loket --</option>
                  {loketList.map(l => <option key={l} value={l} className="bg-dark text-white">{l}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label text-white-50 small fw-bold mb-1.5">Pilih Layanan</label>
                <select
                  className="form-select text-white fw-medium"
                  value={selectedLayanan}
                  onChange={e => setSelectedLayanan(e.target.value)}
                  style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px' }}
                >
                  <option value="semua" className="bg-dark text-white">Semua Layanan (Multi-Layanan)</option>
                  {pelayananList.map(p => (
                    <option key={p.id} value={p.id} className="bg-dark text-white">{p.nama} ({p.kode})</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="btn w-100 py-3 fw-bold rounded-pill mb-3 text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)', border: '1px solid rgba(56, 189, 248, 0.5)', boxShadow: '0 8px 25px rgba(2, 132, 199, 0.35)', letterSpacing: '0.3px' }}>
              <i className="bi bi-box-arrow-in-right me-1.5"></i> Masuk Konsol Petugas
            </button>

            <Link href="/Antrian" className="btn w-100 py-2.5 rounded-pill text-white-50 small text-decoration-none text-center d-block fw-semibold shadow-sm" style={{ backdropFilter: 'blur(8px)', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', transition: 'all 0.2s ease' }}>
              <i className="bi bi-arrow-left me-1"></i> Kembali ke Portal Antrian
            </Link>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundImage: `linear-gradient(rgba(10, 15, 29, 0.88), rgba(10, 15, 29, 0.96)), url("${heroBg}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      minHeight: '100vh',
      maxHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 24px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      fontFamily: 'var(--font-outfit), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      transition: 'background-image 0.5s ease-in-out'
    }}>
      {/* Header Bar */}
      <div className="d-flex justify-content-between align-items-center mb-3 px-4 py-2.5 rounded-4 shadow-lg antrian-glass" style={{
        background: 'rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        <div className="d-flex align-items-center gap-3">
          <img src={logoTambahan || "/img/logo-tambahan.png"} alt="Logo Gandrungmangu" style={{ height: '42px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }} />
          <div>
            <div className="d-flex align-items-center gap-2">
              <h4 className="fw-bold m-0 text-white" style={{ fontSize: '1.35rem', letterSpacing: '-0.01em' }}>
                Konsol Loket: <span style={{ color: '#38bdf8' }}>{selectedLoket}</span>
              </h4>
              <button
                onClick={handleOpenSwitchModal}
                className="btn btn-sm fw-bold rounded-pill px-3 py-1 shadow-sm d-flex align-items-center gap-1.5"
                style={{ fontSize: '0.8rem', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#0f172a', border: '1px solid #fef08a' }}
                title="Ganti Loket / Petugas Tanpa Logout"
              >
                <i className="bi bi-arrow-repeat"></i> Ganti Loket / Petugas
              </button>
            </div>
            <div className="d-flex align-items-center gap-2 mt-1">
              <span className="text-white-50 small">Petugas: <strong className="text-white">{operatorNama || (operatorList.length > 0 ? operatorList[0].nama : 'Operator')}</strong></span>
              <span className="badge rounded-pill px-2.5 py-1 small fw-semibold font-monospace" style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.35)', color: '#38bdf8' }}>
                {selectedLayanan === 'semua' || !selectedLayanan
                  ? 'Semua Layanan (Multi-Layanan)'
                  : (pelayananList.find(p => p.id === selectedLayanan)?.nama || selectedLayanan)}
              </span>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <span
            className="badge px-3 py-1.5 rounded-pill fw-bold d-none d-md-inline-block shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: '#0f172a',
              fontSize: '0.75rem',
              border: '1px solid #fef08a'
            }}
          >
            "SEMAngat memberIkan pelayanan NGgawe bungAH"
          </span>
          <button className="btn btn-outline-danger btn-sm px-3.5 py-1.5 rounded-pill fw-bold shadow-sm d-flex align-items-center gap-1.5" onClick={handleLogout} style={{ border: '1px solid rgba(239, 68, 68, 0.5)' }}>
            <i className="bi bi-box-arrow-right"></i> Keluar
          </button>
        </div>
      </div>

      {/* Main Single-Viewport Layout */}
      <div className="row g-3 flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* Left Column (Calling Control Center) */}
        <div className="col-lg-6 d-flex flex-column h-100">
          <div className="w-100 h-100 rounded-4 p-4 d-flex flex-column justify-content-between text-center shadow-lg antrian-glass" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
          }}>
            {/* Header Service Info */}
            <div className="d-flex justify-content-between align-items-center border-bottom border-white border-opacity-15 pb-2.5">
              <div className="text-start">
                <h5 className="fw-bold m-0 text-white" style={{ fontSize: '1.2rem', letterSpacing: '-0.01em' }}>
                  {selectedLayanan === 'semua' || !selectedLayanan
                    ? 'Akses Semua Layanan Antrian'
                    : pelayananList.find(p => p.id === selectedLayanan)?.nama}
                </h5>
                <small className="fw-semibold" style={{ color: '#38bdf8' }}>Aktif di: {selectedLoket}</small>
              </div>
              <span className="badge rounded-pill py-1.5 px-3 fs-7 shadow-sm fw-bold" style={{ background: 'rgba(52, 211, 153, 0.18)', border: '1px solid rgba(52, 211, 153, 0.4)', color: '#34d399' }}>
                <i className="bi bi-check-circle-fill me-1"></i> Tersinkronisasi
              </span>
            </div>

            {/* Radiant Called Number Display (Harmonized with Display screen) */}
            <div className="my-auto py-2">
              <span className="small text-uppercase fw-bold tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.95rem', letterSpacing: '2px' }}>
                Nomor Antrian Dipanggil
              </span>

              <h1 className="fw-black my-2" style={{
                fontSize: '7.5rem',
                lineHeight: 0.9,
                fontWeight: 900,
                color: currentQueue ? '#fbbf24' : 'rgba(255, 255, 255, 0.25)',
                textShadow: currentQueue ? '0 0 40px rgba(251, 191, 36, 0.45), 0 4px 15px rgba(0, 0, 0, 0.9)' : 'none',
                letterSpacing: '-2px'
              }}>
                {currentQueue ? currentQueue.nomor_lengkap : '---'}
              </h1>

              <p className="text-white-50 fw-medium mb-2 small">
                {currentQueue ? `Diulang: ${currentQueue.panggil_ulang}x` : 'Tidak ada antrian aktif saat ini.'}
              </p>

              {currentQueue && currentQueue.warga_nama && (
                <div className="p-3 rounded-4 text-start d-inline-block shadow-lg antrian-glass" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(12px)', minWidth: '300px' }}>
                  <div className="fw-bold border-bottom border-white border-opacity-15 pb-1.5 mb-1.5 small d-flex justify-content-between align-items-center" style={{ color: '#38bdf8' }}>
                    <span><i className="bi bi-person-fill me-1"></i> Data Warga</span>
                    {currentQueue.tipe === 'online' && <span className="badge rounded-pill small" style={{ background: 'rgba(251, 191, 36, 0.2)', border: '1px solid rgba(251, 191, 36, 0.5)', color: '#fbbf24' }}>ONLINE</span>}
                  </div>
                  <div className="text-white small">Nama: <strong className="text-white">{currentQueue.warga_nama}</strong></div>
                  <div className="text-white-50 small">Alamat: <span>{currentQueue.warga_alamat}</span> | HP: <span>{currentQueue.warga_hp}</span></div>
                  <div className="d-flex gap-2 mt-2">
                    {currentQueue.warga_hp && currentQueue.warga_hp.trim() !== '' && currentQueue.warga_hp !== '-' && (
                      <button
                        onClick={() => handleSendWaEvaluasi(currentQueue)}
                        className={`btn btn-sm flex-fill fw-bold py-1.5 px-3 rounded-pill d-inline-flex align-items-center justify-content-center gap-1.5 shadow-sm ${currentQueue.wa_evaluasi_sent ? 'border' : ''}`}
                        style={{
                          fontSize: '0.78rem',
                          background: currentQueue.wa_evaluasi_sent ? '#0d6838' : '#25D366',
                          borderColor: currentQueue.wa_evaluasi_sent ? '#198754' : '#22bf5b',
                          color: '#ffffff'
                        }}
                        title={currentQueue.wa_evaluasi_sent ? "Sudah terkirim. Klik jika ingin kirim ulang." : "Kirim WA Evaluasi"}
                      >
                        {currentQueue.wa_evaluasi_sent ? (
                          <>
                            <i className="bi bi-check-circle-fill" style={{ color: '#4ddb86' }}></i>
                            <span>Terkirim</span>
                            <i className="bi bi-whatsapp opacity-75 ms-1" style={{ fontSize: '10px' }}></i>
                          </>
                        ) : (
                          <>
                            <i className="bi bi-whatsapp"></i>
                            <span>Kirim WA</span>
                          </>
                        )}
                      </button>
                    )}
                    {(currentQueue.berkas_kk || currentQueue.berkas_ktp) && (
                      <button
                        onClick={() => setSelectedBerkasModal(currentQueue)}
                        className="btn btn-sm flex-fill fw-bold py-1.5 rounded-pill"
                        style={{ background: 'rgba(56, 189, 248, 0.18)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
                      >
                        <i className="bi bi-file-earmark-medical me-1"></i> Berkas
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons Grid */}
            <div className="row g-2">
              {isMultiService ? (
                <>
                  <div className="col-4">
                    <button onClick={panggilBerikutnyaA} className="btn w-100 py-2.5 fw-bold text-white shadow-sm rounded-3" style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', border: '1px solid rgba(56, 189, 248, 0.4)', fontSize: '0.875rem' }}>
                      <i className="bi bi-chevron-double-right me-1"></i> Next Legalisasi (A)
                    </button>
                  </div>
                  <div className="col-4">
                    <button onClick={panggilBerikutnyaB} className="btn w-100 py-2.5 fw-bold text-white shadow-sm rounded-3" style={{ background: 'linear-gradient(135deg, #059669, #047857)', border: '1px solid rgba(52, 211, 153, 0.4)', fontSize: '0.875rem' }}>
                      <i className="bi bi-chevron-double-right me-1"></i> Next Kependudukan (B)
                    </button>
                  </div>
                  <div className="col-4">
                    <button onClick={panggilBerikutnyaC} className="btn w-100 py-2.5 fw-bold text-white shadow-sm rounded-3" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', border: '1px solid rgba(251, 191, 36, 0.4)', fontSize: '0.875rem' }}>
                      <i className="bi bi-chevron-double-right me-1"></i> Next E-KTP (C)
                    </button>
                  </div>
                </>
              ) : (
                <div className="col-12">
                  <button onClick={panggilBerikutnya} className="btn w-100 py-3 fw-bold text-white shadow-lg rounded-pill" style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)', border: '1px solid rgba(56, 189, 248, 0.4)', fontSize: '1.15rem' }}>
                    <i className="bi bi-chevron-double-right me-1.5"></i> Panggil Antrian Berikutnya
                  </button>
                </div>
              )}

              {currentQueue && (
                <>
                  <div className="col-4">
                    <button onClick={panggilUlang} className="btn w-100 py-2.5 fw-bold rounded-pill shadow-sm" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#0f172a', border: '1px solid #fef08a' }}>
                      <i className="bi bi-volume-up-fill me-1"></i> Ulang
                    </button>
                  </div>
                  <div className="col-4">
                    <button onClick={lewatkan} className="btn w-100 py-2.5 fw-bold text-white rounded-pill shadow-sm" style={{ backdropFilter: 'blur(8px)', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.25)' }}>
                      <i className="bi bi-x-circle me-1"></i> Lewat
                    </button>
                  </div>
                  <div className="col-4">
                    <button onClick={selesaikan} className="btn w-100 py-2.5 fw-bold text-white rounded-pill shadow-sm" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: '1px solid rgba(52, 211, 153, 0.5)' }}>
                      <i className="bi bi-check-circle-fill me-1"></i> Selesai
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Queue List & Stats) */}
        <div className="col-lg-6 d-flex flex-column h-100">
          <div className="w-100 h-100 rounded-4 p-3.5 d-flex flex-column justify-content-start shadow-lg antrian-glass" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
          }}>
            {/* Horizontal Stats & Service Filter Row */}
            <div className="d-flex align-items-center justify-content-between gap-1.5 mb-2.5 pb-2 border-bottom border-white border-opacity-15">
              <button
                onClick={() => setActiveTab('semua')}
                className={`px-2 py-1.5 rounded-3 text-center flex-fill btn border-0 transition ${activeTab === 'semua' ? 'shadow-sm' : 'opacity-75'}`}
                style={{ background: activeTab === 'semua' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)', border: activeTab === 'semua' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                <span className="small fw-semibold d-block text-white-50" style={{ fontSize: '0.72rem' }}>Semua</span>
                <span className="fs-5 fw-bold" style={{ color: '#38bdf8' }}>{stats.waiting}</span>
              </button>

              <button
                onClick={() => setActiveTab('pelayanan-A')}
                className={`px-2 py-1.5 rounded-3 text-center flex-fill btn border-0 transition ${activeTab === 'pelayanan-A' ? 'shadow-sm' : 'opacity-75'}`}
                style={{ background: activeTab === 'pelayanan-A' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)', border: activeTab === 'pelayanan-A' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                <span className="small fw-semibold d-block text-white-50" style={{ fontSize: '0.72rem' }}>Legalisasi (A)</span>
                <span className="fs-5 fw-bold text-white">{stats.waitingA}</span>
              </button>

              <button
                onClick={() => setActiveTab('pelayanan-B')}
                className={`px-2 py-1.5 rounded-3 text-center flex-fill btn border-0 transition ${activeTab === 'pelayanan-B' ? 'shadow-sm' : 'opacity-75'}`}
                style={{ background: activeTab === 'pelayanan-B' ? 'rgba(52, 211, 153, 0.25)' : 'rgba(255, 255, 255, 0.05)', border: activeTab === 'pelayanan-B' ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                <span className="small fw-semibold d-block text-white-50" style={{ fontSize: '0.72rem' }}>Kependudukan (B)</span>
                <span className="fs-5 fw-bold" style={{ color: '#34d399' }}>{stats.waitingB}</span>
              </button>

              <button
                onClick={() => setActiveTab('pelayanan-C')}
                className={`px-2 py-1.5 rounded-3 text-center flex-fill btn border-0 transition ${activeTab === 'pelayanan-C' ? 'shadow-sm' : 'opacity-75'}`}
                style={{ background: activeTab === 'pelayanan-C' ? 'rgba(251, 191, 36, 0.25)' : 'rgba(255, 255, 255, 0.05)', border: activeTab === 'pelayanan-C' ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                <span className="small fw-semibold d-block text-white-50" style={{ fontSize: '0.72rem' }}>E-KTP (C)</span>
                <span className="fs-5 fw-bold" style={{ color: '#fbbf24' }}>{stats.waitingC}</span>
              </button>

              <div className="px-2 py-1.5 rounded-3 text-center flex-fill" style={{ background: 'rgba(129, 140, 248, 0.15)', border: '1px solid rgba(129, 140, 248, 0.35)' }}>
                <span className="small fw-semibold d-block text-white-50" style={{ fontSize: '0.72rem' }}>Selesai</span>
                <span className="fs-5 fw-bold" style={{ color: '#818cf8' }}>{stats.served}</span>
              </div>
            </div>

            {/* Waiting Queue List Container */}
            <div className="flex-grow-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 210px)' }}>
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0" style={{ background: 'transparent' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)' }}>
                      <th className="text-white-50 small fw-bold">Nomor</th>
                      <th className="text-white-50 small fw-bold">Layanan</th>
                      <th className="text-white-50 small fw-bold">Warga</th>
                      <th className="text-white-50 small fw-bold text-end">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getDisplayQueueList().map(q => (
                      <tr key={q.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <td>
                          <span
                            className="badge fs-6 fw-bold shadow-sm me-1.5"
                            style={{
                              background: q.kode === 'A' ? 'rgba(56, 189, 248, 0.2)' : q.kode === 'B' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                              border: q.kode === 'A' ? '1px solid #38bdf8' : q.kode === 'B' ? '1px solid #34d399' : '1px solid #fbbf24',
                              color: q.kode === 'A' ? '#38bdf8' : q.kode === 'B' ? '#34d399' : '#fbbf24'
                            }}
                          >
                            {q.nomor_lengkap}
                          </span>
                          {q.tipe === 'online' && <span className="badge rounded-pill" style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', fontSize: '0.65rem' }}>ONLINE</span>}
                        </td>
                        <td>
                          <span className="badge rounded-pill small" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }}>
                            {q.layanan_nama || `Layanan ${q.kode}`}
                          </span>
                        </td>
                        <td>
                          {q.warga_nama ? (
                            <div>
                              <strong className="text-white d-block small">{q.warga_nama}</strong>
                              <span className="text-white-50 small" style={{ fontSize: '0.75rem' }}>{q.warga_alamat}</span>
                            </div>
                          ) : (
                            <span className="text-white-50 small">-</span>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-1">
                            <button
                              onClick={() => layaniSekarang(q)}
                              className="btn btn-sm fw-bold py-1 px-2.5 rounded-pill"
                              style={{ background: 'rgba(56, 189, 248, 0.18)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8', fontSize: '0.75rem' }}
                            >
                              Panggil
                            </button>
                            {(q.berkas_kk || q.berkas_ktp) && (
                              <button
                                onClick={() => setSelectedBerkasModal(q)}
                                className="btn btn-sm fw-bold py-1 px-2 rounded-pill"
                                style={{ background: 'rgba(251, 191, 36, 0.2)', border: '1px solid rgba(251, 191, 36, 0.4)', color: '#fbbf24', fontSize: '0.75rem' }}
                                title="Lihat Berkas"
                              >
                                <i className="bi bi-file-earmark-image"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {getDisplayQueueList().length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center text-white-50 py-4 small">
                          <i className="bi bi-inbox me-1"></i> Tidak ada antrian yang menunggu saat ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Modal Switch Loket Tanpa Logout */}
      {showSwitchLoketModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center px-3" style={{ background: 'rgba(10, 15, 29, 0.85)', backdropFilter: 'blur(8px)', zIndex: 2000 }}>
          <div className="card text-white p-4 border-0 w-100 shadow-lg antrian-glass" style={{ maxWidth: '480px', background: 'rgba(15, 23, 42, 0.96)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '24px' }}>
            <div className="d-flex justify-content-between align-items-center border-bottom border-white border-opacity-15 pb-3 mb-3">
              <h5 className="fw-bold m-0 text-white d-flex align-items-center gap-2">
                <i className="bi bi-arrow-repeat" style={{ color: '#fbbf24' }}></i> Ganti Loket / Layanan
              </h5>
              <button onClick={() => setShowSwitchLoketModal(false)} className="btn-close btn-close-white"></button>
            </div>

            <div className="mb-3">
              <label className="form-label text-white-50 small fw-bold">Pilih Loket Tugas Baru</label>
              <select
                className="form-select text-white fw-medium"
                value={tempLoket}
                onChange={(e) => setTempLoket(e.target.value)}
                style={{ background: 'rgba(10, 15, 29, 0.85)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px' }}
              >
                {loketList.map(l => (
                  <option key={l} value={l} className="bg-dark text-white">{l}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label text-white-50 small fw-bold">Pilih Layanan</label>
              <select
                className="form-select text-white fw-medium"
                value={tempLayanan}
                onChange={(e) => setTempLayanan(e.target.value)}
                style={{ background: 'rgba(10, 15, 29, 0.85)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px' }}
              >
                <option value="semua" className="bg-dark text-white">Semua Layanan (Multi-Layanan)</option>
                {pelayananList.map(p => (
                  <option key={p.id} value={p.id} className="bg-dark text-white">{p.nama} ({p.kode})</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="form-label text-white-50 small fw-bold">Pilih Nama Operator / Petugas Terdaftar</label>
              <select
                className="form-select text-white fw-medium"
                value={tempOperator}
                onChange={(e) => setTempOperator(e.target.value)}
                style={{ background: 'rgba(10, 15, 29, 0.85)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px' }}
              >
                {operatorList.map(op => (
                  <option key={op.id} value={op.nama} className="bg-dark text-white">
                    {op.nama} ({op.username})
                  </option>
                ))}
                {operatorList.length === 0 && (
                  <option value={operatorNama || 'Operator Loket'} className="bg-dark text-white">
                    {operatorNama || 'Operator Loket'}
                  </option>
                )}
              </select>
            </div>

            <div className="d-flex gap-2">
              <button onClick={() => setShowSwitchLoketModal(false)} className="btn w-50 fw-bold rounded-pill text-white" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                Batal
              </button>
              <button onClick={handleApplySwitchLoket} className="btn w-50 fw-bold rounded-pill shadow" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#0f172a', border: '1px solid #fef08a' }}>
                Simpan Loket Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal View Berkas KK / KTP (Dark Frosted Glass) */}
      {selectedBerkasModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center px-3" style={{ background: 'rgba(10, 15, 29, 0.85)', backdropFilter: 'blur(8px)', zIndex: 2000 }}>
          <div className="card text-white p-4 border-0 w-100 shadow-lg antrian-glass" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', background: 'rgba(15, 23, 42, 0.96)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '24px' }}>
            <div className="d-flex justify-content-between align-items-center border-bottom border-white border-opacity-15 pb-3 mb-3">
              <div>
                <span className="badge rounded-pill mb-1 small" style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8' }}>
                  Pemeriksaan Berkas Antrian
                </span>
                <h4 className="fw-bold m-0 text-white" style={{ letterSpacing: '-0.01em' }}>
                  {selectedBerkasModal.nomor_lengkap} - {selectedBerkasModal.warga_nama}
                </h4>
                <small className="text-white-50">NIK: {selectedBerkasModal.warga_nik || '-'} | KK: {selectedBerkasModal.warga_kk || '-'} | HP: {selectedBerkasModal.warga_hp || '-'}</small>
              </div>
              <button onClick={() => setSelectedBerkasModal(null)} className="btn-close btn-close-white"></button>
            </div>

            <div className="row g-4">
              {/* Berkas KK */}
              <div className="col-md-6 border-end border-white border-opacity-15">
                <h6 className="fw-bold text-white mb-2"><i className="bi bi-file-earmark-pdf text-danger me-1"></i> Berkas Kartu Keluarga (KK)</h6>
                {selectedBerkasModal.berkas_kk ? (
                  <div>
                    {selectedBerkasModal.berkas_kk.startsWith('data:image') ? (
                      <img src={selectedBerkasModal.berkas_kk} alt="Berkas KK" className="img-fluid rounded border shadow-sm w-100" style={{ maxHeight: '350px', objectFit: 'contain', background: '#0a0f1d' }} />
                    ) : (
                      <a href={selectedBerkasModal.berkas_kk} target="_blank" rel="noreferrer" className="btn btn-outline-info btn-sm w-100 py-3 rounded-3">
                        <i className="bi bi-download me-1"></i> Buka Dokumen KK ({selectedBerkasModal.berkas_kk_nama || 'File'})
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-white-50 small">Tidak ada lampiran berkas KK.</p>
                )}
              </div>

              {/* Berkas KTP */}
              <div className="col-md-6">
                <h6 className="fw-bold text-white mb-2"><i className="bi bi-person-badge text-info me-1"></i> Berkas KTP Pemohon</h6>
                {selectedBerkasModal.berkas_ktp ? (
                  <div>
                    {selectedBerkasModal.berkas_ktp.startsWith('data:image') ? (
                      <img src={selectedBerkasModal.berkas_ktp} alt="Berkas KTP" className="img-fluid rounded border shadow-sm w-100" style={{ maxHeight: '350px', objectFit: 'contain', background: '#0a0f1d' }} />
                    ) : (
                      <a href={selectedBerkasModal.berkas_ktp} target="_blank" rel="noreferrer" className="btn btn-outline-info btn-sm w-100 py-3 rounded-3">
                        <i className="bi bi-download me-1"></i> Buka Dokumen KTP ({selectedBerkasModal.berkas_ktp_nama || 'File'})
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-white-50 small">Tidak ada lampiran berkas KTP.</p>
                )}
              </div>
            </div>

            {selectedBerkasModal.catatan && (
              <div className="alert mt-3 mb-0 small text-white" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                <strong>Catatan Pemohon:</strong> {selectedBerkasModal.catatan}
              </div>
            )}

            <div className="text-end mt-4 pt-3 border-top border-white border-opacity-15">
              <button onClick={() => setSelectedBerkasModal(null)} className="btn px-4 fw-bold rounded-pill text-white" style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                Tutup Pemeriksaan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kirim WA Evaluasi Pelayanan Setelah Selesai */}
      {showWaModal && completedForWa && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center px-3" style={{ background: 'rgba(10, 15, 29, 0.85)', backdropFilter: 'blur(10px)', zIndex: 2100 }}>
          <div className="card text-white p-4 border-0 w-100 shadow-2xl antrian-glass" style={{ maxWidth: '540px', background: 'rgba(15, 23, 42, 0.96)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '24px' }}>
            <div className="d-flex justify-content-between align-items-center border-bottom border-white border-opacity-15 pb-3 mb-3">
              <div className="d-flex align-items-center gap-2.5">
                <div className="rounded-circle p-2 d-flex align-items-center justify-content-center shadow-sm" style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                  <i className="bi bi-check2-circle text-success fs-4"></i>
                </div>
                <div>
                  <h5 className="fw-bold m-0 text-white">Pelayanan Selesai Dilayani</h5>
                  <small className="text-white-50">Kirim pesan WhatsApp evaluasi kepada warga</small>
                </div>
              </div>
              <button onClick={() => setShowWaModal(false)} className="btn-close btn-close-white"></button>
            </div>

            {/* Detail Antrian Warga */}
            <div className="p-3 rounded-4 mb-3" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-white border-opacity-10">
                <span className="badge px-3 py-1 rounded-pill fw-bold fs-6" style={{ background: 'rgba(251, 191, 36, 0.2)', border: '1px solid #fbbf24', color: '#fbbf24' }}>
                  {completedForWa.nomor_lengkap}
                </span>
                <span className="small text-white-50 fw-semibold">
                  {completedForWa.pelayanan_nama || (pelayananList.find(p => p.id === completedForWa.pelayanan_id)?.nama || 'Pelayanan Publik')}
                </span>
              </div>
              <div className="row g-1 text-start small">
                <div className="col-4 text-white-50">Nama Warga</div>
                <div className="col-8 fw-bold text-white">: {completedForWa.warga_nama || '-'}</div>
                <div className="col-4 text-white-50">No. WhatsApp</div>
                <div className="col-8 fw-bold text-info">: {completedForWa.warga_hp || '-'}</div>
                <div className="col-4 text-white-50">Alamat</div>
                <div className="col-8 text-white-50">: {completedForWa.warga_alamat || '-'}</div>
                <div className="col-4 text-white-50">Operator</div>
                <div className="col-8 text-white-50">: {completedForWa.operator_nama || getCurrentOperatorName()}</div>
              </div>
            </div>

            {/* Tombol Kirim WA / Status Terkirim */}
            <div className="mb-3 text-center">
              {completedForWa.warga_hp && completedForWa.warga_hp.trim() !== '' && completedForWa.warga_hp !== '-' ? (
                completedForWa.wa_evaluasi_sent ? (
                  <button
                    type="button"
                    onClick={() => handleSendWaEvaluasi(completedForWa)}
                    className="btn w-100 py-3 fw-bold rounded-pill shadow-lg d-inline-flex align-items-center justify-content-center gap-2 border"
                    style={{ 
                      fontSize: '1rem', 
                      background: '#0d6838', 
                      borderColor: '#198754',
                      color: '#ffffff'
                    }}
                    title="Sudah terkirim. Klik jika ingin mengirim ulang."
                  >
                    <i className="bi bi-check-circle-fill fs-5" style={{ color: '#4ddb86' }}></i>
                    <span>Status: Terkirim (Kirim Ulang)</span>
                    <i className="bi bi-whatsapp opacity-75 ms-1"></i>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendWaEvaluasi(completedForWa)}
                    className="btn w-100 py-3 fw-bold text-white rounded-pill shadow-lg d-inline-flex align-items-center justify-content-center gap-2"
                    style={{ 
                      fontSize: '1rem', 
                      background: '#25D366', 
                      borderColor: '#22bf5b' 
                    }}
                  >
                    <i className="bi bi-whatsapp fs-5"></i>
                    <span>Kirim WA Evaluasi Pelayanan</span>
                  </button>
                )
              ) : (
                <div className="alert alert-warning py-2 small mb-0 rounded-3">
                  <i className="bi bi-exclamation-triangle me-1"></i> Nomor WhatsApp warga tidak tersedia untuk antrian ini.
                </div>
              )}
            </div>

            <div className="d-flex justify-content-end gap-2 pt-2 border-top border-white border-opacity-15">
              <button 
                type="button" 
                onClick={() => setShowWaModal(false)} 
                className="btn px-4 py-2 rounded-pill fw-semibold text-white" 
                style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
              >
                Tutup & Lanjut
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
