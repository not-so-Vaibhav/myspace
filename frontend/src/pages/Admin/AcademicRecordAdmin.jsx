import React, { useState } from 'react';
import { creditApi } from '../../api/creditApi';


const AcademicRecordAdmin = () => {
    const [studentId, setStudentId] = useState('');
    const [transcript, setTranscript] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchRecord = async () => {
        if (!studentId) return;
        setLoading(true);
        setError('');
        setTranscript(null);
        try {
            const data = await creditApi.getTranscript(studentId);
            setTranscript(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Error fetching academic record');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-sm">
            <h1 className="text-2xl font-bold mb-4">Academic Record & Transcript</h1>
            
            <div className="flex gap-4 mb-6 max-w-md">
                <input 
                    type="text" 
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter Student Enrollment No" 
                    value={studentId} 
                    onChange={(e) => setStudentId(e.target.value)}
                />
                <button 
                    onClick={fetchRecord} 
                    disabled={loading || !studentId}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none bg-blue-600 text-white hover:bg-blue-700 h-10 py-2 px-4 whitespace-nowrap"
                >
                    {loading ? 'Fetching...' : 'View Record'}
                </button>
            </div>

            {error && (
                <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">
                    {error}
                </div>
            )}

            {transcript && transcript.summary && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Summary Header */}
                    <div className="bg-gray-50 p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Cumulative Performance (CGPA)</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded shadow-sm">
                                <p className="text-sm text-gray-500 mb-1">CGPA</p>
                                <p className="text-2xl font-bold text-blue-600">{transcript.summary.cgpa}</p>
                            </div>
                            <div className="bg-white p-4 rounded shadow-sm">
                                <p className="text-sm text-gray-500 mb-1">Percentage</p>
                                <p className="text-2xl font-bold text-blue-600">{transcript.summary.percentage}%</p>
                            </div>
                            <div className="bg-white p-4 rounded shadow-sm">
                                <p className="text-sm text-gray-500 mb-1">Credits Earned</p>
                                <p className="text-2xl font-bold text-green-600">{transcript.summary.credits_earned} <span className="text-sm text-gray-400 font-normal">/ {transcript.summary.credits_registered}</span></p>
                            </div>
                            <div className="bg-white p-4 rounded shadow-sm">
                                <p className="text-sm text-gray-500 mb-1">Pending Credits</p>
                                <p className="text-2xl font-bold text-red-600">{transcript.summary.credits_pending}</p>
                            </div>
                        </div>
                    </div>

                    {/* Semester Breakdown */}
                    <div className="p-6">
                        <h3 className="text-lg font-bold mb-4 border-b pb-2">Semester Breakdown</h3>
                        
                        {transcript.semesters?.length === 0 ? (
                            <p className="text-gray-500">No published results found.</p>
                        ) : (
                            <div className="space-y-6">
                                {transcript.semesters?.map((sem, idx) => (
                                    <div key={sem.semester_id} className="border border-gray-100 rounded-lg shadow-sm">
                                        <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                                            <h4 className="font-semibold text-gray-700">Semester {sem.semester_term} ({sem.academic_year_label})</h4>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-white text-gray-500 border-b">
                                                    <tr>
                                                        <th className="px-4 py-2">Subject Code</th>
                                                        <th className="px-4 py-2">Subject Name</th>
                                                        <th className="px-4 py-2">Credits</th>
                                                        <th className="px-4 py-2">Total Marks</th>
                                                        <th className="px-4 py-2">Grade</th>
                                                        <th className="px-4 py-2">Points</th>
                                                        <th className="px-4 py-2">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sem.subjects.map((sub, sIdx) => (
                                                        <tr key={sIdx} className="border-b last:border-0 hover:bg-gray-50">
                                                            <td className="px-4 py-3">{sub.subject_code}</td>
                                                            <td className="px-4 py-3 font-medium">{sub.subject_name}</td>
                                                            <td className="px-4 py-3">{sub.credits}</td>
                                                            <td className="px-4 py-3">{sub.total_marks}</td>
                                                            <td className="px-4 py-3 font-semibold">{sub.grade}</td>
                                                            <td className="px-4 py-3">{sub.grade_points}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${sub.is_pass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                    {sub.is_pass ? 'PASS' : 'FAIL'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AcademicRecordAdmin;
