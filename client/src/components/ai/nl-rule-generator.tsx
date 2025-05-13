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
  
  // Example prompts
  const examplePrompts = [
    "People who spent over ₹5000 in the last 6 months and haven't shopped recently",
    "Customers who visited more than 5 times but spent less than ₹2000",
    "Premium customers who are inactive for at least 30 days"
  ];
  
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
            Describe your target audience in natural language and we&apos;ll convert it to segmentation rules.
          </p>
          
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Or try one of these examples:</p>
            <div className="space-y-2">
              {examplePrompts.map((example, index) => (
                <div 
                  key={index} 
                  className="text-sm p-2 bg-muted rounded-md cursor-pointer hover:bg-muted/80"
                  onClick={() => setPrompt(example)}
                >
                  {example}
                </div>
              ))}
            </div>
          </div>
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