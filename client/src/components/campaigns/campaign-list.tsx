// src/components/campaigns/campaign-list.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import CampaignStats from './campaign-stats';
import CampaignInsights from '@/components/ai/campaign-insights';

interface Campaign {
  _id: string;
  name: string;
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
}

interface CampaignListProps {
  campaigns: Campaign[];
}

export default function CampaignList({ campaigns }: CampaignListProps) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-muted-foreground">No campaigns found</h3>
        <p className="mt-1">Create your first campaign to get started.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {campaigns.map((campaign) => (
        <Card key={campaign._id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{campaign.name}</CardTitle>
                <CardDescription>
                  Created {formatDistanceToNow(new Date(campaign.createdAt))} ago
                </CardDescription>
              </div>
              <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                {campaign.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Message Template:
              </h4>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">{campaign.messageTemplate}</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Delivery Statistics:
                </h4>
                <CampaignStats stats={campaign.stats} />
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  AI Insights:
                </h4>
                <CampaignInsights campaign={campaign} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}