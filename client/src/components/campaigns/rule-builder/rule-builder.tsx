// src/components/campaigns/rule-builder/rule-builder.tsx
'use client';

import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useCampaignStore } from '@/store/campaign-store';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import RuleGroup from '@/components/campaigns/rule-builder/rule-group';
import NLRuleGenerator from '@/components/ai/nl-rule-generator';
import MessageGenerator from '@/components/ai/message-generator';
import { Wand2, EyeIcon } from 'lucide-react';

// Initial rule structure
const initialRule = {
  operator: 'AND',
  conditions: [
    { field: 'totalSpend', condition: '>', value: '' }
  ]
};

export default function RuleBuilder() {
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
  
  const handleMessageSelect = (message: string) => {
    setMessageTemplate(message);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="name">
            Campaign Name
          </label>
          <Input
            id="name"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Summer Sale Campaign"
            required
          />
        </div>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium">
            Audience Segmentation Rules
          </label>
          <NLRuleGenerator onRulesGenerated={handleRuleChange} />
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <DndProvider backend={HTML5Backend}>
              <RuleGroup
                group={rules}
                onChange={handleRuleChange}
                onDelete={() => {}}
                isRoot={true}
              />
            </DndProvider>
          </CardContent>
        </Card>
        
        <div className="flex justify-end mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviewAudience}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            <EyeIcon size={16} />
            <span>Preview Audience</span>
          </Button>
        </div>
        
        {audienceSize !== null && (
          <div className={`p-3 mt-2 rounded-md ${audienceSize === 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
            {audienceSize === 0 
              ? "No customers match these criteria. Please adjust your rules."
              : `This campaign will target ${audienceSize} customer${audienceSize !== 1 ? 's' : ''}.`
            }
          </div>
        )}
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium" htmlFor="message">
            Message Template
          </label>
          <MessageGenerator onSelectMessage={handleMessageSelect} />
        </div>
        <Textarea
          id="message"
          value={messageTemplate}
          onChange={(e) => setMessageTemplate(e.target.value)}
          rows={3}
          placeholder="Hi {name}, here's a special offer for you!"
          required
        />
        <p className="mt-1 text-sm text-muted-foreground">
          Use {'{name}'} to include the customer&apos;s name in the message.
        </p>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/campaigns')}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          Create Campaign
        </Button>
      </div>
    </form>
  );
}