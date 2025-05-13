// src/components/ai/lookalike-generator.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

interface LookalikeGeneratorProps {
  sourceRules: any;
  onLookalikeGenerated: (rules: any) => void;
}

export default function LookalikeGenerator({ sourceRules, onLookalikeGenerated }: LookalikeGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [lookalike, setLookalike] = useState<any>(null);
  const { token } = useAuthStore();
  
  const generateLookalike = async () => {
    if (!sourceRules || !sourceRules.conditions || sourceRules.conditions.length === 0) {
      toast.error('Valid source rules are required');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ai/lookalike-audience`,
        { sourceRules },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.rules) {
        setLookalike(response.data.rules);
      } else {
        toast.error('Failed to generate lookalike audience');
      }
    } catch (error) {
      console.error('Error generating lookalike audience:', error);
      toast.error('Failed to generate similar audience');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUseRules = () => {
    if (lookalike) {
      onLookalikeGenerated(lookalike);
      setOpen(false);
      toast.success('Lookalike audience applied');
    }
  };
  
  // Format rules for display
  const formatRules = (rules: any) => {
    if (!rules) return '{}';
    
    try {
      return JSON.stringify(rules, null, 2);
    } catch (e) {
      return String(rules);
    }
  };
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1"
      >
        <UserPlus size={14} />
        <span>Generate Similar Audience</span>
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lookalike Audience Generator</DialogTitle>
            <DialogDescription>
              Create a similar audience based on your current segment rules
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Source Audience Rules</h3>
              <div className="bg-muted p-3 rounded-md overflow-auto max-h-80">
                <pre className="text-xs">{formatRules(sourceRules)}</pre>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Generated Lookalike Audience</h3>
              <div className="bg-muted p-3 rounded-md overflow-auto max-h-80">
                {lookalike ? (
                  <pre className="text-xs">{formatRules(lookalike)}</pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    {isLoading ? (
                      <div className="flex space-x-2">
                        <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                        <div className="h-2 w-2 bg-primary rounded-full animate-bounce delay-150" />
                        <div className="h-2 w-2 bg-primary rounded-full animate-bounce delay-300" />
                      </div>
                    ) : (
                      "Click generate to create a lookalike audience"
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex justify-between items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={generateLookalike}
                disabled={isLoading}
              >
                {isLoading ? 'Generating...' : 'Generate Lookalike'}
              </Button>
              <Button
                onClick={handleUseRules}
                disabled={!lookalike}
              >
                Use These Rules
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}