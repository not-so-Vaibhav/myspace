import React, { useState } from 'react';
import { graduationApi } from '../../api/graduationApi';


const GraduationAdmin = () => {
    const [studentId, setStudentId] = useState('');
    const [eligibilityData, setEligibilityData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [processLoading, setProcessLoading] = useState(false);

    const checkEligibility = async () => {
        if (!studentId) return;
        setLoading(true);
        setError('');
        setEligibilityData(null);
        try {
            const data = await graduationApi.checkEligibility(studentId);
            setEligibilityData(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Error checking eligibility');
        } finally {
            setLoading(false);
        }
    };

    const processGraduation = async (force = false) => {
        setProcessLoading(true);
        try {
            await graduationApi.processGraduation(studentId, { force, remarks: force ? 'Force graduated by Admin' : 'Auto-graduated' });
            alert('Student successfully graduated!');
            checkEligibility(); // Refresh
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to process graduation');
        } finally {
            setProcessLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-sm">
            <h1 className="text-2xl font-bold mb-4">Graduation Processing Engine</h1>
            
            <div className="flex gap-4 mb-6 max-w-md">
                <input 
                    type="text" 
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter Student UUID" 
                    value={studentId} 
                    onChange={(e) => setStudentId(e.target.value)}
                />
                <button 
                    onClick={checkEligibility} 
                    disabled={loading || !studentId}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none bg-blue-600 text-white hover:bg-blue-700 h-10 py-2 px-4 whitespace-nowrap"
                >
                    {loading ? 'Checking...' : 'Check Eligibility'}
                </button>
            </div>

            {error && (
                <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">
                    {error}
                </div>
            )}

            {eligibilityData && (
                <div className="border border-gray-200 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Eligibility Report</h2>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <p className="text-sm text-gray-500">Program</p>
                            <p className="font-medium">{eligibilityData.programName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">CGPA</p>
                            <p className="font-medium">{eligibilityData.metrics?.cgpa}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Credits Earned</p>
                            <p className="font-medium">{eligibilityData.metrics?.credits_earned}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Semesters Completed</p>
                            <p className="font-medium">{eligibilityData.uniqueSemesters}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pending Backlogs</p>
                            <p className="font-medium">{eligibilityData.backlogsCount}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <p className={`font-bold ${eligibilityData.isEligible ? 'text-green-600' : 'text-red-600'}`}>
                                {eligibilityData.isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                            </p>
                        </div>
                    </div>

                    {!eligibilityData.isEligible && eligibilityData.issues?.length > 0 && (
                        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                            <h3 className="font-semibold text-yellow-800 mb-2">Missing Requirements</h3>
                            <ul className="list-disc pl-5 text-sm text-yellow-700">
                                {eligibilityData.issues.map((issue, idx) => (
                                    <li key={idx}>{issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex gap-4 border-t border-gray-100 pt-4 mt-4">
                        <button 
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none h-10 py-2 px-4 whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => processGraduation(false)}
                            disabled={!eligibilityData.isEligible || processLoading}
                        >
                            Process Graduation
                        </button>

                        {!eligibilityData.isEligible && (
                            <button 
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none h-10 py-2 px-4 whitespace-nowrap bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => {
                                    if(window.confirm('WARNING: Force graduating an ineligible student will bypass all checks. Continue?')) {
                                        processGraduation(true);
                                    }
                                }}
                                disabled={processLoading}
                            >
                                Force Graduate
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GraduationAdmin;
