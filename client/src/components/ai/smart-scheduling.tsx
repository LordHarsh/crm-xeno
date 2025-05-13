// src/components/ai/smart-scheduling.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

interface SchedulingProps {
  campaignType?: string;
  onTimeSelected: (day: string, time: string) => void;
}

export default function SmartScheduling({ campaignType = 'marketing', onTimeSelected }: SchedulingProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    bestDays: string[];
    bestTimes: string[];
    reasoning: string;
    audienceSpecific: {
      [key: string]: {
        days: string[];
        times: string[];
      }
    }
  } | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const { token } = useAuthStore();
  
  useEffect(() => {
    if (open && !suggestions) {
      fetchSuggestions();
    }
  }, [open]);
  
  const fetchSuggestions = async () => {
    setIsLoading(true);
    
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ai/scheduling-suggestions`,
        {
          params: { campaignType },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setSuggestions(response.data);
    } catch (error) {
      console.error('Error fetching scheduling suggestions:', error);
      toast.error('Failed to load scheduling suggestions');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelectTime = (day: string, time: string) => {
    onTimeSelected(day, time);
    setOpen(false);
    toast.success(`Scheduled for ${day} at ${time}`);
  };
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1"
      >
        <Clock size={14} />
        <span>Smart Scheduling</span>
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smart Scheduling Suggestions</DialogTitle>
            <DialogDescription>
              AI-recommended times to send your campaign based on engagement patterns
            </DialogDescription>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="flex space-x-2">
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce delay-150" />
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce delay-300" />
              </div>
            </div>
          ) : suggestions ? (
            <div className="py-4">
              <Tabs defaultValue="general" onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="general">General</TabsTrigger>
                  {suggestions.audienceSpecific && Object.keys(suggestions.audienceSpecific).map(audience => (
                    <TabsTrigger key={audience} value={audience}>
                      {audience.charAt(0).toUpperCase() + audience.slice(1)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                <TabsContent value="general" className="pt-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Recommended Days</h3>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.bestDays.map(day => (
                          <div 
                            key={day}
                            className="px-3 py-1 bg-secondary rounded-full text-sm cursor-pointer hover:bg-secondary/80"
                            onClick={() => handleSelectTime(day, suggestions.bestTimes[0])}
                          >
                            {day}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Recommended Times</h3>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.bestTimes.map(time => (
                          <div 
                            key={time}
                            className="px-3 py-1 bg-secondary rounded-full text-sm cursor-pointer hover:bg-secondary/80"
                            onClick={() => handleSelectTime(suggestions.bestDays[0], time)}
                          >
                            {time}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Reasoning</h3>
                      <p className="text-sm text-muted-foreground">{suggestions.reasoning}</p>
                    </div>
                  </div>
                </TabsContent>
                
                {suggestions.audienceSpecific && Object.entries(suggestions.audienceSpecific).map(([audience, data]) => (
                  <TabsContent key={audience} value={audience} className="pt-4">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Recommended Days for {audience}</h3>
                        <div className="flex flex-wrap gap-2">
                          {data.days.map(day => (
                            <div 
                              key={day}
                              className="px-3 py-1 bg-secondary rounded-full text-sm cursor-pointer hover:bg-secondary/80"
                              onClick={() => handleSelectTime(day, data.times[0])}
                            >
                              {day}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2">Recommended Times for {audience}</h3>
                        <div className="flex flex-wrap gap-2">
                          {data.times.map(time => (
                            <div 
                              key={time}
                              className="px-3 py-1 bg-secondary rounded-full text-sm cursor-pointer hover:bg-secondary/80"
                              onClick={() => handleSelectTime(data.days[0], time)}
                            >
                              {time}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Failed to load scheduling data</p>
              <Button 
                variant="outline"
                size="sm"
                onClick={fetchSuggestions}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}