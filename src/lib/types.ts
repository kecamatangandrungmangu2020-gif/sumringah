export interface Resident {
  id?: string;
  nik: string;
  noKk?: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  age?: string;
  placeOfBirth: string;
  address: string;
  rt: string;
  rw: string;
  kelurahan: string;
  relationshipToHeadOfFamily?: string;
  maritalStatus: string;
  educationLevel?: string;
  religion: string;
  occupation: string;
  bloodType?: string;
  hasBirthCertificate?: string;
  birthCertificateNumber?: string;
  hasMarriageCertificate?: string;
  marriageCertificateNumber?: string;
  hasDivorceCertificate?: string;
  divorceCertificateNumber?: string;
  fatherName: string;
  motherName: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface CitizenProfile {
  uid: string;
  phoneNumber?: string;
  email?: string;
  nik?: string;
  fullName?: string;
  updatedAt?: any;
}

export interface PelayananDoc {
  id: string;
  title: string;
  category: string;
  fileId: string;
  fileName: string;
  link?: string | null;
  createdAt?: any;
}

export interface DriveSettingsInfo {
  appsScriptUrl?: string;
  rootFolderId?: string;
}

export interface UploadedFile {
  base64Data?: string;
  mimeType?: string;
  targetFileName?: string;
  fieldName?: string;
  url?: string;
}

export interface KopSuratInfo {
  letterheadImageUrl?: string;
  headerLine1?: string;
  headerLine2?: string;
  headerLine3?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
}

export interface LetterSubmissionFormData {
  name: string;
  nik: string;
  noKk?: string;
  birthPlace?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  job?: string;
  religion?: string;
  maritalStatus?: string;
  nationality?: string;
  
  // SKU (Usaha)
  businessName?: string;
  businessType?: string;
  businessAddress?: string;
  businessSince?: string;
  
  // SKTM & Beasiswa
  purpose?: string;
  schoolName?: string;
  
  // SK Pindah
  destination?: string;
  reason?: string;
  familyCount?: number;
  
  // Kelahiran
  childName?: string;
  childGender?: string;
  birthTime?: string;
  fatherName?: string;
  motherName?: string;
  
  // Kematian
  deceasedName?: string;
  dateOfDeath?: string;
  timeOfDeath?: string;
  placeOfDeath?: string;
  causeOfDeath?: string;
  
  // Ijin Keramaian
  eventName?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  
  // Moyang / Wali / BPJS
  ancestorName?: string;
  wardName?: string;
  bpjsNumber?: string;
  
  notes?: string;
  [key: string]: any;
}

export interface LetterSubmission {
  id: string;
  letterType: string;
  documentNumber?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | string;
  createdAt: any;
  updatedAt?: any;
  date?: any;
  nik?: string;
  requesterUid?: string;
  requesterName?: string;
  formData: LetterSubmissionFormData;
  ticketNumber?: string;
  notes?: string;
  source?: string;
  filesToUpload?: any[];
  driveFiles?: Array<{ fieldName?: string; fileName?: string; fileUrl?: string; fileId?: string }>;
}


export type LetterTypeOption = {
  id: string;
  name: string;
  code: string;
  description: string;
};

export interface NewsImage {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  aspectRatio?: 'landscape' | 'portrait' | 'square';
}

export interface NewsItem {
  id: string;
  title: string;
  category: string;
  date: string;
  imageUrl?: string;
  imagePublicId?: string;
  images?: NewsImage[];
  youtubeVideoId?: string;
  excerpt: string;
  content: string;
  author?: string;
  isFeatured?: boolean;
  status: 'published' | 'draft';
  createdAt?: any;
  updatedAt?: any;
}

