// src/components/ai/image-suggestions.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Image } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

interface ImageSuggestionsProps {
  messageTemplate: string;
  audience?: string;
}

interface ImageSuggestion {
  concept: string;
  rationale: string;
  colorScheme: string;
}

export default function ImageSuggestions({ messageTemplate, audience }: ImageSuggestionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<ImageSuggestion[]>([]);
  const { token } = useAuthStore();
  
  const generateSuggestions = async () => {
    if (!messageTemplate) {
      toast.error('Message template is required');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ai/image-suggestions`,
        { messageTemplate, audience },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.suggestions && Array.isArray(response.data.suggestions)) {
        setSuggestions(response.data.suggestions);
      } else {
        toast.error('Failed to generate image suggestions');
      }
    } catch (error) {
      console.error('Error generating image suggestions:', error);
      toast.error('Failed to generate image ideas');
    } finally {
      setIsLoading(false);
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
        <Image size={14} />
        <span>Image Ideas</span>
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Campaign Image Suggestions</DialogTitle>
            <DialogDescription>
              AI-recommended image concepts that match your message
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-4 p-3 bg-muted rounded-md">
              <h3 className="text-sm font-medium mb-1">Your Message:</h3>
              <p className="text-sm italic">&ldquo;{messageTemplate}&rdquo;</p>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="flex space-x-2">
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce delay-150" />
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce delay-300" />
                </div>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {suggestions.map((suggestion, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <h3 className="text-sm font-medium">Concept {index + 1}</h3>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground">Description</h4>
                        <p className="text-sm">{suggestion.concept}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground">Colors</h4>
                        <p className="text-sm">{suggestion.colorScheme}</p>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <p className="text-xs text-muted-foreground italic">{suggestion.rationale}</p>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-2">Click generate to get image suggestions</p>
                <Button onClick={generateSuggestions}>
                  Generate Image Ideas
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            {suggestions.length > 0 && (
              <Button onClick={generateSuggestions} disabled={isLoading}>
                {isLoading ? 'Generating...' : 'Regenerate'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}