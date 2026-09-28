/**
 * =================================================================================
 * BACKEND GOOGLE APPS SCRIPT - Kecamatan DIGITAL (VERSI 7.5 - STABLE CALENDAR)
 * =================================================================================
 * 
 * PETUNJUK DEPLOY (WAJIB):
 * 1. Klik ikon '+' di sebelah "Services" -> Tambahkan: Google Calendar API & Google Drive API.
 * 2. Ganti seluruh isi kode dengan kode ini.
 * 3. Klik "Run" pada fungsi 'forceGrantAllPermissions' untuk Otorisasi.
 * 4. Klik "Deploy" -> "New Deployment" -> "Web App".
 * 5. Execute as: Me | Who has access: Anyone (SIAPA SAJA).
 * 
 * =================================================================================
 */

const GEMINI_API_KEY = "AIzaSyC14sMFsIWhjaZHEv8BzMyAQJtYqUxp6Xo";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Tidak ada data yang diterima.");
    }

    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;

    switch (action) {
      case 'saveToDrive':
        result = handleSaveToDrive(data);
        break;

      case 'askAI':
        result = handleAskAI(data);
        break;

      case 'createEventAndUpload':
        result = handleCreateEventAndUpload(data);
        break;

      case 'uploadArchiveFile':
        result = handleArchiveUpload(data);
        break;

      case 'getCalendar':
        result = handleGetCalendar(data);
        break;

      case 'updateEventDescription':
        result = handleUpdateDescription(data);
        break;

      case 'generateNumber':
        result = handleGenerateNumber(data);
        break;

      default:
        throw new Error("Aksi tidak dikenal: " + action);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, ...result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('doPost Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Script Error: " + error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Menyimpan laporan kegiatan ke Drive dengan proteksi Folder ID.
 */
function handleSaveToDrive(data) {
  const { folderName, parentFolderId, files } = data;
  let parentFolder;

  try {
    parentFolder = DriveApp.getFolderById(parentFolderId);
  } catch (e) {
    parentFolder = DriveApp.getRootFolder();
  }

  const newFolder = parentFolder.createFolder(folderName);
  const fileUrls = { photos: [], materials: [] };

  const saveFile = (fileInfo, folder) => {
    if (!fileInfo || !fileInfo.base64) return null;
    const decoded = Utilities.base64Decode(fileInfo.base64);
    const blob = Utilities.newBlob(decoded, fileInfo.type, fileInfo.name);
    const file = folder.createFile(blob);
    return file.getUrl();
  };

  if (files.photos) {
    files.photos.forEach(photo => {
      const url = saveFile(photo, newFolder);
      if (url) fileUrls.photos.push(url);
    });
  }

  if (files.materials) {
    files.materials.forEach(material => {
      const url = saveFile(material, newFolder);
      if (url) fileUrls.materials.push(url);
    });
  }

  fileUrls.undangan = saveFile(files.undangan, newFolder);
  fileUrls.notulen = saveFile(files.notulen, newFolder);
  fileUrls.bast = saveFile(files.bast, newFolder);

  return {
    folderId: newFolder.getId(),
    fileUrls: fileUrls
  };
}

/**
 * Membuat event kalender dan upload file dengan fallback folder.
 */
function handleCreateEventAndUpload(data) {
  const { eventData, fileData, folderId } = data;
  let fileUrl = null;

  if (fileData && fileData.base64) {
    try {
      let targetFolder;
      try {
        targetFolder = DriveApp.getFolderById(folderId);
      } catch (e) {
        targetFolder = DriveApp.getRootFolder();
      }

      const decoded = Utilities.base64Decode(fileData.base64);
      const blob = Utilities.newBlob(decoded, fileData.type, fileData.name);
      fileUrl = targetFolder.createFile(blob).getUrl();
    } catch (e) {
      throw new Error("Gagal akses Drive: " + e.message);
    }
  }

  const eventResource = {
    summary: eventData.title,
    location: eventData.location,
    description: (eventData.description || '') + (fileUrl ? `\n\n🔗 Link Undangan: ${fileUrl}` : ''),
    start: { dateTime: eventData.start, timeZone: 'Asia/Jakarta' },
    end: { dateTime: eventData.end, timeZone: 'Asia/Jakarta' }
  };

  try {
    const createdEvent = Calendar.Events.insert(eventResource, eventData.calendarId || "primary");
    return { eventUrl: createdEvent.htmlLink, fileUrl: fileUrl };
  } catch (e) {
    throw new Error("Gagal akses Kalender (Pastikan API Calendar aktif): " + e.message);
  }
}

function handleGenerateNumber(data) {
  const randomNum = Math.floor(100 + Math.random() * 900);
  const year = new Date().getFullYear();
  const docNumber = `090/${randomNum}/SPPD/${year}`;
  return { docNumber: docNumber };
}

function handleAskAI(data) {
  const { prompt } = data;
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY;
  const payload = { "contents": [{ "parts": [{ "text": prompt }] }] };
  const options = { 'method': 'post', 'contentType': 'application/json', 'payload': JSON.stringify(payload) };
  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());
  return { text: result.candidates[0].content.parts[0].text };
}

function handleGetCalendar(data) {
  try {
    const { calendarId, date } = data;
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) throw new Error("Format tanggal tidak valid.");

    const timeMin = targetDate.toISOString();
    const timeMax = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const calId = (calendarId && calendarId.includes("@")) ? calendarId : "primary";
    const response = Calendar.Events.list(calId, {
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime'
    });

    return { items: response.items || [] };
  } catch (err) {
    throw new Error("Gagal mengambil agenda: " + err.message);
  }
}

function handleUpdateDescription(data) {
  const { calendarId, eventId, newContent } = data;
  const calId = (calendarId && calendarId.includes("@")) ? calendarId : "primary";
  const event = Calendar.Events.get(calId, eventId);
  const separator = "\n\n--- NOTULENSI ---";
  let description = (event.description || "").split(separator)[0];
  const finalDescription = description.trim() + separator + "\n" + newContent.trim();
  Calendar.Events.patch({ description: finalDescription }, calId, eventId);
  return { message: "Notulensi disimpan." };
}

function handleArchiveUpload(data) {
  const { fileData, fileName, folderId } = data;
  let targetFolder;
  try {
    targetFolder = DriveApp.getFolderById(folderId);
  } catch (e) {
    targetFolder = DriveApp.getRootFolder();
  }

  const decoded = Utilities.base64Decode(fileData.base64);
  const blob = Utilities.newBlob(decoded, fileData.type, fileName);
  const file = targetFolder.createFile(blob);
  return { fileUrl: file.getUrl(), fileId: file.getId() };
}

function forceGrantAllPermissions() {
  const root = DriveApp.getRootFolder();
  Logger.log("Akses Drive OK: " + root.getName());
  const cal = CalendarApp.getDefaultCalendar();
  Logger.log("Akses Kalender OK: " + cal.getName());
  try {
    Calendar.Events.list("primary", { maxResults: 1 });
    Logger.log("API Advanced Calendar OK");
  } catch (e) {
    Logger.log("API Advanced Calendar ERROR: " + e.message);
  }
}
