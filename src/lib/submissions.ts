import {
  Firestore,
  doc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { LetterSubmission } from './types';


/**
 * Mendapatkan pengajuan surat berdasarkan ID Dokumen
 */
export const getSubmissionById = async (
  db: Firestore,
  id: string
): Promise<LetterSubmission | null> => {
  if (!id) return null;
  try {
    const docRef = doc(db, 'submissions', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as LetterSubmission;
    }
    return null;
  } catch (error) {
    console.error("Error fetching submission by id:", error);
    throw error;
  }
};

/**
 * Mendapatkan seluruh daftar pengajuan surat (diurutkan berdasarkan tanggal terbaru)
 */
export const getAllSubmissions = async (db: Firestore): Promise<LetterSubmission[]> => {
  try {
    const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const submissions: LetterSubmission[] = [];
    snapshot.forEach((docSnap) => {
      submissions.push({ id: docSnap.id, ...docSnap.data() } as LetterSubmission);
    });
    return submissions;
  } catch (error) {
    console.error("Error fetching submissions:", error);
    throw error;
  }
};

/**
 * Membuat pengajuan surat baru
 */
export const createLetterSubmission = async (
  db: Firestore,
  submissionData: Omit<LetterSubmission, 'id'>
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'submissions'), {
      ...submissionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating letter submission:", error);
    throw error;
  }
};

/**
 * Memperbarui status pengajuan surat atau nomor surat
 */
export const updateSubmissionStatus = async (
  db: Firestore,
  id: string,
  status: string,
  documentNumber?: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'submissions', id);
    const updatePayload: any = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (documentNumber !== undefined) {
      updatePayload.documentNumber = documentNumber;
      updatePayload['formData.nomorSurat'] = documentNumber;
    }
    await updateDoc(docRef, updatePayload);
  } catch (error) {
    console.error("Error updating submission status:", error);
    throw error;
  }
};

/**
 * Mendapatkan Nomor Surat Otomatis Berurutan
 * Format: 400 / [urutan] / 49 / 2026
 */
export const getNextDocumentNumber = async (db: Firestore): Promise<string> => {
  try {
    const q = collection(db, 'submissions');
    const snapshot = await getDocs(q);
    let maxSeq = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.documentNumber && typeof data.documentNumber === 'string') {
        const match = data.documentNumber.match(/^400\s*\/\s*(\d{1,4})\s*\/\s*04\s*\/\s*\d{4}$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    });

    const nextSeq = maxSeq + 1;
    const seqStr = String(nextSeq).padStart(3, '0');
    const year = new Date().getFullYear();

    return `400 / ${seqStr} / 49 / ${year}`;
  } catch (error) {
    console.error("Error generating document number:", error);
    return `400 / 001 / 49 / ${new Date().getFullYear()}`;
  }
};

/**
 * Unggah Berkas Lampiran Pengajuan Surat ke Google Drive
 * Memanggil API Route server-side /api/upload-drive agar bebas dari batasan CORS browser.
 * Folder ID dibaca dari Firestore settings/village.agendaFolderId.
 */
export const uploadAttachmentsToDrive = async (db: Firestore, payload: any) => {
  if (!payload.filesToUpload || !Array.isArray(payload.filesToUpload) || payload.filesToUpload.length === 0) {
    return [];
  }

  try {
    // 1. Dapatkan Folder ID Agenda & Undangan dari Global Village Settings (/settings/)
    let targetFolderId = '';
    try {
      const villageRef = doc(db, 'settings', 'village');
      const villageSnap = await getDoc(villageRef);
      if (villageSnap.exists()) {
        const vData = villageSnap.data();
        if (vData?.agendaFolderId && vData.agendaFolderId.trim() !== '') {
          targetFolderId = vData.agendaFolderId.trim();
        } else if (vData?.kegiatanFolderId && vData.kegiatanFolderId.trim() !== '') {
          targetFolderId = vData.kegiatanFolderId.trim();
        }
      }
    } catch (e) {
      console.warn("Gagal membaca settings/village folder id:", e);
    }

    // 2. Kirim ke API Route /api/upload-drive (server-side, bebas CORS)
    const filesWithNik = payload.filesToUpload.map((f: any) => ({ ...f, nik: payload.nik }));

    const resp = await fetch('/api/upload-drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: filesWithNik, folderId: targetFolderId }),
    });

    if (!resp.ok) {
      throw new Error(`API Route upload-drive error: ${resp.status}`);
    }

    const result = await resp.json();
    return result?.driveFiles ?? [];
  } catch (err) {
    console.error("Error in uploadAttachmentsToDrive:", err);
    return [];
  }
};

/**
 * Alias / wrapper penambahan pengajuan surat dari form warga
 */
export const addSubmission = async (db: Firestore, payload: any): Promise<string> => {
  try {
    const isAdmin = payload.isAdmin === true;
    const initialStatus = payload.status || (isAdmin ? 'APPROVED' : 'PENDING');

    let docNum = payload.documentNumber;
    if (!docNum && isAdmin) {
      docNum = await getNextDocumentNumber(db);
    } else if (!docNum) {
      docNum = 'Belum Ada';
    }

    // Pastikan flag isAdmin tidak mengotori payload formData
    const { isAdmin: _, ...cleanPayload } = payload;

    // 1. Simpan dokumen pengajuan ke Firestore terlebih dahulu agar UI instan selesai (bebas hanging)
    const docRef = await addDoc(collection(db, 'submissions'), {
      ...cleanPayload,
      documentNumber: docNum,
      status: initialStatus,
      driveFiles: [],
      source: isAdmin ? 'internal_admin' : 'online_warga',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Jika ada berkas lampiran, proses unggah ke Google Drive secara aman di latar belakang
    if (payload.filesToUpload && payload.filesToUpload.length > 0) {
      uploadAttachmentsToDrive(db, payload).then(async (driveFiles) => {
        if (driveFiles && driveFiles.length > 0) {
          try {
            await updateDoc(docRef, { driveFiles });
          } catch (e) {
            console.warn("Gagal memperbarui driveFiles di Firestore:", e);
          }
        }
      }).catch(err => {
        console.warn("Drive upload background notice:", err);
      });
    }

    return docRef.id;
  } catch (error) {
    console.error("Error in addSubmission:", error);
    throw error;
  }
};

/**
 * Mencari status permohonan surat warga berdasarkan NIK atau Nomor Tiket
 */
export const searchSubmissionsByCitizen = async (
  db: Firestore,
  queryParam: string
): Promise<LetterSubmission[]> => {
  if (!queryParam || !queryParam.trim()) return [];
  const clean = queryParam.trim();
  try {
    const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const results: LetterSubmission[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const matchTicket = (data.ticketNumber || '').toLowerCase() === clean.toLowerCase();
      const matchNik = (data.nik || '') === clean || (data.formData?.nik || '') === clean;

      if (matchTicket || matchNik) {
        results.push({ id: docSnap.id, ...data } as LetterSubmission);
      }
    });

    return results;
  } catch (error) {
    console.error("Error searching submissions by citizen:", error);
    throw error;
  }
};

/**
 * Menghapus pengajuan surat
 */
export const deleteSubmission = async (db: Firestore, id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'submissions', id));
  } catch (error) {
    console.error("Error deleting submission:", error);
    throw error;
  }
};


