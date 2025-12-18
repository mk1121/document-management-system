import React, { useState, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImagePreviewModalProps {
  src: string;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ src, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleZoom = (delta: number) => {
    setScale((prev) => {
      const newScale = Math.min(Math.max(0.5, prev + delta), 5); // Limits: 0.5x to 5x
      // If we zoom back out to 100% or less, reset position to center
      if (newScale <= 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  };

  const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Only allow panning if zoomed in
    if (scale <= 1) return;

    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    dragStart.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };
  };

  const onMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;

    e.preventDefault(); // Prevent scrolling on touch devices

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    setPosition({
      x: clientX - dragStart.current.x,
      y: clientY - dragStart.current.y,
    });
  };

  const onMouseUp = () => setIsDragging(false);

  // Handle Mouse Wheel Zoom
  const onWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    // Zoom in/out based on scroll direction
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    handleZoom(delta);
  };

  return (
    <div className='fixed inset-0 z-[100] bg-black/95 flex flex-col overflow-hidden animate-in fade-in duration-200'>
      {/* Toolbar */}
      <div className='absolute top-0 left-0 w-full p-4 flex justify-between items-center z-50 pointer-events-none'>
        {/* Controls */}
        <div className='pointer-events-auto flex gap-2 bg-gray-800/80 rounded-lg p-2 backdrop-blur-sm border border-gray-700 shadow-lg'>
          <button
            onClick={() => handleZoom(0.5)}
            className='text-white hover:text-oracle-500 hover:bg-gray-700 p-2 rounded transition-colors'
            title='Zoom In'
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={() => handleZoom(-0.5)}
            className='text-white hover:text-oracle-500 hover:bg-gray-700 p-2 rounded transition-colors'
            title='Zoom Out'
          >
            <ZoomOut size={20} />
          </button>
          <button
            onClick={() => {
              setScale(1);
              setPosition({ x: 0, y: 0 });
            }}
            className='text-white hover:text-blue-400 hover:bg-gray-700 p-2 rounded transition-colors'
            title='Reset View'
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className='pointer-events-auto text-gray-300 hover:text-white hover:bg-red-600/80 bg-gray-800/80 rounded-full p-2 backdrop-blur-sm transition-all border border-gray-700'
        >
          <X size={28} />
        </button>
      </div>

      {/* Canvas Area */}
      <div
        className={`flex-1 w-full h-full flex items-center justify-center touch-none ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onMouseDown}
        onTouchMove={onMouseMove}
        onTouchEnd={onMouseUp}
        onWheel={onWheel}
      >
        <img
          src={src}
          alt='Preview'
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className='max-w-[90vw] max-h-[90vh] object-contain select-none shadow-2xl'
        />
      </div>

      {/* Helper Hint */}
      <div className='absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white/50 text-xs pointer-events-none bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm'>
        Scroll to zoom • Drag to pan
      </div>
    </div>
  );
};
