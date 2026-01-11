import React, { useState, useEffect } from 'react';
import { Camera, Trash2, MoveLeft, MoveRight, Save, Eye, ImageIcon, Search, Upload, X } from 'lucide-react';
import { DocMaster, DocDetail, ViewMode, Doctor, OnlinePatient, OnlinePatientImage } from './types';
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
    gender: 'Male',
    dob: '',
    age: 0,
    phone: '',
    address: '',
    doctorName: '',
    // New Fields
    branchName: 'FD1',          // Default FD1
    patientType: 'General',     // Default General
    appDate: new Date().toISOString().split('T')[0], // Default Today
    po: '',
    ps: '',
    dist: '',
    emgContactPerson: '',
    emgContactNo: '',
    refBy: '',
  });

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [images, setImages] = useState<{ id: string; url: string; file?: File; nextApp?: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OnlinePatient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOnlinePatient, setSelectedOnlinePatient] = useState<OnlinePatient | null>(null);
  const [onlineImages, setOnlineImages] = useState<OnlinePatientImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Helper to fetch doctors with cache-first strategy
  const fetchDoctors = (force = false) => {
    // If not forced, try to load from cache
    if (!force) {
      const cached = localStorage.getItem('cached_doctors');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDoctors(parsed);
            return;
          }
        } catch (e) {
          // Cache parse error, proceed to fetch from API
        }
      }
    }

    // Fallback or Forced: Fetch from API

    fetch(`${API_BASE_URL}/api/v1/doctors`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {

          setDoctors(data);
          localStorage.setItem('cached_doctors', JSON.stringify(data));
        } else {
          console.error('Invalid data format', data);
        }
      })
      .catch(err => {
        console.error("Doctor fetch error:", err);
        // Optional: showToast('Failed to load doctors', 'error');
      });
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setSelectedOnlinePatient(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/patients/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
      showToast('Search failed. Ensure backend is running.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const loadOnlineImages = async (patientId: number) => {
    try {
      // Add timestamp to prevent caching
      const res = await fetch(`${API_BASE_URL}/api/v1/patients/${patientId}/images?t=${Date.now()}`);
      if (!res.ok) throw new Error('Failed to load images');
      const data = await res.json();
      setOnlineImages(data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load patient images', 'error');
    }
  };

  const handleSelectOnlinePatient = (patient: OnlinePatient) => {
    setSelectedOnlinePatient(patient);
    setOnlineImages([]);
    loadOnlineImages(patient.id);
  };

  // Reusable upload function
  const uploadOnlineImage = async (file: File) => {
    if (!selectedOnlinePatient) return;
    setUploadingImage(true);
    try {
      const compressedDataUrl = await compressImage(file);
      const mimeType = compressedDataUrl.match(/:(.*?);/)?.[1] || 'image/png';

      const payload = {
        images: [
          {
            data: compressedDataUrl,
            mimeType: mimeType
          }
        ]
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/patients/${selectedOnlinePatient.id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Upload failed');
      showToast('Image uploaded successfully', 'success');
      await loadOnlineImages(selectedOnlinePatient.id);
    } catch (err) {
      console.error(err);
      showToast('Failed to upload image', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOnlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedOnlinePatient || !e.target.files?.length) return;
    const file = e.target.files[0];
    await uploadOnlineImage(file);
    e.target.value = '';
  };

  const handleCameraCapture = async (file: File) => {
    if (viewMode === 'search' && selectedOnlinePatient) {
      await uploadOnlineImage(file);
    } else {
      await handleImageFile(file);
    }
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
    }
  };

  useEffect(() => {
    const init = async () => {

      // Theme
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {

        setDarkMode(true);
      } else {

      }

      await refreshCounts();
      await loadDocs(1);
      fetchDoctors(true);
    };
    init();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;

    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const birthDate = new Date(dobString);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months = months + 12;
    }
    return Math.max(0, years);
  };

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

  const handleEdit = async (doc: DocMaster) => {
    setIsProcessing(true);
    try {
      const details = await DB.getDocumentDetails(doc.id);
      setFormData({
        name: doc.name,
        gender: doc.gender || 'Male',
        dob: doc.dob,
        age: doc.age || 0,
        phone: doc.phone,
        address: doc.address || '',
        doctorName: doc.doctorName || '', // [NEW]
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
    // Relaxed validations: Name, Phone, and Doctor (not RefId specifically if using Doctor Name)
    if (!formData.name || !formData.phone || !formData.doctorName || images.length === 0) {
      showToast('Please fill in Doctor, Name, Phone, and attach at least one document.', 'warning');
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
        doctorName: formData.doctorName,
        // New Fields
        branchName: formData.branchName || 'FD1',
        patientType: formData.patientType || 'General',
        appDate: formData.appDate || new Date().toISOString().split('T')[0],
        po: formData.po,
        ps: formData.ps,
        dist: formData.dist,
        emgContactPerson: formData.emgContactPerson,
        emgContactNo: formData.emgContactNo,
        refBy: formData.refBy,
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
          nextApp: img.nextApp, // [NEW] Map from image state
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
      setFormData({ name: '', gender: 'Male', dob: '', age: 0, phone: '', address: '', doctorName: '' });
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
            age: Number(doc.age),
            phoneNumber: doc.phone,
            address: doc.address,
            doctorName: doc.doctorName,
            capturedAt: doc.createdAt,
            // New Fields
            branchName: doc.branchName,
            patientType: doc.patientType,
            appDate: doc.appDate,
            po: doc.po,
            ps: doc.ps,
            dist: doc.dist,
            emgContactPerson: doc.emgContactPerson,
            emgContactNo: doc.emgContactNo,
            refBy: doc.refBy,
          },
          attachments: details.map((d) => ({
            sequence: d.sequence,
            mimeType: d.mimeType,
            data: d.imageData,
            nextApp: d.nextApp, // [NEW] Send per-attachment
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

        // Invalidate Cache after successful sync
        localStorage.removeItem('cached_doctors');


        try {
          await Promise.all([
            refreshCounts(),
            loadDocs(1)
          ]);
        } catch (e) {
          console.error("Failed to refresh counts or load docs after sync:", e);
        }

        // Force fetch on reload to ensure fresh data
        fetchDoctors(true);
        // Use setTimeout to allow the process to finish before refetching, or just let next reload handle it.


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

                <div className='sm:col-span-1'>
                  <FormField
                    label='Branch'
                    type='select'
                    value={formData.branchName || 'FD1'}
                    onChange={(e: any) => setFormData({ ...formData, branchName: e.target.value })}
                    required
                    options={[
                      { label: 'Panchlaish', value: 'FD1' },
                      { label: 'Khulshi', value: 'FD2' }
                    ]}
                  />
                </div>

                <div className='sm:col-span-1'>
                  <FormField
                    label='Patient Type'
                    type='select'
                    value={formData.patientType || 'General'}
                    onChange={(e: any) => setFormData({ ...formData, patientType: e.target.value })}
                    required
                    options={[
                      { label: 'General', value: 'General' },
                      { label: 'Orth', value: 'Orth' },
                      { label: 'Surgery', value: 'Surgery' }
                    ]}
                  />
                </div>

                <div className='sm:col-span-1'>
                  <FormField
                    label='App Date'
                    type='date'
                    value={formData.appDate || ''}
                    onChange={(e: any) => setFormData({ ...formData, appDate: e.target.value })}
                  />
                </div>

                <div className='sm:col-span-1'>
                  <FormField
                    label='Age (Years)'
                    type='number'
                    value={formData.age.toString()}
                    onChange={(e: any) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
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
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-oracle-500 focus:border-oracle-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm mb-4"
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      label='PO'
                      value={formData.po}
                      onChange={(e: any) => setFormData({ ...formData, po: e.target.value })}
                      placeholder="Post Office"
                    />
                    <FormField
                      label='PS'
                      value={formData.ps}
                      onChange={(e: any) => setFormData({ ...formData, ps: e.target.value })}
                      placeholder="Police Station"
                    />
                    <FormField
                      label='District'
                      value={formData.dist}
                      onChange={(e: any) => setFormData({ ...formData, dist: e.target.value })}
                      placeholder="District"
                    />
                  </div>
                </div>

                <div className='sm:col-span-2'>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      label='Emergency Contact Person'
                      value={formData.emgContactPerson}
                      onChange={(e: any) => setFormData({ ...formData, emgContactPerson: e.target.value })}
                      placeholder="Name"
                    />
                    <FormField
                      label='Emergency Contact No'
                      value={formData.emgContactNo}
                      onChange={(e: any) => setFormData({ ...formData, emgContactNo: e.target.value })}
                      placeholder="Phone Number"
                    />
                  </div>
                </div>

                <div className='sm:col-span-1'>
                  <FormField
                    label='Referred By'
                    value={formData.refBy}
                    onChange={(e: any) => setFormData({ ...formData, refBy: e.target.value })}
                    placeholder="Referral Name (Optional)"
                  />
                </div>


                <div className='sm:col-span-2'>
                  <FormField
                    label='Doctor REF'
                    type='select'
                    value={formData.doctorName}
                    onChange={(e: any) => setFormData({ ...formData, doctorName: e.target.value })}
                    placeholder='Select Doctor'
                    required
                    options={doctors.map(d => ({ label: d.name, value: d.name }))}
                  />
                </div>
              </div>

              {/* Image Section */}
              {/* Image Section - Only show when required fields are filled */}
              {formData.name && formData.phone && formData.doctorName && (
                <div className='mt-6'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    Document Images (First image is primary)
                  </label>

                  <div className='flex flex-wrap gap-4 mb-4'>
                    {images.map((img, index) => (
                      <div key={img.id} className="flex flex-col gap-1.5">
                        <div
                          className='relative group w-48 h-60 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 shadow-sm'
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
                          <div className='absolute bottom-0 w-full bg-black/70 flex justify-between px-2 py-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity'>
                            <button
                              onClick={() => moveImage(index, 'up')}
                              disabled={index === 0}
                              className='text-white hover:text-blue-300 disabled:opacity-30'
                            >
                              <MoveLeft size={16} />
                            </button>
                            <button
                              onClick={() => removeImage(img.id)}
                              className='text-red-400 hover:text-red-200'
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              onClick={() => moveImage(index, 'down')}
                              disabled={index === images.length - 1}
                              className='text-white hover:text-blue-300 disabled:opacity-30'
                            >
                              <MoveRight size={16} />
                            </button>
                          </div>

                          {/* Hint Overlay */}
                          <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity'>
                            <div className='bg-black/50 rounded-full p-2'>
                              <Eye size={24} className='text-white' />
                            </div>
                          </div>
                        </div>
                        {/* Per-Image Date Picker */}
                        <div className="flex flex-col">
                          <label className="text-[10px] text-gray-500 font-medium mb-0.5 ml-0.5">Next App Date:</label>
                          <input
                            type="date"
                            value={img.nextApp || ''}
                            onChange={(e) => {
                              const newImages = [...images];
                              newImages[index].nextApp = e.target.value;
                              setImages(newImages);
                            }}
                            className="w-48 text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-1 focus:ring-oracle-500"
                          />
                        </div>
                      </div>
                    ))}

                    {/* Add Buttons */}
                    <div className='flex flex-col gap-2'>
                      {/* Camera Button */}
                      <button
                        onClick={() => setShowCamera(true)}
                        className='w-32 h-20 flex flex-col items-center justify-center border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-oracle-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800'
                      >
                        <Camera className='text-oracle-600 mb-0.5' size={24} />
                        <span className='text-xs text-gray-600 dark:text-gray-300 font-medium'>
                          Camera
                        </span>
                      </button>

                      {/* File Upload Button */}
                      <label className='w-32 h-20 flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-oracle-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800'>
                        <div className='flex flex-col items-center text-center p-1'>
                          <ImageIcon className='text-gray-500 dark:text-gray-400 mb-0.5' size={24} />
                          <span className='text-xs text-gray-500 dark:text-gray-400'>File</span>
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
        ) : viewMode === 'search' ? (
          <div className='max-w-4xl mx-auto'>
            {/* Search Bar */}
            <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6'>
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ID, Name, or Phone..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-oracle-500 focus:border-oracle-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-6 py-2 bg-oracle-600 text-white rounded-md hover:bg-oracle-700 disabled:opacity-50"
                >
                  {isSearching ? 'Search...' : 'Search'}
                </button>
              </form>
            </div>

            {/* Results or Details */}
            {selectedOnlinePatient ? (
              <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6 animate-fade-in'>
                <div className="flex justify-between items-start mb-6 border-b dark:border-gray-700 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedOnlinePatient.name}</h2>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      ID: <span className="font-mono">{selectedOnlinePatient.id}</span> | Phone: {selectedOnlinePatient.phone}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Age: {selectedOnlinePatient.age} | Gender: {selectedOnlinePatient.gender} | Doctor: {selectedOnlinePatient.doctorName}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedOnlinePatient(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Images */}
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Patient Documents</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                  {onlineImages.map((img, index) => (
                    <div key={img.fileId} className="relative group aspect-[3/4] bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border dark:border-gray-700 shadow-sm">
                      <img
                        src={img.data}
                        alt="Document"
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setPreviewImage(img.data)}
                      />
                      <div className='absolute top-0 right-0 bg-black/50 text-white text-xs px-1.5 rounded-bl'>
                        {index + 1}
                      </div>

                      {/* Controls Overlay */}
                      <div className='absolute bottom-0 w-full bg-black/70 flex justify-between px-2 py-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity'>
                        <button className='text-white hover:text-blue-300 disabled:opacity-30' disabled>
                          {/* Placeholder for Move Left */}
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!window.confirm('Delete this image permanently?')) return;
                            try {
                              await fetch(`${API_BASE_URL}/api/v1/images/${img.fileId}`, { method: 'DELETE' });
                              showToast('Image deleted', 'success');
                              await loadOnlineImages(selectedOnlinePatient.id);
                            } catch (err) {

                              showToast('Failed to delete', 'error');
                            }
                          }}
                          className='text-red-400 hover:text-red-200 p-1'
                          title="Delete Image"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button className='text-white hover:text-blue-300 disabled:opacity-30' disabled>
                          {/* Placeholder for Move Right */}
                        </button>
                      </div>

                      {/* Hint Overlay */}
                      <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity'>
                        <div className='bg-black/50 rounded-full p-2'>
                          <Eye size={24} className='text-white' />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Buttons Container */}
                  <div className='flex flex-col gap-2'>
                    {/* Camera Button */}
                    <button
                      onClick={() => setShowCamera(true)}
                      className='w-full h-20 flex flex-col items-center justify-center border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-oracle-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800'
                    >
                      <Camera className='text-oracle-600 mb-1' size={24} />
                      <span className='text-xs text-gray-600 dark:text-gray-300 font-medium'>
                        Camera
                      </span>
                    </button>

                    {/* File Upload Button */}
                    <label className={`w-full h-20 flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-oracle-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                      <ImageIcon className="text-gray-400 mb-1" size={24} />
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Upload File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleOnlineImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {searchResults.map(patient => (
                  <div
                    key={patient.id}
                    onClick={() => handleSelectOnlinePatient(patient)}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md cursor-pointer border border-transparent hover:border-oracle-300 transition-all flex justify-between items-center"
                  >
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{patient.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Phone: {patient.phone} | ID: {patient.id}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                      {patient.doctorName}
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && searchQuery && !isSearching && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No patients found matching "{searchQuery}"
                  </div>
                )}
                {searchResults.length === 0 && !searchQuery && (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                    Enter a name, phone number or ID to search.
                  </div>
                )}
              </div>
            )}
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
