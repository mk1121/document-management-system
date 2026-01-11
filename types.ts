// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

export type ViewMode = 'form' | 'list';

export interface DocMaster {
  id: string; // UUID (or Trigger generated ID if synced)
  name: string;
  gender: string; // 'M' | 'F' | 'O'
  dob: string; // YYYY-MM-DD
  age: number; // Calculated age (Years)
  phone: string;
  address: string;
  doctorName?: string;
  branchName?: string;    // [NEW] FD1 | FD2
  patientType?: string;   // [NEW] General | Orth | Surgery
  appDate?: string;       // [NEW] YYYY-MM-DD
  po?: string;            // [NEW] Post Office
  ps?: string;            // [NEW] Police Station
  dist?: string;          // [NEW] District
  emgContactPerson?: string; // [NEW]
  emgContactNo?: string;     // [NEW]
  refBy?: string;            // [NEW]
  createdAt: number;
  syncStatus: 'pending' | 'synced' | 'failed';
}

export interface Doctor {
  id: number; // Changed to number
  name: string;
}

export interface DocDetail {
  id: string;
  masterId: string;
  sequence: number; // For ordering (1st, 2nd, etc.)
  imageData: string; // Base64 compressed string
  mimeType: string;
  nextApp?: string; // [NEW] Per-document appointment date
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


