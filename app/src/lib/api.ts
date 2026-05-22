import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppVersionHeaders } from './appVersion';
import type { CreatePlanPayload, Plan, PlanActivity, PlanStatus, SubmitPlanRsvpPayload } from '../types/plans';

export const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface AppVersionStatus {
    success: boolean;
    platform: 'android' | 'ios';
    forceUpdate: boolean;
    recommendUpdate: boolean;
    currentBuild: number;
    minimumSupportedBuild: number;
    latestBuild: number;
    minimumSupportedVersion: string;
    latestVersion: string;
    message: string;
    storeUrl: string;
    isUpdateRequired: boolean;
    minimumVersion: string;
    minimumBuildNumber: number;
}

export const fetchAppVersionStatus = async (params: {
    platform: string;
    version: string;
    buildNumber: string | number;
}): Promise<AppVersionStatus> => {
    const response = await axios.get(`${API_URL}/app-version`, { params, timeout: 8000 });
    return response.data;
};

// Helper to get auth headers
export const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('mandali_token');
    return {
        'Authorization': `Bearer ${token}`,
        ...getAppVersionHeaders(),
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

export const markMemoriesAsSeen = async (groupId: string) => {
    const headers = await getAuthHeaders();
    await axios.post(`${API_URL}/groups/${groupId}/seen-memories`, {}, { headers });
};


/**
 * Optimizes Cloudinary retrieval URLs by injecting delivery transformations.
 * Allows grabbing the exact size needed from the CDN (e.g. 'w_400,q_auto,f_auto' for thumbnails)
 */
export const getOptimizedImageUrl = (url: string, transformations: string = 'q_auto,f_auto') => {
    if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) return url;

    // Ensure we don't double-transform if the URL already has some
    if (url.includes('/upload/')) {
        const parts = url.split('/upload/');

        const fPath = `${parts[0]}/upload/${transformations}/${parts[1]}`;
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
        uri: uri,
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
        uri: uri,
        name: filename,
        type: 'image/jpeg',
    });

    formData.append('api_key', signData.apiKey);
    formData.append('timestamp', signData.timestamp);
    formData.append('signature', signData.signature);
    if (signData.uploadPreset) formData.append('upload_preset', signData.uploadPreset);
    if (signData.folder) formData.append('folder', signData.folder);
    if (signData.public_id) formData.append('public_id', signData.public_id);
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
export interface HousieSettings {
    callingMode: 'manual' | 'auto';
    autoCallSeconds: number;
    hostTickets: number;
    ticketDifficulty: string;
    gameStyle: string;
    prizes?: any[];
}

export const createHousieGame = async (groupId: string, settings?: HousieSettings, title?: string, scheduledAt?: string, ticketPrice: number = 100): Promise<any> => {
    const headers = await getAuthHeaders();
    // Move prizes out of settings to the top level for the backend to handle specifically if needed
    const { prizes, ...otherSettings } = settings || {};
    const response = await axios.post(`${API_URL}/housie/create`, {
        groupId,
        settings: otherSettings,
        prizes,
        title,
        scheduledAt,
        ticketPrice
    }, { headers });
    return response.data;
};


export const fetchHousieGame = async (gameCode: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/housie/${gameCode}?t=${Date.now()}`, { headers });
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
    const response = await axios.get(`${API_URL}/housie/active/${groupId}?t=${Date.now()}`, { headers });
    return response.data;
};

export const fetchHousieGroupGames = async (groupId: string): Promise<{ games: any[] }> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/housie/group/${groupId}/list`, { headers });
    return response.data;
};

export const joinHousieGame = async (gameCode: string, ticketCount: number): Promise<{ success: boolean, tickets: any[] }> => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/housie/${gameCode}/join`, { ticketCount }, { headers });
    return response.data;
};

export const updateHousieTicketCount = async (gameCode: string, newCount: number): Promise<{ success: boolean, newCount: number }> => {
    const headers = await getAuthHeaders();
    const response = await axios.patch(`${API_URL}/housie/${gameCode}/tickets/update`, { newCount }, { headers });
    return response.data;
};

export const fetchHousieTickets = async (gameCode: string): Promise<{ tickets: any[] }> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/housie/${gameCode}/tickets?t=${Date.now()}`, { headers });
    return response.data;
};

export const fetchHousieParticipants = async (gameCode: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/housie/${gameCode}/participants`, { headers });
    return response.data;
};

export const fetchHousiePrizeCatalogue = async (mode: 'auto' | 'manual'): Promise<{ prizes: any[]; allowCustom: boolean }> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/housie/prizes?mode=${mode}`, { headers });
    return response.data;
};

export const fetchHousieGameStyles = async (): Promise<{ styles: any[] }> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/housie/styles`, { headers });
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

export const pauseHousieGame = async (gameCode: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/housie/${gameCode}/pause`, {}, { headers });
    return response.data;
};

export const resumeHousieGame = async (gameCode: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/housie/${gameCode}/resume`, {}, { headers });
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

// --- MEMORY COMMENTS API ---
export const fetchMemoryComments = async (memoryId: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/memories/${memoryId}/comments`, { headers });
    return response.data.comments;
};

export const createMemoryComment = async (memoryId: string, comment: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/memories/${memoryId}/comments`, { comment }, { headers });
    return response.data;
};

export const deleteMemoryComment = async (commentId: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_URL}/memories/comments/${commentId}`, { headers });
    return response.data;
};

// --- MEMORY REACTIONS API ---
export const fetchMemoryReactions = async (memoryId: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/memories/${memoryId}/reactions`, { headers });
    return response.data;
};

export const toggleMemoryReaction = async (memoryId: string, reaction: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/memories/${memoryId}/reactions`, { reaction }, { headers });
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

export const settleHisaabBalance = async (groupId: string, toUserId: string, amount: number, fromUserId?: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/hisaab/settle`, { groupId, fromUserId, toUserId, amount }, { headers });
    return response.data;
};

// --- CONFIG API ---
export const fetchAppConfig = async () => {
    const response = await axios.get(`${API_URL}/config/app-config`);
    return response.data;
};

export const deleteHisaabExpense = async (id: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_URL}/hisaab/expense/${id}`, { headers });
    return response.data;
};

export const deleteHisaabSettlement = async (id: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_URL}/hisaab/settlement/${id}`, { headers });
    return response.data;
};

export const updateHisaabExpense = async (id: string, expenseData: any) => {
    const headers = await getAuthHeaders();
    const response = await axios.put(`${API_URL}/hisaab/expense/${id}`, expenseData, { headers });
    return response.data;
};

export const fetchHisaabExpenseDetail = async (id: string) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/hisaab/expense/${id}`, { headers });
    return response.data;
};

// --- BLINK API ---
export const fetchBlinkGroupGames = async (groupId: string): Promise<{ games: any[] }> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/blink/games/group/${groupId}`, { headers });
    return response.data;
};

export const fetchBlinkGame = async (gameCode: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/blink/games/${gameCode.toUpperCase()}?t=${Date.now()}`, { headers });
    return response.data;
};

export const createBlinkGame = async (gameData: {
    groupId: string;
    title?: string;
    maxPlayers?: number;
    cardsPerPlayer?: number;
    symbolsPerCard?: number;
    theme?: string;
    isScheduled?: boolean;
    scheduledAt?: string;
}): Promise<any> => {
    const headers = await getAuthHeaders();
    const endpoint = gameData.isScheduled ? `${API_URL}/blink/games/schedule` : `${API_URL}/blink/games`;
    try {
        const response = await axios.post(endpoint, gameData, { headers });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Failed to create Blink game');
    }
};

export const cancelBlinkGame = async (gameCode: string, reason?: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/blink/games/${gameCode.toUpperCase()}/cancel`, { reason }, { headers });
    return response.data;
};

export const joinBlinkGame = async (gameCode: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/blink/games/${gameCode}/join`, {}, { headers });
    return response.data;
};

export const startBlinkGame = async (gameCode: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/blink/games/${gameCode.toUpperCase()}/start`, {}, { headers });
    return response.data;
};

export const fetchBlinkPlayers = async (gameCode: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/blink/games/${gameCode.toUpperCase()}/players`, { headers });
    return response.data;
};

export const fetchBlinkPlayer = async (gameCode: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/blink/games/${gameCode.toUpperCase()}/player`, { headers });
    return response.data;
};

export const endBlinkGame = async (gameCode: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/blink/games/${gameCode.toUpperCase()}/end`, {}, { headers });
    return response.data;
};

// --- PLANS API ---
export const fetchPlanActivities = async (groupId: string, q?: string): Promise<{ activities: PlanActivity[] }> => {
    const headers = await getAuthHeaders();
    const params: Record<string, string> = { groupId };
    if (q?.trim()) params.q = q.trim();
    const response = await axios.get(`${API_URL}/plans/activities`, { headers, params });
    return response.data;
};

export const createPlanActivity = async (groupId: string, name: string): Promise<{ activity: PlanActivity }> => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/plans/activities`, { groupId, name }, { headers });
    return response.data;
};

export const createPlan = async (payload: CreatePlanPayload): Promise<{ plan: Plan }> => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/plans`, payload, { headers });
    return response.data;
};

export const fetchPlans = async (status?: PlanStatus): Promise<{ plans: Plan[] }> => {
    const headers = await getAuthHeaders();
    const params = status ? { status } : {};
    const response = await axios.get(`${API_URL}/plans`, { headers, params });
    return response.data;
};

export const fetchPlanById = async (id: string): Promise<{ plan: Plan }> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/plans/${id}`, { headers });
    return response.data;
};

export const submitPlanRsvp = async (planId: string, payload: SubmitPlanRsvpPayload): Promise<{ plan: Plan }> => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/plans/${planId}/rsvp`, payload, { headers });
    return response.data;
};

export const cancelPlan = async (planId: string): Promise<{ success: boolean }> => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_URL}/plans/${planId}`, { headers });
    return response.data;
};

export const completePlan = async (planId: string): Promise<{ plan: Plan }> => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/plans/${planId}/close`, {}, { headers });
    return response.data;
};
