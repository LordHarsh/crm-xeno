// src/components/campaigns/campaign-performance.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import {
    ArrowUpRight,
    ArrowDownRight,
    MousePointerClick,
    Eye,
    ShoppingCart,
    Smartphone,
    Laptop,
    Tablet,
    RefreshCw,
    Play
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface CampaignPerformanceProps {
    campaignId: string;
    campaignName: string;
    hasEngagementData?: boolean;
}

export default function CampaignPerformance({ campaignId, campaignName, hasEngagementData = false }: CampaignPerformanceProps) {
    const [metrics, setMetrics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const { token } = useAuthStore();

    useEffect(() => {
        if (hasEngagementData) {
            fetchMetrics();
        }
    }, [campaignId, hasEngagementData]);

    const fetchMetrics = async () => {
        setIsLoading(true);

        try {
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/demo-data/campaign-metrics/${campaignId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMetrics(response.data);
        } catch (error) {
            console.error('Error fetching campaign metrics:', error);
            toast.error('Failed to load campaign metrics');
        } finally {
            setIsLoading(false);
        }
    };

    const simulateCampaignResponses = async () => {
        setIsSimulating(true);

        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/demo-data/simulate-responses`,
                { campaignId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success('Campaign response simulation completed!');
            fetchMetrics();
        } catch (error) {
            console.error('Error simulating campaign responses:', error);
            toast.error('Failed to simulate campaign responses');
        } finally {
            setIsSimulating(false);
        }
    };

    if (!hasEngagementData && !metrics) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Campaign Performance</CardTitle>
                    <CardDescription>
                        Simulate customer engagement to see campaign performance
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8">
                    <p className="text-center text-muted-foreground mb-4">
                        No engagement data available yet. Simulate customer responses to see how this campaign would perform.
                    </p>
                    <Button
                        onClick={simulateCampaignResponses}
                        disabled={isSimulating}
                        className="flex items-center gap-1"
                    >
                        {isSimulating ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                <span>Simulating...</span>
                            </>
                        ) : (
                            <>
                                <Play size={16} />
                                <span>Simulate Campaign Responses</span>
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Campaign Performance</CardTitle>
                    <CardDescription>Loading metrics...</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                </CardContent>
            </Card>
        );
    }

    if (!metrics) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Campaign Performance</CardTitle>
                    <CardDescription>Campaign metrics</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground">
                        Error loading metrics. Please try again.
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button onClick={fetchMetrics} variant="outline" size="sm">
                        Retry
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    // Format metrics for display
    const {
        delivery = { sent: 0, failed: 0, pending: 0, total: 0, deliveryRate: 0 },
        engagement = { opened: 0, clicked: 0, converted: 0, openRate: 0, clickRate: 0, conversionRate: 0 },
        devices = {},
        timeline = [],
        aiGenerated = null
    } = metrics;

    // Format timeline data for charts
    const timelineData = timeline.map((point: any) => ({
        ...point,
        hour: `Hour ${point.hour}`
    }));

    // Format device data for pie chart
    const deviceData = Object.entries(devices).map(([device, count]) => ({
        name: device,
        value: count
    }));

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                        <CardTitle>Campaign Performance</CardTitle>
                        <CardDescription>
                            Engagement metrics for {campaignName}
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchMetrics}
                        className="flex items-center gap-1"
                    >
                        <RefreshCw size={14} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="overview" onValueChange={setActiveTab}>
                    <TabsList className="w-full">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="timeline">Timeline</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        {aiGenerated && <TabsTrigger value="insights">AI Insights</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="overview" className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-muted-foreground">Delivery Rate</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-2xl font-bold">
                                                {(delivery.deliveryRate * 100).toFixed(1)}%
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {delivery.sent} of {delivery.total} delivered
                                            </p>
                                        </div>
                                        <Badge
                                            variant={delivery.deliveryRate > 0.9 ? "default" : "secondary"}
                                            className="flex items-center gap-1"
                                        >
                                            {delivery.deliveryRate > 0.9 ? (
                                                <ArrowUpRight size={12} />
                                            ) : (
                                                <ArrowDownRight size={12} />
                                            )}
                                            {delivery.deliveryRate > 0.9 ? "Good" : "Needs Improvement"}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-muted-foreground">Open Rate</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-2xl font-bold">
                                                {(engagement.openRate * 100).toFixed(1)}%
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {engagement.opened} of {delivery.sent} opened
                                            </p>
                                        </div>
                                        <Badge
                                            variant={engagement.openRate > 0.7 ? "default" :
                                                engagement.openRate > 0.5 ? "secondary" : "destructive"}
                                            className="flex items-center gap-1"
                                        >
                                            {engagement.openRate > 0.7 ? (
                                                <ArrowUpRight size={12} />
                                            ) : (
                                                <ArrowDownRight size={12} />
                                            )}
                                            {engagement.openRate > 0.7 ? "Good" :
                                                engagement.openRate > 0.5 ? "Average" : "Poor"}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-muted-foreground">Conversion Rate</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-2xl font-bold">
                                                {(engagement.overallConversionRate * 100).toFixed(1)}%
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {engagement.converted} conversions
                                            </p>
                                        </div>
                                        <Badge
                                            variant={engagement.overallConversionRate > 0.1 ? "default" :
                                                engagement.overallConversionRate > 0.05 ? "secondary" : "destructive"}
                                            className="flex items-center gap-1"
                                        >
                                            {engagement.overallConversionRate > 0.1 ? (
                                                <ArrowUpRight size={12} />
                                            ) : (
                                                <ArrowDownRight size={12} />
                                            )}
                                            {engagement.overallConversionRate > 0.1 ? "Good" :
                                                engagement.overallConversionRate > 0.05 ? "Average" : "Poor"}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Engagement Funnel</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={[
                                                    { name: 'Sent', count: delivery.sent },
                                                    { name: 'Opened', count: engagement.opened },
                                                    { name: 'Clicked', count: engagement.clicked },
                                                    { name: 'Converted', count: engagement.converted }
                                                ]}
                                                layout="vertical"
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis dataKey="name" type="category" />
                                                <Tooltip />
                                                <Bar dataKey="count" fill="#8884d8" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Device Distribution</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={deviceData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {deviceData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => [`${value} opens`, 'Count']} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="timeline" className="pt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Engagement Over Time</CardTitle>
                                <CardDescription>
                                    Hourly breakdown of customer engagement
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={timelineData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="hour" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="opens" stroke="#8884d8" activeDot={{ r: 8 }} />
                                            <Line type="monotone" dataKey="clicks" stroke="#82ca9d" />
                                            <Line type="monotone" dataKey="conversions" stroke="#ffc658" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="details" className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Delivery Details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Total Messages</span>
                                            <span className="font-medium">{delivery.total}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Sent</span>
                                            <span className="font-medium">{delivery.sent}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Failed</span>
                                            <span className="font-medium">{delivery.failed}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Pending</span>
                                            <span className="font-medium">{delivery.pending}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Delivery Rate</span>
                                            <span className="font-medium">{(delivery.deliveryRate * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Engagement Details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Eye size={16} className="text-blue-500" />
                                                <span className="text-sm">Open Rate</span>
                                            </div>
                                            <span className="font-medium">{(engagement.openRate * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <MousePointerClick size={16} className="text-green-500" />
                                                <span className="text-sm">Click Rate</span>
                                            </div>
                                            <span className="font-medium">{(engagement.clickRate * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <ShoppingCart size={16} className="text-amber-500" />
                                                <span className="text-sm">Conversion Rate</span>
                                            </div>
                                            <span className="font-medium">{(engagement.conversionRate * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <ShoppingCart size={16} className="text-purple-500" />
                                                <span className="text-sm">Overall Conversion</span>
                                            </div>
                                            <span className="font-medium">{(engagement.overallConversionRate * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle className="text-sm">Device Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex flex-col items-center justify-center p-4 border rounded-md">
                                        <Smartphone size={32} className="text-blue-500 mb-2" />
                                        <p className="text-lg font-medium">
                                            {Number(deviceData.find(d => d.name === 'mobile')?.value || 0)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Mobile</p>
                                    </div>

                                    <div className="flex flex-col items-center justify-center p-4 border rounded-md">
                                        <Laptop size={32} className="text-green-500 mb-2" />
                                        <p className="text-lg font-medium">
                                            {Number(deviceData.find(d => d.name === 'desktop')?.value || 0)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Desktop</p>
                                    </div>

                                    <div className="flex flex-col items-center justify-center p-4 border rounded-md">
                                        <Tablet size={32} className="text-amber-500 mb-2" />
                                        <p className="text-lg font-medium">
                                            {Number(deviceData.find(d => d.name === 'tablet')?.value || 0)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Tablet</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {aiGenerated && (
                        <TabsContent value="insights" className="pt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">AI-Generated Insights</CardTitle>
                                    <CardDescription>
                                        Intelligent analysis of campaign performance
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        <div className="p-4 bg-muted rounded-md">
                                            <h3 className="font-medium mb-2">Performance Summary</h3>
                                            <p className="text-sm">
                                                {aiGenerated.summary?.averageTimeToOpen && (
                                                    <>Average time to open: {aiGenerated.summary.averageTimeToOpen}<br /></>
                                                )}
                                                {aiGenerated.summary?.topPerformingSegment && (
                                                    <>Top performing segment: {aiGenerated.summary.topPerformingSegment}<br /></>
                                                )}
                                                {aiGenerated.summary?.estimatedRevenue && (
                                                    <>Estimated revenue: ₹{aiGenerated.summary.estimatedRevenue.toLocaleString()}<br /></>
                                                )}
                                                {aiGenerated.summary?.roi && (
                                                    <>Estimated ROI: {aiGenerated.summary.roi}x<br /></>
                                                )}
                                            </p>
                                        </div>

                                        {aiGenerated.segmentPerformance && (
                                            <div>
                                                <h3 className="font-medium mb-2">Segment Performance</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {Object.entries(aiGenerated.segmentPerformance).map(([segment, metrics]) => (
                                                        <div key={segment} className="p-4 border rounded-md">
                                                            <h4 className="font-medium mb-2 capitalize">{segment}</h4>
                                                            <p className="text-sm">
                                                                Open Rate: {((metrics as any).openRate * 100).toFixed(1)}%<br />
                                                                Click Rate: {((metrics as any).clickRate * 100).toFixed(1)}%<br />
                                                                Conversion: {((metrics as any).conversionRate * 100).toFixed(1)}%
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {aiGenerated.timeDistribution && (
                                            <div>
                                                <h3 className="font-medium mb-2">Response Time Distribution</h3>
                                                <div className="h-64">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={Object.entries(aiGenerated.timeDistribution).map(([time, value]) => ({
                                                                    name: time === 'immediate' ? 'Immediate' :
                                                                        time === 'within1Hour' ? 'Within 1 Hour' :
                                                                            time === 'within24Hours' ? 'Within 24 Hours' : 'Within 72 Hours',
                                                                    value
                                                                }))}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={60}
                                                                outerRadius={80}
                                                                paddingAngle={5}
                                                                dataKey="value"
                                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                            >
                                                                {Object.entries(aiGenerated.timeDistribution).map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip formatter={(value) => [`${(value as number * 100).toFixed(0)}%`, 'Percentage']} />
                                                            <Legend />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                </Tabs>
            </CardContent>
        </Card>
    );
}