// lib/api/campaigns.js
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const fetchCampaigns = async () => {
  const token = useAuthStore.getState().token;
  const response = await axios.get(
    `${BASE_URL}/api/campaigns`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const fetchCampaign = async (id: any) => {
  const token = useAuthStore.getState().token;
  const response = await axios.get(
    `${BASE_URL}/api/campaigns/${id}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const createCampaign = async (campaignData: any) => {
  const token = useAuthStore.getState().token;
  const response = await axios.post(
    `${BASE_URL}/api/campaigns`,
    campaignData,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const previewAudience = async (segmentRules: any) => {
  const token = useAuthStore.getState().token;
  const response = await axios.post(
    `${BASE_URL}/api/campaigns/preview-audience`,
    { segmentRules },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};