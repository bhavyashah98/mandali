import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Helper to get auth headers
export const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('mandali_token');
    return {
        'Authorization': `Bearer ${token}`
    };
};

// --- AUTH API ---
export const fetchCurrentUser = async () => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/auth/me`, { headers });
    return response.data;
};

// --- GROUPS API ---
export const fetchGroups = async () => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/groups`, { headers });
    return response.data.groups; // Extracting the array
};

export const fetchGroupDetail = async (groupId: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/groups/${groupId}`, { headers });
    return response.data;
};

export const createGroup = async (groupData: any) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/groups`, groupData, { headers });
    return response.data;
};
export const joinGroup = async (inviteCode: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/groups/join`, { inviteCode }, { headers });
    return response.data;
};

/**
 * Optimizes Cloudinary retrieval URLs by injecting delivery transformations.
 * Allows grabbing the exact size needed from the CDN (e.g. 'w_400,q_auto,f_auto' for thumbnails)
 */
export const getOptimizedImageUrl = (url: string, transformations: string = 'q_auto,f_auto') => {
    console.log(url);
    if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) return url;

    // Ensure we don't double-transform if the URL already has some
    if (url.includes('/upload/')) {
        const parts = url.split('/upload/');

        const fPath = `${parts[0]}/upload/${transformations}/${parts[1]}`;
        console.log(fPath);
        return fPath;
    }

    return url;
};

export const uploadImage = async (uri: string, groupId: string) => {
    // 1. Fetch upload signature from backend
    const headers = await getAuthHeaders();
    const signResponse = await axios.get(`${API_URL}/upload/sign?type=memory&groupId=${groupId}`, { headers });
    const signData = signResponse.data;

    // 2. Prepare FormData
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'upload.jpg';

    // @ts-ignore
    formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: 'image/jpeg',
    });

    formData.append('api_key', signData.apiKey);
    formData.append('timestamp', signData.timestamp);
    formData.append('signature', signData.signature);
    if (signData.uploadPreset) formData.append('upload_preset', signData.uploadPreset);
    if (signData.folder) formData.append('folder', signData.folder);

    // 3. Upload directly to Cloudinary
    try {
        const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 }
        );

        if (!response.data?.secure_url) throw new Error('Upload failed: Missing URL');

        return {
            url: response.data.secure_url,
            publicId: response.data.public_id,
        };
    } catch (error: any) {
        if (error.response) {
            console.error('[Cloudinary] Detail:', error.response.status, error.response.data);
            throw new Error(error.response.data?.error?.message || 'Upload failed');
        }
        throw error;
    }
};

export const uploadProfileImage = async (uri: string) => {
    // 1. Fetch profile upload signature from backend
    const headers = await getAuthHeaders();
    const signResponse = await axios.get(`${API_URL}/upload/sign?type=profile`, { headers });
    const signData = signResponse.data;

    // 2. Prepare FormData
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'profile.jpg';

    // @ts-ignore
    formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: 'image/jpeg',
    });

    formData.append('api_key', signData.apiKey);
    formData.append('timestamp', signData.timestamp);
    formData.append('signature', signData.signature);
    if (signData.uploadPreset) formData.append('upload_preset', signData.uploadPreset);
    if (signData.folder) formData.append('folder', signData.folder);
    if (signData.publicId) formData.append('public_id', signData.publicId);
    if (signData.overwrite) formData.append('overwrite', 'true');
    if (signData.transformation) formData.append('transformation', signData.transformation);

    // 3. Upload directly to Cloudinary
    try {
        const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data.secure_url;
    } catch (error: any) {
        if (error.response) {
            console.error('[Cloudinary Profile] Detail:', error.response.status, error.response.data);
        }
        throw error;
    }
};

// --- HOUSIE API ---
export const createHousieGame = async (groupId: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/housie/create`, { groupId }, { headers });
    return response.data;
};

export const setupHousieGame = async (gameCode: string, ticketPrice: number): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.patch(`${API_URL}/housie/${gameCode}/setup`, { ticketPrice }, { headers });
    return response.data;
};

export const fetchHousieGame = async (gameCode: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/housie/${gameCode}`, { headers });
    return response.data;
};

export const activateHousieGame = async (gameCode: string, prizes?: any[]) => {
    const headers = await getAuthHeaders();
    const response = await axios.patch(`${API_URL}/housie/${gameCode}/activate`, { prizes }, { headers });
    return response.data;
};

export const fetchTicketById = async (ticketId: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/housie/ticket/${ticketId}`, { headers });
    return response.data?.ticket;
};

export const fetchActiveHousieGame = async (groupId: string): Promise<{ activeGame: any, lastGame: any }> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/housie/active/${groupId}`, { headers });
    return response.data;
};

export const joinHousieGame = async (gameCode: string, ticketCount: number): Promise<{ success: boolean, tickets: any[] }> => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/housie/${gameCode}/join`, { ticketCount }, { headers });
    return response.data;
};

export const fetchHousieTickets = async (gameCode: string): Promise<{ tickets: any[] }> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/housie/${gameCode}/tickets`, { headers });
    return response.data;
};

export const fetchHousieParticipants = async (gameCode: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/housie/${gameCode}/participants`, { headers });
    return response.data;
};

export const updateHousieStatus = async (gameCode: string, status: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.patch(`${API_URL}/housie/${gameCode}/status`, { status }, { headers });
    return response.data;
};

export const callHousieNumber = async (gameCode: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/housie/${gameCode}/call`, {}, { headers });
    return response.data;
};

export const cancelHousieGame = async (gameCode: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/housie/${gameCode}/cancel`, {}, { headers });
    return response.data;
};

export const updateGroup = async (groupId: string, groupData: any) => {
    const headers = await getAuthHeaders();
    const response = await axios.patch(`${API_URL}/groups/${groupId}`, groupData, { headers });
    return response.data;
};

export const leaveGroup = async (groupId: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/groups/${groupId}/leave`, {}, { headers });
    return response.data;
};

export const deleteGroup = async (groupId: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_URL}/groups/${groupId}`, { headers });
    return response.data;
};

export const transferOwnership = async (groupId: string, newAdminUserId: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/groups/${groupId}/transfer-ownership`, { newAdminUserId }, { headers });
    return response.data;
};

// --- MEMORIES API ---
export const fetchMemories = async (groupId: string, page: number = 0, limit: number = 20) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/memories/group/${groupId}?page=${page}&limit=${limit}`, { headers });
    return response.data;
};

export const createMemory = async (memoryData: { groupId: string, imageUrls: string[], story?: string, memoryDate?: Date }) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/memories`, memoryData, { headers });
    return response.data;
};

export const deleteMemory = async (memoryId: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_URL}/memories/${memoryId}`, { headers });
    return response.data;
};

// --- MODERATION API ---
export const reportContent = async (reportData: { contentId: string, groupId: string, reason?: string, contentType?: string }) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/moderation/report`, reportData, { headers });
    return response.data;
};

export const blockUser = async (blockedId: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/moderation/block`, { blockedId }, { headers });
    return response.data;
};

export const unblockUser = async (blockedId: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_URL}/moderation/block/${blockedId}`, { headers });
    return response.data;
};

export const fetchBlockedUsers = async () => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/moderation/blocked`, { headers });
    return response.data;
};
