"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

Bapak/Ibu dapat langsung membalas pesan WhatsApp atau dapat mengisi form pada link : https://skm.go.id/share/instansi/804defd3-958e-48f9-b9db-10f0ef7a3d29/1 dengan menyampaikan kesan, pengalaman, atau saran Bapak/Ibu secara bebas. Setiap masukan yang masuk akan sangat berarti bagi kemajuan pelayanan kami.

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
      } catch (e) { }
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
            maxWidth: '520px',
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
              <img src={logoTambahan || "/img/logo-tambahan.png"} alt="Logo Gandrungmangu" style={{ height: '56px', objectFit: 'contain' }} />
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
                <i className="bi bi-stars me-1"></i> SEMRINGAH • KONSOL LOKET
              </span>
            </div>

            <h3 className="fw-extrabold font-hero mb-1" style={{ fontSize: '1.7rem', letterSpacing: '-0.02em', color: '#041E17' }}>
              Konsol Petugas Loket
            </h3>
            <p className="small mb-0" style={{ color: '#64748b' }}>Sistem Pelayanan Kecamatan Gandrungmangu</p>
          </div>

          {loginError && (
            <div className="alert border-0 text-white p-3 mb-3 text-center rounded-3 small fw-semibold shadow-sm" style={{ background: '#dc2626' }}>
              <i className="bi bi-exclamation-triangle-fill me-1"></i> {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            {operatorList.length > 0 && (
              <div className="mb-3">
                <label className="form-label small fw-bold mb-1.5 font-hero" style={{ color: '#041E17' }}>
                  <i className="bi bi-person-badge me-1" style={{ color: '#065F46' }}></i> Pilih Petugas / Operator Terdaftar
                </label>
                <select
                  className="form-select fw-medium mb-1"
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
                  style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRadius: '12px', color: '#041E17' }}
                >
                  <option value="">-- Pilih Dari Daftar Operator Terdaftar --</option>
                  {operatorList.map(op => (
                    <option key={op.id} value={op.id}>
                      {op.nama} ({op.username})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-3">
              <label className="form-label small fw-bold mb-1.5 font-hero" style={{ color: '#041E17' }}>Username / Email Masuk Sistem</label>
              <div className="input-group">
                <span className="input-group-text" style={{ background: '#F3EFE6', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRight: 'none', borderRadius: '12px 0 0 12px', color: '#065F46' }}>
                  <i className="bi bi-person"></i>
                </span>
                <input
                  type="text"
                  className="form-control fw-medium"
                  placeholder="Username / Email akun Masuk Sistem"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRadius: '0 12px 12px 0', color: '#041E17' }}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-bold mb-1.5 font-hero" style={{ color: '#041E17' }}>Kata Sandi</label>
              <div className="input-group">
                <span className="input-group-text" style={{ background: '#F3EFE6', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRight: 'none', borderRadius: '12px 0 0 12px', color: '#065F46' }}>
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  type="password"
                  className="form-control fw-medium"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRadius: '0 12px 12px 0', color: '#041E17' }}
                />
              </div>
            </div>

            <div className="row g-2 mb-4">
              <div className="col-md-6">
                <label className="form-label small fw-bold mb-1.5 font-hero" style={{ color: '#041E17' }}>Pilih Loket</label>
                <select
                  className="form-select fw-medium"
                  required
                  value={selectedLoket}
                  onChange={e => setSelectedLoket(e.target.value)}
                  style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRadius: '12px', color: '#041E17' }}
                >
                  <option value="">-- Pilih Loket --</option>
                  {loketList.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold mb-1.5 font-hero" style={{ color: '#041E17' }}>Pilih Layanan</label>
                <select
                  className="form-select fw-medium"
                  value={selectedLayanan}
                  onChange={e => setSelectedLayanan(e.target.value)}
                  style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRadius: '12px', color: '#041E17' }}
                >
                  <option value="semua">Semua Layanan (Multi-Layanan)</option>
                  {pelayananList.map(p => (
                    <option key={p.id} value={p.id}>{p.nama} ({p.kode})</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="btn w-100 py-3 fw-bold rounded-pill mb-3 text-white shadow font-hero" style={{ background: 'linear-gradient(135deg, #065F46, #041E17)', border: 'none', letterSpacing: '0.03em' }}>
              <i className="bi bi-box-arrow-in-right me-1.5"></i> Masuk Konsol Petugas
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
      maxHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '14px 20px',
      boxSizing: 'border-box',
      overflow: 'hidden',
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

      {/* Header Bar (Porcelain White + Ocean Blue) */}
      <div className="d-flex justify-content-between align-items-center mb-3 px-4 py-2.5 rounded-4 position-relative" style={{
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(6, 95, 70, 0.18)',
        boxShadow: '0 8px 26px rgba(4, 30, 23, 0.08)'
      }}>
        <div className="d-flex align-items-center gap-3">
          <img src={logoTambahan || "/img/logo-tambahan.png"} alt="Logo Gandrungmangu" style={{ height: '42px', objectFit: 'contain' }} />
          <div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h4 className="fw-extrabold m-0 font-hero" style={{ fontSize: '1.3rem', letterSpacing: '-0.02em', color: '#041E17' }}>
                Konsol Loket: <span style={{ color: '#065F46' }}>{selectedLoket}</span>
              </h4>
              <button
                onClick={handleOpenSwitchModal}
                className="btn btn-sm fw-bold rounded-pill px-3 py-1 shadow-sm d-flex align-items-center gap-1.5 font-hero text-white"
                style={{ fontSize: '0.78rem', background: 'linear-gradient(135deg, #065F46, #041E17)', border: 'none' }}
                title="Ganti Loket / Petugas Tanpa Logout"
              >
                <i className="bi bi-arrow-repeat"></i> Ganti Loket / Petugas
              </button>
            </div>
            <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
              <span className="small" style={{ color: '#475569' }}>Petugas: <strong style={{ color: '#041E17' }}>{operatorNama || (operatorList.length > 0 ? operatorList[0].nama : 'Operator')}</strong></span>
              <span className="badge rounded-pill px-2.5 py-1 small fw-bold font-mono" style={{ background: '#F3EFE6', border: '1px solid rgba(6, 95, 70, 0.25)', color: '#065F46' }}>
                {selectedLayanan === 'semua' || !selectedLayanan
                  ? 'Semua Layanan (Multi-Layanan)'
                  : (pelayananList.find(p => p.id === selectedLayanan)?.nama || selectedLayanan)}
              </span>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Link
            href="/Antrian/"
            className="btn btn-sm px-3 py-1.5 rounded-pill fw-bold d-none d-md-inline-flex align-items-center gap-1.5 text-decoration-none font-hero"
            style={{ background: '#F3EFE6', color: '#065F46', border: '1px solid rgba(6, 95, 70, 0.25)' }}
          >
            <i className="bi bi-arrow-left"></i> Portal
          </Link>
          <button className="btn btn-sm px-3.5 py-1.5 rounded-pill fw-bold d-flex align-items-center gap-1.5 font-hero" onClick={handleLogout} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            <i className="bi bi-box-arrow-right"></i> Keluar
          </button>
        </div>
      </div>

      {/* Main Single-Viewport Layout */}
      <div className="row g-3 flex-grow-1 overflow-hidden position-relative" style={{ minHeight: 0, zIndex: 10 }}>

        {/* Left Column (Calling Control Center) */}
        <div className="col-lg-6 d-flex flex-column h-100">
          <div className="w-100 h-100 rounded-4 p-4 d-flex flex-column justify-content-between text-center" style={{
            background: '#ffffff',
            border: '1.5px solid rgba(6, 95, 70, 0.18)',
            boxShadow: '0 14px 36px rgba(4, 30, 23, 0.08)'
          }}>
            {/* Header Service Info */}
            <div className="d-flex justify-content-between align-items-center pb-2.5" style={{ borderBottom: '1px solid rgba(6, 95, 70, 0.14)' }}>
              <div className="text-start">
                <h5 className="fw-extrabold m-0 font-hero" style={{ fontSize: '1.15rem', letterSpacing: '-0.01em', color: '#041E17' }}>
                  {selectedLayanan === 'semua' || !selectedLayanan
                    ? 'Akses Semua Layanan Antrian'
                    : pelayananList.find(p => p.id === selectedLayanan)?.nama}
                </h5>
                <small className="fw-bold font-mono" style={{ color: '#065F46' }}>Aktif di: {selectedLoket}</small>
              </div>
              <span className="badge rounded-pill py-1.5 px-3 fw-bold font-mono" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', fontSize: '0.72rem' }}>
                <i className="bi bi-check-circle-fill me-1"></i> Tersinkronisasi
              </span>
            </div>

            {/* Radiant Called Number Display (Ocean Blue Centerpiece Card) */}
            <div className="my-auto py-2">
              <div
                className="rounded-4 p-3 p-md-4 position-relative overflow-hidden mx-auto"
                style={{
                  background: 'linear-gradient(135deg, #065F46 0%, #064E3B 52%, #041E17 100%)',
                  boxShadow: '0 16px 36px rgba(6, 95, 70, 0.28)',
                  color: '#ffffff'
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    right: '-8px',
                    bottom: '-8px',
                    width: '140px',
                    height: '140px',
                    opacity: 0.13,
                    pointerEvents: 'none',
                    backgroundImage: "url('/images/gandrungmangu-semringah-silhouette.webp')",
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right bottom',
                    backgroundSize: 'contain'
                  }}
                />
                <span className="badge rounded-pill px-3 py-1 font-mono fw-bold text-uppercase" style={{ background: '#ffffff', color: '#065F46', fontSize: '0.72rem', letterSpacing: '0.12em' }}>
                  Nomor Antrian Dipanggil
                </span>

                <AnimatePresence mode="wait">
                  <motion.h1
                    key={currentQueue ? `${currentQueue.id}-${currentQueue.panggil_ulang}` : 'none'}
                    initial={{ opacity: 0, scale: 0.85, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.05, y: -8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    className="fw-black my-2 font-hero"
                    style={{
                      fontSize: 'clamp(4.4rem, 6.2vw, 6.8rem)',
                      lineHeight: 0.92,
                      fontWeight: 900,
                      color: currentQueue ? '#ffffff' : 'rgba(255, 255, 255, 0.35)',
                      textShadow: currentQueue ? '0 0 32px rgba(229, 200, 130, 0.5), 0 4px 14px rgba(4, 30, 23, 0.45)' : 'none',
                      letterSpacing: '-0.03em'
                    }}
                  >
                    {currentQueue ? currentQueue.nomor_lengkap : '---'}
                  </motion.h1>
                </AnimatePresence>

                <p className="fw-medium mb-0 small" style={{ color: '#F5E9CC' }}>
                  {currentQueue ? `Diulang: ${currentQueue.panggil_ulang}x` : 'Tidak ada antrian aktif saat ini.'}
                </p>
              </div>

              {currentQueue && currentQueue.warga_nama && (
                <div className="p-3 rounded-4 text-start mt-3 shadow-sm" style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.2)' }}>
                  <div className="fw-bold pb-1.5 mb-1.5 small d-flex justify-content-between align-items-center font-hero" style={{ color: '#065F46', borderBottom: '1px solid rgba(6, 95, 70, 0.14)' }}>
                    <span><i className="bi bi-person-fill me-1"></i> Data Warga</span>
                    {currentQueue.tipe === 'online' && <span className="badge rounded-pill small" style={{ background: '#065F46', color: '#ffffff' }}>ONLINE</span>}
                  </div>
                  <div className="small" style={{ color: '#041E17' }}>Nama: <strong>{currentQueue.warga_nama}</strong></div>
                  <div className="small" style={{ color: '#475569' }}>Alamat: <span>{currentQueue.warga_alamat}</span> | HP: <strong style={{ color: '#065F46' }}>{currentQueue.warga_hp}</strong></div>
                  <div className="d-flex gap-2 mt-2">
                    {currentQueue.warga_hp && currentQueue.warga_hp.trim() !== '' && currentQueue.warga_hp !== '-' && (
                      <button
                        onClick={() => handleSendWaEvaluasi(currentQueue)}
                        className="btn btn-sm flex-fill fw-bold py-1.5 px-3 rounded-pill d-inline-flex align-items-center justify-content-center gap-1.5 shadow-sm"
                        style={{
                          fontSize: '0.78rem',
                          background: currentQueue.wa_evaluasi_sent ? '#059669' : '#25D366',
                          border: 'none',
                          color: '#ffffff'
                        }}
                        title={currentQueue.wa_evaluasi_sent ? "Sudah terkirim. Klik jika ingin kirim ulang." : "Kirim WA Evaluasi"}
                      >
                        {currentQueue.wa_evaluasi_sent ? (
                          <>
                            <i className="bi bi-check-circle-fill"></i>
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
                        style={{ background: '#F3EFE6', border: '1px solid rgba(6, 95, 70, 0.3)', color: '#065F46' }}
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
                    <button onClick={panggilBerikutnyaA} className="btn w-100 py-2.5 fw-bold text-white shadow-sm rounded-3 font-hero" style={{ background: 'linear-gradient(135deg, #065F46, #047857)', border: 'none', fontSize: '0.84rem' }}>
                      <i className="bi bi-chevron-double-right me-1"></i> Next (A)
                    </button>
                  </div>
                  <div className="col-4">
                    <button onClick={panggilBerikutnyaB} className="btn w-100 py-2.5 fw-bold text-white shadow-sm rounded-3 font-hero" style={{ background: 'linear-gradient(135deg, #047857, #047857)', border: 'none', fontSize: '0.84rem' }}>
                      <i className="bi bi-chevron-double-right me-1"></i> Next (B)
                    </button>
                  </div>
                  <div className="col-4">
                    <button onClick={panggilBerikutnyaC} className="btn w-100 py-2.5 fw-bold text-white shadow-sm rounded-3 font-hero" style={{ background: 'linear-gradient(135deg, #041E17, #064E3B)', border: 'none', fontSize: '0.84rem' }}>
                      <i className="bi bi-chevron-double-right me-1"></i> Next (C)
                    </button>
                  </div>
                </>
              ) : (
                <div className="col-12">
                  <button onClick={panggilBerikutnya} className="btn w-100 py-3 fw-bold text-white shadow rounded-pill font-hero" style={{ background: 'linear-gradient(135deg, #065F46, #041E17)', border: 'none', fontSize: '1.08rem' }}>
                    <i className="bi bi-chevron-double-right me-1.5"></i> Panggil Antrian Berikutnya
                  </button>
                </div>
              )}

              {currentQueue && (
                <>
                  <div className="col-4">
                    <button onClick={panggilUlang} className="btn w-100 py-2.5 fw-bold rounded-pill shadow-sm font-hero" style={{ background: '#F3EFE6', color: '#065F46', border: '1.5px solid rgba(6, 95, 70, 0.35)' }}>
                      <i className="bi bi-volume-up-fill me-1"></i> Ulang
                    </button>
                  </div>
                  <div className="col-4">
                    <button onClick={lewatkan} className="btn w-100 py-2.5 fw-bold rounded-pill shadow-sm font-hero" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                      <i className="bi bi-x-circle me-1"></i> Lewat
                    </button>
                  </div>
                  <div className="col-4">
                    <button onClick={selesaikan} className="btn w-100 py-2.5 fw-bold text-white rounded-pill shadow-sm font-hero" style={{ background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none' }}>
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
          <div className="w-100 h-100 rounded-4 p-3.5 d-flex flex-column justify-content-start" style={{
            background: '#ffffff',
            border: '1.5px solid rgba(6, 95, 70, 0.18)',
            boxShadow: '0 14px 36px rgba(4, 30, 23, 0.08)'
          }}>
            {/* Horizontal Stats & Service Filter Row */}
            <div className="d-flex align-items-center justify-content-between gap-1.5 mb-2.5 pb-2.5" style={{ borderBottom: '1px solid rgba(6, 95, 70, 0.14)' }}>
              {[
                { key: 'semua', label: 'Semua', count: stats.waiting },
                { key: 'pelayanan-A', label: 'Legalisasi (A)', count: stats.waitingA },
                { key: 'pelayanan-B', label: 'Kependudukan (B)', count: stats.waitingB },
                { key: 'pelayanan-C', label: 'E-KTP (C)', count: stats.waitingC },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="px-2 py-1.5 rounded-3 text-center flex-fill btn transition font-hero"
                    style={{
                      background: isActive ? 'linear-gradient(135deg, #065F46, #041E17)' : '#FAF8F5',
                      border: isActive ? '1px solid #065F46' : '1px solid rgba(6, 95, 70, 0.16)',
                      color: isActive ? '#ffffff' : '#041E17'
                    }}
                  >
                    <span className="small fw-semibold d-block" style={{ fontSize: '0.7rem', opacity: isActive ? 0.9 : 0.7 }}>{tab.label}</span>
                    <span className="fs-5 fw-black font-mono">{tab.count}</span>
                  </button>
                );
              })}

              <div className="px-2 py-1.5 rounded-3 text-center flex-fill" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669' }}>
                <span className="small fw-semibold d-block" style={{ fontSize: '0.7rem' }}>Selesai</span>
                <span className="fs-5 fw-black font-mono">{stats.served}</span>
              </div>
            </div>

            {/* Waiting Queue List Container */}
            <div className="flex-grow-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 210px)' }}>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr style={{ background: '#F3EFE6', borderBottom: '1.5px solid rgba(6, 95, 70, 0.2)' }}>
                      <th className="small fw-bold font-hero" style={{ color: '#041E17' }}>Nomor</th>
                      <th className="small fw-bold font-hero" style={{ color: '#041E17' }}>Layanan</th>
                      <th className="small fw-bold font-hero" style={{ color: '#041E17' }}>Warga</th>
                      <th className="small fw-bold text-end font-hero" style={{ color: '#041E17' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getDisplayQueueList().map(q => (
                      <tr key={q.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td>
                          <span
                            className="badge fs-6 fw-bold font-mono me-1.5"
                            style={{
                              background: '#F3EFE6',
                              border: '1px solid rgba(6, 95, 70, 0.3)',
                              color: '#065F46'
                            }}
                          >
                            {q.nomor_lengkap}
                          </span>
                          {q.tipe === 'online' && <span className="badge rounded-pill" style={{ background: '#041E17', color: '#ffffff', fontSize: '0.65rem' }}>ONLINE</span>}
                        </td>
                        <td>
                          <span className="badge rounded-pill small" style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}>
                            {q.layanan_nama || `Layanan ${q.kode}`}
                          </span>
                        </td>
                        <td>
                          {q.warga_nama ? (
                            <div>
                              <strong className="d-block small" style={{ color: '#041E17' }}>{q.warga_nama}</strong>
                              <span className="small" style={{ fontSize: '0.75rem', color: '#64748b' }}>{q.warga_alamat}</span>
                            </div>
                          ) : (
                            <span className="small text-muted">-</span>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-1">
                            <button
                              onClick={() => layaniSekarang(q)}
                              className="btn btn-sm fw-bold py-1 px-3 rounded-pill text-white font-hero"
                              style={{ background: 'linear-gradient(135deg, #065F46, #041E17)', border: 'none', fontSize: '0.75rem' }}
                            >
                              Panggil
                            </button>
                            {(q.berkas_kk || q.berkas_ktp) && (
                              <button
                                onClick={() => setSelectedBerkasModal(q)}
                                className="btn btn-sm fw-bold py-1 px-2 rounded-pill"
                                style={{ background: '#F3EFE6', border: '1px solid rgba(6, 95, 70, 0.3)', color: '#065F46', fontSize: '0.75rem' }}
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
                        <td colSpan="4" className="text-center py-5 small" style={{ color: '#64748b' }}>
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

      {/* Modal Switch Loket Tanpa Logout (Clean Blue & White) */}
      {showSwitchLoketModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center px-3" style={{ background: 'rgba(4, 30, 23, 0.65)', backdropFilter: 'blur(8px)', zIndex: 2000 }}>
          <div className="card p-4 border-0 w-100 shadow-lg" style={{ maxWidth: '480px', background: '#ffffff', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRadius: '24px', color: '#041E17' }}>
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h5 className="fw-extrabold m-0 font-hero d-flex align-items-center gap-2" style={{ color: '#041E17' }}>
                <i className="bi bi-arrow-repeat" style={{ color: '#065F46' }}></i> Ganti Loket / Layanan
              </h5>
              <button onClick={() => setShowSwitchLoketModal(false)} className="btn-close"></button>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-bold font-hero" style={{ color: '#041E17' }}>Pilih Loket Tugas Baru</label>
              <select
                className="form-select fw-medium"
                value={tempLoket}
                onChange={(e) => setTempLoket(e.target.value)}
                style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRadius: '12px', color: '#041E17' }}
              >
                {loketList.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-bold font-hero" style={{ color: '#041E17' }}>Pilih Layanan</label>
              <select
                className="form-select fw-medium"
                value={tempLayanan}
                onChange={(e) => setTempLayanan(e.target.value)}
                style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRadius: '12px', color: '#041E17' }}
              >
                <option value="semua">Semua Layanan (Multi-Layanan)</option>
                {pelayananList.map(p => (
                  <option key={p.id} value={p.id}>{p.nama} ({p.kode})</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-bold font-hero" style={{ color: '#041E17' }}>Pilih Nama Operator / Petugas Terdaftar</label>
              <select
                className="form-select fw-medium"
                value={tempOperator}
                onChange={(e) => setTempOperator(e.target.value)}
                style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRadius: '12px', color: '#041E17' }}
              >
                {operatorList.map(op => (
                  <option key={op.id} value={op.nama}>
                    {op.nama} ({op.username})
                  </option>
                ))}
                {operatorList.length === 0 && (
                  <option value={operatorNama || 'Operator Loket'}>
                    {operatorNama || 'Operator Loket'}
                  </option>
                )}
              </select>
            </div>

            <div className="d-flex gap-2">
              <button onClick={() => setShowSwitchLoketModal(false)} className="btn w-50 fw-bold rounded-pill font-hero" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                Batal
              </button>
              <button onClick={handleApplySwitchLoket} className="btn w-50 fw-bold rounded-pill shadow text-white font-hero" style={{ background: 'linear-gradient(135deg, #065F46, #041E17)', border: 'none' }}>
                Simpan Loket Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal View Berkas KK / KTP */}
      {selectedBerkasModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center px-3" style={{ background: 'rgba(4, 30, 23, 0.65)', backdropFilter: 'blur(8px)', zIndex: 2000 }}>
          <div className="card p-4 border-0 w-100 shadow-lg" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRadius: '24px', color: '#041E17' }}>
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <span className="badge rounded-pill mb-1 small font-mono" style={{ background: '#F3EFE6', border: '1px solid rgba(6, 95, 70, 0.25)', color: '#065F46' }}>
                  Pemeriksaan Berkas Antrian
                </span>
                <h4 className="fw-extrabold m-0 font-hero" style={{ color: '#041E17' }}>
                  {selectedBerkasModal.nomor_lengkap} - {selectedBerkasModal.warga_nama}
                </h4>
                <small style={{ color: '#64748b' }}>NIK: {selectedBerkasModal.warga_nik || '-'} | KK: {selectedBerkasModal.warga_kk || '-'} | HP: {selectedBerkasModal.warga_hp || '-'}</small>
              </div>
              <button onClick={() => setSelectedBerkasModal(null)} className="btn-close"></button>
            </div>

            <div className="row g-4">
              <div className="col-md-6" style={{ borderRight: '1px solid #e2e8f0' }}>
                <h6 className="fw-bold mb-2 font-hero" style={{ color: '#041E17' }}><i className="bi bi-file-earmark-pdf text-danger me-1"></i> Berkas Kartu Keluarga (KK)</h6>
                {selectedBerkasModal.berkas_kk ? (
                  <div>
                    {selectedBerkasModal.berkas_kk.startsWith('data:image') ? (
                      <img src={selectedBerkasModal.berkas_kk} alt="Berkas KK" className="img-fluid rounded border shadow-sm w-100" style={{ maxHeight: '350px', objectFit: 'contain', background: '#FAF8F5' }} />
                    ) : (
                      <a href={selectedBerkasModal.berkas_kk} target="_blank" rel="noreferrer" className="btn btn-sm w-100 py-3 rounded-3 fw-bold" style={{ background: '#F3EFE6', color: '#065F46', border: '1px solid rgba(6, 95, 70, 0.25)' }}>
                        <i className="bi bi-download me-1"></i> Buka Dokumen KK ({selectedBerkasModal.berkas_kk_nama || 'File'})
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="small text-muted">Tidak ada lampiran berkas KK.</p>
                )}
              </div>

              <div className="col-md-6">
                <h6 className="fw-bold mb-2 font-hero" style={{ color: '#041E17' }}><i className="bi bi-person-badge me-1" style={{ color: '#065F46' }}></i> Berkas KTP Pemohon</h6>
                {selectedBerkasModal.berkas_ktp ? (
                  <div>
                    {selectedBerkasModal.berkas_ktp.startsWith('data:image') ? (
                      <img src={selectedBerkasModal.berkas_ktp} alt="Berkas KTP" className="img-fluid rounded border shadow-sm w-100" style={{ maxHeight: '350px', objectFit: 'contain', background: '#FAF8F5' }} />
                    ) : (
                      <a href={selectedBerkasModal.berkas_ktp} target="_blank" rel="noreferrer" className="btn btn-sm w-100 py-3 rounded-3 fw-bold" style={{ background: '#F3EFE6', color: '#065F46', border: '1px solid rgba(6, 95, 70, 0.25)' }}>
                        <i className="bi bi-download me-1"></i> Buka Dokumen KTP ({selectedBerkasModal.berkas_ktp_nama || 'File'})
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="small text-muted">Tidak ada lampiran berkas KTP.</p>
                )}
              </div>
            </div>

            {selectedBerkasModal.catatan && (
              <div className="alert mt-3 mb-0 small" style={{ background: '#FAF8F5', border: '1px solid rgba(6, 95, 70, 0.2)', color: '#041E17' }}>
                <strong>Catatan Pemohon:</strong> {selectedBerkasModal.catatan}
              </div>
            )}

            <div className="text-end mt-4 pt-3" style={{ borderTop: '1px solid #e2e8f0' }}>
              <button onClick={() => setSelectedBerkasModal(null)} className="btn px-4 fw-bold rounded-pill text-white font-hero" style={{ background: 'linear-gradient(135deg, #065F46, #041E17)', border: 'none' }}>
                Tutup Pemeriksaan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kirim WA Evaluasi Pelayanan Setelah Selesai */}
      {showWaModal && completedForWa && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center px-3" style={{ background: 'rgba(4, 30, 23, 0.68)', backdropFilter: 'blur(10px)', zIndex: 2100 }}>
          <div className="card p-4 border-0 w-100 shadow-2xl" style={{ maxWidth: '540px', background: '#ffffff', border: '1.5px solid rgba(6, 95, 70, 0.22)', borderRadius: '24px', color: '#041E17' }}>
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <div className="d-flex align-items-center gap-2.5">
                <div className="rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                  <i className="bi bi-check2-circle text-success fs-4"></i>
                </div>
                <div>
                  <h5 className="fw-extrabold m-0 font-hero" style={{ color: '#041E17' }}>Pelayanan Selesai Dilayani</h5>
                  <small style={{ color: '#64748b' }}>Kirim pesan WhatsApp evaluasi + link SKM kepada warga</small>
                </div>
              </div>
              <button onClick={() => setShowWaModal(false)} className="btn-close"></button>
            </div>

            <div className="p-3 rounded-4 mb-3" style={{ background: '#FAF8F5', border: '1px solid rgba(6, 95, 70, 0.18)' }}>
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <span className="badge px-3 py-1 rounded-pill fw-bold fs-6 font-mono text-white" style={{ background: 'linear-gradient(135deg, #065F46, #041E17)' }}>
                  {completedForWa.nomor_lengkap}
                </span>
                <span className="small fw-bold" style={{ color: '#065F46' }}>
                  {completedForWa.pelayanan_nama || (pelayananList.find(p => p.id === completedForWa.pelayanan_id)?.nama || 'Pelayanan Publik')}
                </span>
              </div>
              <div className="row g-1 text-start small">
                <div className="col-4 text-muted">Nama Warga</div>
                <div className="col-8 fw-bold" style={{ color: '#041E17' }}>: {completedForWa.warga_nama || '-'}</div>
                <div className="col-4 text-muted">No. WhatsApp</div>
                <div className="col-8 fw-bold" style={{ color: '#065F46' }}>: {completedForWa.warga_hp || '-'}</div>
                <div className="col-4 text-muted">Alamat</div>
                <div className="col-8 text-muted">: {completedForWa.warga_alamat || '-'}</div>
                <div className="col-4 text-muted">Operator</div>
                <div className="col-8 text-muted">: {completedForWa.operator_nama || getCurrentOperatorName()}</div>
              </div>
            </div>

            <div className="mb-3 text-center">
              {completedForWa.warga_hp && completedForWa.warga_hp.trim() !== '' && completedForWa.warga_hp !== '-' ? (
                completedForWa.wa_evaluasi_sent ? (
                  <button
                    type="button"
                    onClick={() => handleSendWaEvaluasi(completedForWa)}
                    className="btn w-100 py-3 fw-bold rounded-pill shadow d-inline-flex align-items-center justify-content-center gap-2 font-hero"
                    style={{ fontSize: '1rem', background: '#059669', border: 'none', color: '#ffffff' }}
                    title="Sudah terkirim. Klik jika ingin mengirim ulang."
                  >
                    <i className="bi bi-check-circle-fill fs-5"></i>
                    <span>Status: Terkirim (Kirim Ulang)</span>
                    <i className="bi bi-whatsapp opacity-75 ms-1"></i>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendWaEvaluasi(completedForWa)}
                    className="btn w-100 py-3 fw-bold text-white rounded-pill shadow d-inline-flex align-items-center justify-content-center gap-2 font-hero"
                    style={{ fontSize: '1rem', background: '#25D366', border: 'none' }}
                  >
                    <i className="bi bi-whatsapp fs-5"></i>
                    <span>Kirim WA Evaluasi + Link SKM</span>
                  </button>
                )
              ) : (
                <div className="alert alert-warning py-2 small mb-0 rounded-3">
                  <i className="bi bi-exclamation-triangle me-1"></i> Nomor WhatsApp warga tidak tersedia untuk antrian ini.
                </div>
              )}
            </div>

            <div className="d-flex justify-content-end gap-2 pt-2" style={{ borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setShowWaModal(false)}
                className="btn px-4 py-2 rounded-pill fw-bold font-hero"
                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
              >
                Tutup &amp; Lanjut
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
