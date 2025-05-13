// src/components/ai/campaign-insights.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';

interface Campaign {
  _id: string;
  stats?: {
    sent: number;
    failed: number;
    pending: number;
    total: number;
  };
}

interface CampaignInsightsProps {
  campaign: Campaign;
}

export default function CampaignInsights({ campaign }: CampaignInsightsProps) {
  const [insights, setInsights] = useState('');
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();
  
  useEffect(() => {
    if (campaign) {
      generateInsights();
    }
  }, [campaign]);
  
  const generateInsights = async () => {
    if (!campaign.stats || campaign.stats.total === 0) {
      setInsights('No insights available yet. Insights will be generated once the campaign has delivery data.');
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ai/campaign-insights`,
        { campaignId: campaign._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setInsights(response.data.insights);
    } catch (error) {
      console.error('Error generating insights:', error);
      setInsights('Failed to generate campaign insights.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="h-full">
      <CardContent className="p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex space-x-2">
              <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
              <div className="h-2 w-2 bg-primary rounded-full animate-bounce delay-150" />
              <div className="h-2 w-2 bg-primary rounded-full animate-bounce delay-300" />
            </div>
          </div>
        ) : (
          <p className="text-sm">{insights}</p>
        )}
      </CardContent>
    </Card>
  );
}