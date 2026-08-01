import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
const API_URL = `${BASE_URL}/api/graduation`;

export const graduationApi = {
    checkEligibility: async (studentId) => {
        const response = await axios.get(`${API_URL}/eligibility/${studentId}`);
        return response.data.data;
    },
    
    processGraduation: async (studentId, { force = false, remarks = '' } = {}) => {
        const response = await axios.post(`${API_URL}/process/${studentId}`, {
            force,
            remarks
        });
        return response.data;
    }
};
