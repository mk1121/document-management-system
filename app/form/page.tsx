'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Trash2, MoveLeft, MoveRight, Save, Eye, ImageIcon, RefreshCw, X } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { DocMaster, DocDetail, Doctor } from '@/types';
import * as DB from '@/services/db';
import { compressImage } from '@/services/imageService';
import { useToast } from '@/components/Toast';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { CameraModal } from '@/components/CameraModal';
import { FormField } from '@/components/FormField';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

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
          >
            <img
              ref={imgRef}
              src={src}
              alt="Crop target"
              style={{ maxHeight: '60vh', maxWidth: '100%' }}
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
      if (blob) {
        resolve(new File([blob], 'cropped.png', { type: 'image/png' }));
      } else {
        resolve(null);
      }
    }, 'image/png');
  });
};

export default function FormPage() {
  const [_darkMode, _setDarkMode] = useState(false);
  const [_username, _setUsername] = useState('user');

  const { showToast } = useToast();

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
  const [currentStep, setCurrentStep] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New workflow states
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [isCropLoading, setIsCropLoading] = useState(false);

  // Load doctors
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/doctors`);
        if (response.ok) {
          const data = await response.json();
          setDoctors(data);
        }
      } catch (error) {
        console.error('Failed to load doctors:', error);
      }
    };
    loadDoctors();
  }, []);

  // Load document for editing
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    if (editId) {
      loadDocumentForEdit(editId);
    }
  }, []);

  const loadDocumentForEdit = async (id: string) => {
    try {
      const doc = await DB.getDocMaster(id, _username);
      if (doc) {
        setEditingId(id);
        setFormData({
          name: doc.name,
          gender: doc.gender,
          dob: doc.dob,
          age: doc.age,
          phone: doc.phone,
          address: doc.address,
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
        // Load images
        const details = await DB.getDocDetails(id, _username);
        const loadedImages = details.map(detail => ({
          id: detail.id,
          url: detail.imageData,
          nextApp: detail.nextApp,
        }));
        setImages(loadedImages);
        setCurrentStep(3); // Allow editing all steps
      }
    } catch (error) {
      console.error('Failed to load document:', error);
      showToast('Failed to load document', 'error');
    }
  };

  const handleDobChange = (e: any) => {
    const dob = e.target.value;
    setFormData({ ...formData, dob });
    if (dob) {
      const age = new Date().getFullYear() - new Date(dob).getFullYear();
      setFormData(prev => ({ ...prev, age }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => processImageFile(file));
    }
  };

  const processImageFile = async (file: File) => {
    // This function is for direct upload (not via camera workflow)
    setPendingImageFile(file);
    const url = URL.createObjectURL(file);
    setPendingImageUrl(url);
  };

  const handleCameraCapture = (file: File) => {
    setPendingImageFile(file);
    const url = URL.createObjectURL(file);
    setPendingImageUrl(url);
  };

  const processFinalImage = async (file: File, isCropped: boolean = false) => {
    try {
      setIsProcessing(true);
      
      let url: string;
      
      if (isCropped) {
        // Skip compression for cropped images (already optimized from canvas)
        // Convert File to data URL for storage
        const reader = new FileReader();
        url = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      } else {
        // Compress regular images - returns data URL
        url = await compressImage(file);
      }
      
      setImages(prev => [...prev, { id: generateUUID(), url, file }]);
    } catch (error) {
      console.error('Image processing failed:', error);
      showToast('Image processing failed', 'error');
    } finally {
      setIsProcessing(false);
      setPendingImageFile(null);
      setPendingImageUrl(null);
    }
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

  const handleSave = async () => {
    if (!formData.name || !formData.phone || !formData.doctorName) {
      showToast('Please fill required fields', 'error');
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

      await DB.saveDocMaster(docMaster, _username);

      // Save images
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.file) {
          const detail: DocDetail = {
            id: img.id,
            masterId: docId,
            imageData: await fileToBase64(img.file),
            mimeType: 'image/jpeg',
            nextApp: img.nextApp,
            sequence: i + 1,
          };
          await DB.saveDocDetail(detail, _username);
        }
      }

      showToast(editingId ? 'Document updated' : 'Document saved', 'success');
      // Reset form
      setFormData({
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
      setImages([]);
      setEditingId(null);
    } catch (error) {
      console.error('Save failed:', error);
      showToast('Save failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  return (
    <div className={`min-h-screen ${_darkMode ? 'dark' : ''} bg-gray-50 dark:bg-gray-900`}>
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
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
                          ? 'bg-oracle-600 text-white'
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
                  value={formData.age.toString()}
                  onChange={() => {}}
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
            </div>
            )}

            {/* Step 2: Additional Details */}
            {currentStep === 2 && (
              <div className='grid grid-cols-1 gap-y-2 gap-x-4 sm:grid-cols-2'>
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
            </div>
            )}

            <div className='sticky bottom-0 z-10 bg-white dark:bg-gray-800 mt-8 pt-6 pb-2 border-t border-gray-200 dark:border-gray-700'>
              <div className='flex gap-4'>
                {currentStep > 1 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className='flex-1 flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-oracle-500'
                  >
                    Previous
                  </button>
                )}
                {currentStep < 3 ? (
                  <button
                    onClick={nextStep}
                    className='flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-oracle-600 hover:bg-oracle-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-oracle-500'
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={isProcessing}
                    className='flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-oracle-600 hover:bg-oracle-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-oracle-500 disabled:opacity-70 disabled:cursor-not-allowed'
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
      </main>

      {/* Full Screen Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />
      )}

      {/* Camera Modal */}
      {showCamera && (
        <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
      )}

      {/* Image Options Dialog */}
      {pendingImageUrl && !imageToCrop && (
        <ImageOptionsDialog
          src={pendingImageUrl}
          onCrop={() => setImageToCrop(pendingImageUrl)}
          onSave={async () => {
            if (pendingImageFile) {
              await processFinalImage(pendingImageFile, false);
            }
          }}
          onCancel={() => {
            setPendingImageFile(null);
            setPendingImageUrl(null);
          }}
          loading={isProcessing}
        />
      )}

      {/* Crop Dialog */}
      {imageToCrop && (
        <CropDialog
          src={imageToCrop}
          crop={crop}
          setCrop={setCrop}
          onCropComplete={setCompletedCrop}
          imgRef={imgRef}
          loading={isCropLoading}
          onCrop={async () => {
            if (completedCrop && imgRef.current) {
              setIsCropLoading(true);
              const croppedFile = await getCroppedImg(imgRef.current, completedCrop);
              setIsCropLoading(false);
              if (croppedFile) {
                setImageToCrop(null);
                await processFinalImage(croppedFile, true);
              }
            }
          }}
          onCancel={() => {
            setImageToCrop(null);
          }}
        />
      )}
    </div>
  );
}