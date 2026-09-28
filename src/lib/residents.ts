import { Firestore, doc, getDoc, getDocs, setDoc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { Resident } from '@/lib/types';


// In-Memory Cache untuk menghemat Quota Read Firestore saat Autofill NIK
const residentMemoryCache = new Map<string, Resident>();

/**
 * Menyimpan data penduduk ke cache lokal (Memory + SessionStorage)
 */
export const cacheResident = (resident: Resident) => {
  if (!resident || !resident.nik) return;
  const cleanNik = String(resident.nik).trim();
  residentMemoryCache.set(cleanNik, resident);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`res_cache_${cleanNik}`, JSON.stringify(resident));
    } catch (e) {
      // Ignore storage errors
    }
  }
};

/**
 * MENCARI DATA PENDUDUK BY NIK (ULTRA OPTIMIZED - ZERO / 1 READ QUERY SCHEMA)
 * 1. Cek Memory Cache (0 Read)
 * 2. Cek SessionStorage (0 Read)
 * 3. Jika tidak ada, panggil getDoc(doc(db, 'residents', nik)) (Tepat 1 Read tanpa scan index)
 */
export const getResidentByNik = async (db: Firestore, nik: string): Promise<Resident | null> => {
  if (!nik) return null;
  const cleanNik = String(nik).trim();
  if (cleanNik.length !== 16) return null;

  // 1. Cek Memory Cache
  if (residentMemoryCache.has(cleanNik)) {
    return residentMemoryCache.get(cleanNik)!;
  }

  // 2. Cek SessionStorage Cache
  if (typeof window !== 'undefined') {
    try {
      const cachedStr = sessionStorage.getItem(`res_cache_${cleanNik}`);
      if (cachedStr) {
        const cachedRes = JSON.parse(cachedStr) as Resident;
        residentMemoryCache.set(cleanNik, cachedRes);
        return cachedRes;
      }
    } catch (e) {
      // Pass
    }
  }

  // 3. Panggil Firestore getDoc (Hanya 1 Read langsung ke Document ID = NIK)
  try {
    const docRef = doc(db, 'residents', cleanNik);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const resident = { id: docSnap.id, ...docSnap.data() } as Resident;
      cacheResident(resident);
      return resident;
    }

    return null;
  } catch (error: any) {
    console.error("Error fetching resident by NIK:", error);
    throw error;
  }
};


/**
 * SEED DATA TESTING
 */
export const seedResidents = async (db: Firestore) => {
  const batch = writeBatch(db);
  const residentsRef = collection(db, 'residents');

  const testData = [
    {
      nik: "3301010101010001",
      noKk: "3301010101018888",
      fullName: "BUDI SANTOSO",
      gender: "Laki-laki",
      dateOfBirth: "12-05-1985",
      age: "39",
      placeOfBirth: "Cilacap",
      address: "Jl. Mawar No. 12, Gandrungmangu",
      rt: "001",
      rw: "002",
      kelurahan: "Gandrungmangu",
      relationshipToHeadOfFamily: "KEPALA KELUARGA",
      maritalStatus: "KAWIN",
      educationLevel: "SLTA / Sederajat",
      religion: "Islam",
      occupation: "Wiraswasta",
      bloodType: "O",
      hasBirthCertificate: "ADA",
      birthCertificateNumber: "12345/DISDUK/2010",
      hasMarriageCertificate: "ADA",
      marriageCertificateNumber: "987/KUA/2012",
      hasDivorceCertificate: "TIDAK",
      divorceCertificateNumber: "-",
      fatherName: "SUTRISNO",
      motherName: "SITI AMINAH"
    },
    {
      nik: "3301010101010002",
      noKk: "3301010101018888",
      fullName: "ANI WIDAYATI",
      gender: "Perempuan",
      dateOfBirth: "20-08-1988",
      age: "34",
      placeOfBirth: "Cilacap",
      address: "Jl. Mawar No. 12, Gandrungmangu",
      rt: "001",
      rw: "002",
      kelurahan: "Gandrungmangu",
      relationshipToHeadOfFamily: "ISTRI",
      maritalStatus: "KAWIN",
      educationLevel: "SLTA / Sederajat",
      religion: "Islam",
      occupation: "Ibu Rumah Tangga (IRT)",
      bloodType: "A",
      hasBirthCertificate: "ADA",
      birthCertificateNumber: "55432/DISDUK/2011",
      hasMarriageCertificate: "ADA",
      marriageCertificateNumber: "987/KUA/2012",
      hasDivorceCertificate: "TIDAK",
      divorceCertificateNumber: "-",
      fatherName: "KARTONO",
      motherName: "SUMIATI"
    }
  ];

  testData.forEach(data => {
    const docRef = doc(residentsRef, data.nik);
    batch.set(docRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
};

/**
 * MENGHITUNG STATISTIK KELOMPOK
 */
export function calculateStatsForGroup(residents: any[]) {
  const total = residents.length;
  const kkSet = new Set(residents.map(r => r.noKk).filter(Boolean));

  const maleCount = residents.filter(r => {
    const g = (r.gender || '').toLowerCase().trim();
    return g.startsWith('l') || g.includes('laki');
  }).length;

  const femaleCount = residents.filter(r => {
    const g = (r.gender || '').toLowerCase().trim();
    return g.startsWith('p') || g.startsWith('w') || g.includes('perempuan') || g.includes('wanita');
  }).length;

  const otherCount = Math.max(0, total - maleCount - femaleCount);

  const malePercent = total > 0 ? Math.round((maleCount / total) * 100) : 0;
  const femalePercent = total > 0 ? Math.round((femaleCount / total) * 100) : 0;

  // Kelompok Umur
  const ageGroups = [
    { name: 'Anak (0-14)', value: 0 },
    { name: 'Produktif (15-64)', value: 0 },
    { name: 'Lansia (65+)', value: 0 },
  ];

  // Pendidikan
  const eduMap: Record<string, number> = { 'SD': 0, 'SMP': 0, 'SMA': 0, 'Diploma/Sarjana': 0, 'Lainnya': 0 };

  // Pekerjaan
  const jobMap: Record<string, number> = { 'Petani': 0, 'Buruh': 0, 'Swasta': 0, 'Pelajar': 0, 'PNS/TNI': 0, 'Lainnya': 0 };

  // Sebaran RW
  const rwMap: Record<string, number> = {};

  // Sebaran RT
  const rtMap: Record<string, number> = {};

  residents.forEach(r => {
    // Kelompok Umur
    const age = parseInt(r.age || '0');
    if (age <= 14) ageGroups[0].value++;
    else if (age <= 64) ageGroups[1].value++;
    else ageGroups[2].value++;

    // Pendidikan
    const edu = (r.educationLevel || '').toUpperCase();
    if (edu.includes('SD')) eduMap['SD']++;
    else if (edu.includes('SMP')) eduMap['SMP']++;
    else if (edu.includes('SMA') || edu.includes('SLTA')) eduMap['SMA']++;
    else if (edu.includes('SARJANA') || edu.includes('DIPLOMA') || edu.includes('S1') || edu.includes('S2') || edu.includes('S3')) eduMap['Diploma/Sarjana']++;
    else eduMap['Lainnya']++;

    // Pekerjaan
    const job = (r.occupation || '').toUpperCase();
    if (job.includes('TANI')) jobMap['Petani']++;
    else if (job.includes('BURUH')) jobMap['Buruh']++;
    else if (job.includes('SWASTA') || job.includes('KARYAWAN') || job.includes('WIRASWASTA')) jobMap['Swasta']++;
    else if (job.includes('PELAJAR') || job.includes('MAHASISWA')) jobMap['Pelajar']++;
    else if (job.includes('PNS') || job.includes('TNI') || job.includes('POLRI') || job.includes('PEGAWAI')) jobMap['PNS/TNI']++;
    else jobMap['Lainnya']++;

    // RW
    const rwRaw = String(r.rw || '').trim();
    const rw = rwRaw ? `RW ${rwRaw.padStart(2, '0')}` : 'N/A';
    rwMap[rw] = (rwMap[rw] || 0) + 1;

    // RT
    const rtRaw = String(r.rt || '').trim();
    const rt = rtRaw ? rtRaw.padStart(3, '0') : 'N/A';
    rtMap[rt] = (rtMap[rt] || 0) + 1;
  });

  return {
    total,
    totalKK: kkSet.size,
    malePercent,
    femalePercent,
    maleCount,
    femaleCount,
    otherCount,
    ageData: ageGroups,
    eduData: Object.entries(eduMap).map(([name, value]) => ({ name, value })),
    jobData: Object.entries(jobMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    rwData: Object.entries(rwMap).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name)),
    rtData: Object.entries(rtMap).map(([name, value]) => ({ rt: name, count: value })).sort((a, b) => a.rt.localeCompare(b.rt)),
  };
}

/**
 * HITUNG ULANG STATISTIK KEPENDUDUKAN & SIMPAN KE DOCUMENT
 */
export const recalculateStatistics = async (db: Firestore): Promise<any> => {
  try {
    const residentsCol = collection(db, 'residents');
    const snapshot = await getDocs(residentsCol);
    const residents: any[] = [];
    snapshot.forEach(doc => {
      residents.push({ id: doc.id, ...doc.data() });
    });

    const rootStats = calculateStatsForGroup(residents);

    const dusunNames = ["Dusun I", "Dusun II", "Dusun III", "Dusun IV"];
    const dusunData: Record<string, any> = {};

    dusunNames.forEach(dusun => {
      const filtered = residents.filter(r => (r.address || '').toUpperCase().includes(dusun.toUpperCase()));
      dusunData[dusun] = calculateStatsForGroup(filtered);
    });

    const finalStats = {
      ...rootStats,
      dusunData,
      updatedAt: serverTimestamp(),
    };

    const docRef = doc(db, 'villageProfile', 'statistics');
    await setDoc(docRef, finalStats, { merge: true });

    return finalStats;
  } catch (error) {
    console.error("Error recalculating statistics:", error);
    throw error;
  }
};