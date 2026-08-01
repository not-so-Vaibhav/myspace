// ==============================================================================
// PHASE 8: ENTERPRISE EXPORT MENU BUTTON COMPONENT
// TCS iON / Oracle PeopleSoft Campus Solutions / SAP Campus Management Style
// ==============================================================================
// Reusable Export dropdown button supporting Excel (.xlsx), CSV (.csv), JSON,
// PDF (.pdf), and Print for any table or report across the ERP.
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
    Download,
    FileSpreadsheet,
    FileText,
    FileCode,
    Printer,
    ChevronDown
} from 'lucide-react';
import { downloadExportFile } from '../../api/bulkDataApi';

const ExportMenuButton = ({
    moduleName = 'STUDENT',
    entityType = 'students',
    filters = {},
    buttonText = 'Export Data',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const handleExport = async (format) => {
        setIsOpen(false);
        if (format === 'PRINT') {
            window.print();
            return;
        }
        setExporting(true);
        try {
            await downloadExportFile(moduleName, entityType, filters, format);
        } catch (err) {
            console.error('Export download error:', err);
            alert(`Could not download export file: ${err.message}`);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={exporting}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition shadow-sm ${className}`}
            >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>{exporting ? 'Exporting...' : buttonText}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 py-1.5 focus:outline-none">
                    <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                        Choose Export Format
                    </div>
                    <button
                        onClick={() => handleExport('EXCEL')}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2.5 transition"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>Excel Spreadsheet (.xlsx)</span>
                    </button>
                    <button
                        onClick={() => handleExport('CSV')}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2.5 transition"
                    >
                        <FileText className="w-4 h-4 text-indigo-400" />
                        <span>CSV Data File (.csv)</span>
                    </button>
                    <button
                        onClick={() => handleExport('JSON')}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2.5 transition"
                    >
                        <FileCode className="w-4 h-4 text-amber-400" />
                        <span>JSON Data Format (.json)</span>
                    </button>
                    <button
                        onClick={() => handleExport('PDF')}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2.5 transition"
                    >
                        <FileText className="w-4 h-4 text-red-400" />
                        <span>PDF Report (.pdf)</span>
                    </button>
                    <div className="border-t border-slate-800 my-1" />
                    <button
                        onClick={() => handleExport('PRINT')}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2.5 transition"
                    >
                        <Printer className="w-4 h-4 text-slate-400" />
                        <span>Print Document</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExportMenuButton;
