import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, Circle, SwitchCamera } from 'lucide-react';

interface CameraProps {
  onCapture: (base64Image: string) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer back camera on mobile
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("無法存取相機，請確認權限設定。");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Get base64 string (remove prefix for API if needed, but Gemini handles data URL usually or we strip it)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];
        onCapture(base64);
        stopCamera();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black/50 backdrop-blur-sm absolute top-0 w-full z-10">
        <h2 className="text-white font-medium text-lg">拍攝發票</h2>
        <button onClick={onClose} className="text-white p-2 rounded-full hover:bg-white/20 transition">
          <X size={24} />
        </button>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
        {error ? (
          <div className="text-white text-center p-6">
            <p className="mb-4 text-red-400">{error}</p>
            <button 
              onClick={startCamera}
              className="px-4 py-2 bg-blue-600 rounded text-white"
            >
              重試
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            onLoadedMetadata={() => videoRef.current?.play()}
          />
        )}
        
        {/* Guiding Frame */}
        {!error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[85%] aspect-[1/1.4] border-2 border-white/50 rounded-lg relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-yellow-400 -mt-0.5 -ml-0.5"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-yellow-400 -mt-0.5 -mr-0.5"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-yellow-400 -mb-0.5 -ml-0.5"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-yellow-400 -mb-0.5 -mr-0.5"></div>
                </div>
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black/80 p-8 flex justify-center items-center gap-12 pb-12">
        <button 
          onClick={startCamera} // Acts as a reset/focus try if needed
          className="text-white/50 hover:text-white transition"
        >
          <SwitchCamera size={24} />
        </button>
        
        <button 
          onClick={captureImage}
          disabled={!!error || !isStreaming}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/40 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <div className="w-16 h-16 bg-white rounded-full"></div>
        </button>

        <div className="w-6 h-6"></div> {/* Spacer for balance */}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
