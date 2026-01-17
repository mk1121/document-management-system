'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Trash2, MoveLeft, MoveRight, Save, Eye, ImageIcon, Search, Upload, X, Plus, RefreshCw } from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { DocMaster, ViewMode, Doctor, OnlinePatient, OnlinePatientImage } from '@/types';
import * as DB from '@/services/db';
import { compressImage } from '@/services/imageService';
import { useToast } from '@/components/Toast';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { CameraModal } from '@/components/CameraModal';
import { Header } from '@/components/Header';
import { DocumentCard } from '@/components/DocumentCard';
import { FormField } from '@/components/FormField';
import { Login } from '@/components/Login';

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
// Use Next.js environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const getCroppedImg = async (image: HTMLImageElement, crop: PixelCrop): Promise<File | null> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(null);
      resolve(new File([blob], 'cropped.png', { type: 'image/png' }));
    }, 'image/png');
  });
};

// --- COMPONENTS ---

const CropDialog = ({ src, onCrop, onCancel, crop, setCrop, onCropComplete, loading, imgRef }: any) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[85vh]">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Crop Image</h3>
          <button onClick={onCancel} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 relative bg-gray-200 dark:bg-black overflow-auto flex items-center justify-center p-4">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => onCropComplete(c)}
            style={{ maxHeight: '100%', maxWidth: '100%' }}
          >
            <img
              ref={imgRef}
              src={src}
              alt="Crop target"
              style={{ maxHeight: '60vh', maxWidth: '100%', width: 'auto', height: 'auto', display: 'block' }}
              onLoad={(e) => {
                const { width, height } = e.currentTarget;
                const initialCrop = centerCrop(
                  makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
                  width,
                  height
                );
                setCrop(initialCrop);
                onCropComplete(initialCrop);
              }}
            />
          </ReactCrop>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t dark:border-gray-700">
          <div className="flex gap-4">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onCrop}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-oracle-600 text-white rounded-xl font-bold hover:bg-oracle-700 shadow-lg shadow-oracle-600/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <RefreshCw className="animate-spin" size={18} />}
              {loading ? 'Applying...' : 'Apply Crop'}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 text-center">Drag corners or edges to adjust the crop area.</p>
        </div>
      </div>
    </div>
  );
};

const ImageOptionsDialog = ({ src, onCrop, onSave, onCancel, loading }: any) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Image Options</h3>
          <button onClick={onCancel} disabled={loading} className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 flex flex-col items-center">
          <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 mb-6">
            <img src={src} alt="Preview" className="w-full h-full object-contain" />
          </div>

          <div className="grid grid-cols-1 gap-3 w-full">
            <button
              onClick={onCrop}
              disabled={loading}
              className="w-full py-3 px-4 bg-oracle-600 text-white rounded-xl font-bold hover:bg-oracle-700 shadow-lg shadow-oracle-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="group-hover:rotate-180 transition-transform duration-500" size={18} />
              Crop Image
            </button>
            <button
              onClick={onSave}
              disabled={loading}
              className="w-full py-3 px-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              {loading ? 'Processing...' : 'Save Original'}
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="w-full py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-gray-200 dark:bg-gray-700 animate-pulse rounded ${className}`}>
    {/* Shimmer effect for skeleton loading - Reduced opacity for better dark mode UI */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
  </div>
);

const OnlineImageCard = ({ img }: { img: OnlinePatientImage }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-transparent transition-all shadow-sm">
      {!loaded && <Skeleton className="absolute inset-0 z-10" />}
      <img
        src={img.data}
        alt={`Page ${img.sequence}`}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
      />
      <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md p-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <div className="flex justify-between items-center">
          <span className="text-white text-xs font-medium">Page {img.sequence}</span>
          {img.nextApp && (
            <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {img.nextApp}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
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
    branchName: 'FD1',
    patientType: 'General',
    appDate: new Date().toISOString().split('T')[0],
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
  const [currentStep, setCurrentStep] = useState(1);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OnlinePatient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOnlinePatient, setSelectedOnlinePatient] = useState<OnlinePatient | null>(null);
  const [onlineImages, setOnlineImages] = useState<(OnlinePatientImage & { url: string })[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [updateMode, setUpdateMode] = useState<'add' | 'update' | null>(null);

  // Crop states
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  // Load doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const cached = localStorage.getItem('cached_doctors');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDoctors(parsed);
            return;
          }
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/doctors`);
        if (response.ok) {
          const data = await response.json();
          setDoctors(data);
          localStorage.setItem('cached_doctors', JSON.stringify(data));
        }
      } catch (error) {
        console.error('Failed to load doctors:', error);
      }
    };
    fetchDoctors();
  }, []);

  // Load documents for list view
  const loadDocs = useCallback(async (pageNum: number) => {
    if (!username) return;
    try {
      const { docs, total } = await DB.getDocuments(pageNum, ITEMS_PER_PAGE, username);
      setDocList(docs);
      setTotalDocs(total);
      setPage(pageNum);
    } catch (e) {
      console.error('Failed to load docs:', e);
    }
  }, [username]);

  // Load pending/failed counts
  useEffect(() => {
    const loadCounts = async () => {
      if (!username) return;
      try {
        const pending = await DB.getPendingCount(username);
        const failed = await DB.getFailedCount(username);
        setPendingCount(pending);
        setFailedCount(failed);
      } catch (e) {
        console.error('Failed to load counts:', e);
      }
    };
    loadCounts();
  }, [username]);

  // Handle DOB change to calculate age
  const handleDobChange = (e: any) => {
    const dob = e.target.value;
    setFormData({ ...formData, dob });
    if (dob) {
      const age = new Date().getFullYear() - new Date(dob).getFullYear();
      setFormData(prev => ({ ...prev, age }));
    }
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Trigger Options Step
      const reader = new FileReader();
      reader.onload = () => {
        setPendingImageFile(file);
        setPendingImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  // Handle camera capture
  const handleCameraCapture = (file: File) => {
    // Trigger Options Step
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImageFile(file);
      setPendingImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    setShowCamera(false);
  };

  const processFinalImage = async (file: File, isCropped: boolean = false) => {
    if (viewMode === 'search' && selectedOnlinePatient) {
      if (updateMode === 'update') {
        const lastImg = onlineImages[onlineImages.length - 1];
        await uploadOnlineImage(file, lastImg.fileId, isCropped);
      } else {
        await uploadOnlineImage(file, undefined, isCropped);
      }
    } else {
      // Form View / Local Insertion
      await handleImageFile(file, isCropped);
    }
    // Cleanup
    setPendingImageFile(null);
    setPendingImageUrl(null);
    setImageToCrop(null);
  };

  const handleImageFile = async (file: File, isCropped: boolean = false) => {
    setIsProcessing(true);
    try {
      let imageUrl: string;
      
      if (isCropped) {
        // Cropped images from canvas are already optimized, skip compression
        imageUrl = URL.createObjectURL(file);
      } else {
        // Compress non-cropped images
        imageUrl = await compressImage(file);
      }
      
      setImages((prev) => [
        ...prev,
        {
          id: generateUUID(),
          url: imageUrl,
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

  const uploadOnlineImage = async (file: File, updateFileId?: number, isCropped: boolean = false) => {
    if (!selectedOnlinePatient) return;
    setUploadingImage(true);
    try {
      let base64: string = '';
      let mimeType: string = '';
      
      if (isCropped) {
        // Cropped images are already optimized from canvas (PNG format)
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
        base64 = dataUrl.split(',')[1];
        mimeType = dataUrl.split(';')[0].split(':')[1] || 'image/png';
      } else {
        // Apply High-Efficiency WebP compression for non-cropped images
        const compressedDataUrl = await compressImage(file);
        base64 = compressedDataUrl.split(',')[1];
        mimeType = compressedDataUrl.split(';')[0].split(':')[1] || 'image/webp';
      }

      if (updateFileId) {
        // Update existing image
        const res = await fetch(`${API_BASE_URL}/api/v1/images/${updateFileId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: base64,
            mimeType: mimeType,
            username: username
          })
        });
        if (!res.ok) throw new Error('Update failed');
        showToast('Image updated successfully', 'success');
      } else {
        // Add new image
        const res = await fetch(`${API_BASE_URL}/api/v1/patients/${selectedOnlinePatient.id}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: [{ data: base64, mimeType: mimeType }],
            username: username
          })
        });
        if (!res.ok) throw new Error('Upload failed');
        showToast('Image added successfully', 'success');
      }
      await loadOnlineImages(selectedOnlinePatient.id);
      setUpdateMode(null); // Reset mode after success
    } catch (err) {
      console.error(err);
      showToast(updateFileId ? 'Failed to update image' : 'Failed to upload image', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // Navigation functions
  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.name || !formData.phone) {
        showToast('Please fill required fields: Name and Phone', 'error');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.doctorName) {
        showToast('Please select a doctor', 'error');
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  // Handle save
  const handleSave = async () => {
    if (!formData.name || !formData.phone || !formData.doctorName || images.length === 0) {
      showToast('Please fill in Doctor, Name, Phone, and attach at least one document.', 'warning');
      return;
    }

    try {
      setIsProcessing(true);
      const docId = editingId || generateUUID();
      const docMaster: DocMaster = {
        id: docId,
        name: formData.name,
        gender: formData.gender,
        dob: formData.dob,
        age: formData.age,
        phone: formData.phone,
        address: formData.address,
        doctorName: formData.doctorName,
        branchName: formData.branchName,
        patientType: formData.patientType,
        appDate: formData.appDate,
        po: formData.po,
        ps: formData.ps,
        dist: formData.dist,
        emgContactPerson: formData.emgContactPerson,
        emgContactNo: formData.emgContactNo,
        refBy: formData.refBy,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending',
      };

      await DB.saveDocMaster(docMaster, username);
      const details = await Promise.all(images.map(async (img, index) => ({
        id: img.id,
        masterId: docId,
        sequence: index + 1,
        imageData: img.file ? await fileToBase64(img.file) : '',
        mimeType: 'image/jpeg',
        nextApp: img.nextApp,
      })));
      await DB.saveDocDetails(docId, details, username);

      showToast('Document saved locally!', 'success');
      
      // Reset form
      setFormData({
        name: '', gender: 'Male', dob: '', age: 0, phone: '', address: '', doctorName: '',
        branchName: 'FD1', patientType: 'General', appDate: new Date().toISOString().split('T')[0],
        po: '', ps: '', dist: '', emgContactPerson: '', emgContactNo: '', refBy: '',
      });
      setImages([]);
      setEditingId(null);
      setCurrentStep(1);
      
      // Reload counts
      const pending = await DB.getPendingCount(username);
      const failed = await DB.getFailedCount(username);
      setPendingCount(pending);
      setFailedCount(failed);
      
    } catch (error) {
      console.error('Save failed:', error);
      showToast('Failed to save document', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle sync
  const handleSync = async () => {
    setIsSyncing(true);
    const docsToSync = await DB.getUnsyncedDocs(username);
    
    let successCount = 0;
    let failCount = 0;
    const totalToSync = docsToSync.length;

    for (let i = 0; i < totalToSync; i++) {
      const doc = docsToSync[i];
      setSyncStatus(`Syncing ${i + 1}/${totalToSync}`);

      try {
        const details = await DB.getDocumentDetails(doc.id, username);

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
          username: username,
          attachments: details.map((d) => ({
            sequence: d.sequence,
            mimeType: d.mimeType,
            data: d.imageData,
            nextApp: d.nextApp,
          })),
        };

        const response = await fetch(`${API_BASE_URL}/api/v1/documents/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          await DB.markAsSynced(doc.id, username);
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error('Sync failed for doc:', doc.id, error);
        failCount++;
      }
    }

    showToast(`Sync complete: ${successCount} uploaded, ${failCount} failed`, 'info');
    setIsSyncing(false);
    setSyncStatus('');
    
    // Reload counts
    const pending = await DB.getPendingCount(username);
    const failed = await DB.getFailedCount(username);
    setPendingCount(pending);
    setFailedCount(failed);
  };

  // Utility function
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Handle edit
  const handleEdit = async (doc: DocMaster) => {
    try {
      const details = await DB.getDocumentDetails(doc.id, username);
      setFormData({
        name: doc.name,
        gender: doc.gender || 'Male',
        dob: doc.dob,
        age: doc.age || 0,
        phone: doc.phone,
        address: doc.address || '',
        doctorName: doc.doctorName || '',
        branchName: doc.branchName || 'FD1',
        patientType: doc.patientType || 'General',
        appDate: doc.appDate || new Date().toISOString().split('T')[0],
        po: doc.po || '',
        ps: doc.ps || '',
        dist: doc.dist || '',
        emgContactPerson: doc.emgContactPerson || '',
        emgContactNo: doc.emgContactNo || '',
        refBy: doc.refBy || '',
      });
      setImages(details.map(d => ({
        id: d.id,
        url: d.imageData,
        nextApp: d.nextApp,
      })));
      setEditingId(doc.id);
      setCurrentStep(3); // Allow editing all steps
      setViewMode('form');
    } catch (e) {
      console.error(e);
      showToast('Failed to load document for editing', 'error');
    }
  };

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/patients/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Load online images for selected patient
  const loadOnlineImages = async (patientId: number) => {
    setLoadingImages(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/patients/${patientId}/images?t=${Date.now()}`);
      if (!res.ok) throw new Error('Failed to load images');
      const mapped = (await res.json()).map((img: any) => ({
        ...img,
        url: `${API_BASE_URL}/api/v1/images/${img.fileId}`,
      }));
      setOnlineImages(mapped);
    } catch (error) {
      console.error('Failed to load online images:', error);
      showToast('Failed to load patient images', 'error');
    } finally {
      setLoadingImages(false);
    }
  };

  // Handle selecting online patient
  const handleSelectOnlinePatient = (patient: OnlinePatient) => {
    setSelectedOnlinePatient(patient);
    loadOnlineImages(patient.id);
  };

  // Handle online image upload (for search view)
  const handleOnlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedOnlinePatient || !e.target.files?.length) return;
    const file = e.target.files[0];

    // Trigger Options Step
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImageFile(file);
      setPendingImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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

  // Handle clear data
  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all local data? This cannot be undone.')) return;

    try {
      await DB.clearAllData(username);
      setDocList([]);
      setTotalDocs(0);
      setPendingCount(0);
      setFailedCount(0);
      showToast('All data cleared', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to clear data', 'error');
    }
  };

  // Handle retry failed syncs
  const handleRetryFailed = async () => {
    try {
      await DB.retryFailedSyncs(username);
      const pending = await DB.getPendingCount(username);
      const failed = await DB.getFailedCount(username);
      setPendingCount(pending);
      setFailedCount(failed);
      showToast('Failed syncs marked for retry', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to retry syncs', 'error');
    }
  };

  // Load docs when username changes
  useEffect(() => {
    if (username) {
      loadDocs(1);
    }
  }, [username, loadDocs]);

  if (!isLoggedIn) {
    return <Login onLogin={(user) => { setIsLoggedIn(true); setUsername(user); }} />;
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 ${darkMode ? 'dark' : ''}`}>
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
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

              {/* Step Indicator */}
              <div className='mb-6'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Step {currentStep} of 3</span>
                  <div className='flex space-x-2'>
                    {[1, 2, 3].map(step => (
                      <div
                        key={step}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          step <= currentStep
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
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
                      value={formData.age.toString()}
                      onChange={(e: any) => {}}
                      placeholder="Auto-calculated"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Additional Details */}
              {currentStep === 2 && (
                <div className='grid grid-cols-1 gap-y-2 gap-x-4 sm:grid-cols-2'>
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

                  <div className='sm:col-span-2'>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e: any) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm mb-4"
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
              )}

              {/* Step 3: Images */}
              {currentStep === 3 && (
                <div>
                  {/* Image Section */}
                  {formData.name && formData.phone && formData.doctorName && (
                    <div className='mt-6'>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                        Document Images (First image is primary)
                      </label>

                      {/* Image Grid */}
                      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4'>
                        {images.map((img, index) => (
                          <div key={img.id} className='relative group'>
                            <img
                              src={img.url}
                              alt={`Document ${index + 1}`}
                              className='w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity'
                              onClick={() => setPreviewImage(img.url)}
                            />
                            <button
                              onClick={() => setImages(prev => prev.filter(i => i.id !== img.id))}
                              className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'
                            >
                              <X size={14} />
                            </button>
                            <div className='absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded'>
                              {index + 1}
                            </div>
                          </div>
                        ))}

                        {/* Upload buttons */}
                        <label className='w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors'>
                          <Upload className='text-gray-400 mb-1' size={20} />
                          <span className='text-xs text-gray-500 dark:text-gray-400'>Upload</span>
                          <input
                            type='file'
                            accept='image/*'
                            multiple
                            className='hidden'
                            onChange={handleImageUpload}
                          />
                        </label>

                        <button
                          onClick={() => setShowCamera(true)}
                          className='w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center hover:border-blue-500 transition-colors'
                        >
                          <Camera className='text-gray-400 mb-1' size={20} />
                          <span className='text-xs text-gray-500 dark:text-gray-400'>Camera</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className='sticky bottom-0 z-10 bg-white dark:bg-gray-800 mt-8 pt-6 pb-2 border-t border-gray-200 dark:border-gray-700'>
                <div className='flex gap-4'>
                  {currentStep > 1 && (
                    <button
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className='flex-1 flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    >
                      Previous
                    </button>
                  )}
                  {currentStep < 3 ? (
                    <button
                      onClick={nextStep}
                      className='flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={handleSave}
                      disabled={isProcessing}
                      className='flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed'
                    >
                      {isProcessing ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <Save size={18} className='mr-2' /> {editingId ? 'Update Document' : 'Save to Local Storage'}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div className='space-y-6'>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
              {docList.length === 0 ? (
                <div className='col-span-full text-center py-12 text-gray-500 dark:text-gray-400'>
                  No documents found. Switch to Form view to add one.
                </div>
              ) : (
                docList.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} onEdit={handleEdit} username={username} />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalDocs > ITEMS_PER_PAGE && (
              <div className='flex justify-between items-center bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6 rounded-lg shadow'>
                <div className='text-sm text-gray-700 dark:text-gray-300'>
                  Showing <span className='font-medium'>{(page - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                  <span className='font-medium'>{Math.min(page * ITEMS_PER_PAGE, totalDocs)}</span> of{' '}
                  <span className='font-medium'>{totalDocs}</span> results
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
        ) : (
          <div className='max-w-4xl mx-auto'>
            {/* Search Bar */}
            <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6'>
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ID, Name, Phone, Address, Branch..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6'>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Search Results</h3>
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                  {searchResults.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => handleSelectOnlinePatient(patient)}
                      className='p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                    >
                      <h4 className="font-medium text-gray-900 dark:text-white">{patient.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Phone: {patient.phone} | ID: {patient.id}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Age: {patient.age} | Gender: {patient.gender}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Patient Details */}
            {selectedOnlinePatient && (
              <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6'>
                <div className="flex justify-between items-start mb-6 border-b dark:border-gray-700 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedOnlinePatient.name}</h3>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      ID: <span className="font-mono">{selectedOnlinePatient.id}</span> | Phone: {selectedOnlinePatient.phone}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Age: {selectedOnlinePatient.age} | Gender: {selectedOnlinePatient.gender} | Doctor: {selectedOnlinePatient.doctorName}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedOnlinePatient(null);
                      setOnlineImages([]);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Online Images */}
                <div className='mb-6'>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Patient Images</h4>
                  {loadingImages ? (
                    <div className='text-center py-8 text-gray-500 dark:text-gray-400'>Loading images...</div>
                  ) : onlineImages.length === 0 ? (
                    <div className='text-center py-8 text-gray-500 dark:text-gray-400'>No images found</div>
                  ) : (
                    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
                      {onlineImages.map((img) => (
                        <div key={img.fileId} className='relative group'>
                          <img
                            src={img.url}
                            alt={`Patient image ${img.fileId}`}
                            className='w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity'
                            onClick={() => setPreviewImage(img.url)}
                          />
                          <div className='absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded'>
                            {img.sequence}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upload to Online Patient */}
                <div className='border-t dark:border-gray-700 pt-6'>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Upload New Image</h4>
                  <div className='flex gap-4'>
                    <label className='flex-1 flex justify-center items-center py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors'>
                      <Upload className='text-gray-400 mr-2' size={20} />
                      <span className='text-sm text-gray-500 dark:text-gray-400'>Choose File</span>
                      <input
                        type='file'
                        accept='image/*'
                        className='hidden'
                        onChange={handleOnlineImageUpload}
                      />
                    </label>
                    <button
                      onClick={() => setShowCamera(true)}
                      className='flex-1 flex justify-center items-center py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition-colors'
                    >
                      <Camera className='text-gray-400 mr-2' size={20} />
                      <span className='text-sm text-gray-500 dark:text-gray-400'>Camera</span>
                    </button>
                  </div>
                  {uploadingImage && (
                    <div className='mt-4 text-center text-blue-600 dark:text-blue-400'>Uploading...</div>
                  )}
                </div>
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !isSearching && (
              <div className='text-center py-12 text-gray-500 dark:text-gray-400'>
                No patients found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {previewImage && (
        <ImagePreviewModal
          src={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {showCamera && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Selection Modal (Crop vs Save) */}
      {pendingImageUrl && !imageToCrop && (
        <ImageOptionsDialog
          src={pendingImageUrl}
          onCrop={() => setImageToCrop(pendingImageUrl)}
          onSave={() => pendingImageFile && processFinalImage(pendingImageFile)}
          loading={uploadingImage || isProcessing}
          onCancel={() => {
            setPendingImageFile(null);
            setPendingImageUrl(null);
          }}
        />
      )}

      {/* Crop Modal */}
      {imageToCrop && (
        <CropDialog
          src={imageToCrop}
          crop={crop}
          setCrop={setCrop}
          imgRef={imgRef}
          loading={uploadingImage || isProcessing}
          onCropComplete={(c: PixelCrop) => setCompletedCrop(c)}
          onCancel={() => {
            if (uploadingImage || isProcessing) return;
            setImageToCrop(null);
            // Don't clear pending image, so they can go back to options
          }}
          onCrop={async () => {
            if (uploadingImage || isProcessing || !completedCrop || !imgRef.current) return;
            const croppedFile = await getCroppedImg(imgRef.current, completedCrop);
            if (croppedFile) {
              await processFinalImage(croppedFile, true); // true = isCropped, skip compression
            }
          }}
        />
      )}
    </div>
  );
}
