// src/app/dashboard/campaigns/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';
import { useCampaignStore } from '@/store/campaign-store';
import RuleBuilder from '@/components/campaigns/rule-builder/rule-builder';
import NLRuleGenerator from '@/components/ai/nl-rule-generator';
import MessageGenerator from '@/components/ai/message-generator';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ArrowLeft, Wand2, EyeIcon } from 'lucide-react';

// Initial rule structure
const initialRule = {
  operator: 'AND',
  conditions: [
    { field: 'totalSpend', condition: '>', value: '' }
  ]
};

export default function CreateCampaignPage() {
  const [campaignName, setCampaignName] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('Hi {name}, here\'s a special offer for you!');
  const [rules, setRules] = useState(initialRule);
  
  const { audienceSize, previewAudience, createCampaign, isLoading, resetAudienceSize } = useCampaignStore();
  const router = useRouter();
  
  const handleRuleChange = (newRules: any) => {
    setRules(newRules);
    resetAudienceSize();
  };
  
  const handlePreviewAudience = async () => {
    if (!rules.conditions || rules.conditions.length === 0) {
      toast.error('Please add at least one condition');
      return;
    }
    
    await previewAudience(rules);
  };
  
  const handleMessageSelect = (message: string) => {
    setMessageTemplate(message);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campaignName.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    
    if (!messageTemplate.trim()) {
      toast.error('Message template is required');
      return;
    }
    
    if (!rules.conditions || rules.conditions.length === 0) {
      toast.error('Please add at least one condition');
      return;
    }
    
    const campaignId = await createCampaign({
      name: campaignName,
      segmentRules: rules,
      messageTemplate
    });
    
    if (campaignId) {
      router.push('/dashboard/campaigns');
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push('/dashboard/campaigns')}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-bold">Create New Campaign</h1>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>
                Basic information about your campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="name">
                    Campaign Name *
                  </label>
                  <Input
                    id="name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Summer Sale Campaign"
                    required
                    className="max-w-md"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Audience Segmentation</CardTitle>
                  <CardDescription>
                    Define who will receive your campaign
                  </CardDescription>
                </div>
                <NLRuleGenerator onRulesGenerated={handleRuleChange} />
              </div>
            </CardHeader>
            <CardContent>
              <DndProvider backend={HTML5Backend}>
                <RuleBuilder
                  group={rules}
                  onChange={handleRuleChange}
                  onDelete={() => {}}
                  isRoot={true}
                />
              </DndProvider>
              
              <div className="flex justify-end mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviewAudience}
                  disabled={isLoading}
                  className="flex items-center gap-1"
                >
                  <EyeIcon size={16} />
                  <span>Preview Audience</span>
                </Button>
              </div>
              
              {audienceSize !== null && (
                <div className={`p-4 mt-4 rounded-md border ${audienceSize === 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                  {audienceSize === 0 
                    ? "No customers match these criteria. Please adjust your rules."
                    : `This campaign will target ${audienceSize} customer${audienceSize !== 1 ? 's' : ''}.`
                  }
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Message Template</CardTitle>
                  <CardDescription>
                    Create the message that will be sent to your audience
                  </CardDescription>
                </div>
                <MessageGenerator onSelectMessage={handleMessageSelect} />
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                rows={4}
                placeholder="Hi {name}, here's a special offer for you!"
                required
              />
              <p className="mt-2 text-sm text-muted-foreground">
                Use {'{name}'} to include the customer&apos;s name in the message.
              </p>
            </CardContent>
          </Card>
          
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/campaigns')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Campaign'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}