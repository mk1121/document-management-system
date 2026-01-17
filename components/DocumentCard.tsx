import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle, AlertCircle, RefreshCw, Edit } from 'lucide-react';
import { DocMaster } from '../types';
import * as DB from '../services/db';

interface DocumentCardProps {
  doc: DocMaster;
  onEdit: (doc: DocMaster) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ doc, onEdit }) => {

  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    // Load first image as thumbnail
    DB.getDocumentDetails(doc.id).then((details) => {
      if (details.length > 0) {
        setThumbnail(details[0].imageData);
      }
    });
  }, [doc.id]);

  return (
    <div className='bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200 border border-gray-100 dark:border-gray-700 relative'>
      <div className='h-40 w-full bg-gray-200 dark:bg-gray-700 relative'>
        {thumbnail ? (
          <img src={thumbnail} alt={doc.name} className='w-full h-full object-cover' />
        ) : (
          <div className='flex items-center justify-center h-full text-gray-400'>
            <Camera size={32} />
          </div>
        )}

        {/* Edit Button for Unsynced Items */}
        {doc.syncStatus !== 'synced' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(doc);
            }}
            className='absolute top-2 left-2 p-1.5 bg-white bg-opacity-90 rounded-full text-gray-700 shadow-sm hover:text-oracle-600 hover:bg-white transition-colors'
            title="Edit Document"
          >
            <Edit size={16} />
          </button>
        )}

        <div className='absolute top-2 right-2'>
          {doc.syncStatus === 'synced' ? (
            <span className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800'>
              <CheckCircle size={12} className='mr-1' /> Synced
            </span>
          ) : doc.syncStatus === 'failed' ? (
            <span className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800'>
              <AlertCircle size={12} className='mr-1' /> Failed
            </span>
          ) : (
            <span className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800'>
              <RefreshCw size={12} className='mr-1' /> Pending
            </span>
          )}
        </div>
      </div>
      <div className='px-4 py-4 sm:px-6'>
        <h3 className='text-lg leading-6 font-medium text-gray-900 dark:text-white truncate'>
          {doc.name}
        </h3>
        <p className='mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400'>
          Phone: {doc.phone}
        </p>
        <p className='mt-1 max-w-2xl text-xs text-gray-400 dark:text-gray-500'>
          DOB: {doc.dob || 'N/A'}
        </p>
        <p className='mt-2 text-xs text-gray-400'>
          Created: {new Date(doc.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
};
