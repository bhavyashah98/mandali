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
export const uploadImage = async (uri: string, groupId: string) => {
    const headers = await getAuthHeaders();
    const formData = new FormData();

    // Create the file object
    const filename = uri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    // @ts-ignore
    formData.append('image', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type,
    });

    // NOTE: Backend is mounted as /upload and route is /image -> /upload/image
    const response = await axios.post(`${API_URL}/upload/image?groupId=${groupId}`, formData, {
        headers: {
            ...headers,
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data.url;
};

export const uploadProfileImage = async (uri: string) => {
    const headers = await getAuthHeaders();
    const formData = new FormData();

    // Create the file object
    const filename = uri.split('/').pop() || 'profile.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    // @ts-ignore
    formData.append('image', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type,
    });

    const response = await axios.post(`${API_URL}/upload/profile`, formData, {
        headers: {
            ...headers,
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data.url;
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

export const updateHousieStatus = async (gameCode: string, status: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.patch(`${API_URL}/housie/${gameCode}/status`, { status }, { headers });
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
export const fetchMemories = async (groupId: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/memories/group/${groupId}`, { headers });
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

// --- HISAAB API ---
export const fetchHisaabBalances = async () => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/hisaab/balances`, { headers });
    return response.data.balances;
};

export const fetchHisaabLedger = async (groupId: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/hisaab/ledger/${groupId}`, { headers });
    return response.data.ledger;
};

export const fetchHisaabMembers = async (groupId: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/hisaab/members/${groupId}`, { headers });
    return response.data.members;
};

export const createHisaabExpense = async (expenseData: any) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/hisaab/expense`, expenseData, { headers });
    return response.data;
};

export const settleHisaabBalance = async (groupId: string, toUserId: string, amount: number) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/hisaab/settle`, { groupId, toUserId, amount }, { headers });
    return response.data;
};
