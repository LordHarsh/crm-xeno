// src/components/demo/demo-data-generator.tsx
'use client';

import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth-store';
import { Database, Users, ShoppingBag, RefreshCw } from 'lucide-react';

export default function DemoDataGenerator() {
    const [isOpen, setIsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [step, setStep] = useState(0);
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState<{
        customers: number;
        orders: number;
    }>({ customers: 0, orders: 0 });
    const [statusText, setStatusText] = useState('');
    const { token } = useAuthStore();

    const resetState = () => {
        setStep(0);
        setProgress(0);
        setStats({ customers: 0, orders: 0 });
        setStatusText('');
    };

    const generateData = async () => {
        setIsGenerating(true);
        resetState();

        try {
            // Step 1: Generate and process customers
            setStep(0);
            setStatusText('Generating and processing customer data...');
            setProgress(10);

            const customersResponse = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/demo-data/generate-customers`,
                {
                    params: { count: 10 },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            const customerCount = customersResponse.data.customers.length;
            const customerMapping = customersResponse.data.customerMapping;

            setStats(prev => ({ ...prev, customers: customerCount }));
            setProgress(50);
            setStatusText(`Successfully processed ${customerCount} customers`);

            // Only proceed if we created some customers
            if (customerCount === 0) {
                throw new Error('Failed to create any customers');
            }

            // Step 2: Generate and process orders
            setStep(1);
            setStatusText('Generating and processing order data...');

            const ordersResponse = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/demo-data/generate-orders`,
                {
                    params: {
                        customerMap: JSON.stringify(customerMapping),
                        count: 40
                    },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            const orderCount = ordersResponse.data.orders.length;

            setStats(prev => ({ ...prev, orders: orderCount }));
            setProgress(100);

            // Step 3: Complete
            setStep(2);
            setStatusText('Demo data generation complete!');

            toast.success('Demo data generated successfully!');

            // Refresh dashboard data after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error: any) {
            console.error('Error generating demo data:', error);
            toast.error('Error generating demo data: ' + (error.message || 'Unknown error'));
            setStatusText('Error generating demo data. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <Button
                variant="default"
                onClick={() => setIsOpen(true)}
                className="gap-2"
            >
                <Database size={16} />
                <span>Generate Demo Data</span>
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Generate Demo Data</DialogTitle>
                        <DialogDescription>
                            Populate your CRM with AI-generated customers and orders for demonstration purposes.
                        </DialogDescription>
                    </DialogHeader>

                    {!isGenerating && step === 0 ? (
                        <div className="space-y-4 py-4">
                            <p className="text-sm">
                                This will generate approximately:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                <li>10 realistic customer profiles</li>
                                <li>40 orders with diverse product combinations</li>
                                <li>Various customer segments and behaviors</li>
                            </ul>
                            <p className="text-sm">
                                This process will take approximately 1 minute to complete.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-2">
                                <span className={`rounded-full p-1 ${step >= 0 ? 'bg-primary text-white' : 'bg-muted'}`}>
                                    <Users size={14} />
                                </span>
                                <span className={step >= 0 ? 'font-medium' : 'text-muted-foreground'}>Processing customers</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`rounded-full p-1 ${step >= 1 ? 'bg-primary text-white' : 'bg-muted'}`}>
                                    <ShoppingBag size={14} />
                                </span>
                                <span className={step >= 1 ? 'font-medium' : 'text-muted-foreground'}>Processing orders</span>
                            </div>

                            <div className="pt-2">
                                <Progress value={progress} className="h-2" />
                            </div>

                            <p className="text-sm">
                                {statusText}
                            </p>

                            {step === 2 && (
                                <div className="bg-muted p-3 rounded-md">
                                    <p className="font-medium">Generation Complete!</p>
                                    <p className="text-sm">
                                        Successfully created:
                                    </p>
                                    <ul className="list-disc list-inside text-sm">
                                        <li>{stats.customers} customer profiles</li>
                                        <li>{stats.orders} orders</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        {!isGenerating && step === 0 ? (
                            <>
                                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                                <Button onClick={generateData} disabled={isGenerating}>Generate Data</Button>
                            </>
                        ) : step === 2 ? (
                            <Button onClick={() => setIsOpen(false)}>Close</Button>
                        ) : (
                            <Button disabled>Generating...</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}