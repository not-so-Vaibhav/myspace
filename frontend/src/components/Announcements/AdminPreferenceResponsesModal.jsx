import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { 
    Users, 
    BookOpen, 
    X, 
    Search, 
    Calendar, 
    Clock, 
    Download, 
    Upload,
    ExternalLink, 
    Loader2, 
    CheckCircle2, 
    BarChart3,
    Building,
    ChevronRight,
    FileSpreadsheet,
    AlertCircle,
    Info
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { 
    fetchAllResponsesForAnnouncement, 
    fetchAvailableSubjects,
    saveFacultyPreferences 
} from '../../services/subjectPreferenceService';

const AdminPreferenceResponsesModal = ({ isOpen, onClose, announcement }) => {
    const [responses, setResponses] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSubject, setFilterSubject] = useState('ALL');
    
    // Import state
    const [importing, setImporting] = useState(false);
    const [importSuccessMsg, setImportSuccessMsg] = useState('');
    const [importErrorMsg, setImportErrorMsg] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen && announcement?.id) {
            loadData();
        }
    }, [isOpen, announcement?.id]);

    const loadData = async () => {
        setLoading(true);
        setImportSuccessMsg('');
        setImportErrorMsg('');
        try {
            const [respData, subsData] = await Promise.all([
                fetchAllResponsesForAnnouncement(announcement.id),
                fetchAvailableSubjects()
            ]);
            setResponses(respData || []);
            setAvailableSubjects(subsData || []);
        } catch (err) {
            console.error('Error loading responses:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !announcement) return null;

    // Group responses by faculty_id
    const facultyMap = {};
    responses.forEach(r => {
        const fId = r.faculty_id || r.faculty?.id;
        if (!facultyMap[fId]) {
            facultyMap[fId] = {
                faculty: r.faculty || { id: fId, full_name: 'Faculty Member', department: 'Academic', email: '' },
                submittedAt: r.created_at,
                preferences: []
            };
        }
        facultyMap[fId].preferences.push(r);
    });

    const facultyList = Object.values(facultyMap);

    // Subject breakdown count
    const subjectCounts = {};
    const subjectFacultyMap = {};
    responses.forEach(r => {
        const sub = r.subject || {};
        const code = sub.code || 'UNKNOWN';
        const name = sub.name || 'Subject';
        const key = `${code}: ${name}`;
        subjectCounts[key] = (subjectCounts[key] || 0) + 1;

        if (!subjectFacultyMap[key]) subjectFacultyMap[key] = [];
        const fName = r.faculty?.full_name || 'Faculty';
        subjectFacultyMap[key].push(`${fName} (Choice #${r.preference_rank || 1}, ${r.preferred_type || 'Theory'})`);
    });

    // Filter faculty list by search
    const filteredFaculty = facultyList.filter(item => {
        const name = item.faculty.full_name?.toLowerCase() || '';
        const dept = item.faculty.department?.toLowerCase() || '';
        const email = item.faculty.email?.toLowerCase() || '';
        const q = searchQuery.toLowerCase().trim();

        const matchesQuery = !q || name.includes(q) || dept.includes(q) || email.includes(q) ||
            item.preferences.some(p => {
                const sub = p.subject || {};
                return (sub.name?.toLowerCase() || '').includes(q) || (sub.code?.toLowerCase() || '').includes(q);
            });

        const matchesSubject = filterSubject === 'ALL' || item.preferences.some(p => {
            const sub = p.subject || {};
            return `${sub.code}: ${sub.name}` === filterSubject;
        });

        return matchesQuery && matchesSubject;
    });

    // ── 1. EXPORT DATA TO EXCEL WORKBOOK (.xlsx) ───────────────────────────────
    const handleExportToExcel = () => {
        try {
            // Sheet 1: Detailed Faculty Preferences
            const rows = [];
            facultyList.forEach(item => {
                item.preferences.forEach((p, idx) => {
                    const sub = p.subject || {};
                    rows.push({
                        'Faculty Name': item.faculty.full_name || 'Faculty Member',
                        'Faculty Email': item.faculty.email || '',
                        'Department': item.faculty.department || 'Computer Science & Engineering',
                        'Preference Choice': `Choice #${p.preference_rank || (idx + 1)}`,
                        'Choice Rank': p.preference_rank || (idx + 1),
                        'Subject Code': sub.code || 'UNKNOWN',
                        'Subject Name': sub.name || 'Subject',
                        'Credits': sub.credits || 3,
                        'Teaching Mode': p.preferred_type || 'Theory',
                        'Hours Per Week': p.preferred_hours_per_week || 4,
                        'Notes / Slot Timing': p.remarks || '',
                        'Submitted Date': p.created_at ? format(new Date(p.created_at), 'yyyy-MM-dd HH:mm') : '',
                        'Target Semester': announcement.target_semester || 1,
                        'Academic Year': announcement.target_academic_year || '2026-2027',
                        'Announcement': announcement.title || ''
                    });
                });
            });

            // Sheet 2: Subject Demand & Allocation Summary
            const summaryRows = Object.keys(subjectCounts).map(subKey => ({
                'Subject (Code & Name)': subKey,
                'Total Faculty Demand': subjectCounts[subKey],
                'Faculty Instructors': (subjectFacultyMap[subKey] || []).join('; ')
            }));

            // Create Workbook
            const wb = XLSX.utils.book_new();
            const wsDetail = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Message': 'No responses submitted yet' }]);
            const wsSummary = XLSX.utils.json_to_sheet(summaryRows.length > 0 ? summaryRows : [{ 'Message': 'No subject preferences yet' }]);

            // Set column widths
            wsDetail['!cols'] = [
                { wch: 22 }, // Faculty Name
                { wch: 28 }, // Faculty Email
                { wch: 30 }, // Department
                { wch: 16 }, // Choice
                { wch: 12 }, // Rank
                { wch: 14 }, // Code
                { wch: 32 }, // Name
                { wch: 10 }, // Credits
                { wch: 14 }, // Mode
                { wch: 14 }, // Hours
                { wch: 24 }, // Notes
                { wch: 18 }, // Date
                { wch: 14 }, // Sem
                { wch: 14 }  // Year
            ];

            XLSX.utils.book_append_sheet(wb, wsDetail, 'Faculty Preferences');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Subject Demand Summary');

            const fileName = `Faculty_Subject_Preferences_Sem${announcement.target_semester || 1}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            XLSX.writeFile(wb, fileName);

            setImportSuccessMsg(`Exported ${rows.length} rows to ${fileName}!`);
            setTimeout(() => setImportSuccessMsg(''), 4000);
        } catch (err) {
            console.error('Error exporting Excel:', err);
            setImportErrorMsg('Failed to export Excel file: ' + err.message);
        }
    };

    // ── 2. DOWNLOAD SAMPLE IMPORT TEMPLATE (.xlsx) ────────────────────────────
    const handleDownloadTemplate = () => {
        try {
            const templateRows = [
                {
                    'Faculty Email': 'akash@mit.edu',
                    'Faculty Name': 'Akash Alegaonkar',
                    'Subject Code': availableSubjects[0]?.code || '23CSE1415',
                    'Choice Rank': 1,
                    'Teaching Mode': 'Theory',
                    'Hours Per Week': 4,
                    'Notes': 'Morning slots preferred'
                },
                {
                    'Faculty Email': 'akash@mit.edu',
                    'Faculty Name': 'Akash Alegaonkar',
                    'Subject Code': availableSubjects[1]?.code || '23CSE2323',
                    'Choice Rank': 2,
                    'Teaching Mode': 'Theory',
                    'Hours Per Week': 4,
                    'Notes': 'Elective subject'
                }
            ];

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(templateRows);
            ws['!cols'] = [
                { wch: 25 },
                { wch: 22 },
                { wch: 15 },
                { wch: 12 },
                { wch: 15 },
                { wch: 14 },
                { wch: 25 }
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Import Template');
            XLSX.writeFile(wb, 'Faculty_Preferences_Import_Template.xlsx');
        } catch (err) {
            console.error('Error downloading template:', err);
        }
    };

    // ── 3. IMPORT DATA FROM EXCEL / CSV (.xlsx, .xls, .csv) ───────────────────
    const handleImportFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportSuccessMsg('');
        setImportErrorMsg('');

        try {
            const dataBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(dataBuffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rawRows = XLSX.utils.sheet_to_json(worksheet);

            if (!rawRows || rawRows.length === 0) {
                throw new Error('The uploaded spreadsheet contains no data rows.');
            }

            // Fetch profiles to match faculty by email or name
            const { data: profiles, error: pErr } = await supabase
                .from('profiles')
                .select('id, full_name, email, role, department');

            const allProfiles = profiles || [];
            const allSubjects = availableSubjects.length > 0 ? availableSubjects : await fetchAvailableSubjects();

            // Group import rows by faculty
            const facultyImportMap = {};
            let matchCount = 0;
            let skippedCount = 0;

            rawRows.forEach((row, rIdx) => {
                const email = (row['Faculty Email'] || row['email'] || row['Email'] || '').toString().trim().toLowerCase();
                const name = (row['Faculty Name'] || row['name'] || row['Name'] || '').toString().trim().toLowerCase();
                const subCode = (row['Subject Code'] || row['subject_code'] || row['Code'] || row['Subject'] || '').toString().trim().toUpperCase();
                const rank = parseInt(row['Choice Rank'] || row['preference_rank'] || row['Rank'] || (rIdx % 3 + 1), 10);
                const mode = (row['Teaching Mode'] || row['preferred_type'] || row['Mode'] || 'Theory').toString().trim();
                const notes = (row['Notes'] || row['remarks'] || row['Remarks'] || row['Notes / Slot Timing'] || '').toString().trim();
                const hours = parseInt(row['Hours Per Week'] || row['hours'] || 4, 10);

                // Match faculty
                let matchedProfile = allProfiles.find(p => p.email && p.email.toLowerCase() === email);
                if (!matchedProfile && name) {
                    matchedProfile = allProfiles.find(p => p.full_name && p.full_name.toLowerCase().includes(name));
                }
                // Fallback: match by current user if nothing matched
                if (!matchedProfile && allProfiles.length > 0) {
                    matchedProfile = allProfiles[0];
                }

                // Match subject
                const matchedSubject = allSubjects.find(s => 
                    (s.code && s.code.toUpperCase() === subCode) || 
                    (s.name && s.name.toUpperCase().includes(subCode))
                );

                if (matchedProfile && matchedSubject) {
                    const fId = matchedProfile.id;
                    if (!facultyImportMap[fId]) facultyImportMap[fId] = [];

                    // Avoid duplicate subject for same faculty
                    if (!facultyImportMap[fId].some(p => p.subject_id === matchedSubject.id)) {
                        facultyImportMap[fId].push({
                            subject_id: matchedSubject.id,
                            preference_rank: rank || (facultyImportMap[fId].length + 1),
                            preferred_type: mode === 'Practical' ? 'Practical' : mode === 'Both' ? 'Both' : 'Theory',
                            preferred_hours_per_week: hours || 4,
                            remarks: notes,
                            subject: matchedSubject
                        });
                        matchCount++;
                    }
                } else {
                    skippedCount++;
                }
            });

            // Save to database
            const facultyIds = Object.keys(facultyImportMap);
            if (facultyIds.length === 0) {
                throw new Error('Could not match any rows with valid Faculty and Subject Codes. Please check the column headers or download the template.');
            }

            for (const fId of facultyIds) {
                const prefs = facultyImportMap[fId];
                await saveFacultyPreferences(announcement.id, fId, prefs);
            }

            setImportSuccessMsg(`Successfully imported ${matchCount} preferences for ${facultyIds.length} faculty members! ${skippedCount > 0 ? `(${skippedCount} unrecognized rows skipped)` : ''}`);
            await loadData();
            setTimeout(() => setImportSuccessMsg(''), 5000);
        } catch (err) {
            console.error('Import error:', err);
            setImportErrorMsg(err.message || 'Failed to import Excel file.');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            {/* Hidden File Input for Excel Import */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportFileChange} 
                accept=".xlsx,.xls,.csv" 
                className="hidden" 
            />

            <div className="bg-white rounded-[2rem] w-full max-w-5xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                
                {/* ── Fixed Header ────────────────────────────────────────────── */}
                <div className="px-6 py-4 sm:px-8 sm:py-5 bg-gradient-to-r from-[#1a1b4b] via-[#242b70] to-[#1a1b4b] text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <BarChart3 size={20} className="text-indigo-200" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                                    Faculty Teaching Preferences
                                </h2>
                                <span className="px-2.5 py-0.5 bg-emerald-400 text-[#1a1b4b] rounded-full text-[10px] font-black uppercase tracking-wider">
                                    {facultyList.length} Faculty Responded
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-white/70 tracking-wide mt-0.5">
                                {announcement.title} • Semester {announcement.target_semester || 1} ({announcement.target_academic_year || '2026-2027'})
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Excel Export Button */}
                        <button
                            type="button"
                            onClick={handleExportToExcel}
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                            title="Download complete data in Excel spreadsheet"
                        >
                            <Download size={13} />
                            <span>Export Excel (.xlsx)</span>
                        </button>

                        {/* Excel Import Button */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            title="Import faculty preferences from spreadsheet"
                        >
                            {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                            <span>{importing ? 'Importing...' : 'Import Data'}</span>
                        </button>

                        <button 
                            onClick={onClose} 
                            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all ml-1"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Scrollable Body Content ─────────────────────────────────── */}
                <div className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1">
                    {/* Status Alerts */}
                    {importSuccessMsg && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                            <span>{importSuccessMsg}</span>
                        </div>
                    )}
                    {importErrorMsg && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold uppercase tracking-wider">
                            <AlertCircle size={16} className="shrink-0 text-rose-600" />
                            <span>{importErrorMsg}</span>
                        </div>
                    )}

                    {/* Top Analytics Cards & Schedule Allocation Link */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                            <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Total Responses</p>
                            <p className="text-xl font-black text-[#1a1b4b] mt-0.5">{facultyList.length} Faculty</p>
                            <p className="text-[10px] font-bold text-indigo-600">{responses.length} Total Subject Choices</p>
                        </div>

                        <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                            <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Target Term</p>
                            <p className="text-xl font-black text-emerald-800 mt-0.5">Semester {announcement.target_semester || 1}</p>
                            <p className="text-[10px] font-bold text-emerald-600">Academic Year {announcement.target_academic_year || '2026-2027'}</p>
                        </div>

                        <div className="p-4 bg-[#1a1b4b] text-white rounded-2xl flex flex-col justify-between">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Schedule Engine</p>
                            <div className="pt-2 flex items-center justify-between">
                                <Link
                                    to="/schedule-allocation"
                                    onClick={onClose}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#1a1b4b] rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-50 transition-all shadow-sm"
                                >
                                    <span>Allocate Schedule</span>
                                    <ChevronRight size={13} />
                                </Link>
                                <Link
                                    to="/allocation-dashboard"
                                    onClick={onClose}
                                    className="text-[10px] font-bold text-indigo-200 hover:text-white uppercase tracking-wider"
                                >
                                    Allocations →
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Export / Import Buttons Toolbar */}
                    <div className="flex sm:hidden items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportToExcel}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                        >
                            <Download size={13} />
                            <span>Export Excel</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gray-100 text-gray-800 rounded-xl text-xs font-black uppercase tracking-wider"
                        >
                            <Upload size={13} />
                            <span>Import</span>
                        </button>
                    </div>

                    {/* Subject Demand Pill Strip */}
                    {Object.keys(subjectCounts).length > 0 && (
                        <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Subject Demand Distribution:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {Object.entries(subjectCounts).map(([subName, count]) => (
                                    <span 
                                        key={subName} 
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-[#1a1b4b] shadow-2xs"
                                    >
                                        <BookOpen size={11} className="text-indigo-600" />
                                        <span>{subName}</span>
                                        <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded text-[10px] font-black">
                                            {count} {count === 1 ? 'choice' : 'choices'}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search & Subject Filter Bar */}
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={15} />
                            <input
                                type="text"
                                placeholder="Search by faculty name, department, or subject code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>

                        {Object.keys(subjectCounts).length > 0 && (
                            <select
                                value={filterSubject}
                                onChange={(e) => setFilterSubject(e.target.value)}
                                className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer w-full sm:w-auto"
                            >
                                <option value="ALL">All Subjects ({Object.keys(subjectCounts).length})</option>
                                {Object.keys(subjectCounts).map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Faculty Responses List */}
                    {loading ? (
                        <div className="py-14 text-center space-y-2">
                            <Loader2 size={26} className="animate-spin text-indigo-500 mx-auto" />
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                Loading Faculty Responses...
                            </p>
                        </div>
                    ) : filteredFaculty.length === 0 ? (
                        <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
                            <Users size={28} className="text-gray-300 mx-auto" />
                            <p className="text-xs font-black text-[#1a1b4b] uppercase tracking-wider">
                                No Faculty Responses Found
                            </p>
                            <p className="text-[11px] font-bold text-gray-400">
                                Responses submitted by teachers or imported via Excel will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredFaculty.map((item, idx) => (
                                <div
                                    key={item.faculty.id || idx}
                                    className="p-4 bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 shadow-2xs hover:shadow-xs transition-all space-y-2.5"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-gray-50 pb-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a1b4b] to-[#2d3a8c] text-white flex items-center justify-center font-black text-xs">
                                                {item.faculty.full_name?.charAt(0).toUpperCase() || 'F'}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-[#1a1b4b]">
                                                    {item.faculty.full_name}
                                                </h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                    <Building size={10} /> {item.faculty.department || 'Computer Science & Engineering'} • {item.faculty.email}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            Submitted: {item.submittedAt ? format(new Date(item.submittedAt), 'MMM dd, yyyy h:mm a') : 'Recently'}
                                        </span>
                                    </div>

                                    {/* Preference Chips */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {item.preferences.map((p, pIdx) => {
                                            const sub = p.subject || {};
                                            const isPrimary = (p.preference_rank || (pIdx + 1)) === 1;

                                            return (
                                                <div
                                                    key={p.id || pIdx}
                                                    className={`p-2.5 rounded-xl border ${
                                                        isPrimary 
                                                            ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950' 
                                                            : 'bg-gray-50/60 border-gray-200 text-gray-800'
                                                    } space-y-1`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                                            isPrimary ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                                                        }`}>
                                                            Choice #{p.preference_rank || (pIdx + 1)}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                            {p.preferred_type || 'Theory'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-black truncate pt-0.5">
                                                        [{sub.code || 'CODE'}] {sub.name || 'Subject'}
                                                    </p>
                                                    {p.remarks && (
                                                        <p className="text-[10px] text-gray-500 italic truncate">
                                                            Note: {p.remarks}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Fixed Footer ─────────────────────────────────────────────── */}
                <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider flex items-center gap-1.5"
                    >
                        <FileSpreadsheet size={14} />
                        <span>Download Sample Excel Template</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportToExcel}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                        >
                            <Download size={13} />
                            <span>Download Excel (.xlsx)</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default AdminPreferenceResponsesModal;
