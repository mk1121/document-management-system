'use client';

import React, { useState } from 'react';
import { X, Plus, RefreshCw, Camera, ImageIcon } from 'lucide-react';
import { OnlinePatient, OnlinePatientImage } from '@/types';
import { useToast } from '@/components/Toast';
import { Header } from '@/components/Header';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { CameraModal } from '@/components/CameraModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

interface OnlineImageCardProps {
  img: OnlinePatientImage;
}

const OnlineImageCard: React.FC<OnlineImageCardProps> = ({ img }) => (
  <div className='aspect-[3/4] relative bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm'>
    <img src={img.data} alt={`Image ${img.sequence}`} className='w-full h-full object-cover' />
    <div className='absolute top-0 right-0 bg-black/50 text-white text-xs px-1.5 rounded-bl'>
      {img.sequence}
    </div>
  </div>
);

export default function SearchPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OnlinePatient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOnlinePatient, setSelectedOnlinePatient] = useState<OnlinePatient | null>(null);
  const [onlineImages, setOnlineImages] = useState<OnlinePatientImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [updateMode, setUpdateMode] = useState<'add' | 'update' | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);

  const { showToast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/patients/search?q=${encodeURIComponent(searchQuery)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        showToast('Search failed', 'error');
      }
    } catch (error) {
      console.error('Search error:', error);
      showToast('Search failed', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectOnlinePatient = async (patient: OnlinePatient) => {
    setSelectedOnlinePatient(patient);
    setLoadingImages(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/patients/${patient.id}/images`);
      if (response.ok) {
        const data = await response.json();
        setOnlineImages(data);
      } else {
        showToast('Failed to load images', 'error');
      }
    } catch (error) {
      console.error('Load images error:', error);
      showToast('Failed to load images', 'error');
    } finally {
      setLoadingImages(false);
    }
  };

  const handleOnlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedOnlinePatient) return;

    const file = files[0];
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('patientId', selectedOnlinePatient.id.toString());
      formData.append('username', 'user'); // Assume user

      const response = await fetch(`${API_BASE_URL}/api/v1/images/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        showToast('Image uploaded successfully', 'success');
        // Reload images
        handleSelectOnlinePatient(selectedOnlinePatient);
      } else {
        showToast('Upload failed', 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Upload failed', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCameraCapture = (file: File) => {
    setPendingImageFile(file);
    const url = URL.createObjectURL(file);
    setPendingImageUrl(url);
  };

  const processFinalImage = async (file: File) => {
    if (!selectedOnlinePatient) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('patientId', selectedOnlinePatient.id.toString());
      formData.append('username', 'user');

      const response = await fetch(`${API_BASE_URL}/api/v1/images/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        showToast('Image uploaded successfully', 'success');
        handleSelectOnlinePatient(selectedOnlinePatient);
      } else {
        showToast('Upload failed', 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Upload failed', 'error');
    } finally {
      setUploadingImage(false);
      setPendingImageFile(null);
      setPendingImageUrl(null);
      setUpdateMode(null);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''} bg-gray-50 dark:bg-gray-900`}>
      <Header viewMode='search' darkMode={darkMode} setDarkMode={setDarkMode} />

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='max-w-4xl mx-auto'>
          {/* Search Bar */}
          <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6'>
            <form onSubmit={handleSearch} className='flex gap-4'>
              <div className='flex-1'>
                <input
                  type='text'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Search by ID, Name, Phone, Address, Branch...'
                  className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-oracle-500 focus:border-oracle-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                />
              </div>
              <button
                type='submit'
                disabled={isSearching}
                className='px-6 py-2 bg-oracle-600 text-white rounded-md hover:bg-oracle-700 disabled:opacity-50'
              >
                {isSearching ? 'Search...' : 'Search'}
              </button>
            </form>
          </div>

          {selectedOnlinePatient ? (
            <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6 animate-fade-in'>
              <div className='flex justify-between items-start mb-6 border-b dark:border-gray-700 pb-4'>
                <div>
                  <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                    {selectedOnlinePatient.name}
                  </h2>
                  <div className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                    ID: <span className='font-mono'>{selectedOnlinePatient.id}</span> | Phone:{' '}
                    {selectedOnlinePatient.phone}
                  </div>
                  <div className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                    Age: {selectedOnlinePatient.age} | Gender: {selectedOnlinePatient.gender} |
                    Doctor: {selectedOnlinePatient.doctorName}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOnlinePatient(null)}
                  className='p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                >
                  <X size={24} />
                </button>
              </div>

              {/* Images */}
              <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-4'>
                Patient Documents
              </h3>
              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8'>
                {loadingImages ? (
                  Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className='aspect-[3/4] relative'>
                        <Skeleton className='absolute inset-0 rounded-xl' />
                      </div>
                    ))
                ) : onlineImages.length > 0 ? (
                  onlineImages.map((img) => (
                    <div key={img.fileId} className='flex flex-col gap-1.5'>
                      <div className='cursor-pointer' onClick={() => setPreviewImage(img.data)}>
                        <OnlineImageCard img={img} />
                      </div>
                      {/* Per-Image Date Picker */}
                      <div className='flex flex-col mt-0.5'>
                        <label className='text-[10px] text-gray-500 dark:text-gray-400 font-medium mb-0.5 ml-0.5'>
                          Next App Date:
                        </label>
                        <input
                          type='date'
                          defaultValue={img.nextApp || ''}
                          onBlur={async (e) => {
                            const newDate = (e.target as HTMLInputElement).value;
                            if (newDate === img.nextApp) return;
                            try {
                              showToast('Updating date...', 'success');
                              const res = await fetch(
                                `${API_BASE_URL}/api/v1/images/${img.fileId}`,
                                {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    nextApp: newDate || null,
                                    username: 'user',
                                  }),
                                },
                              );
                              if (!res.ok) throw new Error('Update failed');
                              showToast('Date updated', 'success');
                            } catch (err) {
                              console.error(err);
                              showToast('Failed to update date', 'error');
                            }
                          }}
                          className='w-full text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-1 focus:ring-oracle-500'
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='col-span-full py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed dark:border-gray-700'>
                    <ImageIcon
                      className='mx-auto text-gray-300 dark:text-gray-600 mb-2'
                      size={48}
                    />
                    <p className='text-gray-500 dark:text-gray-400'>
                      No documents found for this patient.
                    </p>
                  </div>
                )}
              </div>

              {/* Add/Update Selection */}
              {!updateMode ? (
                <div className='flex gap-4 mb-4'>
                  <button
                    onClick={() => setUpdateMode('add')}
                    className='flex-1 py-4 flex flex-col items-center justify-center border-2 border-oracle-100 dark:border-oracle-900 rounded-xl hover:border-oracle-500 hover:bg-oracle-50 dark:hover:bg-oracle-900/30 transition-all bg-white dark:bg-gray-800 shadow-sm'
                  >
                    <Plus className='text-oracle-600 mb-1' size={32} />
                    <span className='font-bold text-gray-800 dark:text-gray-100'>
                      Add New Image
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (onlineImages.length === 0) {
                        showToast('No images to update', 'warning');
                        return;
                      }
                      setUpdateMode('update');
                    }}
                    className='flex-1 py-4 flex flex-col items-center justify-center border-2 border-orange-100 dark:border-orange-900 rounded-xl hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-all bg-white dark:bg-gray-800 shadow-sm'
                  >
                    <RefreshCw className='text-orange-600 mb-1' size={32} />
                    <span className='font-bold text-gray-800 dark:text-gray-100'>
                      Update Last Image
                    </span>
                  </button>
                </div>
              ) : (
                <div className='flex flex-col gap-4 mb-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700'>
                  <div className='flex justify-between items-center'>
                    <h4 className='font-bold text-gray-700 dark:text-gray-300'>
                      {updateMode === 'add' ? 'Adding New Image' : 'Updating Last Image'}
                    </h4>
                    <button
                      onClick={() => setUpdateMode(null)}
                      className='p-1 text-gray-400 hover:text-red-500 transition-colors'
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <button
                      onClick={() => setShowCamera(true)}
                      className='h-24 flex flex-col items-center justify-center border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-oracle-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 shadow-sm'
                    >
                      <Camera className='text-oracle-600 mb-1' size={28} />
                      <span className='text-sm text-gray-600 dark:text-gray-300 font-medium'>
                        Camera
                      </span>
                    </button>

                    <label
                      className={`h-24 flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-oracle-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 shadow-sm ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <ImageIcon className='text-gray-400 mb-1' size={28} />
                      <span className='text-sm text-gray-500 dark:text-gray-400 font-medium'>
                        Upload File
                      </span>
                      <input
                        type='file'
                        accept='image/*'
                        className='hidden'
                        onChange={handleOnlineImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          ) : isSearching ? (
            <div className='flex flex-col gap-4'>
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className='bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-100 dark:border-gray-700 flex justify-between items-center'
                  >
                    <div className='flex-1 space-y-2'>
                      <Skeleton className='h-5 w-1/3' />
                      <Skeleton className='h-4 w-1/2' />
                    </div>
                    <Skeleton className='h-4 w-20' />
                  </div>
                ))}
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-4'>
              {searchResults.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => handleSelectOnlinePatient(patient)}
                  className='bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md cursor-pointer border border-transparent hover:border-oracle-300 transition-all flex justify-between items-center'
                >
                  <div>
                    <h3 className='text-lg font-medium text-gray-900 dark:text-white'>
                      {patient.name}
                    </h3>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                      Phone: {patient.phone} | ID: {patient.id}
                    </p>
                  </div>
                  <div className='text-right text-sm text-gray-500 dark:text-gray-400'>
                    {patient.doctorName}
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && !isSearching && (
                <div className='text-center py-12 text-gray-500 dark:text-gray-400'>
                  No patients found matching "{searchQuery}"
                </div>
              )}
              {searchResults.length === 0 && !searchQuery && (
                <div className='text-center py-12 text-gray-400 dark:text-gray-500'>
                  Enter a name, phone number or ID to search.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />
      )}

      {/* Camera Modal */}
      {showCamera && (
        <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
      )}

      {/* Selection Modal (Crop vs Save) */}
      {pendingImageUrl && !updateMode && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4'>
            <h3 className='text-lg font-medium mb-4'>Process Image</h3>
            <div className='flex gap-4'>
              <button
                onClick={() => setUpdateMode('update')}
                className='flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
              >
                Update
              </button>
              <button
                onClick={() => pendingImageFile && processFinalImage(pendingImageFile)}
                className='flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700'
              >
                Add
              </button>
            </div>
            <button
              onClick={() => {
                setPendingImageFile(null);
                setPendingImageUrl(null);
              }}
              className='mt-4 w-full py-2 bg-gray-600 text-white rounded hover:bg-gray-700'
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
