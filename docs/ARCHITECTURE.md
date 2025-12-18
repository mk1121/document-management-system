# Architecture & Design

## 1. Data Persistence Strategy

### Challenge

The requirement involves handling 50,000+ records with images on a mobile device.

- **LocalStorage**: Limited to ~5MB. Completely insufficient for images.
- **SessionStorage**: Cleared on tab close. Not persistent.

### Solution: IndexedDB

We utilize the browser's native **IndexedDB** API. It is asynchronous, transactional, and supports storing large binary objects (Blobs/Base64) efficiently.

**Store Layout:**

- `masters`: Stores metadata (Name, DOB, Phone, SyncStatus). Indexed by `createdAt` and `syncStatus`.
- `details`: Stores image data. Linked to `masters` via `masterId`.

## 2. Image Optimization Pipeline

To prevent the device storage from filling up and to ensure feasible upload times:

1.  **Capture**: User selects file or captures via camera.
2.  **Resize**: Image is drawn onto an HTML5 Canvas. Max dimension is capped at **1200px** (preserving aspect ratio).
3.  **Compression**: Canvas is exported as `image/jpeg` with **0.7 (70%) quality**.
4.  **Storage**: The resulting Base64 string is stored in IndexedDB.

**Result**: A raw 5MB photo is typically reduced to ~100-300KB while maintaining OCR-readable quality.

## 3. Synchronization Mechanism

The sync process is manual-trigger based (User initiated) to save battery and data.

**Flow:**

1.  Fetch all records from `masters` where `syncStatus === 'pending'`.
2.  Iterate through each master:
    - Fetch associated images from `details`.
    - Construct the payload (see `ORACLE_INTEGRATION.md`).
    - POST to API.
    - On 200 OK: Update local `syncStatus` to `synced`.
    - On Error: Update `syncStatus` to `failed`.

## 4. Component Architecture

- **App.tsx**: Acts as the Controller. Manages state `docList`, `formData`, `viewMode`.
- **Header**: Navigation and global actions (Sync, Theme).
- **DocumentCard**: Presentation component for list items.
- **Services**: Pure TypeScript modules isolated from React logic for testability.
