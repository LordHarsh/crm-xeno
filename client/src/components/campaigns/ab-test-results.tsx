// src/components/campaigns/ab-test-results.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Crown, ThumbsUp, ThumbsDown, Info } from 'lucide-react';

interface AbTestResultsProps {
    results: {
        prediction: {
            winner: string;
            rationale: string;
            marginOfVictory: string;
        };
        metrics: {
            variantA: {
                openRate: number;
                clickRate: number;
                conversionRate: number;
                engagementScore: number;
            };
            variantB: {
                openRate: number;
                clickRate: number;
                conversionRate: number;
                engagementScore: number;
            };
        };
        insightsAndRecommendations: string[];
    };
    variantA: string;
    variantB: string;
}

export default function AbTestResults({ results, variantA, variantB }: AbTestResultsProps) {
    const { prediction, metrics, insightsAndRecommendations } = results;

    // Format metrics for chart
    const chartData = [
        { name: 'Open Rate', 'Variant A': metrics.variantA.openRate * 100, 'Variant B': metrics.variantB.openRate * 100 },
        { name: 'Click Rate', 'Variant A': metrics.variantA.clickRate * 100, 'Variant B': metrics.variantB.clickRate * 100 },
        { name: 'Conversion Rate', 'Variant A': metrics.variantA.conversionRate * 100, 'Variant B': metrics.variantB.conversionRate * 100 }
    ];

    // Calculate engagement score difference
    const scoreA = metrics.variantA.engagementScore;
    const scoreB = metrics.variantB.engagementScore;
    const maxScore = Math.max(scoreA, scoreB);
    const scoreAPercentage = (scoreA / maxScore) * 100;
    const scoreBPercentage = (scoreB / maxScore) * 100;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Crown className={prediction.winner === 'Variant A' ? 'text-yellow-500' : 'text-blue-500'} size={20} />
                    A/B Test Results
                </CardTitle>
                <CardDescription>
                    Performance comparison of message variants
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 border rounded-md bg-muted/50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">Winning Variant: {prediction.winner}</h3>
                        <Badge variant="outline">
                            {prediction.marginOfVictory} better performance
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        {prediction.rationale}
                    </p>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-1">
                                    <Badge variant={prediction.winner === 'Variant A' ? 'default' : 'secondary'}>A</Badge>
                                    <span className="text-sm">Engagement Score: {metrics.variantA.engagementScore.toFixed(1)}</span>
                                </div>
                                {prediction.winner === 'Variant A' ? (
                                    <ThumbsUp size={16} className="text-green-500" />
                                ) : (
                                    <ThumbsDown size={16} className="text-red-500" />
                                )}
                            </div>
                            <Progress value={scoreAPercentage} className="h-2" />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-1">
                                    <Badge variant={prediction.winner === 'Variant B' ? 'default' : 'secondary'}>B</Badge>
                                    <span className="text-sm">Engagement Score: {metrics.variantB.engagementScore.toFixed(1)}</span>
                                </div>
                                {prediction.winner === 'Variant B' ? (
                                    <ThumbsUp size={16} className="text-green-500" />
                                ) : (
                                    <ThumbsDown size={16} className="text-red-500" />
                                )}
                            </div>
                            <Progress value={scoreBPercentage} className="h-2" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-medium mb-2">Message Variants</h3>
                        <div className="space-y-4">
                            <div className="p-3 border rounded-md">
                                <div className="flex items-center gap-1 mb-1">
                                    <Badge variant="outline">A</Badge>
                                    <span className="text-sm font-medium">Variant A</span>
                                </div>
                                <p className="text-sm">{variantA}</p>
                            </div>

                            <div className="p-3 border rounded-md">
                                <div className="flex items-center gap-1 mb-1">
                                    <Badge variant="outline">B</Badge>
                                    <span className="text-sm font-medium">Variant B</span>
                                </div>
                                <p className="text-sm">{variantB}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-medium mb-2">Performance Metrics</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis unit="%" />
                                    <Tooltip formatter={(value) => [typeof value === 'number' ? `${value.toFixed(1)}%` : `${value}%`, '']} />
                                    <Legend />
                                    <Bar dataKey="Variant A" fill="#8884d8" />
                                    <Bar dataKey="Variant B" fill="#82ca9d" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-medium mb-2 flex items-center gap-1">
                        <Info size={16} />
                        Insights & Recommendations
                    </h3>
                    <ul className="space-y-2">
                        {insightsAndRecommendations.map((item, index) => (
                            <li key={index} className="text-sm p-2 border-l-2 border-primary pl-2">
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}