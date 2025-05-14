// src/components/campaigns/ab-test-creator.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import MessageGenerator from '@/components/ai/message-generator';
import { SplitSquareVertical, GaugeCircle, Dices } from 'lucide-react';

export default function AbTestCreator({ segmentRules }: { segmentRules: any }) {
  const [campaignName, setCampaignName] = useState('');
  const [variantA, setVariantA] = useState('Hi {name}, check out our exclusive offers just for you!');
  const [variantB, setVariantB] = useState('Hi {name}, we have some special deals we think you\'ll love!');
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuthStore();
  const router = useRouter();
  
  const handleVariantASelect = (message: string) => {
    setVariantA(message);
  };
  
  const handleVariantBSelect = (message: string) => {
    setVariantB(message);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campaignName.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    
    if (!variantA.trim() || !variantB.trim()) {
      toast.error('Both variants need message templates');
      return;
    }
    
    if (!segmentRules || !segmentRules.conditions || segmentRules.conditions.length === 0) {
      toast.error('Segment rules are required');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/demo-data/ab-test`,
        {
          campaignName,
          segmentRules,
          variantA,
          variantB
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('A/B test campaign created successfully!');
      router.push('/dashboard/campaigns');
    } catch (error) {
      console.error('Error creating A/B test campaign:', error);
      toast.error('Failed to create A/B test campaign');
    } finally {
      setIsLoading(false);
    }
  };
  
  const generateRandomVariants = async () => {
    try {
      setIsLoading(true);
      
      const promptPrefix = "Generate a marketing message for a generic promotion. The message should:";
      const promptA = `${promptPrefix} be direct and clear, using assertive language.`;
      const promptB = `${promptPrefix} be friendly and conversational, focusing on benefits.`;
      
      const [responseA, responseB] = await Promise.all([
        axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/ai/message-suggestions`,
          { objective: promptA },
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/ai/message-suggestions`,
          { objective: promptB },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ]);
      
      if (responseA.data.suggestions && responseA.data.suggestions.length) {
        setVariantA(responseA.data.suggestions[0]);
      }
      
      if (responseB.data.suggestions && responseB.data.suggestions.length) {
        setVariantB(responseB.data.suggestions[0]);
      }
      
      toast.success('Generated variant messages!');
    } catch (error) {
      console.error('Error generating variants:', error);
      toast.error('Failed to generate variant messages');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SplitSquareVertical />
          <span>Create A/B Test Campaign</span>
        </CardTitle>
        <CardDescription>
          Test different message variations to see which performs better
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="campaign-name">
              Campaign Name *
            </label>
            <Input
              id="campaign-name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Summer A/B Test Campaign"
              required
            />
          </div>
          
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={generateRandomVariants}
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              <Dices size={16} />
              <span>Generate Random Variants</span>
            </Button>
          </div>
          
          <Tabs defaultValue="variant-a">
            <TabsList className="w-full">
              <TabsTrigger value="variant-a" className="flex-1">Variant A</TabsTrigger>
              <TabsTrigger value="variant-b" className="flex-1">Variant B</TabsTrigger>
            </TabsList>
            
            <TabsContent value="variant-a" className="pt-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium" htmlFor="variant-a">
                    Message Template A *
                  </label>
                  <MessageGenerator onSelectMessage={handleVariantASelect} />
                </div>
                <Textarea
                  id="variant-a"
                  value={variantA}
                  onChange={(e) => setVariantA(e.target.value)}
                  rows={4}
                  placeholder="Hi {name}, here's a special offer for you!"
                  required
                  className="mb-2"
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{name}'} to include the customer&apos;s name in the message.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="variant-b" className="pt-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium" htmlFor="variant-b">
                    Message Template B *
                  </label>
                  <MessageGenerator onSelectMessage={handleVariantBSelect} />
                </div>
                <Textarea
                  id="variant-b"
                  value={variantB}
                  onChange={(e) => setVariantB(e.target.value)}
                  rows={4}
                  placeholder="Hi {name}, we have some amazing deals for you!"
                  required
                  className="mb-2"
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{name}'} to include the customer&apos;s name in the message.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/campaigns/create')}
          disabled={isLoading}
        >
          Back to Standard Campaign
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex items-center gap-1"
        >
          <GaugeCircle size={16} />
          <span>{isLoading ? 'Creating...' : 'Create A/B Test'}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}