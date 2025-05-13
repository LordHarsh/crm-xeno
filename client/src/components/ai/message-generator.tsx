// src/components/ai/message-generator.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

interface MessageGeneratorProps {
  onSelectMessage: (message: string) => void;
}

export default function MessageGenerator({ onSelectMessage }: MessageGeneratorProps) {
  const [objective, setObjective] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { token } = useAuthStore();
  
  const handleGenerateSuggestions = async () => {
    if (!objective.trim()) {
      toast.error('Please enter a campaign objective');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ai/message-suggestions`,
        { objective },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.suggestions && response.data.suggestions.length) {
        setSuggestions(response.data.suggestions);
      } else {
        toast.error('Failed to generate message suggestions');
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error('Failed to generate message suggestions');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelectMessage = (message: string) => {
    onSelectMessage(message);
    setOpen(false);
    toast.success('Message template selected!');
  };
  
  // Example objectives
  const exampleObjectives = [
    "Bring back inactive users",
    "Promote new product launch to high-value customers",
    "Encourage repeat purchases with a special discount",
    "Introduce loyalty program to frequent shoppers"
  ];
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Sparkles size={14} />
          <span>AI Suggestions</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Message Suggestions</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <label className="block text-sm font-medium mb-1" htmlFor="objective">
            Campaign Objective
          </label>
          <Input
            id="objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="E.g., bring back inactive users"
          />
          
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Or try one of these examples:</p>
            <div className="space-y-2">
              {exampleObjectives.map((example, index) => (
                <div 
                  key={index} 
                  className="text-sm p-2 bg-muted rounded-md cursor-pointer hover:bg-muted/80"
                  onClick={() => setObjective(example)}
                >
                  {example}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mb-4">
          <Button 
            onClick={handleGenerateSuggestions} 
            disabled={isLoading || !objective.trim()}
          >
            {isLoading ? 'Generating...' : 'Generate Ideas'}
          </Button>
        </div>
        
        {suggestions.length > 0 && (
          <div className="space-y-3 max-h-60 overflow-y-auto">
            <h4 className="text-sm font-medium">
              Select a message template:
            </h4>
            {suggestions.map((message, index) => (
              <div
                key={index}
                className="p-3 border rounded-md hover:bg-muted cursor-pointer"
                onClick={() => handleSelectMessage(message)}
              >
                <p className="text-sm">{message}</p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}