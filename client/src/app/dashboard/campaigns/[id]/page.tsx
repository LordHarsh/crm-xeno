// src/app/dashboard/campaigns/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import CampaignPerformance from '@/components/campaigns/campaign-performance';
import AbTestResults from '@/components/campaigns/ab-test-results';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CampaignDetailsPage() {
  const [campaign, setCampaign] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { id } = useParams();
  const { token } = useAuthStore();
  const router = useRouter();
  
  useEffect(() => {
    fetchCampaign();
  }, [id]);
  
  const fetchCampaign = async () => {
    setIsLoading(true);
    
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/campaigns/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setCampaign(response.data);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign details');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  if (!campaign) {
    return (
      <div className="p-6">
        <div className="bg-muted p-6 rounded-md text-center">
          <h2 className="text-xl font-bold mb-2">Campaign Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The campaign you&apos;re looking for could not be found.
          </p>
          <Button onClick={() => router.push('/dashboard/campaigns')}>
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => router.push('/dashboard/campaigns')}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-bold">{campaign.name}</h1>
      </div>
      
      <Tabs defaultValue="overview">
        <TabsList className="w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          {campaign.isAbTest && <TabsTrigger value="ab-test">A/B Test Results</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="overview" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                    <p>{campaign.status}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Created At</h3>
                    <p>{new Date(campaign.createdAt).toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Audience Size</h3>
                    <p>{campaign.audienceSize || 'Not available'}</p>
                  </div>
                  
                  {campaign.isAbTest ? (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">A/B Test</h3>
                      <p>This campaign is testing two message variants</p>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Message Template</h3>
                      <p className="p-3 bg-muted rounded-md text-sm">
                        {campaign.messageTemplate}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Segment Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-80">
                  {JSON.stringify(campaign.segmentRules, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="performance" className="pt-4">
          <CampaignPerformance 
            campaignId={id as string} 
            campaignName={campaign.name}
            hasEngagementData={campaign.hasEngagementData}
          />
        </TabsContent>
        
        {campaign.isAbTest && (
          <TabsContent value="ab-test" className="pt-4">
            {campaign.abTestResults ? (
              <AbTestResults 
                results={campaign.abTestResults}
                variantA={campaign.variants[0].messageTemplate}
                variantB={campaign.variants[1].messageTemplate}
              />
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground mb-4">
                    A/B test results are not available yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}