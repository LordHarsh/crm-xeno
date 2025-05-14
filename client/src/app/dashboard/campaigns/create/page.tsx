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
import LookalikeGenerator from '@/components/ai/lookalike-generator';
import SmartScheduling from '@/components/ai/smart-scheduling';
import ImageSuggestions from '@/components/ai/image-suggestions';
import AutoTagger from '@/components/ai/auto-tagger';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ArrowLeft, EyeIcon, Calendar, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AbTestCreator from '@/components/campaigns/ab-test-creator';
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
  const [scheduledDay, setScheduledDay] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [tags, setTags] = useState<string[]>([]);

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

  const handleScheduleSelect = (day: string, time: string) => {
    setScheduledDay(day);
    setScheduledTime(time);
  };

  const handleTagsGenerated = (newTags: string[]) => {
    setTags(newTags);
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

    const campaignData = {
      name: campaignName,
      segmentRules: rules,
      messageTemplate,
      tags,
      scheduledDay,
      scheduledTime
    };

    const campaignId = await createCampaign(campaignData);

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

      <Tabs defaultValue="standard">
        <TabsList className="w-full">
          <TabsTrigger value="standard" className="flex-1">Standard Campaign</TabsTrigger>
          <TabsTrigger value="ab-test" className="flex-1">A/B Test Campaign</TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="pt-4">

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
                  <div className="grid md:grid-cols-2 gap-6">
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
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Campaign Tags
                      </label>
                      <AutoTagger
                        name={campaignName}
                        segmentRules={rules}
                        messageTemplate={messageTemplate}
                        onTagsGenerated={handleTagsGenerated}
                      />
                    </div>

                    {(scheduledDay || scheduledTime) && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">
                          Scheduled Time
                        </label>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-muted-foreground" />
                          <span className="text-sm">{scheduledDay || 'Not scheduled'}</span>

                          {scheduledTime && (
                            <>
                              <Clock size={16} className="text-muted-foreground ml-4" />
                              <span className="text-sm">{scheduledTime}</span>
                            </>
                          )}

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setScheduledDay('');
                              setScheduledTime('');
                            }}
                            className="ml-auto text-xs"
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                    <div>
                      <CardTitle>Audience Segmentation</CardTitle>
                      <CardDescription>
                        Define who will receive your campaign
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <NLRuleGenerator onRulesGenerated={handleRuleChange} />
                      <LookalikeGenerator
                        sourceRules={rules}
                        onLookalikeGenerated={handleRuleChange}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DndProvider backend={HTML5Backend}>
                    <RuleBuilder
                      group={rules}
                      onChange={handleRuleChange}
                      onDelete={() => { }}
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
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                    <div>
                      <CardTitle>Message Template</CardTitle>
                      <CardDescription>
                        Create the message that will be sent to your audience
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <MessageGenerator onSelectMessage={handleMessageSelect} />
                      <SmartScheduling
                        onTimeSelected={handleScheduleSelect}
                      />
                      <ImageSuggestions
                        messageTemplate={messageTemplate}
                        audience={audienceSize ? `${audienceSize} customers` : undefined}
                      />
                    </div>
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
        </TabsContent>

        <TabsContent value="ab-test" className="pt-4">
          <AbTestCreator segmentRules={rules} />
        </TabsContent>
      </Tabs>
    </div>
  );
}