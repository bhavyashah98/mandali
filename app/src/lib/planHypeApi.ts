import axios from 'axios';
import { API_URL, getAuthHeaders } from './api';
import type { PlanHypeData } from '../types/planHype';

const hypeUrl = (planId: string, path = '') => `${API_URL}/plans/${planId}/hype${path}`;

export async function fetchPlanHype(planId: string): Promise<PlanHypeData> {
    const headers = await getAuthHeaders();
    const response = await axios.get(hypeUrl(planId), { headers });
    return response.data;
}

export async function saveHypeOutfit(planId: string, text: string) {
    const headers = await getAuthHeaders();
    const response = await axios.put(hypeUrl(planId, '/outfit'), { text }, { headers });
    return response.data;
}

export async function saveHypeDressCode(planId: string, dressCode: string) {
    const headers = await getAuthHeaders();
    const response = await axios.put(hypeUrl(planId, '/dress-code'), { dressCode }, { headers });
    return response.data;
}

export async function addHypeShoutout(planId: string, message: string) {
    const headers = await getAuthHeaders();
    const response = await axios.post(hypeUrl(planId, '/shoutouts'), { message }, { headers });
    return response.data;
}

export async function reactToHypeShoutout(planId: string, shoutoutId: string, emoji: string) {
    const headers = await getAuthHeaders();
    const response = await axios.post(hypeUrl(planId, `/shoutouts/${shoutoutId}/reactions`), { emoji }, { headers });
    return response.data;
}

export async function voteHypeShow(planId: string, targetUserId: string, vote: boolean) {
    const headers = await getAuthHeaders();
    const response = await axios.post(hypeUrl(planId, '/show-votes'), { targetUserId, vote }, { headers });
    return response.data;
}

export async function betHypeCancel(planId: string, targetUserId: string) {
    const headers = await getAuthHeaders();
    const response = await axios.post(hypeUrl(planId, '/cancel-bets'), { targetUserId }, { headers });
    return response.data;
}

export async function voteHypePrediction(planId: string, questionId: string, targetUserId: string) {
    const headers = await getAuthHeaders();
    const response = await axios.post(hypeUrl(planId, '/prediction-votes'), { questionId, targetUserId }, { headers });
    return response.data;
}
