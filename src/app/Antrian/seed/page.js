"use client";

import { useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

export default function Seed() {
  const [status, setStatus] = useState('');

  const runSeed = async () => {
    setStatus('Seeding data...');
    try {
      // 1. Pelayanan
      await setDoc(doc(collection(db, 'pelayanan'), 'pelayanan-A'), {
        kode: 'A',
        nama: 'Legalisasi',
        estimasi_waktu: 15,
        loket_id: 'loket-1',
        loket_nama: 'Loket 1'
      });
      await setDoc(doc(collection(db, 'pelayanan'), 'pelayanan-B'), {
        kode: 'B',
        nama: 'Kependudukan',
        estimasi_waktu: 10,
        loket_id: 'loket-2-3-4',
        loket_nama: 'Loket 2, 3, 4'
      });
      await setDoc(doc(collection(db, 'pelayanan'), 'pelayanan-C'), {
        kode: 'C',
        nama: 'Perekaman E-KTP',
        estimasi_waktu: 20,
        loket_id: 'loket-2-3-4',
        loket_nama: 'Loket 2, 3, 4'
      });

      // 2. Settings
      await setDoc(doc(collection(db, 'settings'), 'instansi_nama'), { value: 'Kecamatan Gandrungmangu' });
      await setDoc(doc(collection(db, 'settings'), 'instansi_alamat'), { value: 'Jl. Raya Gandrungmangu No. 1, Cilacap' });
      await setDoc(doc(collection(db, 'settings'), 'running_text'), { value: 'Selamat Datang di Pelayanan Terpadu Kecamatan Gandrungmangu. Silakan ambil nomor antrian dan tunggu panggilan dari loket.' });
      await setDoc(doc(collection(db, 'settings'), 'display_video_url'), { value: 'https://youtu.be/FkbZshiiS-k' });
      await setDoc(doc(collection(db, 'settings'), 'bell_sound_volume'), { value: '0.8' });

      // 3. Loket
      await setDoc(doc(collection(db, 'loket'), 'loket-1'), { nama: 'Loket 1' });
      await setDoc(doc(collection(db, 'loket'), 'loket-2'), { nama: 'Loket 2' });
      await setDoc(doc(collection(db, 'loket'), 'loket-3'), { nama: 'Loket 3' });
      await setDoc(doc(collection(db, 'loket'), 'loket-4'), { nama: 'Loket 4' });

      // 4. Operator
      await setDoc(doc(collection(db, 'operators'), 'operator-admin'), {
        nama: 'Operator Default',
        username: 'admin',
        password: 'admin'
      });

      await setDoc(doc(collection(db, 'operators'), 'operator-gandrungmangu'), {
        nama: 'Admin Gandrungmangu',
        username: 'antrian.kecgandrungmangu@mail.id',
        password: 'login'
      });

      await setDoc(doc(collection(db, 'operators'), 'operator-system-admin'), {
        nama: 'Admin Sistem',
        username: 'admin@gandrungmangu.id',
        password: 'gandrungmangu123'
      });

      await setDoc(doc(collection(db, 'operators'), 'operator-system-pusat'), {
        nama: 'Admin Pusat Gandrungmangu',
        username: 'gandrungmangu@gmail.id',
        password: 'gandrungmangu123'
      });

      setStatus('Seeding berhasil! Data default sudah masuk ke Firestore.');
    } catch (e) {
      console.error(e);
      setStatus('Gagal seeding: ' + e.message);
    }
  };

  return (
    <div className="container py-5 text-center">
      <h2>Database Initialization</h2>
      <button className="btn btn-primary my-3" onClick={runSeed}>Run Seed</button>
      <p>{status}</p>
    </div>
  );
}
