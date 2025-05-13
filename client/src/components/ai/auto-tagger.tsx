// src/components/ai/auto-tagger.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth-store';

interface AutoTaggerProps {
    name: string;
    segmentRules: any;
    messageTemplate: string;
    // src/components/ai/auto-tagger.tsx (continued)
    onTagsGenerated: (tags: string[]) => void;
}

export default function AutoTagger({ name, segmentRules, messageTemplate, onTagsGenerated }: AutoTaggerProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const { token } = useAuthStore();

    const generateTags = async () => {
        if (!messageTemplate && !segmentRules) {
            toast.error('Campaign details are required to generate tags');
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/ai/auto-tag`,
                { name, segmentRules, messageTemplate },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.tags && Array.isArray(response.data.tags)) {
                setTags(response.data.tags);
                onTagsGenerated(response.data.tags);
                toast.success('Tags generated successfully!');
            } else {
                toast.error('Failed to generate tags');
            }
        } catch (error) {
            console.error('Error generating tags:', error);
            toast.error('Failed to generate campaign tags');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateTags}
                    disabled={isLoading}
                    className="flex items-center gap-1"
                >
                    <Tag size={14} />
                    <span>{isLoading ? 'Generating...' : 'Auto-Generate Tags'}</span>
                </Button>
            </div>

            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                            {tag}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}