/**
 * BACKEND GOOGLE APPS SCRIPT - Kecamatan DIGITAL
 * Versi 3.1: Menambahkan kemampuan menghapus acara dari Google Calendar.
 * Logika Terpadu: Agenda, Arsip, Google Drive, & Google Kalender.
 */

// --- FUNGSI UTAMA UNTUK MENERIMA PERINTAH DARI APLIKASI ---
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;

    switch (action) {
      case 'createEventAndUpload':
        result = handleCreateEventAndUpload(data);
        break;
      
      case 'uploadArchiveFile':
        result = handleArchiveUpload(data);
        break;

      case 'saveToDrive':
        result = handleSaveToDrive(data);
        break;
        
      case 'getCalendar':
        result = handleGetCalendar(data);
        break;

      case 'updateEventDescription':
        result = handleUpdateDescription(data);
        break;

      case 'updateEventDisposition':
        result = handleUpdateDisposition(data);
        break;

      case 'deleteEvent':
        result = handleDeleteEvent(data);
        break;

      default:
        throw new Error("Aksi tidak dikenal: " + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, ...result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('doPost Error: ' + error.toString() + "\n" + error.stack);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Apps Script Error: " + error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * FUNGSI BARU: Mengambil acara dari kalender pada tanggal tertentu.
 */
function handleGetCalendar(data) {
  const { calendarId, date } = data;
  if (!calendarId || !date) {
    throw new Error("calendarId dan tanggal diperlukan.");
  }

  try {
    const targetDate = new Date(date);
    const timeMin = targetDate.toISOString();
    const timeMax = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const response = Calendar.Events.list(calendarId, {
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime'
    });

    return { items: response.items };
  } catch (e) {
    throw new Error('Gagal mengambil acara dari Kalender: ' + e.message);
  }
}

/**
 * FUNGSI BARU: Memperbarui deskripsi acara untuk menyimpan notulensi.
 */
function handleUpdateDescription(data) {
  const { calendarId, eventId, newContent } = data;
  if (!calendarId || !eventId || newContent === undefined) {
    throw new Error("calendarId, eventId, dan newContent diperlukan.");
  }

  try {
    // 1. Ambil event yang ada
    const event = Calendar.Events.get(calendarId, eventId);
    let description = event.description || "";

    // 2. Hapus notulensi lama jika ada
    const separator = "\n\n--- NOTULENSI ---";
    const oldNotulensiIndex = description.indexOf(separator);
    if (oldNotulensiIndex !== -1) {
      description = description.substring(0, oldNotulensiIndex);
    }

    // 3. Tambahkan notulensi baru
    const finalDescription = description.trim() + separator + "\n" + newContent.trim();

    // 4. Buat payload update
    const updatedEvent = {
      description: finalDescription
    };

    // 5. Kirim pembaruan
    const result = Calendar.Events.patch(updatedEvent, calendarId, eventId);
    
    return { message: "Deskripsi acara berhasil diperbarui.", updatedEvent: result };
  } catch (e) {
    throw new Error('Gagal memperbarui deskripsi acara: ' + e.message);
  }
}

/**
 * FUNGSI BARU: Memperbarui penugasan disposisi (petugas) pada acara kalender.
 */
function handleUpdateDisposition(data) {
  const { calendarId, eventId, disposition, dispositionNotes } = data;
  if (!calendarId || !eventId) {
    throw new Error("calendarId dan eventId diperlukan.");
  }

  try {
    const event = Calendar.Events.get(calendarId, eventId);
    let description = event.description || "";

    const cleanDisp = (disposition && disposition.trim() !== '') ? disposition.trim() : 'Belum Didisposisi';
    const dispLine = (cleanDisp !== 'Belum Didisposisi' && dispositionNotes && dispositionNotes.trim() !== '') 
      ? `DISPOSISI: ${cleanDisp} (Catatan: ${dispositionNotes.trim()})`
      : `DISPOSISI: ${cleanDisp}`;

    if (data.eventType) {
      const typeLine = `JENIS: ${data.eventType}`;
      if (/^JENIS:.*$/m.test(description)) {
        description = description.replace(/^JENIS:.*$/m, typeLine);
      } else {
        description = typeLine + '\n' + description;
      }
    }

    if (/^DISPOSISI:.*$/m.test(description)) {
      description = description.replace(/^DISPOSISI:.*$/m, dispLine);
    } else if (/^JENIS:.*$/m.test(description)) {
      description = description.replace(/^JENIS:.*$/m, (match) => match + '\n' + dispLine);
    } else {
      description = dispLine + '\n\n' + description;
    }

    const updatedEvent = {
      description: description.trim()
    };

    const result = Calendar.Events.patch(updatedEvent, calendarId, eventId);
    return { message: "Disposisi acara berhasil diperbarui.", updatedEvent: result };
  } catch (e) {
    throw new Error('Gagal memperbarui disposisi acara: ' + e.message);
  }
}


/**
 * Menghapus acara dari Google Calendar berdasarkan eventId.
 */
function handleDeleteEvent(data) {
  const { calendarId, eventId } = data;
  if (!calendarId || !eventId) {
    throw new Error("calendarId dan eventId diperlukan.");
  }

  try {
    Calendar.Events.remove(calendarId, eventId);
    return { message: "Acara berhasil dihapus dari Google Calendar." };
  } catch (e) {
    throw new Error('Gagal menghapus acara: ' + e.message);
  }
}


/**
 * Menangani unggahan file arsip ke Google Drive.
 */
function handleArchiveUpload(data) {
  const { fileData, fileName, folderId } = data;

  if (!fileData || !fileData.base64 || !fileName || !folderId) {
    throw new Error("Data arsip tidak lengkap.");
  }

  try {
    const decoded = Utilities.base64Decode(fileData.base64);
    const blob = Utilities.newBlob(decoded, fileData.type, fileName);
    const targetFolder = DriveApp.getFolderById(folderId);
    const newFile = targetFolder.createFile(blob);
    
    return {
      message: "File berhasil diarsipkan.",
      fileUrl: newFile.getUrl(),
      fileId: newFile.getId()
    };
  } catch (e) {
    throw new Error('Gagal unggah arsip ke Drive: ' + e.message);
  }
}

/**
 * Menyimpan seluruh dokumen dan lampiran kegiatan ke Google Drive dalam folder kegiatan.
 */
function handleSaveToDrive(data) {
  const { folderName, parentFolderId, files } = data;
  let parentFolder;
  
  if (parentFolderId && typeof parentFolderId === 'string' && parentFolderId.trim() !== '') {
    try {
      parentFolder = DriveApp.getFolderById(parentFolderId.trim());
    } catch (e) {
      console.warn("Parent folder spesifik tidak ditemukan: " + e.message);
      parentFolder = DriveApp.getRootFolder();
    }
  } else {
    parentFolder = DriveApp.getRootFolder();
  }

  // Buat subfolder khusus kegiatan ini
  const targetFolder = parentFolder.createFolder(folderName || "Arsip Kegiatan");
  try {
    targetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    console.warn("Peringatan izin sharing folder: " + err.message);
  }

  const fileUrls = {};

  function saveSingleFile(key, fileObj) {
    if (!fileObj || !fileObj.base64) return;
    try {
      const decoded = Utilities.base64Decode(fileObj.base64);
      const blob = Utilities.newBlob(decoded, fileObj.type || 'application/pdf', fileObj.name || (key + '.pdf'));
      const newFile = targetFolder.createFile(blob);
      try {
        newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {}
      fileUrls[key] = newFile.getUrl();
    } catch (e) {
      console.error("Gagal simpan file " + key + ": " + e.message);
    }
  }

  if (files) {
    saveSingleFile('notulen', files.notulen);
    saveSingleFile('bast', files.bast);
    saveSingleFile('dokKegiatan', files.dokKegiatan);
    saveSingleFile('dokAtk', files.dokAtk);
    saveSingleFile('dokKonsumsi', files.dokKonsumsi);
    saveSingleFile('undangan', files.undangan);

    if (Array.isArray(files.materials)) {
      files.materials.forEach(function(mat, idx) {
        saveSingleFile('materi_' + (idx + 1), mat);
      });
    }

    if (Array.isArray(files.photos)) {
      files.photos.forEach(function(photo, idx) {
        saveSingleFile('foto_' + (idx + 1), photo);
      });
    }
  }

  return {
    message: "Seluruh berkas kegiatan berhasil diarsipkan ke Google Drive.",
    folderId: targetFolder.getId(),
    folderUrl: targetFolder.getUrl(),
    fileUrls: fileUrls
  };
}


/**
 * Membuat acara di Google Calendar & mengunggah file ke Google Drive sebagai Lampiran Resmi.
 */
function handleCreateEventAndUpload(data) {
  const { eventData, fileData, folderId } = data;
  let fileUrl = null;
  let eventUrl = null;
  let uploadedFile = null;

  if (!eventData || !eventData.calendarId || !eventData.title) {
    throw new Error("Data agenda tidak lengkap (ID Kalender atau Acara kosong).");
  }

  // 1. Simpan file jika dilampirkan
  let uploadWarning = null;
  if (fileData && fileData.base64) {
    try {
      const decoded = Utilities.base64Decode(fileData.base64);
      const blob = Utilities.newBlob(decoded, fileData.type || 'application/pdf', fileData.name || 'Undangan.pdf');
      
      let targetFolder = null;
      if (folderId && typeof folderId === 'string' && folderId.trim() !== '') {
        try {
          targetFolder = DriveApp.getFolderById(folderId.trim());
        } catch (e) {
          console.warn("Folder ID spesifik tidak ditemukan: " + e.message);
        }
      }
      
      // Jika folderId tidak diisi atau tidak valid, simpan ke folder 'Lampiran Agenda Kecamatan'
      if (!targetFolder) {
        try {
          const folders = DriveApp.getFoldersByName("Lampiran Agenda Kecamatan");
          if (folders.hasNext()) {
            targetFolder = folders.next();
          } else {
            targetFolder = DriveApp.createFolder("Lampiran Agenda Kecamatan");
          }
        } catch (folderErr) {
          targetFolder = DriveApp.getRootFolder();
        }
      }

      uploadedFile = targetFolder.createFile(blob);
      try {
        // Atur izin agar file dapat dilihat oleh siapa saja yang memiliki tautan
        uploadedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {
        console.warn("Peringatan izin sharing file: " + shareErr.message);
      }
      fileUrl = uploadedFile.getUrl();
    } catch (e) {
      console.error('Gagal unggah berkas ke Google Drive: ' + e.message);
      uploadWarning = 'Agenda dicatat ke Kalender, namun berkas belum tersimpan ke Drive (' + e.message + '). Silakan jalankan forceGrantAllPermissions di Editor Apps Script.';
    }
  }

  // 2. Buat Acara di Google Calendar dengan Lampiran Resmi (Calendar Attachment)
  try {
    let finalDescription = (eventData.description || '');
    if (fileUrl) {
      finalDescription += `\n\n📄 Undangan / Lampiran: ${fileUrl}`;
    } else if (uploadWarning) {
      finalDescription += `\n\n⚠️ Lampiran: Gagal tersimpan ke Drive (${uploadWarning})`;
    }

    const eventResource = {
      summary: eventData.title,
      location: eventData.location,
      description: finalDescription,
      start: { dateTime: eventData.start, timeZone: 'Asia/Jakarta' },
      end: { dateTime: eventData.end, timeZone: 'Asia/Jakarta' },
      reminders: { 'useDefault': false, 'overrides': [{'method': 'popup', 'minutes': 60}, {'method': 'email', 'minutes': 1440}] }
    };

    // Daftarkan sebagai attachment resmi di Google Calendar API jika file berhasil dibuat
    if (uploadedFile && fileUrl) {
      eventResource.attachments = [{
        fileUrl: uploadedFile.getUrl(),
        title: uploadedFile.getName(),
        mimeType: uploadedFile.getMimeType(),
        fileId: uploadedFile.getId()
      }];
    }
    
    // Parameter supportsAttachments: true wajib digunakan untuk menyertakan lampiran
    const createdEvent = Calendar.Events.insert(eventResource, eventData.calendarId, { supportsAttachments: true });
    eventUrl = createdEvent.htmlLink;

  } catch (e) {
    throw new Error('Gagal membuat acara di Google Calendar: ' + e.message);
  }

  return { 
    message: uploadWarning ? uploadWarning : 'Agenda dan lampiran berhasil disimpan.',
    warning: uploadWarning,
    eventUrl: eventUrl,
    fileUrl: fileUrl
  };
}

/**
 * FUNGSI DIAGNOSTIK: Jalankan fungsi ini secara manual di Editor Apps Script untuk otorisasi penuh Drive & Calendar.
 */
function forceGrantAllPermissions() {
  try {
    Calendar.Events.list('primary');
    const root = DriveApp.getRootFolder();
    Logger.log('DriveApp berhasil diakses: ' + root.getName());
    Logger.log('Otorisasi Google Calendar & DriveApp berhasil 100%!');
  } catch (e) {
    console.error('Gagal saat meminta izin: ' + e.message);
    throw new Error('Otorisasi gagal: ' + e.message);
  }
}
