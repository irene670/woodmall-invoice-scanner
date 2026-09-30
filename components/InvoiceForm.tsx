import React, { useState } from 'react';
import { InvoiceData, InvoiceType } from '../types';
import { Copy, Check, RotateCcw, PlusCircle } from 'lucide-react';

interface InvoiceFormProps {
  data: InvoiceData;
  onDataChange: (data: InvoiceData) => void;
  onRetake: () => void;
  onAddToList: () => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ data, onDataChange, onRetake, onAddToList }) => {
  const [rowCopied, setRowCopied] = useState(false);

  const handleChange = (field: keyof InvoiceData, value: string) => {
    onDataChange({ ...data, [field]: value });
  };

  const copyRowForExcel = async () => {
    let rowString = "";
    if (data.type === InvoiceType.TRIPLET) {
        // Excel: Date, Inv#, Amount, Tax, Total, Remarks
        rowString = `${data.date}\t${data.invoiceNumber}\t${data.amount}\t${data.tax}\t${data.total}\t${data.remarks}`;
    } else if (data.type === InvoiceType.DUPLICATE) {
        // Excel: Date, Inv#, Amount, Remarks
        rowString = `${data.date}\t${data.invoiceNumber}\t${data.amount}\t${data.remarks}`;
    } else if (data.type === InvoiceType.RECEIPT) {
        // Excel: Date, Item(Remarks), Amount
        rowString = `${data.date}\t${data.remarks}\t${data.amount}`;
    }

    try {
      await navigator.clipboard.writeText(rowString);
      setRowCopied(true);
      setTimeout(() => setRowCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy row", err);
    }
  };

  const getTypeLabel = () => {
    switch (data.type) {
        case InvoiceType.TRIPLET: return '三聯式 / 電子發票';
        case InvoiceType.DUPLICATE: return '二聯式發票';
        case InvoiceType.RECEIPT: return '收據 / 郵資券';
        default: return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-gray-300">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-wrap justify-between items-center gap-4">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          <span className="w-2 h-6 bg-green-600 rounded-sm"></span>
          辨識結果: {getTypeLabel()}
        </h3>
        <div className="flex gap-3">
          <button 
            onClick={onRetake}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-200 rounded transition text-sm font-medium"
          >
            <RotateCcw size={16} />
            重拍
          </button>
          <button 
            onClick={copyRowForExcel}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium shadow-sm transition-all border ${
              rowCopied 
                ? 'bg-green-100 text-green-700 border-green-200' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {rowCopied ? <Check size={16} /> : <Copy size={16} />}
            {rowCopied ? '已複製' : '僅複製此列'}
          </button>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600 font-bold border-b border-gray-300">
                <th className="w-32 px-2 py-3 border-r border-gray-300 text-center">日期</th>
                
                {data.type !== InvoiceType.RECEIPT && (
                    <th className="w-36 px-2 py-3 border-r border-gray-300 text-center">發票號碼</th>
                )}

                {data.type === InvoiceType.RECEIPT && (
                     <th className="px-4 py-3 text-left border-r border-gray-300">項目 (備註)</th>
                )}

                {/* Amount Columns */}
                {data.type === InvoiceType.TRIPLET && (
                    <>
                        <th className="w-28 px-2 py-3 border-r border-gray-300 text-center bg-yellow-50/50">金額</th>
                        <th className="w-24 px-2 py-3 border-r border-gray-300 text-center bg-yellow-50/50">稅額</th>
                        <th className="w-28 px-2 py-3 border-r border-gray-300 text-center bg-yellow-50/50">總計</th>
                    </>
                )}
                {(data.type === InvoiceType.DUPLICATE || data.type === InvoiceType.RECEIPT) && (
                     <th className="w-28 px-2 py-3 border-r border-gray-300 text-center bg-yellow-50/50">金額</th>
                )}

                {data.type !== InvoiceType.RECEIPT && (
                    <th className="px-4 py-3 text-left">備註 (公司名稱)</th>
                )}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white hover:bg-blue-50/30 transition-colors">
                {/* Date */}
                <td className="border-r border-gray-200 p-0">
                  <input
                    type="text"
                    value={data.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className="w-full h-12 px-2 text-center text-gray-800 focus:bg-blue-50 outline-none font-medium"
                    placeholder="114.xx.xx"
                  />
                </td>
                
                {/* Receipt Item Name */}
                {data.type === InvoiceType.RECEIPT && (
                     <td className="border-r border-gray-200 p-0">
                     <input
                       type="text"
                       value={data.remarks}
                       onChange={(e) => handleChange('remarks', e.target.value)}
                       className="w-full h-12 px-4 text-left text-gray-800 focus:bg-blue-50 outline-none"
                     />
                   </td>
                )}

                {/* Invoice Number */}
                {data.type !== InvoiceType.RECEIPT && (
                    <td className="border-r border-gray-200 p-0">
                    <input
                        type="text"
                        value={data.invoiceNumber}
                        onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                        className="w-full h-12 px-2 text-center text-gray-800 focus:bg-blue-50 outline-none uppercase tracking-wide font-medium"
                    />
                    </td>
                )}

                {/* Triplet Amounts */}
                {data.type === InvoiceType.TRIPLET && (
                    <>
                        <td className="border-r border-gray-200 p-0 relative">
                            <div className="flex items-center h-12 px-2 focus-within:bg-blue-50">
                                <span className="text-gray-400 mr-1">$</span>
                                <input type="text" value={data.amount} onChange={(e) => handleChange('amount', e.target.value)} className="w-full text-right text-gray-800 bg-transparent outline-none font-mono" />
                            </div>
                        </td>
                        <td className="border-r border-gray-200 p-0">
                            <div className="flex items-center h-12 px-2 focus-within:bg-blue-50">
                                <span className="text-gray-400 mr-1">$</span>
                                <input type="text" value={data.tax} onChange={(e) => handleChange('tax', e.target.value)} className="w-full text-right text-gray-800 bg-transparent outline-none font-mono" />
                            </div>
                        </td>
                        <td className="border-r border-gray-200 p-0 bg-yellow-50/30">
                            <div className="flex items-center h-12 px-2 focus-within:bg-blue-50">
                                <span className="text-gray-400 mr-1">$</span>
                                <input type="text" value={data.total} onChange={(e) => handleChange('total', e.target.value)} className="w-full text-right text-gray-900 font-bold bg-transparent outline-none font-mono" />
                            </div>
                        </td>
                    </>
                )}

                {/* Duplicate / Receipt Amount */}
                {(data.type === InvoiceType.DUPLICATE || data.type === InvoiceType.RECEIPT) && (
                    <td className="border-r border-gray-200 p-0 bg-yellow-50/30">
                        <div className="flex items-center h-12 px-2 focus-within:bg-blue-50">
                            <span className="text-gray-400 mr-1">$</span>
                            <input type="text" value={data.amount} onChange={(e) => handleChange('amount', e.target.value)} className="w-full text-right text-gray-900 font-bold bg-transparent outline-none font-mono" />
                        </div>
                    </td>
                )}

                {/* Remarks (Company Name) */}
                {data.type !== InvoiceType.RECEIPT && (
                    <td className="p-0">
                    <input
                        type="text"
                        value={data.remarks}
                        onChange={(e) => handleChange('remarks', e.target.value)}
                        className="w-full h-12 px-4 text-left text-gray-800 focus:bg-blue-50 outline-none"
                    />
                    </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Primary Action */}
      <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end">
         <button 
            onClick={onAddToList}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 hover:shadow-lg transition-all active:scale-95"
         >
            <PlusCircle size={20} />
            加入暫存清單 (繼續下一張)
         </button>
      </div>
    </div>
  );
};

export default InvoiceForm;