// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

export type ViewMode = 'form' | 'list';

export interface DocMaster {
  id: string; // UUID
  name: string;
  gender: string; // 'M' | 'F' | 'O'
  dob: string; // YYYY-MM-DD
  age: string; // Calculated age (e.g. "25y" or "6M")
  phone: string;
  address: string;
  doctorName?: string; // [NEW] Selected Doctor Name
  createdAt: number;
  syncStatus: 'pending' | 'synced' | 'failed';
}

export interface Doctor {
  id: string; // Changed to string
  name: string;
}

export interface DocDetail {
  id: string;
  masterId: string;
  sequence: number; // For ordering (1st, 2nd, etc.)
  imageData: string; // Base64 compressed string
  mimeType: string;
}

// Combined type for UI consumption
export interface CompleteDocument {
  master: DocMaster;
  details: DocDetail[];
}

export interface SyncResult {
  success: number;
  failed: number;
  errors: string[];
}

export type ViewMode = 'form' | 'list';
