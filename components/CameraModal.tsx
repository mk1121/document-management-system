import React, { useEffect, useRef, useState } from 'react';
import { X, RefreshCcw, Zap, ZapOff } from 'lucide-react';

interface CameraModalProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Flash/Torch State
  const [supportsFlash, setSupportsFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
      try {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!mounted) {
          newStream.getTracks().forEach((track) => track.stop());
          return;
        }

        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }

        const track = newStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;

        if (capabilities.torch) {
          setSupportsFlash(true);
        } else {
          setSupportsFlash(false);
        }
        setFlashOn(false);
        setError('');
      } catch (err: any) {
        console.error('Camera Error:', err);
        if (mounted) {
          setError('Could not access camera. Please ensure permissions are granted.');
        }
      }
    };

    initCamera();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const toggleFlash = async () => {
    if (stream && supportsFlash) {
      const track = stream.getVideoTracks()[0];
      const newFlashState = !flashOn;
      try {
        await track.applyConstraints({
          advanced: [{ torch: newFlashState } as any],
        });
        setFlashOn(newFlashState);
      } catch (e) {
        console.error('Error toggling flash', e);
      }
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas dimensions to match video resolution
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Flip horizontally if using front camera for natural feel
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
              onCapture(file);
            }
          },
          'image/jpeg',
          0.9,
        );
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className='fixed inset-0 z-[100] bg-black'>
      {/* Video Feed Layer */}
      <div className='absolute inset-0 flex items-center justify-center overflow-hidden bg-black'>
        {error ? (
          <div className='px-6 text-center text-white z-20'>
            <div className='bg-red-900/50 p-4 rounded-lg border border-red-500/50 backdrop-blur-sm'>
              <p className='mb-2 font-bold'>Camera Error</p>
              <p className='text-sm opacity-90'>{error}</p>
            </div>
            <button
              onClick={onClose}
              className='mt-4 px-4 py-2 bg-white text-black rounded font-medium'
            >
              Close
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
        )}
      </div>

      {/* Header Controls Overlay */}
      <div className='absolute top-0 w-full p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent'>
        {/* Flash Toggle */}
        <div className='w-12 h-12 flex items-center justify-center'>
          {supportsFlash && (
            <button
              onClick={toggleFlash}
              className={`p-2 rounded-full backdrop-blur-md transition-all ${
                flashOn
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-black/30 text-white hover:bg-black/50'
              }`}
              title='Toggle Flash'
            >
              {flashOn ? <Zap size={24} fill='currentColor' /> : <ZapOff size={24} />}
            </button>
          )}
        </div>

        <span className='text-white font-medium drop-shadow-md tracking-wide'>Photo</span>

        {/* Close Button */}
        <button
          onClick={onClose}
          className='w-12 h-12 flex items-center justify-center bg-black/30 rounded-full text-white hover:bg-black/50 transition-colors backdrop-blur-md'
        >
          <X size={24} />
        </button>
      </div>

      {/* Footer Controls Overlay */}
      <div className='absolute bottom-0 w-full pb-10 pt-20 flex items-center justify-center z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent'>
        {/* Shutter Button (Center) */}
        <button
          onClick={handleCapture}
          disabled={!!error}
          className='group relative flex items-center justify-center focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'
          aria-label='Capture Photo'
        >
          <div className='w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all group-active:scale-95 shadow-lg bg-white/10 backdrop-blur-sm'>
            <div className='w-16 h-16 bg-white rounded-full transition-all group-active:scale-90 shadow-inner'></div>
          </div>
        </button>

        {/* Switch Cam (Right) */}
        <button
          onClick={toggleCamera}
          className='absolute right-8 sm:right-16 text-white bg-black/30 p-4 rounded-full hover:bg-black/50 transition-all backdrop-blur-md'
          title='Switch Camera'
        >
          <RefreshCcw size={24} />
        </button>
      </div>

      {/* Hidden Canvas for processing */}
      <canvas ref={canvasRef} className='hidden' />
    </div>
  );
};
