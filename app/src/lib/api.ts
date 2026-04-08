import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('mandali_token');
    return { Authorization: `Bearer ${token}` };
};

export interface Group {
    id: string;
    name: string;
    description?: string;
    type?: string;
    cover_photo_url: string | null;
    invite_code: string;
    admin_user_id: string;
    memberCount: number;
    myRole: string;
    created_at: string;
}

export interface GroupMember {
    id: string;
    role: string;
    joined_at: string;
    user_id: string;
    users: {
        id: string;
        name: string;
        phone: string;
        avatar_url: string | null;
    };
}

export interface GroupDetail {
    group: Group;
    members: GroupMember[];
    myRole: string;
}

// Fetch all groups for the current user
export const fetchGroups = async (): Promise<Group[]> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/groups`, { headers });
    return response.data.groups;
};

// Fetch a single group with members
export const fetchGroupDetail = async (groupId: string): Promise<GroupDetail> => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/groups/${groupId}`, { headers });
    return response.data;
};

// Create a new group
export const createGroup = async (data: {
    name: string;
    description: string;
    coverPhotoUrl: string | null;
}): Promise<{ group: Group }> => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/groups`, data, { headers });
    return response.data;
};

// Join a group by invite code
export const joinGroup = async (inviteCode: string): Promise<{ group: Group }> => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/groups/join`, { inviteCode }, { headers });
    return response.data;
};

// Upload an image
export const uploadImage = async (imageUri: string): Promise<string> => {
    const headers = await getAuthHeaders();
    
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    const formData = new FormData();
    formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
    } as any);

    const response = await axios.post(`${API_URL}/upload/image`, formData, { headers });
    return response.data.url;
};
