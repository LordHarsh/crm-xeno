// components/campaigns/SegmentBuilder/RuleBuilder.jsx
'use client';

import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import RuleGroup from './RuleGroup';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import useCampaignStore from '@/store/campaign-store';
import NaturalLanguageRules from '@/components/ai/NaturalLanguageRules';

const initialRule = {
  operator: 'AND',
  conditions: [
    { field: 'totalSpend', condition: '>', value: '' }
  ]
};

export default function RuleBuilder({ initialRules = null }) {
  const [rules, setRules] = useState(initialRules || initialRule);
  const [campaignName, setCampaignName] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('Hi {name}, here\'s a special offer for you!');
  const { audienceSize, previewAudience, createCampaign, isLoading, resetAudienceSize } = useCampaignStore();
  const router = useRouter();
  
  const handleRuleChange = (newRules) => {
    setRules(newRules);
    // Reset audience size preview when rules change
    resetAudienceSize();
  };
  
  const handlePreviewAudience = async () => {
    if (!rules.conditions || rules.conditions.length === 0) {
      toast.error('Please add at least one condition');
      return;
    }
    
    await previewAudience(rules);
  };
  
  const handleSubmit = async (e) => {
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
    
    // Submit campaign
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
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Create New Campaign</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Name
          </label>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Summer Sale Campaign"
            required
          />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Audience Segmentation Rules
            </label>
            <NaturalLanguageRules onRulesGenerated={handleRuleChange} />
          </div>
          
          <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
            <DndProvider backend={HTML5Backend}>
              <RuleGroup
                group={rules}
                onChange={handleRuleChange}
                onDelete={() => {}}
                isRoot={true}
              />
            </DndProvider>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handlePreviewAudience}
            variant="secondary"
            className="mr-2"
            isLoading={isLoading}
          >
            Preview Audience
          </Button>
        </div>
        
        {audienceSize !== null && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800">
              {audienceSize === 0 ? (
                "No customers match these criteria. Please adjust your rules."
              ) : (
                `This campaign will target ${audienceSize} customer${audienceSize !== 1 ? 's' : ''}.`
              )}
            </p>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message Template
          </label>
          <textarea
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={3}
            placeholder="Hi {name}, here's a special offer for you!"
            required
          ></textarea>
          <p className="mt-1 text-sm text-gray-500">
            Use {'{name}'} to include the customer's name in the message.
          </p>
        </div>
        
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => router.push('/dashboard/campaigns')}
            variant="secondary"
            className="mr-2"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            isLoading={isLoading}
          >
            Create Campaign
          </Button>
        </div>
      </form>
    </div>
  );
}