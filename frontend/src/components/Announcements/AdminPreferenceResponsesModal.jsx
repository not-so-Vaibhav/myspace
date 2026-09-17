import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    Check,
    Circle,
    BarChart3,
    Building,
    ChevronRight,
    FileSpreadsheet,
    AlertCircle,
    Info,
    Layers,
    UserCheck,
    Sparkles,
    Filter,
    RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { 
    fetchAllResponsesForAnnouncement, 
    fetchAvailableSubjects,
    saveFacultyPreferences,
    togglePreferenceAllocation,
    batchAllocatePreferences
} from '../../services/subjectPreferenceService';

const AdminPreferenceResponsesModal = ({ isOpen, onClose, announcement }) => {
    const [responses, setResponses] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSubject, setFilterSubject] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'ALLOCATED' | 'PENDING'
    const [viewMode, setViewMode] = useState('faculty'); // 'faculty' | 'subject'
    const [updatingId, setUpdatingId] = useState(null);
    
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

    // ── Group responses by faculty_id ─────────────────────────────────────────
    const facultyMap = useMemo(() => {
        const map = {};
        responses.forEach(r => {
            const fId = r.faculty_id || r.faculty?.id;
            if (!map[fId]) {
                map[fId] = {
                    faculty: r.faculty || { id: fId, full_name: 'Faculty Member', department: 'Academic', email: '' },
                    submittedAt: r.created_at,
                    preferences: []
                };
            }
            map[fId].preferences.push(r);
        });
        return map;
    }, [responses]);

    const facultyList = useMemo(() => Object.values(facultyMap), [facultyMap]);

    // ── Group responses by subject ───────────────────────────────────────────
    const subjectMap = useMemo(() => {
        const map = {};
        responses.forEach(r => {
            const sub = r.subject || {};
            const code = sub.code || 'UNKNOWN';
            const name = sub.name || 'Subject';
            const key = `${code}: ${name}`;
            if (!map[key]) {
                map[key] = {
                    subject: sub,
                    key,
                    code,
                    name,
                    preferences: [],
                    allocatedCount: 0
                };
            }
            map[key].preferences.push(r);
            if (r.is_allocated) {
                map[key].allocatedCount++;
            }
        });
        return map;
    }, [responses]);

    const subjectList = useMemo(() => Object.values(subjectMap), [subjectMap]);

    // ── Calculate Stats ───────────────────────────────────────────────────────
    const totalChoicesCount = responses.length;
    const allocatedChoicesCount = responses.filter(r => r.is_allocated).length;
    const pendingChoicesCount = totalChoicesCount - allocatedChoicesCount;

    // ── Toggle Allocation for a Subject Preference ───────────────────────────
    const handleToggleAllocation = async (pref) => {
        if (!pref) return;
        const currentStatus = Boolean(pref.is_allocated);
        const nextStatus = !currentStatus;
        const prefId = pref.id;

        setUpdatingId(prefId);

        // Optimistically update local responses state
        setResponses(prev => prev.map(item => {
            const isMatch = item.id === prefId || 
                ((item.faculty_id === pref.faculty_id || item.faculty?.id === pref.faculty?.id) && 
                 item.subject_id === pref.subject_id);

            if (isMatch) {
                return {
                    ...item,
                    is_allocated: nextStatus,
                    allocated_at: nextStatus ? new Date().toISOString() : null
                };
            }
            return item;
        }));

        try {
            await togglePreferenceAllocation(prefId, nextStatus, {
                announcementId: announcement.id,
                facultyId: pref.faculty_id || pref.faculty?.id,
                subjectId: pref.subject_id
            });

            const facultyName = pref.faculty?.full_name || 'Faculty Member';
            const subCode = pref.subject?.code || 'Subject';
            if (nextStatus) {
                setImportSuccessMsg(`✓ Allocated [${subCode}] to ${facultyName}`);
            } else {
                setImportSuccessMsg(`Removed allocation of [${subCode}] for ${facultyName}`);
            }
            setTimeout(() => setImportSuccessMsg(''), 3500);
        } catch (err) {
            console.error('Error updating allocation status:', err);
            setImportErrorMsg('Failed to update allocation in database.');
            // Revert on error
            setResponses(prev => prev.map(item => {
                if (item.id === prefId) {
                    return { ...item, is_allocated: currentStatus };
                }
                return item;
            }));
        } finally {
            setUpdatingId(null);
        }
    };

    // ── Filtered Faculty List ─────────────────────────────────────────────────
    const filteredFaculty = useMemo(() => {
        return facultyList.map(item => {
            let matchesFacultyQuery = true;
            const q = searchQuery.toLowerCase().trim();
            if (q) {
                const name = item.faculty.full_name?.toLowerCase() || '';
                const dept = item.faculty.department?.toLowerCase() || '';
                const email = item.faculty.email?.toLowerCase() || '';
                const hasSubMatch = item.preferences.some(p => {
                    const sub = p.subject || {};
                    return (sub.name?.toLowerCase() || '').includes(q) || (sub.code?.toLowerCase() || '').includes(q);
                });
                matchesFacultyQuery = name.includes(q) || dept.includes(q) || email.includes(q) || hasSubMatch;
            }

            if (!matchesFacultyQuery) return null;

            // Filter preferences based on subject dropdown and status tab
            const filteredPrefs = item.preferences.filter(p => {
                const sub = p.subject || {};
                const subKey = `${sub.code}: ${sub.name}`;
                const matchesSub = filterSubject === 'ALL' || subKey === filterSubject;
                
                const matchesStat = 
                    filterStatus === 'ALL' ? true :
                    filterStatus === 'ALLOCATED' ? Boolean(p.is_allocated) :
                    !p.is_allocated;

                return matchesSub && matchesStat;
            });

            if (filteredPrefs.length === 0) return null;

            return {
                ...item,
                preferences: filteredPrefs
            };
        }).filter(Boolean);
    }, [facultyList, searchQuery, filterSubject, filterStatus]);

    // ── Filtered Subject List ─────────────────────────────────────────────────
    const filteredSubjects = useMemo(() => {
        return subjectList.map(sItem => {
            const q = searchQuery.toLowerCase().trim();
            let matchesQuery = true;
            if (q) {
                matchesQuery = sItem.name.toLowerCase().includes(q) || 
                               sItem.code.toLowerCase().includes(q) ||
                               sItem.preferences.some(p => (p.faculty?.full_name?.toLowerCase() || '').includes(q));
            }

            const matchesSub = filterSubject === 'ALL' || sItem.key === filterSubject;
            if (!matchesQuery || !matchesSub) return null;

            const filteredPrefs = sItem.preferences.filter(p => {
                if (filterStatus === 'ALLOCATED') return Boolean(p.is_allocated);
                if (filterStatus === 'PENDING') return !p.is_allocated;
                return true;
            });

            if (filteredPrefs.length === 0) return null;

            return {
                ...sItem,
                preferences: filteredPrefs
            };
        }).filter(Boolean);
    }, [subjectList, searchQuery, filterSubject, filterStatus]);

    // ── 1. EXPORT ALLOCATED DATA TO EXCEL (.xlsx) ──────────────────────────────
    const handleExportAllocatedToExcel = () => {
        try {
            const exportRows = [];
            let sNo = 1;

            if (responses.length > 0) {
                responses.forEach(p => {
                    const sub = p.subject || {};
                    const fac = p.faculty || {};
                    const isMarked = Boolean(p.is_allocated);

                    exportRows.push({
                        'S.No': sNo++,
                        'Faculty Name': isMarked ? (fac.full_name || 'Faculty Member') : 'Not Assigned',
                        'Faculty Email': isMarked ? (fac.email || '') : '',
                        'Department': isMarked ? (fac.department || 'Computer Science & Engineering') : '',
                        'Subject Code': sub.code || 'UNKNOWN',
                        'Subject Name': sub.name || 'Subject',
                        'Subject Credits': sub.credits || 3,
                        'Teaching Mode': p.preferred_type || 'Theory',
                        'Assigned Hours/Week': p.preferred_hours_per_week || 4,
                        'Choice Preference': isMarked ? `Choice #${p.preference_rank || 1}` : `Choice #${p.preference_rank || 1} (Unmarked)`,
                        'Preferred Slots': p.preferred_day_slots || 'Flexible',
                        'Remarks': p.remarks || '',
                        'Allocation Status': isMarked ? 'ALLOCATED / APPROVED' : 'UNALLOCATED / PENDING',
                        'Target Semester': `Semester ${announcement.target_semester || 1}`,
                        'Academic Year': announcement.target_academic_year || '2026-2027',
                        'Allocated Date': isMarked ? (p.allocated_at ? format(new Date(p.allocated_at), 'yyyy-MM-dd HH:mm') : format(new Date(), 'yyyy-MM-dd HH:mm')) : 'Pending Allocation',
                        'Announcement Reference': announcement.title || ''
                    });
                });
            } else if (availableSubjects.length > 0) {
                // If no faculty responses yet, generate complete subject catalog for the term with unassigned status
                availableSubjects.forEach(sub => {
                    exportRows.push({
                        'S.No': sNo++,
                        'Faculty Name': 'Not Assigned',
                        'Faculty Email': '',
                        'Department': '',
                        'Subject Code': sub.code || 'UNKNOWN',
                        'Subject Name': sub.name || 'Subject',
                        'Subject Credits': sub.credits || 3,
                        'Teaching Mode': sub.type || 'Theory',
                        'Assigned Hours/Week': 4,
                        'Choice Preference': 'Not Assigned',
                        'Preferred Slots': 'Flexible',
                        'Remarks': '',
                        'Allocation Status': 'UNALLOCATED / PENDING',
                        'Target Semester': `Semester ${announcement.target_semester || 1}`,
                        'Academic Year': announcement.target_academic_year || '2026-2027',
                        'Allocated Date': 'Pending Allocation',
                        'Announcement Reference': announcement.title || ''
                    });
                });
            }

            if (exportRows.length === 0) {
                exportRows.push({
                    'S.No': 1,
                    'Faculty Name': 'Not Assigned',
                    'Subject Code': '23CSE1415',
                    'Subject Name': 'Design Thinking',
                    'Subject Credits': 3,
                    'Teaching Mode': 'Theory',
                    'Allocation Status': 'UNALLOCATED / PENDING',
                    'Target Semester': `Semester ${announcement.target_semester || 1}`,
                    'Academic Year': announcement.target_academic_year || '2026-2027'
                });
            }

            // Sheet 2: Subject Coverage Summary
            const subjectAllocSummary = subjectList.length > 0 ? subjectList.map(s => {
                const allocatedFaculty = s.preferences
                    .filter(p => p.is_allocated)
                    .map(p => `${p.faculty?.full_name || 'Faculty'} (${p.preferred_type || 'Theory'})`);

                return {
                    'Subject Code': s.code,
                    'Subject Name': s.name,
                    'Credits': s.subject.credits || 3,
                    'Allocated Faculty Instructors': allocatedFaculty.length > 0 ? allocatedFaculty.join('; ') : 'NOT ASSIGNED',
                    'Allocated Faculty Count': allocatedFaculty.length,
                    'Total Faculty Applicants': s.preferences.length,
                    'Status': allocatedFaculty.length > 0 ? 'ALLOCATED' : 'UNALLOCATED / PENDING'
                };
            }) : availableSubjects.map(sub => ({
                'Subject Code': sub.code,
                'Subject Name': sub.name,
                'Credits': sub.credits || 3,
                'Allocated Faculty Instructors': 'NOT ASSIGNED',
                'Allocated Faculty Count': 0,
                'Total Faculty Applicants': 0,
                'Status': 'UNALLOCATED / PENDING'
            }));

            // Create Workbook
            const wb = XLSX.utils.book_new();
            const wsAllocated = XLSX.utils.json_to_sheet(exportRows);
            const wsSummary = XLSX.utils.json_to_sheet(subjectAllocSummary);

            // Column Widths
            wsAllocated['!cols'] = [
                { wch: 8 },  // S.No
                { wch: 25 }, // Faculty Name
                { wch: 30 }, // Faculty Email
                { wch: 32 }, // Department
                { wch: 16 }, // Subject Code
                { wch: 36 }, // Subject Name
                { wch: 14 }, // Credits
                { wch: 16 }, // Mode
                { wch: 20 }, // Hours
                { wch: 22 }, // Rank
                { wch: 20 }, // Slots
                { wch: 25 }, // Remarks
                { wch: 26 }, // Status
                { wch: 18 }, // Semester
                { wch: 16 }, // Year
                { wch: 22 }, // Date
                { wch: 30 }  // Announcement
            ];

            wsSummary['!cols'] = [
                { wch: 16 },
                { wch: 36 },
                { wch: 10 },
                { wch: 45 },
                { wch: 24 },
                { wch: 24 },
                { wch: 24 }
            ];

            XLSX.utils.book_append_sheet(wb, wsAllocated, 'Subject Allocation Schedule');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Subject Coverage Summary');

            const fileName = `Subject_Allocations_Sem${announcement.target_semester || 1}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            XLSX.writeFile(wb, fileName);

            setImportSuccessMsg(`✓ Successfully downloaded Excel schedule with ${exportRows.length} subject entries!`);
            setTimeout(() => setImportSuccessMsg(''), 5000);
        } catch (err) {
            console.error('Error exporting allocated Excel:', err);
            setImportErrorMsg('Failed to export Excel spreadsheet: ' + err.message);
        }
    };

    // ── 2. EXPORT COMPLETE PREFERENCES WORKBOOK (.xlsx) ────────────────────────
    const handleExportAllToExcel = () => {
        try {
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
                        'Allocation Status': p.is_allocated ? 'ALLOCATED / APPROVED' : 'PENDING',
                        'Allocated Date': p.allocated_at ? format(new Date(p.allocated_at), 'yyyy-MM-dd HH:mm') : '',
                        'Notes / Slot Timing': p.remarks || '',
                        'Submitted Date': p.created_at ? format(new Date(p.created_at), 'yyyy-MM-dd HH:mm') : '',
                        'Target Semester': announcement.target_semester || 1,
                        'Academic Year': announcement.target_academic_year || '2026-2027',
                        'Announcement': announcement.title || ''
                    });
                });
            });

            // Summary Rows
            const summaryRows = subjectList.map(s => ({
                'Subject (Code & Name)': s.key,
                'Total Faculty Demand': s.preferences.length,
                'Allocated Faculty': s.preferences.filter(p => p.is_allocated).map(p => p.faculty?.full_name || 'Faculty').join(', ') || 'None',
                'All Applicant Faculty': s.preferences.map(p => `${p.faculty?.full_name || 'Faculty'} (Rank #${p.preference_rank || 1})`).join('; ')
            }));

            const wb = XLSX.utils.book_new();
            const wsDetail = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Message': 'No responses submitted yet' }]);
            const wsSummary = XLSX.utils.json_to_sheet(summaryRows.length > 0 ? summaryRows : [{ 'Message': 'No subject preferences yet' }]);

            wsDetail['!cols'] = [
                { wch: 22 }, { wch: 28 }, { wch: 30 }, { wch: 16 }, { wch: 12 },
                { wch: 14 }, { wch: 32 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
                { wch: 22 }, { wch: 18 }, { wch: 24 }, { wch: 18 }, { wch: 14 }, { wch: 14 }
            ];

            XLSX.utils.book_append_sheet(wb, wsDetail, 'All Faculty Preferences');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Subject Demand & Allocations');

            const fileName = `All_Faculty_Preferences_Sem${announcement.target_semester || 1}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            XLSX.writeFile(wb, fileName);

            setImportSuccessMsg(`Exported ${rows.length} rows to ${fileName}!`);
            setTimeout(() => setImportSuccessMsg(''), 4000);
        } catch (err) {
            console.error('Error exporting Excel:', err);
            setImportErrorMsg('Failed to export Excel file: ' + err.message);
        }
    };

    // ── 3. DOWNLOAD SAMPLE IMPORT TEMPLATE (.xlsx) ────────────────────────────
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
                { wch: 25 }, { wch: 22 }, { wch: 15 }, { wch: 12 },
                { wch: 15 }, { wch: 14 }, { wch: 25 }
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Import Template');
            XLSX.writeFile(wb, 'Faculty_Preferences_Import_Template.xlsx');
        } catch (err) {
            console.error('Error downloading template:', err);
        }
    };

    // ── 4. IMPORT DATA FROM EXCEL / CSV (.xlsx, .xls, .csv) ───────────────────
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

            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email, role, department');

            const allProfiles = profiles || [];
            const allSubjects = availableSubjects.length > 0 ? availableSubjects : await fetchAvailableSubjects();

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

                let matchedProfile = allProfiles.find(p => p.email && p.email.toLowerCase() === email);
                if (!matchedProfile && name) {
                    matchedProfile = allProfiles.find(p => p.full_name && p.full_name.toLowerCase().includes(name));
                }
                if (!matchedProfile && allProfiles.length > 0) {
                    matchedProfile = allProfiles[0];
                }

                const matchedSubject = allSubjects.find(s => 
                    (s.code && s.code.toUpperCase() === subCode) || 
                    (s.name && s.name.toUpperCase().includes(subCode))
                );

                if (matchedProfile && matchedSubject) {
                    const fId = matchedProfile.id;
                    if (!facultyImportMap[fId]) facultyImportMap[fId] = [];

                    if (!facultyImportMap[fId].some(p => p.subject_id === matchedSubject.id)) {
                        facultyImportMap[fId].push({
                            subject_id: matchedSubject.id,
                            preference_rank: rank || (facultyImportMap[fId].length + 1),
                            preferred_type: mode === 'Practical' ? 'Practical' : mode === 'Both' ? 'Both' : 'Theory',
                            preferred_hours_per_week: hours || 4,
                            remarks: notes,
                            is_allocated: false,
                            subject: matchedSubject
                        });
                        matchCount++;
                    }
                } else {
                    skippedCount++;
                }
            });

            const facultyIds = Object.keys(facultyImportMap);
            if (facultyIds.length === 0) {
                throw new Error('Could not match any rows with valid Faculty and Subject Codes. Please check column headers.');
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

    if (!isOpen || !announcement) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
            {/* Hidden File Input for Excel Import */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportFileChange} 
                accept=".xlsx,.xls,.csv" 
                className="hidden" 
            />

            <div className="bg-white rounded-[2rem] w-full max-w-5xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
                
                {/* ── Fixed Header ────────────────────────────────────────────── */}
                <div className="px-5 py-4 sm:px-8 sm:py-5 bg-gradient-to-r from-[#1a1b4b] via-[#242b70] to-[#1a1b4b] text-white flex items-center justify-between shrink-0 shadow-md">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
                            <BarChart3 size={20} className="text-indigo-200" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                                    Faculty Teaching Preferences
                                </h2>
                                <span className="px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-300/30 text-indigo-100 rounded-full text-[10px] font-black uppercase tracking-wider">
                                    {facultyList.length} Faculty Responded
                                </span>
                                <span className="px-2.5 py-0.5 bg-emerald-400 text-[#1a1b4b] rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                    <CheckCircle2 size={11} className="text-[#1a1b4b]" />
                                    <span>{allocatedChoicesCount} Allocated</span>
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-white/70 tracking-wide mt-0.5">
                                {announcement.title} • Semester {announcement.target_semester || 1} ({announcement.target_academic_year || '2026-2027'})
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Primary Download Allocated Excel Button */}
                        <button
                            type="button"
                            onClick={handleExportAllocatedToExcel}
                            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                            title="Download Excel spreadsheet of approved / allocated subjects"
                        >
                            <FileSpreadsheet size={14} />
                            <span>Download Allocated Excel (.xlsx)</span>
                        </button>

                        {/* Export All Data Button */}
                        <button
                            type="button"
                            onClick={handleExportAllToExcel}
                            className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            title="Export all faculty preferences (including unallocated)"
                        >
                            <Download size={13} />
                            <span>Export All</span>
                        </button>

                        {/* Import Button */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                            className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            title="Import faculty preferences from spreadsheet"
                        >
                            {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                            <span>{importing ? 'Importing...' : 'Import'}</span>
                        </button>

                        <button 
                            onClick={onClose} 
                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all ml-1"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Scrollable Body Content ─────────────────────────────────── */}
                <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Status Alerts */}
                    {importSuccessMsg && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider animate-in fade-in">
                            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                            <span className="flex-1">{importSuccessMsg}</span>
                            <button onClick={() => setImportSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    {importErrorMsg && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold uppercase tracking-wider animate-in fade-in">
                            <AlertCircle size={16} className="shrink-0 text-rose-600" />
                            <span className="flex-1">{importErrorMsg}</span>
                            <button onClick={() => setImportErrorMsg('')} className="text-rose-500 hover:text-rose-700">
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    {/* Top Analytics Cards & Schedule Allocation Link */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-col justify-between">
                            <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Total Responses</p>
                            <div className="my-1">
                                <p className="text-xl font-black text-[#1a1b4b]">{facultyList.length} Faculty</p>
                                <p className="text-[10px] font-bold text-indigo-600">{totalChoicesCount} Subject Choices</p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Allocated</p>
                                <CheckCircle2 size={14} className="text-emerald-600" />
                            </div>
                            <div className="my-1">
                                <p className="text-xl font-black text-emerald-800">{allocatedChoicesCount} Approved</p>
                                <p className="text-[10px] font-bold text-emerald-600">
                                    {totalChoicesCount > 0 ? Math.round((allocatedChoicesCount / totalChoicesCount) * 100) : 0}% Choices Allocated
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Pending Choices</p>
                                <Clock size={14} className="text-amber-600" />
                            </div>
                            <div className="my-1">
                                <p className="text-xl font-black text-amber-800">{pendingChoicesCount} Pending</p>
                                <p className="text-[10px] font-bold text-amber-600">Click tick mark on cards to allocate</p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-[#1a1b4b] text-white rounded-2xl flex flex-col justify-between">
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

                    {/* Mobile Quick Action Buttons Toolbar */}
                    <div className="flex sm:hidden items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportAllocatedToExcel}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm"
                        >
                            <FileSpreadsheet size={13} />
                            <span>Allocated Excel</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleExportAllToExcel}
                            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-indigo-50 text-[#1a1b4b] border border-indigo-200 rounded-xl text-xs font-black uppercase tracking-wider"
                        >
                            <Download size={13} />
                            <span>All Data</span>
                        </button>
                    </div>

                    {/* Subject Demand Pill Strip with Allocation Indicator */}
                    {subjectList.length > 0 && (
                        <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    Subject Demand & Staffing Overview:
                                </p>
                                <span className="text-[10px] text-gray-400 font-bold">
                                    Click any subject to filter responses
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {subjectList.map((sItem) => {
                                    const isSelected = filterSubject === sItem.key;
                                    const hasAllocated = sItem.allocatedCount > 0;
                                    const isMultiple = sItem.preferences.length > 1;

                                    return (
                                        <button 
                                            key={sItem.key}
                                            type="button"
                                            onClick={() => setFilterSubject(isSelected ? 'ALL' : sItem.key)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                                isSelected 
                                                    ? 'bg-[#1a1b4b] text-white shadow-sm ring-2 ring-[#1a1b4b]/30' 
                                                    : hasAllocated
                                                    ? 'bg-emerald-50 text-emerald-950 border border-emerald-200 hover:border-emerald-300'
                                                    : isMultiple
                                                    ? 'bg-amber-50 text-amber-950 border border-amber-200 hover:border-amber-300'
                                                    : 'bg-white border border-gray-200 text-gray-800 hover:border-indigo-300'
                                            }`}
                                        >
                                            <BookOpen size={11} className={isSelected ? 'text-indigo-200' : hasAllocated ? 'text-emerald-600' : 'text-indigo-600'} />
                                            <span>{sItem.code}: {sItem.name}</span>
                                            
                                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                                                isSelected 
                                                    ? 'bg-white/20 text-white' 
                                                    : hasAllocated
                                                    ? 'bg-emerald-200 text-emerald-900'
                                                    : 'bg-indigo-100 text-indigo-900'
                                            }`}>
                                                {sItem.preferences.length} {sItem.preferences.length === 1 ? 'choice' : 'choices'}
                                            </span>

                                            {hasAllocated && (
                                                <span className="text-[10px] text-emerald-600 font-black flex items-center gap-0.5">
                                                    <Check size={11} /> {sItem.allocatedCount}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Toolbar: Search, View Switcher & Status Filter Tabs */}
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                            
                            {/* View Mode Switcher */}
                            <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200 shrink-0 self-start sm:self-auto">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('faculty')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                        viewMode === 'faculty'
                                            ? 'bg-white text-[#1a1b4b] shadow-xs'
                                            : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    <Users size={13} />
                                    <span>By Faculty</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('subject')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                        viewMode === 'subject'
                                            ? 'bg-white text-[#1a1b4b] shadow-xs'
                                            : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    <Layers size={13} />
                                    <span>By Subject (Resolve Conflicts)</span>
                                </button>
                            </div>

                            {/* Status Filter Tabs */}
                            <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200 shrink-0 self-start sm:self-auto">
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('ALL')}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                                        filterStatus === 'ALL'
                                            ? 'bg-[#1a1b4b] text-white shadow-xs'
                                            : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    All ({totalChoicesCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('ALLOCATED')}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                                        filterStatus === 'ALLOCATED'
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'text-emerald-700 hover:bg-emerald-50'
                                    }`}
                                >
                                    <Check size={12} />
                                    <span>Allocated ({allocatedChoicesCount})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('PENDING')}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                                        filterStatus === 'PENDING'
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'text-amber-700 hover:bg-amber-50'
                                    }`}
                                >
                                    <span>Pending ({pendingChoicesCount})</span>
                                </button>
                            </div>

                        </div>

                        {/* Search Input and Subject Dropdown Filter */}
                        <div className="flex flex-col sm:flex-row items-center gap-2.5">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={15} />
                                <input
                                    type="text"
                                    placeholder="Search by faculty name, email, department, or subject code..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {subjectList.length > 0 && (
                                <select
                                    value={filterSubject}
                                    onChange={(e) => setFilterSubject(e.target.value)}
                                    className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#1a1b4b] outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer w-full sm:w-auto"
                                >
                                    <option value="ALL">All Subjects ({subjectList.length})</option>
                                    {subjectList.map(s => (
                                        <option key={s.key} value={s.key}>{s.key} ({s.preferences.length})</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* ── Main Data View ─────────────────────────────────────────── */}
                    {loading ? (
                        <div className="py-14 text-center space-y-2">
                            <Loader2 size={28} className="animate-spin text-indigo-500 mx-auto" />
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                Loading Faculty Preferences & Allocation Status...
                            </p>
                        </div>
                    ) : viewMode === 'faculty' ? (
                        /* ────────────────────────── VIEW 1: BY FACULTY ────────────────────────── */
                        filteredFaculty.length === 0 ? (
                            <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
                                <Users size={28} className="text-gray-300 mx-auto" />
                                <p className="text-xs font-black text-[#1a1b4b] uppercase tracking-wider">
                                    No Faculty Responses Found
                                </p>
                                <p className="text-[11px] font-bold text-gray-400">
                                    {filterStatus !== 'ALL' ? `No faculty responses match the status filter "${filterStatus}".` : 'Responses submitted by teachers or imported via Excel will appear here.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredFaculty.map((item, idx) => {
                                    const facAllocatedCount = item.preferences.filter(p => p.is_allocated).length;
                                    
                                    return (
                                        <div
                                            key={item.faculty.id || idx}
                                            className="p-4 bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 shadow-2xs hover:shadow-xs transition-all space-y-3"
                                        >
                                            {/* Faculty Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1a1b4b] to-[#2d3a8c] text-white flex items-center justify-center font-black text-xs shadow-sm">
                                                        {item.faculty.full_name?.charAt(0).toUpperCase() || 'F'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-xs sm:text-sm font-black text-[#1a1b4b]">
                                                                {item.faculty.full_name}
                                                            </h4>
                                                            {facAllocatedCount > 0 ? (
                                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                                                    <Check size={10} /> {facAllocatedCount} Allocated
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[9px] font-black uppercase tracking-wider">
                                                                    Pending
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                                                            <Building size={11} className="text-gray-400" /> 
                                                            <span>{item.faculty.department || 'Computer Science & Engineering'}</span>
                                                            <span>•</span>
                                                            <span className="lowercase text-gray-500 font-semibold">{item.faculty.email}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest self-start sm:self-auto">
                                                    Submitted: {item.submittedAt ? format(new Date(item.submittedAt), 'MMM dd, yyyy h:mm a') : 'Recently'}
                                                </span>
                                            </div>

                                            {/* Faculty Preference Choice Cards with Tick Mark Toggle */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                                {item.preferences.map((p, pIdx) => {
                                                    const sub = p.subject || {};
                                                    const isPrimary = (p.preference_rank || (pIdx + 1)) === 1;
                                                    const isAllocated = Boolean(p.is_allocated);
                                                    const isUpdating = updatingId === p.id;
                                                    const subKey = `${sub.code}: ${sub.name}`;
                                                    const totalForSub = subjectMap[subKey]?.preferences?.length || 1;
                                                    const otherAllocated = subjectMap[subKey]?.allocatedCount || 0;

                                                    return (
                                                        <div
                                                            key={p.id || pIdx}
                                                            className={`p-3 rounded-2xl border transition-all relative flex flex-col justify-between ${
                                                                isAllocated 
                                                                    ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/50 shadow-xs' 
                                                                    : isPrimary 
                                                                    ? 'bg-indigo-50/40 border-indigo-200 text-indigo-950' 
                                                                    : 'bg-gray-50/50 border-gray-200 text-gray-800'
                                                            }`}
                                                        >
                                                            {/* Choice Header & Interactive Tick Mark */}
                                                            <div className="flex items-center justify-between gap-1.5 mb-2">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                                                        isAllocated
                                                                            ? 'bg-emerald-700 text-white'
                                                                            : isPrimary 
                                                                            ? 'bg-[#1a1b4b] text-white' 
                                                                            : 'bg-gray-200 text-gray-700'
                                                                    }`}>
                                                                        Choice #{p.preference_rank || (pIdx + 1)}
                                                                    </span>
                                                                    <span className="px-1.5 py-0.5 bg-white/80 border border-gray-200 rounded text-[9px] font-bold text-gray-600 uppercase">
                                                                        {p.preferred_type || 'Theory'}
                                                                    </span>
                                                                </div>

                                                                {/* ── THE INTERACTIVE ALLOCATION TICK MARK BUTTON ── */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleAllocation(p)}
                                                                    disabled={isUpdating}
                                                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs ${
                                                                        isAllocated
                                                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-1 ring-emerald-500'
                                                                            : 'bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 text-gray-700 hover:text-emerald-800'
                                                                    }`}
                                                                    title={isAllocated ? 'Click to unassign / remove allocation' : 'Click tick mark to assign & allocate this subject to this faculty'}
                                                                >
                                                                    {isUpdating ? (
                                                                        <Loader2 size={12} className="animate-spin text-emerald-600" />
                                                                    ) : isAllocated ? (
                                                                        <>
                                                                            <CheckCircle2 size={13} className="text-white fill-emerald-800" />
                                                                            <span>Allocated</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Circle size={13} className="text-gray-400 group-hover:text-emerald-600" />
                                                                            <span>Allocate</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>

                                                            {/* Subject Details */}
                                                            <div className="space-y-1">
                                                                <p className="text-xs font-black text-[#1a1b4b] leading-snug">
                                                                    [{sub.code || 'CODE'}] {sub.name || 'Subject'}
                                                                </p>
                                                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                                                    <span>{sub.credits || 3} Credits</span>
                                                                    <span>•</span>
                                                                    <span>{p.preferred_hours_per_week || 4} Hrs/Week</span>
                                                                </div>
                                                                {p.remarks && (
                                                                    <p className="text-[10px] text-gray-500 italic bg-white/70 p-1.5 rounded-lg border border-gray-100 mt-1 line-clamp-2">
                                                                        "{p.remarks}"
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {/* Multiple Faculty Contest Notice */}
                                                            {totalForSub > 1 && (
                                                                <div className="mt-2 pt-1.5 border-t border-gray-200/60 flex items-center justify-between text-[9px] font-bold text-gray-500">
                                                                    <span className="flex items-center gap-1 text-amber-700">
                                                                        <Info size={10} />
                                                                        <span>{totalForSub} faculty picked this</span>
                                                                    </span>
                                                                    {otherAllocated > 0 && !isAllocated && (
                                                                        <span className="text-emerald-700 font-black">
                                                                            ({otherAllocated} allocated)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        /* ────────────────────────── VIEW 2: BY SUBJECT (CONFLICT RESOLVER) ────────────────────────── */
                        filteredSubjects.length === 0 ? (
                            <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
                                <BookOpen size={28} className="text-gray-300 mx-auto" />
                                <p className="text-xs font-black text-[#1a1b4b] uppercase tracking-wider">
                                    No Subjects Found
                                </p>
                                <p className="text-[11px] font-bold text-gray-400">
                                    No subjects match your current search and filter criteria.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3.5">
                                {filteredSubjects.map((sItem) => {
                                    const isMultiple = sItem.preferences.length > 1;
                                    const hasAllocated = sItem.allocatedCount > 0;

                                    return (
                                        <div
                                            key={sItem.key}
                                            className={`p-4 bg-white rounded-2xl border transition-all space-y-3 ${
                                                hasAllocated
                                                    ? 'border-emerald-200 shadow-2xs'
                                                    : isMultiple
                                                    ? 'border-amber-200 shadow-2xs'
                                                    : 'border-gray-100 shadow-2xs'
                                            }`}
                                        >
                                            {/* Subject Title & Stats Bar */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                                                        hasAllocated 
                                                            ? 'bg-emerald-600 text-white' 
                                                            : 'bg-[#1a1b4b] text-white'
                                                    }`}>
                                                        <BookOpen size={15} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-xs sm:text-sm font-black text-[#1a1b4b]">
                                                                [{sItem.code}] {sItem.name}
                                                            </h4>
                                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-bold">
                                                                {sItem.subject.credits || 3} Credits
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                                                            Target Semester {announcement.target_semester || 1} • {sItem.preferences.length} Faculty Applied
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                                    {hasAllocated ? (
                                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                                            <CheckCircle2 size={12} className="text-emerald-700" />
                                                            <span>{sItem.allocatedCount} Faculty Allocated</span>
                                                        </span>
                                                    ) : isMultiple ? (
                                                        <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                                            <AlertCircle size={12} className="text-amber-700" />
                                                            <span>{sItem.preferences.length} Competing Requests</span>
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                            Pending Allocation
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* List of Faculty who Selected this Subject */}
                                            <div className="space-y-2">
                                                {sItem.preferences.map((p, pIdx) => {
                                                    const fac = p.faculty || {};
                                                    const isAllocated = Boolean(p.is_allocated);
                                                    const isUpdating = updatingId === p.id;
                                                    const isPrimary = p.preference_rank === 1;

                                                    return (
                                                        <div
                                                            key={p.id || pIdx}
                                                            className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                                                                isAllocated
                                                                    ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/40'
                                                                    : 'bg-gray-50/70 border-gray-200 hover:border-indigo-200'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-7 h-7 rounded-lg bg-gray-200 text-gray-800 flex items-center justify-center font-black text-[11px]">
                                                                    {fac.full_name?.charAt(0).toUpperCase() || 'F'}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-black text-[#1a1b4b]">
                                                                            {fac.full_name || 'Faculty Member'}
                                                                        </span>
                                                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                                                            isPrimary ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                                                                        }`}>
                                                                            Choice #{p.preference_rank || (pIdx + 1)}
                                                                        </span>
                                                                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                                                                            ({p.preferred_type || 'Theory'})
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[10px] font-bold text-gray-400">
                                                                        {fac.department || 'Academic'} • {fac.email}
                                                                        {p.remarks && <span className="italic text-gray-500 ml-1"> — "{p.remarks}"</span>}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Allocation Toggle Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleAllocation(p)}
                                                                disabled={isUpdating}
                                                                className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 self-end sm:self-auto shadow-xs ${
                                                                    isAllocated
                                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-1 ring-emerald-500'
                                                                        : 'bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 text-gray-700 hover:text-emerald-800'
                                                                }`}
                                                                title={isAllocated ? 'Click to unassign allocation' : 'Tick mark to allocate this subject to this faculty'}
                                                            >
                                                                {isUpdating ? (
                                                                    <Loader2 size={12} className="animate-spin text-emerald-600" />
                                                                ) : isAllocated ? (
                                                                    <>
                                                                        <CheckCircle2 size={14} className="text-white fill-emerald-800" />
                                                                        <span>✓ Allocated</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Circle size={14} className="text-gray-400" />
                                                                        <span>Mark Allocate</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>

                {/* ── Fixed Footer ─────────────────────────────────────────────── */}
                <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto"
                    >
                        <FileSpreadsheet size={14} />
                        <span>Download Sample Import Template</span>
                    </button>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {/* Download Allocated Excel */}
                        <button
                            type="button"
                            onClick={handleExportAllocatedToExcel}
                            className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                        >
                            <FileSpreadsheet size={14} />
                            <span>Download Allocated Excel (.xlsx)</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleExportAllToExcel}
                            className="hidden sm:flex px-3.5 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all items-center gap-1.5"
                        >
                            <Download size={13} />
                            <span>All Responses</span>
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
