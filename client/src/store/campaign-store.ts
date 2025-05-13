// src/store/campaign-store.ts
import { create } from 'zustand';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuthStore } from './auth-store';

type Campaign = {
  _id: string;
  name: string;
  segmentRules: any;
  messageTemplate: string;
  audienceSize: number;
  createdAt: string;
  status: string;
  stats?: {
    sent: number;
    failed: number;
    pending: number;
    total: number;
  };
};

type CampaignState = {
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  isLoading: boolean;
  audienceSize: number | null;
  
  // Actions
  fetchCampaigns: () => Promise<void>;
  fetchCampaign: (id: string) => Promise<Campaign | null>;
  createCampaign: (data: any) => Promise<string | null>;
  previewAudience: (segmentRules: any) => Promise<number | null>;
  resetAudienceSize: () => void;
};

export const useCampaignStore = create<CampaignState>()((set, get) => ({
  campaigns: [],
  currentCampaign: null,
  isLoading: false,
  audienceSize: null,
  
  fetchCampaigns: async () => {
    set({ isLoading: true });
    
    try {
      const token = useAuthStore.getState().token;
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/campaigns`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      set({ campaigns: response.data.data, isLoading: false });
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
      set({ isLoading: false });
    }
  },
  
  fetchCampaign: async (id: string) => {
    set({ isLoading: true, currentCampaign: null });
    
    try {
      const token = useAuthStore.getState().token;
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/campaigns/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const campaign = response.data;
      set({ currentCampaign: campaign, isLoading: false });
      return campaign;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign details');
      set({ isLoading: false });
      return null;
    }
  },
  
  createCampaign: async (data: any) => {
    set({ isLoading: true });
    
    try {
      const token = useAuthStore.getState().token;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/campaigns`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Campaign created successfully!');
      
      // Refresh campaign list
      get().fetchCampaigns();
      
      set({ isLoading: false });
      return response.data.campaignId;
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
      set({ isLoading: false });
      return null;
    }
  },
  
  previewAudience: async (segmentRules: any) => {
    set({ isLoading: true });
    
    try {
      const token = useAuthStore.getState().token;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/campaigns/preview-audience`,
        { segmentRules },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const size = response.data.audienceSize;
      set({ audienceSize: size, isLoading: false });
      
      if (size === 0) {
        toast.warning('No customers match these criteria');
      } else {
        toast.success(`Found ${size} matching customers`);
      }
      
      return size;
    } catch (error) {
      console.error('Error previewing audience:', error);
      toast.error('Failed to preview audience size');
      set({ isLoading: false });
      return null;
    }
  },
  
  resetAudienceSize: () => set({ audienceSize: null })
}));