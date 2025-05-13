// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCampaignStore } from '@/store/campaign-store';
import { useCustomerStore } from '@/store/customer-store';
import { useOrderStore } from '@/store/order-store';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Users, Megaphone, ShoppingCart, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { campaigns, fetchCampaigns } = useCampaignStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { orders, fetchOrders } = useOrderStore();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchCampaigns(),
        fetchCustomers(),
        fetchOrders()
      ]);
      setIsLoading(false);
    };
    
    fetchData();
  }, [fetchCampaigns, fetchCustomers, fetchOrders]);
  
  // Calculate total revenue from orders
  const totalRevenue = orders.reduce((total, order) => total + order.amount, 0);
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-12 w-12 rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome to Mini CRM</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">
              Active user base
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Campaigns
            </CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">
              Campaigns created
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">
              Orders processed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime revenue
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Recent Customers</CardTitle>
            <CardDescription>
              Recently added customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No customers yet
              </p>
            ) : (
              <div className="space-y-4">
                {customers.slice(0, 5).map(customer => (
                  <div key={customer._id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">{customer.email}</div>
                    </div>
                    <div className="text-sm">₹{customer.totalSpend.toLocaleString()}</div>
                  </div>
                ))}
                
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/customers">View All Customers</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              Latest customer orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No orders yet
              </p>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 5).map(order => (
                  <div key={order._id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm">₹{order.amount.toLocaleString()}</div>
                  </div>
                ))}
                
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/orders">View All Orders</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
            <CardDescription>
              Latest marketing campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No campaigns yet
              </p>
            ) : (
              <div className="space-y-4">
                {campaigns.slice(0, 5).map(campaign => (
                  <div key={campaign._id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Audience: {campaign.audienceSize}
                      </div>
                    </div>
                    <div className="text-sm capitalize">{campaign.status}</div>
                  </div>
                ))}
                
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/campaigns">View All Campaigns</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}