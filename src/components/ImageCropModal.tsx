import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Crop,
  Disc,
  Image as ImageIcon,
  Move,
  RefreshCw,
  RotateCw,
  Sparkles,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  initialImageUrl?: string;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  onCropComplete,
  initialImageUrl,
}) => {
  const [imageSrc, setImageSrc] = useState<string>(initialImageUrl || '');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropShape, setCropShape] = useState<'circle' | 'rounded'>('rounded');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sample band logo presets
  const LOGO_PRESETS = [
    {
      name: 'Electric Bolt',
      url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
    },
    {
      name: 'Vintage Vinyl',
      url: 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?w=300&auto=format&fit=crop&q=80',
    },
    {
      name: 'Retro Cassette',
      url: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=300&auto=format&fit=crop&q=80',
    },
    {
      name: 'Stage Spotlight',
      url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
    },
  ];

  // Load image whenever imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imageObjRef.current = img;
      setOffset({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      drawCanvas();
    };
  }, [imageSrc]);

  // Redraw canvas on transform changes
  useEffect(() => {
    drawCanvas();
  }, [zoom, rotation, offset, cropShape]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Save context for transform
    ctx.save();

    // Center translation
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Compute drawing dimensions preserving aspect ratio
    const scale = Math.max(width / img.width, height / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObjRef.current) return;

    // Create export canvas at 256x256
    const outputCanvas = document.createElement('canvas');
    const size = 256;
    outputCanvas.width = size;
    outputCanvas.height = size;
    const outCtx = outputCanvas.getContext('2d');
    if (!outCtx) return;

    // Clip shape if circle
    if (cropShape === 'circle') {
      outCtx.beginPath();
      outCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      outCtx.closePath();
      outCtx.clip();
    } else {
      // Rounded rect
      const radius = 32;
      outCtx.beginPath();
      outCtx.moveTo(radius, 0);
      outCtx.lineTo(size - radius, 0);
      outCtx.quadraticCurveTo(size, 0, size, radius);
      outCtx.lineTo(size, size - radius);
      outCtx.quadraticCurveTo(size, size, size - radius, size);
      outCtx.lineTo(radius, size);
      outCtx.quadraticCurveTo(0, size, 0, size - radius);
      outCtx.lineTo(0, radius);
      outCtx.quadraticCurveTo(0, 0, radius, 0);
      outCtx.closePath();
      outCtx.clip();
    }

    // Draw visible region
    outCtx.drawImage(canvas, 0, 0, size, size);

    const croppedUrl = outputCanvas.toDataURL('image/png');
    onCropComplete(croppedUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Band Header Logo &amp; Crop Tool
              </h2>
              <p className="text-xs text-zinc-400">
                Upload, pan, zoom, and crop your band's custom logo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Upload Button & Presets */}
          <div className="space-y-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition shadow-md"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Logo Image</span>
              </button>

              <span className="text-zinc-500">or choose sample:</span>

              {LOGO_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setImageSrc(preset.url)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition text-[11px]"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Crop Canvas Viewport */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div
              className="relative w-64 h-64 bg-zinc-950 rounded-2xl border-2 border-zinc-700/80 overflow-hidden cursor-grab active:cursor-grabbing shadow-inner flex items-center justify-center select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {imageSrc ? (
                <>
                  <canvas
                    ref={canvasRef}
                    width={256}
                    height={256}
                    className="w-full h-full object-cover"
                  />

                  {/* Mask Overlay */}
                  <div className="absolute inset-0 pointer-events-none border border-amber-500/40">
                    <div
                      className={`w-full h-full shadow-[0_0_0_9999px_rgba(9,9,11,0.55)] ${
                        cropShape === 'circle' ? 'rounded-full' : 'rounded-3xl'
                      } border-2 border-dashed border-amber-400`}
                    />
                  </div>

                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-zinc-900/80 text-[10px] text-zinc-300 font-mono flex items-center gap-1 pointer-events-none">
                    <Move className="w-3 h-3 text-amber-400" />
                    <span>Drag to pan</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 text-zinc-500 space-y-2">
                  <ImageIcon className="w-10 h-10 mx-auto opacity-40 text-amber-400" />
                  <p className="font-semibold text-zinc-300">No Image Selected</p>
                  <p className="text-[11px]">Upload an image file or pick a preset above to begin cropping.</p>
                </div>
              )}
            </div>

            {/* Transform Controls (Zoom, Rotate, Shape) */}
            {imageSrc && (
              <div className="w-full space-y-3 pt-2">
                {/* Zoom Slider */}
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-zinc-500" />
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    value={zoom}
                    onChange={e => setZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <ZoomIn className="w-4 h-4 text-zinc-500" />
                  <span className="font-mono text-zinc-400 w-10 text-right">{zoom.toFixed(1)}x</span>
                </div>

                {/* Rotate & Shape buttons */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1.5 transition"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Rotate 90°</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOffset({ x: 0, y: 0 });
                        setZoom(1);
                        setRotation(0);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                      title="Reset position"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500">Shape:</span>
                    <button
                      type="button"
                      onClick={() => setCropShape('rounded')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                        cropShape === 'rounded'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Squircle
                    </button>
                    <button
                      type="button"
                      onClick={() => setCropShape('circle')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                        cropShape === 'circle'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Circle
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/70 flex items-center justify-end gap-3 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white transition font-medium"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!imageSrc}
            onClick={handleApplyCrop}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Apply Crop &amp; Save Logo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
