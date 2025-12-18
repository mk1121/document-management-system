import { DocMaster, DocDetail } from '../types';

// Simple IndexedDB wrapper since LocalStorage has a 5MB limit which is insufficient for images.
const DB_NAME = 'DocDigitizeDB';
const DB_VERSION = 1;
const MASTER_STORE = 'masters';
const DETAIL_STORE = 'details';

/**
 * Opens a connection to the IndexedDB database.
 * Creates object stores and indices if they do not exist (during upgrade).
 *
 * @returns {Promise<IDBDatabase>} A promise resolving to the database instance.
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(MASTER_STORE)) {
        const masterStore = db.createObjectStore(MASTER_STORE, { keyPath: 'id' });
        masterStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        masterStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(DETAIL_STORE)) {
        const detailStore = db.createObjectStore(DETAIL_STORE, { keyPath: 'id' });
        detailStore.createIndex('masterId', 'masterId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Saves a complete document (Master record + Detail images) transactionally.
 *
 * @param {DocMaster} master - The metadata of the document.
 * @param {DocDetail[]} details - The array of image details.
 * @returns {Promise<void>}
 */
export const saveDocument = async (master: DocMaster, details: DocDetail[]): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MASTER_STORE, DETAIL_STORE], 'readwrite');

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    const masterStore = transaction.objectStore(MASTER_STORE);
    const detailStore = transaction.objectStore(DETAIL_STORE);

    masterStore.put(master);
    details.forEach((detail) => detailStore.put(detail));
  });
};

/**
 * Updates an existing document.
 * replaces the master record and REPLACES all details.
 */
export const updateDocument = async (master: DocMaster, details: DocDetail[]): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MASTER_STORE, DETAIL_STORE], 'readwrite');

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    const masterStore = transaction.objectStore(MASTER_STORE);
    const detailStore = transaction.objectStore(DETAIL_STORE);

    // 1. Update Master
    masterStore.put(master);

    // 2. Delete existing details for this master
    const index = detailStore.index('masterId');
    const request = index.getAllKeys(master.id);

    request.onsuccess = () => {
      const keys = request.result;
      keys.forEach((key) => {
        detailStore.delete(key);
      });
      // 3. Add new details
      details.forEach((detail) => detailStore.put(detail));
    };
    request.onerror = () => {
      // Fallback or abort? Index lookup failed?
      // Proceeding to add might dupe or leave orphans if delete failed.
      // But throwing error aborts transaction.
      throw new Error("Failed to fetch details for update");
    }
  });
};

/**
 * Retrieves a paginated list of documents from the Master store.
 * Uses a cursor to iterate backwards (newest first).
 *
 * @param {number} page - Current page number (1-based).
 * @param {number} limit - Number of items per page.
 * @returns {Promise<{ docs: DocMaster[], total: number }>}
 */
export const getDocuments = async (
  page: number,
  limit: number,
): Promise<{ docs: DocMaster[]; total: number }> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MASTER_STORE], 'readonly');
    const store = transaction.objectStore(MASTER_STORE);
    const index = store.index('createdAt');

    // Get total count
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      const total = countRequest.result;
      const docs: DocMaster[] = [];

      // Open cursor moving backwards (newest first)
      let advanced = false;
      const cursorRequest = index.openCursor(null, 'prev');

      cursorRequest.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
        if (!cursor) {
          resolve({ docs, total });
          return;
        }

        // Pagination Logic: Skip items for previous pages
        if (page > 1 && !advanced) {
          advanced = true;
          const advanceBy = (page - 1) * limit;
          if (advanceBy > 0) {
            cursor.advance(advanceBy);
            return;
          }
        }

        docs.push(cursor.value);
        if (docs.length < limit) {
          cursor.continue();
        } else {
          resolve({ docs, total });
        }
      };

      cursorRequest.onerror = () => reject(cursorRequest.error);
    };

    countRequest.onerror = () => reject(countRequest.error);
  });
};

/**
 * Fetches all image details for a specific master document.
 *
 * @param {string} masterId - The UUID of the master document.
 * @returns {Promise<DocDetail[]>} Array of image details sorted by sequence.
 */
export const getDocumentDetails = async (masterId: string): Promise<DocDetail[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DETAIL_STORE], 'readonly');
    const store = transaction.objectStore(DETAIL_STORE);
    const index = store.index('masterId');
    const request = index.getAll(masterId);

    request.onsuccess = () => {
      // Sort by sequence manually as getAll order isn't guaranteed
      const details = request.result as DocDetail[];
      details.sort((a, b) => a.sequence - b.sequence);
      resolve(details);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Retrieves all documents that are pending synchronization.
 * Used by the Sync process to identify what needs to be uploaded.
 *
 * @returns {Promise<DocMaster[]>} List of pending documents.
 */
export const getPendingDocuments = async (): Promise<DocMaster[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([MASTER_STORE], 'readonly');
    const index = tx.objectStore(MASTER_STORE).index('syncStatus');
    const req = index.getAll('pending');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

/**
 * Retrieves all documents that failed synchronization.
 *
 * @returns {Promise<DocMaster[]>} List of failed documents.
 */
export const getFailedDocuments = async (): Promise<DocMaster[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([MASTER_STORE], 'readonly');
    const index = tx.objectStore(MASTER_STORE).index('syncStatus');
    const req = index.getAll('failed');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

/**
 * Updates the status of a document to 'synced'.
 *
 * @param {string} masterId - The UUID of the document to update.
 */
export const markAsSynced = async (masterId: string) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([MASTER_STORE], 'readwrite');
    const store = tx.objectStore(MASTER_STORE);
    const req = store.get(masterId);

    req.onsuccess = () => {
      const data = req.result as DocMaster;
      if (data) {
        data.syncStatus = 'synced';
        store.put(data);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

/**
 * Updates the status of a document to 'failed'.
 *
 * @param {string} masterId - The UUID of the document to update.
 */
export const markAsFailed = async (masterId: string) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([MASTER_STORE], 'readwrite');
    const store = tx.objectStore(MASTER_STORE);
    const req = store.get(masterId);

    req.onsuccess = () => {
      const data = req.result as DocMaster;
      if (data) {
        data.syncStatus = 'failed';
        store.put(data);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

/**
 * Deletes the entire database.
 *
 * @returns {Promise<void>}
 */
export const clearDatabase = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.warn('Database deletion blocked. Closing tabs or reloading might fix this.');
      // Attempt to proceed anyway, or just reject
      // Ideally the caller ensures connections are closed (e.g. by reloading page)
    };
  });
};
