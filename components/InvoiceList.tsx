import React, { useState, useEffect, useRef } from 'react';
import { InvoiceData, InvoiceType } from '../types';
import { Trash2, Check, FileSpreadsheet, AlertCircle, RotateCw, RotateCcw, Eye, EyeOff, ZoomIn, X, Plus, Minus, Move } from 'lucide-react';

interface InvoiceListProps {
  invoices: InvoiceData[];
  onUpdate: (index: number, newData: InvoiceData) => void;
  onDelete: (index: number) => void;
  onClear: () => void;
}

// Sub-component for the Full Screen Viewer
const FullScreenViewer: React.FC<{
  src: string;
  initialRotation: number;
  onClose: () => void;
}> = ({ src, initialRotation, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(initialRotation);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset if src changes (though this component is mounted/unmounted usually)
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(initialRotation);
  }, [src, initialRotation]);

  const handleZoom = (delta: number) => {
    setZoom(prev => {
      const newZoom = Math.max(1, Math.min(prev + delta, 5)); // Min 1x, Max 5x
      if (newZoom === 1) setPan({ x: 0, y: 0 }); // Reset pan on reset zoom
      return newZoom;
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault(); // Stop page scroll
    // Simple wheel zoom logic
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    handleZoom(delta);
  };

  // Drag Handlers (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      e.preventDefault();
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  // Touch handlers for basic pan (pinch-zoom is complex, we'll stick to buttons + drag pan for simplicity)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom > 1 && e.touches.length === 1) {
        setIsDragging(true);
        const touch = e.touches[0];
        setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (isDragging && zoom > 1 && e.touches.length === 1) {
          // Prevent default to stop scrolling background
          // e.preventDefault(); // React synthetic events might not support this directly here without passive:false
          const touch = e.touches[0];
          setPan({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
      }
  };

  const handleTouchEnd = () => setIsDragging(false);

  return (
    <div 
        className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center animate-fade-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
    >
        {/* Toolbar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 pointer-events-none">
            <div className="flex gap-2 pointer-events-auto">
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-1 flex items-center text-white/90">
                    <button onClick={() => handleZoom(-0.5)} className="p-2 hover:bg-white/20 rounded disabled:opacity-50" disabled={zoom <= 1}><Minus size={20}/></button>
                    <span className="w-12 text-center font-mono text-sm">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => handleZoom(0.5)} className="p-2 hover:bg-white/20 rounded disabled:opacity-50" disabled={zoom >= 5}><Plus size={20}/></button>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-1 flex items-center text-white/90">
                     <button onClick={() => setRotation(r => r - 90)} className="p-2 hover:bg-white/20 rounded"><RotateCcw size={20}/></button>
                     <button onClick={() => setRotation(r => r + 90)} className="p-2 hover:bg-white/20 rounded"><RotateCw size={20}/></button>
                </div>
            </div>

            <button 
                className="text-white/70 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors pointer-events-auto"
                onClick={onClose}
            >
                <X size={32} />
            </button>
        </div>

        {/* Info Hint */}
        {zoom > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 text-white/80 px-4 py-2 rounded-full text-sm pointer-events-none flex items-center gap-2 z-50 backdrop-blur-sm">
                <Move size={14} /> 拖曳可移動視角
            </div>
        )}

        {/* Image Container */}
        <div 
            ref={containerRef}
            className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ 
                cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                touchAction: zoom > 1 ? 'none' : 'auto' // Important for touch drag
            }}
            onClick={() => { if(zoom === 1) handleZoom(0.5); }} // Click to zoom in if 1x
        >
            <img 
                src={`data:image/jpeg;base64,${src}`}
                className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-100 ease-out origin-center select-none"
                style={{ 
                    transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                }}
                alt="Full Screen Preview"
                draggable={false}
            />
        </div>
    </div>
  );
};


const InvoiceList: React.FC<InvoiceListProps> = ({ invoices, onUpdate, onDelete, onClear }) => {
  const [copied, setCopied] = useState(false);
  const [showAllImages, setShowAllImages] = useState(true);
  // Store rotation state for each invoice index
  const [rotations, setRotations] = useState<Record<number, number>>({});
  
  // State for Full Screen Preview
  const [previewImage, setPreviewImage] = useState<{ src: string; rotation: number } | null>(null);

  const listType = invoices.length > 0 ? invoices[0].type : InvoiceType.TRIPLET;

  const handleRotate = (index: number, degree: number) => {
    setRotations(prev => ({
      ...prev,
      [index]: (prev[index] || 0) + degree
    }));
  };

  const handleFieldChange = (index: number, field: keyof InvoiceData, value: string) => {
    const newData = { ...invoices[index], [field]: value };
    onUpdate(index, newData);
  };

  const copyAll = async () => {
    if (invoices.length === 0) return;
    
    const text = invoices.map(i => {
        if (i.type === InvoiceType.TRIPLET) {
             return `${i.date}\t${i.invoiceNumber}\t${i.amount}\t${i.tax}\t${i.total}\t${i.remarks}`;
        } else if (i.type === InvoiceType.DUPLICATE) {
             return `${i.date}\t${i.invoiceNumber}\t${i.amount}\t${i.remarks}`;
        } else {
             // RECEIPT
             return `${i.date}\t${i.remarks}\t${i.amount}`;
        }
    }).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  if (invoices.length === 0) return null;

  return (
    <div className="mt-8 animate-fade-in-up mb-24">
      {/* List Header / Actions */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 sticky top-16 z-20">
        <div className="flex items-center gap-3">
            <div className="bg-gray-800 text-white px-3 py-1 rounded text-sm font-bold">
               暫存清單 ({invoices.length})
            </div>
            <span className="text-sm text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">
                {listType === InvoiceType.TRIPLET && '三聯式模式'}
                {listType === InvoiceType.DUPLICATE && '二聯式模式'}
                {listType === InvoiceType.RECEIPT && '收據模式'}
            </span>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
             {/* Toggle Images Button */}
             <button 
                onClick={() => setShowAllImages(!showAllImages)}
                className="text-gray-600 hover:text-blue-600 bg-white border border-gray-300 hover:border-blue-400 px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
             >
                {showAllImages ? <EyeOff size={16} /> : <Eye size={16} />}
                <span className="hidden sm:inline">{showAllImages ? '隱藏圖片' : '顯示圖片'}</span>
             </button>

             {/* Clear All Button - Updated to be more prominent */}
             <button 
                onClick={onClear}
                className="text-white bg-red-500 hover:bg-red-600 border border-red-600 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
             >
                <Trash2 size={16} /> 清空全部
             </button>
             
             <button 
                onClick={copyAll}
                className={`flex items-center justify-center gap-2 px-6 py-2 rounded font-bold transition-all shadow-sm ${
                    copied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
             >
                {copied ? <Check size={18} /> : <FileSpreadsheet size={18} />}
                {copied ? '已複製全部' : '複製全部'}
             </button>
        </div>
      </div>

      <div className="space-y-6">
        {invoices.map((inv, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* 1. Header Bar */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex justify-between items-center h-12">
                <span className="font-mono text-gray-400 font-bold text-lg">#{idx + 1}</span>
                <button 
                    onClick={() => onDelete(idx)}
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                    title="刪除此筆"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {/* 2. Data Row (Grid) */}
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 items-end bg-white relative z-10">
                
                {/* Date */}
                <div className="col-span-1 group">
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">日期</label>
                    <input 
                        type="text"
                        value={inv.date}
                        onChange={(e) => handleFieldChange(idx, 'date', e.target.value)}
                        className={`w-full text-lg font-medium font-mono border-b-2 bg-transparent outline-none transition-colors pb-1 ${!inv.date ? 'border-red-300 bg-red-50/50' : 'border-gray-200 hover:border-blue-400 focus:border-blue-600 focus:bg-blue-50'}`}
                        placeholder="無"
                    />
                </div>

                {/* Invoice Number */}
                {listType !== InvoiceType.RECEIPT && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-1 group">
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">發票號碼</label>
                         <input 
                            type="text"
                            value={inv.invoiceNumber}
                            onChange={(e) => handleFieldChange(idx, 'invoiceNumber', e.target.value.toUpperCase())}
                            className={`w-full text-xl font-bold font-mono tracking-wide border-b-2 bg-transparent outline-none transition-colors pb-1 ${
                                !inv.invoiceNumber 
                                ? 'border-red-300 text-red-500 bg-red-50' 
                                : 'text-blue-700 border-gray-200 hover:border-blue-400 focus:border-blue-600 focus:bg-blue-50'
                            }`}
                            placeholder="格式錯誤"
                        />
                    </div>
                )}

                {/* Amounts - Responsive handling */}
                {listType === InvoiceType.TRIPLET && (
                    <>
                         <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">銷售額</label>
                            <input 
                                type="text"
                                value={inv.amount}
                                onChange={(e) => handleFieldChange(idx, 'amount', e.target.value)}
                                className="w-full text-lg font-mono text-gray-600 border-b-2 border-gray-200 hover:border-blue-400 focus:border-blue-600 focus:bg-blue-50 bg-transparent outline-none pb-1 transition-colors"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">稅額</label>
                            <input 
                                type="text"
                                value={inv.tax}
                                onChange={(e) => handleFieldChange(idx, 'tax', e.target.value)}
                                className="w-full text-lg font-mono text-gray-600 border-b-2 border-gray-200 hover:border-blue-400 focus:border-blue-600 focus:bg-blue-50 bg-transparent outline-none pb-1 transition-colors"
                            />
                        </div>
                        <div className="col-span-1 bg-yellow-50/50 -mx-2 px-2 rounded">
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase pt-1">總計</label>
                             <input 
                                type="text"
                                value={inv.total}
                                onChange={(e) => handleFieldChange(idx, 'total', e.target.value)}
                                className="w-full text-xl font-bold font-mono text-gray-900 border-b-2 border-transparent hover:border-blue-400 focus:border-blue-600 focus:bg-white bg-transparent outline-none pb-1 transition-colors"
                            />
                        </div>
                    </>
                )}

                {(listType === InvoiceType.DUPLICATE || listType === InvoiceType.RECEIPT) && (
                     <div className="col-span-1 bg-yellow-50/50 -mx-2 px-2 rounded">
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase pt-1">總金額</label>
                         <input 
                            type="text"
                            value={inv.amount}
                            onChange={(e) => handleFieldChange(idx, 'amount', e.target.value)}
                            className="w-full text-xl font-bold font-mono text-gray-900 border-b-2 border-transparent hover:border-blue-400 focus:border-blue-600 focus:bg-white bg-transparent outline-none pb-1 transition-colors"
                        />
                    </div>
                )}

                {/* Remarks */}
                <div className={`${listType === InvoiceType.RECEIPT ? 'col-span-1' : 'col-span-2 md:col-span-4 lg:col-span-1'}`}>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
                        {listType === InvoiceType.RECEIPT ? '項目' : '備註 (公司)'}
                    </label>
                    <input 
                        type="text"
                        value={inv.remarks}
                        onChange={(e) => handleFieldChange(idx, 'remarks', e.target.value)}
                        className="w-full text-base text-gray-700 border-b-2 border-gray-200 hover:border-blue-400 focus:border-blue-600 focus:bg-blue-50 bg-transparent outline-none pb-1 transition-colors"
                        placeholder="-"
                    />
                </div>
            </div>

            {/* 3. Original Image (Collapsible / Checkable) */}
            {showAllImages && (
                <div className="bg-gray-100 border-t border-gray-200 p-4 relative group animate-fade-in">
                     {/* Image Toolbar */}
                     <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-80 hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => handleRotate(idx, -90)}
                            className="bg-white/90 hover:bg-white text-gray-700 p-2 rounded shadow-sm border border-gray-300"
                            title="向左旋轉"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button 
                            onClick={() => handleRotate(idx, 90)}
                            className="bg-white/90 hover:bg-white text-gray-700 p-2 rounded shadow-sm border border-gray-300"
                            title="向右旋轉"
                        >
                            <RotateCw size={18} />
                        </button>
                     </div>
                     
                     {/* Image Display - Click to Zoom */}
                     <div 
                        className="flex justify-center overflow-hidden min-h-[150px] bg-gray-200/50 rounded-lg border border-dashed border-gray-300 relative cursor-zoom-in group/image"
                        onClick={() => setPreviewImage({ src: inv.originalImage!, rotation: rotations[idx] || 0 })}
                     >
                        {inv.originalImage ? (
                            <>
                                {/* Hover Hint */}
                                <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors z-10 flex items-center justify-center opacity-0 group-hover/image:opacity-100 pointer-events-none">
                                    <div className="bg-black/60 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm backdrop-blur-sm">
                                        <ZoomIn size={16} /> 點擊放大
                                    </div>
                                </div>
                                
                                <img 
                                    src={`data:image/jpeg;base64,${inv.originalImage}`} 
                                    className="max-w-full object-contain transition-transform duration-300 ease-out"
                                    style={{ 
                                        transform: `rotate(${rotations[idx] || 0}deg)`,
                                        maxHeight: '400px' 
                                    }}
                                    alt="原始憑證"
                                />
                            </>
                        ) : (
                            <div className="flex items-center text-gray-400 gap-2 p-10 cursor-default">
                                <AlertCircle size={20} />
                                無影像資料
                            </div>
                        )}
                     </div>
                </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Footer Info */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>所有欄位皆可點擊直接修改。確認無誤後，點擊上方「複製全部」即可貼上至 Excel。</p>
      </div>

      {/* Full Screen Image Modal */}
      {previewImage && (
        <FullScreenViewer 
            src={previewImage.src} 
            initialRotation={previewImage.rotation} 
            onClose={() => setPreviewImage(null)} 
        />
      )}
    </div>
  );
};

export default InvoiceList;