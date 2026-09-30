import React, { useState } from 'react';
import { Camera, Upload, Loader2, ScanLine, Layers, FileText, Receipt, ImagePlus, X, RotateCw } from 'lucide-react';
import CameraCapture from './components/Camera';
import InvoiceForm from './components/InvoiceForm';
import InvoiceList from './components/InvoiceList';
import { parseInvoiceImage } from './services/geminiService';
import { AppState, InvoiceData, InvoiceType } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(InvoiceType.TRIPLET);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<InvoiceData[]>([]);
  
  // Image rotation state for the result preview
  const [resultRotation, setResultRotation] = useState(0);

  // Batch State
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, success: 0, fail: 0 });

  const processSingleImage = async (base64: string): Promise<InvoiceData | null> => {
    try {
      const data = await parseInvoiceImage(base64, invoiceType);
      // Attach original image for verification
      data.originalImage = base64;
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleCapture = async (base64: string) => {
    setCapturedImage(base64);
    setResultRotation(0); // Reset rotation for new image
    setAppState(AppState.PROCESSING);
    setErrorMsg(null);

    const data = await processSingleImage(base64);
    if (data) {
      setInvoiceData(data);
      setAppState(AppState.RESULT);
    } else {
      setErrorMsg("辨識失敗，請確認圖片清晰並重試。");
      setAppState(AppState.IDLE);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      // Single file flow
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        handleCapture(base64);
      };
      reader.readAsDataURL(file);
    } else {
      // Batch file flow
      const fileList: File[] = Array.from(files);
      
      if (fileList.length > 30) {
         if (!window.confirm(`您選擇了 ${fileList.length} 張圖片。大量處理可能會導致瀏覽器變慢。確定要繼續嗎？`)) {
             return;
         }
      }

      setAppState(AppState.BATCH_PROCESSING);
      setBatchProgress({ current: 0, total: fileList.length, success: 0, fail: 0 });

      let successCount = 0;
      let failCount = 0;

      // Process sequentially
      for (let i = 0; i < fileList.length; i++) {
        setBatchProgress(prev => ({ ...prev, current: i + 1 }));
        
        try {
          // Increase delay to 2 seconds to drastically reduce hallucination risk on subsequent calls
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          const base64 = await new Promise<string>((resolve, reject) => {
             const reader = new FileReader();
             reader.onload = () => {
                 const res = reader.result as string;
                 resolve(res.split(',')[1]);
             };
             reader.onerror = reject;
             reader.readAsDataURL(fileList[i]);
          });

          const data = await parseInvoiceImage(base64, invoiceType);
          if (data) {
             data.originalImage = base64;
             setHistory(prev => [...prev, data]);
             successCount++;
          } else {
             failCount++;
          }
        } catch (error) {
           console.error(`Error processing file ${i}:`, error);
           failCount++;
        }
      }
      
      setBatchProgress(prev => ({ ...prev, success: successCount, fail: failCount }));
      // Finished
      setAppState(AppState.IDLE);
      if (failCount > 0) {
          setErrorMsg(`批次處理完成：${successCount} 成功，${failCount} 失敗（因模糊、格式不符或無法辨識）。`);
      }
    }
    
    // Reset input
    e.target.value = ''; 
  };

  const handleAddToList = () => {
    if (invoiceData) {
        setHistory(prev => [...prev, invoiceData]);
        reset(false); 
    }
  };

  const handleUpdateList = (index: number, updatedData: InvoiceData) => {
    setHistory(prev => {
        const newList = [...prev];
        newList[index] = updatedData;
        return newList;
    });
  };

  const handleDeleteFromList = (index: number) => {
    setHistory(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearList = () => {
    if (window.confirm('確定要清空暫存清單嗎？')) {
        setHistory([]);
    }
  };

  const handleTypeChange = (type: InvoiceType) => {
      if (history.length > 0 && history[0].type !== type) {
          if (!window.confirm("切換類型可能會影響 Excel 複製格式的一致性。確定要切換嗎？建議先清除清單。")) {
              return;
          }
      }
      setInvoiceType(type);
  };

  const reset = (clearHistory = false) => {
    setAppState(AppState.IDLE);
    setInvoiceData(null);
    setCapturedImage(null);
    setErrorMsg(null);
    setResultRotation(0);
    if (clearHistory) setHistory([]);
  };

  return (
    <div className="min-h-screen pb-12 bg-gray-100 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-green-600 text-white p-2 rounded-lg shadow-sm">
              <ScanLine size={20} />
            </div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">木百貨發票小幫手 <span className="text-gray-400 font-normal ml-2 text-sm hidden sm:inline">Excel 批次模式</span></h1>
          </div>
          <div className="text-xs text-gray-500 hidden sm:block">
            Gemini AI Powered
          </div>
        </div>
      </header>

      <main className={`mx-auto px-4 mt-8 transition-all duration-300 ${appState === AppState.RESULT ? 'max-w-6xl' : 'max-w-4xl'}`}>
        
        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm animate-fade-in flex justify-between items-center">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
              </div>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700"><X size={18}/></button>
          </div>
        )}

        {/* State: IDLE - Type Selection & Scan Options */}
        {appState === AppState.IDLE && (
          <div className="mt-6 animate-fade-in">
             <div className="mb-8 text-center">
                <h2 className="text-gray-700 font-bold mb-4 text-lg">步驟 1：請選擇發票類型</h2>
                <div className="inline-flex bg-white p-1 rounded-xl shadow border border-gray-200">
                    <button 
                        onClick={() => handleTypeChange(InvoiceType.TRIPLET)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${invoiceType === InvoiceType.TRIPLET ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Layers size={18} /> 三聯式/電子
                    </button>
                    <button 
                         onClick={() => handleTypeChange(InvoiceType.DUPLICATE)}
                         className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${invoiceType === InvoiceType.DUPLICATE ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <FileText size={18} /> 二聯式
                    </button>
                    <button 
                         onClick={() => handleTypeChange(InvoiceType.RECEIPT)}
                         className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${invoiceType === InvoiceType.RECEIPT ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Receipt size={18} /> 收據/郵資券
                    </button>
                </div>
             </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                onClick={() => setAppState(AppState.CAMERA)}
                className="group relative flex flex-col items-center justify-center p-12 bg-white border-2 border-dashed border-gray-300 rounded-2xl hover:border-green-500 hover:bg-green-50 transition-all duration-300 shadow-sm hover:shadow-lg"
                >
                <div className="bg-green-100 text-green-600 p-5 rounded-full mb-5 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                    <Camera size={48} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">開啟相機拍攝</h3>
                <p className="text-gray-500 mt-2 text-center">
                    單張拍攝
                </p>
                </button>

                <label className="cursor-pointer group relative flex flex-col items-center justify-center p-12 bg-white border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 shadow-sm hover:shadow-lg">
                <input 
                    type="file" 
                    accept="image/*" 
                    multiple // Enable multiple files
                    className="hidden" 
                    onChange={handleFileUpload}
                />
                <div className="bg-blue-100 text-blue-600 p-5 rounded-full mb-5 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                    <div className="relative">
                        <Upload size={48} />
                        <div className="absolute -right-2 -bottom-2 bg-white rounded-full p-1 text-blue-600">
                             <ImagePlus size={20} />
                        </div>
                    </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800">上傳圖片 (支援批次)</h3>
                <p className="text-gray-500 mt-2 text-center">可一次選取多張發票照片 (建議 20 張以內)</p>
                </label>
            </div>
          </div>
        )}

        {/* State: SINGLE PROCESSING */}
        {appState === AppState.PROCESSING && (
          <div className="flex flex-col items-center justify-center mt-20">
            <div className="relative">
              {capturedImage && (
                <img 
                  src={`data:image/jpeg;base64,${capturedImage}`} 
                  alt="Processing" 
                  className="w-40 h-40 object-cover rounded-xl opacity-50 blur-sm mb-6 border-4 border-white shadow-lg"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                 <Loader2 className="animate-spin text-green-600 drop-shadow-md" size={64} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mt-6">AI 正在辨識中...</h2>
            <p className="text-gray-500 mt-2">
               正在分析圖片內容
            </p>
          </div>
        )}

        {/* State: BATCH PROCESSING */}
        {appState === AppState.BATCH_PROCESSING && (
           <div className="flex flex-col items-center justify-center mt-20 max-w-lg mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
              <Loader2 className="animate-spin text-blue-600 mb-6" size={64} />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">批次辨識進行中...</h2>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                  <div 
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300" 
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  ></div>
              </div>
              <p className="text-gray-600 font-medium text-lg mb-1">
                 正在處理第 <span className="text-blue-600 font-bold">{batchProgress.current}</span> 張，共 {batchProgress.total} 張
              </p>
              <p className="text-gray-400 text-sm">請勿關閉視窗，完成後將自動加入下方清單。</p>
           </div>
        )}

        {/* State: RESULT (Single Scan only) */}
        {appState === AppState.RESULT && invoiceData && (
          <div className="animate-fade-in-up space-y-6">
             {/* Result Form (Table) */}
            <InvoiceForm 
              data={invoiceData}
              onDataChange={setInvoiceData}
              onRetake={() => reset(false)}
              onAddToList={handleAddToList}
            />

            <div className="flex justify-center">
                <details className="group w-full max-w-lg border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden" open>
                    <summary className="cursor-pointer bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 flex items-center justify-between">
                        <span>查看原始影像 (點擊以摺疊)</span>
                        <span className="group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="p-4 bg-gray-100 flex flex-col items-center">
                        <div className="flex justify-end w-full mb-2">
                            <button 
                                onClick={(e) => { e.preventDefault(); setResultRotation(prev => prev + 90); }}
                                className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 bg-white px-3 py-1 rounded shadow-sm border border-gray-300"
                            >
                                <RotateCw size={14} /> 旋轉
                            </button>
                        </div>
                        {capturedImage && (
                        <img 
                            src={`data:image/jpeg;base64,${capturedImage}`} 
                            className="max-h-[400px] object-contain rounded shadow-sm transition-transform duration-300 ease-in-out"
                            style={{ transform: `rotate(${resultRotation}deg)` }}
                            alt="Captured Receipt"
                        />
                        )}
                    </div>
                </details>
            </div>
          </div>
        )}

        {/* History List Section */}
        <InvoiceList 
            invoices={history} 
            onUpdate={handleUpdateList}
            onDelete={handleDeleteFromList}
            onClear={handleClearList}
        />

        {/* Camera Overlay */}
        {appState === AppState.CAMERA && (
          <CameraCapture 
            onCapture={handleCapture}
            onClose={() => reset(false)}
          />
        )}
      </main>
    </div>
  );
};

export default App;