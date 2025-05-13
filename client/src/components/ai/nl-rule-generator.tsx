// src/components/ai/nl-rule-generator.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Wand2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

interface NLRuleGeneratorProps {
  onRulesGenerated: (rules: any) => void;
}

export default function NLRuleGenerator({ onRulesGenerated }: NLRuleGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { token } = useAuthStore();
  
  const handleGenerateRules = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description of your audience');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ai/segment-rules`,
        { prompt },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.rules) {
        onRulesGenerated(response.data.rules);
        toast.success('Rules generated successfully!');
        setOpen(false);
        setPrompt('');
      } else {
        toast.error('Failed to generate rules');
      }
    } catch (error) {
      console.error('Error generating rules:', error);
      toast.error('Failed to generate rules from your description');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Wand2 size={14} />
          <span>Generate Rules</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Describe Your Target Audience</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., People who spent over ₹5000 in the last 6 months and haven't shopped recently"
            rows={4}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Describe your target audience in natural language and we'll convert it to segmentation rules.
          </p>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerateRules} disabled={isLoading || !prompt.trim()}>
            {isLoading ? 'Generating...' : 'Generate Rules'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}