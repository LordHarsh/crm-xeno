// src/app/dashboard/campaigns/page.tsx
'use client';

import { useEffect } from 'react';
import { useCampaignStore } from '@/store/campaign-store';
import CampaignList from '@/components/campaigns/campaign-list';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';

export default function CampaignsPage() {
  const { campaigns, isLoading, fetchCampaigns } = useCampaignStore();
  const router = useRouter();
  
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-12 w-12 rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div>
      {campaigns.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center py-20">
          <h2 className="text-2xl font-bold mb-2">No Campaigns Yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first campaign to start engaging with your customers
          </p>
          <Button
            onClick={() => router.push('/dashboard/campaigns/create')}
            className="flex items-center gap-1"
          >
            <PlusCircle size={16} />
            <span>Create Campaign</span>
          </Button>
        </div>
      ) : (
        <CampaignList campaigns={campaigns} />
      )}
    </div>
  );
}