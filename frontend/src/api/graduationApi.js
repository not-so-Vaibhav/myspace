import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
const API_URL = `${BASE_URL}/graduation`;

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
