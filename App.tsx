import React, { useState, useEffect } from 'react';
import { Camera, Trash2, MoveLeft, MoveRight, Save, Eye, ImageIcon } from 'lucide-react';
import { DocMaster, DocDetail, ViewMode, ReferenceItem } from './types';
import * as DB from './services/db';
import { compressImage } from './services/imageService';
import { useToast } from './components/Toast';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { CameraModal } from './components/CameraModal';
import { Header } from './components/Header';
import { DocumentCard } from './components/DocumentCard';
import { FormField } from './components/FormField';

// Robust UUID generator that works in insecure contexts (HTTP)
const generateUUID = () => {
  // Try native crypto API if available (Secure Contexts)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (_e) {
      // Fallback if invocation fails
    }
  }
  // Fallback for non-secure contexts (e.g. LAN IP usage)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const ITEMS_PER_PAGE = 10;
// Default to relative path to use Vite Proxy in dev, or same-domain in prod
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// --- MAIN APP COMPONENT ---

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const { showToast } = useToast();

  // List State
  const [docList, setDocList] = useState<DocMaster[]>([]);
  const [page, setPage] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    gender: 'Male', // Default to Male 
    dob: '',
    age: '', // Auto-calculated
    phone: '',
    address: '',
    refId: ''
  });
  const [refs, setRefs] = useState<ReferenceItem[]>([]);
  const [images, setImages] = useState<{ id: string; url: string; file?: File }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    // Check if we need to clear DB (triggered from a reload)
    const performInitialChecks = async () => {
      if (localStorage.getItem('clear_db_pending')) {
        try {
          // Delete IndexedDB
          await DB.clearDatabase();
          // Clear LocalStorage
          localStorage.clear();
          showToast('Application Reset: All data cleared successfully.', 'success');
        } catch (e) {
          console.error(e);
          showToast('Failed to fully clear database. Please close other tabs.', 'error');
          localStorage.removeItem('clear_db_pending');
        }
      }

      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setDarkMode(true);
      }

      await refreshCounts();
      await loadDocs(1);

      const cachedRefs = localStorage.getItem('cached_refs');
      if (cachedRefs) {
        setRefs(JSON.parse(cachedRefs));
      } else {
        // Fetch references
        fetch(`${API_BASE_URL}/api/v1/references`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setRefs(data);
              localStorage.setItem('cached_refs', JSON.stringify(data));
            }
          })
          .catch(err => console.error("Failed to fetch refs", err));
      }
    };

    performInitialChecks();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const refreshCounts = async () => {
    const pending = await DB.getPendingDocuments();
    setPendingCount(pending.length);
    const failed = await DB.getFailedDocuments();
    setFailedCount(failed.length);
  };

  const loadDocs = async (pageNum: number) => {
    try {
      const { docs, total } = await DB.getDocuments(pageNum, ITEMS_PER_PAGE);
      setDocList(docs);
      setTotalDocs(total);
      setPage(pageNum);
    } catch (e) {
      console.error('Failed to load documents', e);
    }
  };

  const calculateAge = (dobString: string) => {
    if (!dobString) return '';
    const birthDate = new Date(dobString);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months = months + 12;
    }
    // Re-calculate precise month diff if years became 0
    if (years === 0) {
      // If less than a year, calculate total months difference
      const m = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
      return `${m}M`;
    }

    return `${years}y`;
  };

  // Update logic to trigger age calculation
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDob = e.target.value;
    const newAge = calculateAge(newDob);
    setFormData({ ...formData, dob: newDob, age: newAge });
  };

  const handleImageFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const compressedDataUrl = await compressImage(file);
      setImages((prev) => [
        ...prev,
        {
          id: generateUUID(),
          url: compressedDataUrl,
          file: file,
        },
      ]);
    } catch (err: any) {
      console.error('Image processing failed', err);
      showToast('Failed to process image: ' + file.name, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      for (let i = 0; i < e.target.files.length; i++) {
        await handleImageFile(e.target.files[i]);
      }
      e.target.value = '';
    }
  };

  const handleCameraCapture = async (file: File) => {
    await handleImageFile(file);
    setShowCamera(false);
  };

  const removeImage = (id: string) => {
    setImages(images.filter((img) => img.id !== id));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === images.length - 1) return;

    const newImages = [...images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
    setImages(newImages);
  };

  const handleEdit = async (doc: DocMaster) => {
    setIsProcessing(true);
    try {
      const details = await DB.getDocumentDetails(doc.id);
      setFormData({
        name: doc.name,
        gender: doc.gender || 'Male',
        dob: doc.dob,
        age: doc.age || '',
        phone: doc.phone,
        address: doc.address || '',
        refId: doc.refId ? String(doc.refId) : ''
      });
      setImages(details.map(d => ({
        id: d.id,
        url: d.imageData,
        // file object is lost, but we only need it for upload, and we have base64
        // If we edit images, we might add new Files or re-use existing URLs.
      })));
      setEditingId(doc.id);
      setViewMode('form');
    } catch (e) {
      console.error(e);
      showToast('Failed to load document for editing', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone || !formData.refId || images.length === 0) {
      showToast('Please fill in Reference, Name, Phone, and attach at least one document.', 'warning');
      return;
    }

    setIsProcessing(true);

    try {
      const masterId = editingId || generateUUID();
      const master: DocMaster = {
        id: masterId,
        name: formData.name,
        gender: formData.gender,
        dob: formData.dob,
        age: formData.age,
        phone: formData.phone,
        address: formData.address,
        refId: formData.refId ? Number(formData.refId) : undefined,
        createdAt: Date.now(),
        syncStatus: 'pending',
      };

      const details: DocDetail[] = images.map((img, idx) => {
        // Extract MIME type from Data URL (e.g. data:image/png;base64,...)
        const mimeType = img.url.match(/:(.*?);/)?.[1] || 'image/png';
        return {
          id: generateUUID(),
          masterId: masterId,
          sequence: idx + 1,
          imageData: img.url,
          mimeType: mimeType,
        };
      });

      if (editingId) {
        await DB.updateDocument(master, details);
        showToast("Document Updated Locally!", 'success');
        setEditingId(null);
      } else {
        await DB.saveDocument(master, details);
        // showToast("Document Saved Locally!", 'success');
      }

      // Success
      setFormData({ name: '', gender: 'Male', dob: '', age: '', phone: '', address: '', refId: '' });
      setImages([]);
      refreshCounts();

      // If we are on page 1, reload list immediately
      if (page === 1) loadDocs(1);
    } catch (e) {
      console.error(e);
      showToast('Failed to save to database.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const processSyncBatch = async (docsToSync: DocMaster[]) => {
    let successCount = 0;
    let failCount = 0;
    const totalToSync = docsToSync.length;

    // Determine Backend URL
    const syncUrl = `${API_BASE_URL}/api/v1/documents/sync`;

    // Iterate with index for progress tracking
    for (let i = 0; i < totalToSync; i++) {
      const doc = docsToSync[i];
      setSyncStatus(`Syncing ${i + 1}/${totalToSync}`);

      try {
        const details = await DB.getDocumentDetails(doc.id);

        // Construct Payload matching Backend Expectation
        const payload = {
          transactionId: doc.id,
          metadata: {
            fullName: doc.name,
            gender: doc.gender,
            dateOfBirth: doc.dob,
            age: doc.age,
            phoneNumber: doc.phone,
            address: doc.address,
            refId: doc.refId,
            capturedAt: doc.createdAt,
          },
          attachments: details.map((d) => ({
            sequence: d.sequence,
            mimeType: d.mimeType,
            data: d.imageData,
          })),
        };

        // Perform Network Request
        const response = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Note: No authorization header used as per current requirements
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Server error ${response.status}`);
        }

        await DB.markAsSynced(doc.id);
        successCount++;

        // Invalidate Cache after successful sync (to fetch fresh data if needed, as per requirement "db theke new query calai data niye asbe")
        localStorage.removeItem('cached_refs');
        // Use setTimeout to allow the process to finish before refetching, or just let next reload handle it.
        // Or aggressively refetch now:
        fetch(`${API_BASE_URL}/api/v1/references`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setRefs(data);
              localStorage.setItem('cached_refs', JSON.stringify(data));
            }
          }).catch(err => console.log('Refetch failed silently'));

      } catch (docErr: any) {
        console.error(`Failed to sync doc ${doc.id}:`, docErr);
        // Explicitly mark as failed so it can be retried later
        await DB.markAsFailed(doc.id);
        failCount++;
      }
    }

    let msg = `Batch completed. Success: ${successCount}`;
    if (failCount > 0) msg += `, Failed: ${failCount}`;

    showToast(msg, failCount > 0 ? 'warning' : 'success');
    refreshCounts();
    loadDocs(page); // Refresh UI status
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus('Preparing...');
    try {
      const pendingDocs = await DB.getPendingDocuments();
      if (pendingDocs.length === 0) {
        showToast('No pending documents to sync.', 'info');
        setIsSyncing(false);
        setSyncStatus('');
        return;
      }

      await processSyncBatch(pendingDocs);
    } catch (e) {
      console.error('Global Sync error', e);
      showToast('Sync failed: Could not connect to backend server.', 'error');
    } finally {
      setSyncStatus('');
      setIsSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    setIsSyncing(true);
    setSyncStatus('Preparing Retry...');
    try {
      const failedDocs = await DB.getFailedDocuments();
      if (failedDocs.length === 0) {
        showToast('No failed documents to retry.', 'info');
        setIsSyncing(false);
        setSyncStatus('');
        return;
      }

      await processSyncBatch(failedDocs);
    } catch (e) {
      console.error('Global Retry error', e);
      showToast('Retry failed: Could not connect to backend server.', 'error');
    } finally {
      setSyncStatus('');
      setIsSyncing(false);
    }
  };

  const handleClearData = async () => {
    if (
      window.confirm(
        'WARNING: This will DELETE ALL saved documents and local data.\n\nThis action cannot be undone.\n\nDo you want to reset the application?',
      )
    ) {
      try {
        // We set a flag and reload to ensure DB connections are closed for a clean delete
        localStorage.setItem('clear_db_pending', 'true');
        window.location.reload();
      } catch (e) {
        console.error(e);
        showToast('Failed to initiate clear.', 'error');
      }
    }
  };

  // --- RENDER ---

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200'>
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        darkMode={darkMode}
        toggleTheme={() => setDarkMode(!darkMode)}
        onSync={handleSync}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        onRetryFailed={handleRetryFailed}
        failedCount={failedCount}
        onClearData={handleClearData}
        syncStatus={syncStatus}
      />

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {viewMode === 'form' ? (
          <div className='max-w-2xl mx-auto'>
            <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8'>
              <h2 className='text-lg font-medium text-gray-900 dark:text-white mb-6 border-b dark:border-gray-700 pb-2'>
                {editingId ? 'Edit Document' : 'New Document Entry'}
              </h2>

              <div className='grid grid-cols-1 gap-y-2 gap-x-4 sm:grid-cols-2'>
                <div className='sm:col-span-2'>
                  <FormField
                    label='Full Name'
                    value={formData.name}
                    onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                    placeholder='e.g. Rahim Uddin'
                    required
                  />
                </div>
                <FormField
                  label='Date of Birth'
                  type='date'
                  value={formData.dob}
                  onChange={handleDobChange}
                />
                <FormField
                  label='Phone Number'
                  type='tel'
                  value={formData.phone}
                  onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder='e.g. 01711...'
                  required
                />

                <div className='sm:col-span-1'>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e: any) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-oracle-500 focus:border-oracle-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className='sm:col-span-1'>
                  <FormField
                    label="Age"
                    type="text"
                    value={formData.age}
                    //@ts-ignore
                    readOnly={true}
                    disabled={true}
                    placeholder="Auto-calculated"
                  />
                </div>

                <div className='sm:col-span-2'>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e: any) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-oracle-500 focus:border-oracle-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  />
                </div>
                <div className='sm:col-span-2'>
                  <FormField
                    label='REF'
                    type='select'
                    value={formData.refId}
                    onChange={(e: any) => setFormData({ ...formData, refId: e.target.value })}
                    placeholder='Select Reference Type'
                    required
                    options={refs.map(r => ({ label: r.name, value: r.id }))}
                  />
                </div>
              </div>

              {/* Image Section */}
              {/* Image Section - Only show when required fields are filled */}
              {formData.name && formData.phone && formData.refId && (
                <div className='mt-6'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    Document Images (First image is primary)
                  </label>

                  <div className='flex flex-wrap gap-4 mb-4'>
                    {images.map((img, index) => (
                      <div
                        key={img.id}
                        className='relative group w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 shadow-sm'
                      >
                        <img
                          src={img.url}
                          alt={`Doc ${index + 1}`}
                          className='w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity'
                          onClick={() => setPreviewImage(img.url)}
                        />
                        <div className='absolute top-0 right-0 bg-black/50 text-white text-xs px-1.5 rounded-bl'>
                          {index + 1}
                        </div>

                        {/* Controls Overlay */}
                        <div className='absolute bottom-0 w-full bg-black/70 flex justify-between px-1 py-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity'>
                          <button
                            onClick={() => moveImage(index, 'up')}
                            disabled={index === 0}
                            className='text-white hover:text-blue-300 disabled:opacity-30'
                          >
                            <MoveLeft size={14} />
                          </button>
                          <button
                            onClick={() => removeImage(img.id)}
                            className='text-red-400 hover:text-red-200'
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => moveImage(index, 'down')}
                            disabled={index === images.length - 1}
                            className='text-white hover:text-blue-300 disabled:opacity-30'
                          >
                            <MoveRight size={14} />
                          </button>
                        </div>

                        {/* Hint Overlay */}
                        <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity'>
                          <div className='bg-black/50 rounded-full p-1'>
                            <Eye size={20} className='text-white' />
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Buttons */}
                    <div className='flex flex-col gap-2'>
                      {/* Camera Button */}
                      <button
                        onClick={() => setShowCamera(true)}
                        className='w-24 h-14 flex flex-col items-center justify-center border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-oracle-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800'
                      >
                        <Camera className='text-oracle-600 mb-0.5' size={20} />
                        <span className='text-[10px] text-gray-600 dark:text-gray-300 font-medium'>
                          Camera
                        </span>
                      </button>

                      {/* File Upload Button */}
                      <label className='w-24 h-14 flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-oracle-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800'>
                        <div className='flex flex-col items-center text-center p-1'>
                          <ImageIcon className='text-gray-500 dark:text-gray-400 mb-0.5' size={20} />
                          <span className='text-[10px] text-gray-500 dark:text-gray-400'>File</span>
                        </div>
                        <input
                          type='file'
                          accept='image/*'
                          multiple
                          className='hidden'
                          onChange={handleImageUpload}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className='sticky bottom-0 z-10 bg-white dark:bg-gray-800 mt-8 pt-6 pb-2 border-t border-gray-200 dark:border-gray-700'>
                <button
                  onClick={handleSave}
                  disabled={isProcessing}
                  className='w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-oracle-600 hover:bg-oracle-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-oracle-500 disabled:opacity-70 disabled:cursor-not-allowed'
                >
                  {isProcessing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Save size={18} className='mr-2' /> {editingId ? 'Update Document' : 'Save to Local Storage'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* LIST VIEW */
          <div className='space-y-6'>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
              {docList.length === 0 ? (
                <div className='col-span-full text-center py-12 text-gray-500 dark:text-gray-400'>
                  No documents found. Switch to Form view to add one.
                </div>
              ) : (
                docList.map((doc) => <DocumentCard key={doc.id} doc={doc} onEdit={handleEdit} />)
              )}
            </div>

            {/* Pagination */}
            {totalDocs > ITEMS_PER_PAGE && (
              <div className='flex justify-between items-center bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6 rounded-lg shadow'>
                <div className='text-sm text-gray-700 dark:text-gray-300'>
                  Showing <span className='font-medium'>{(page - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                  <span className='font-medium'>{Math.min(page * ITEMS_PER_PAGE, totalDocs)}</span>{' '}
                  of <span className='font-medium'>{totalDocs}</span> results
                </div>
                <div className='flex space-x-2'>
                  <button
                    onClick={() => loadDocs(page - 1)}
                    disabled={page === 1}
                    className='px-3 py-1 border rounded text-sm disabled:opacity-50 dark:border-gray-600 dark:text-white'
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => loadDocs(page + 1)}
                    disabled={page * ITEMS_PER_PAGE >= totalDocs}
                    className='px-3 py-1 border rounded text-sm disabled:opacity-50 dark:border-gray-600 dark:text-white'
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Full Screen Image Preview Modal with Zoom/Pan */}
      {previewImage && (
        <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />
      )}

      {/* Camera Modal */}
      {showCamera && (
        <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
}
