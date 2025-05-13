// src/components/campaigns/campaign-stats.tsx
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

interface CampaignStatsProps {
  stats?: {
    sent: number;
    failed: number;
    pending: number;
    total: number;
  };
}

export default function CampaignStats({ stats }: CampaignStatsProps) {
  const { sent = 0, failed = 0, pending = 0, total = 0 } = stats || {};
  
  // Prepare data for the pie chart
  const data = [
    { name: 'Sent', value: sent, color: '#10B981' },
    { name: 'Failed', value: failed, color: '#EF4444' },
    { name: 'Pending', value: pending, color: '#F59E0B' }
  ].filter(item => item.value > 0);
  
  if (!stats || total === 0) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 text-center flex items-center justify-center h-full">
          <p className="text-muted-foreground">No delivery data available yet</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-semibold">{total}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Sent</p>
            <p className="text-xl font-semibold text-green-600">
              {sent} ({total ? Math.round((sent / total) * 100) : 0}%)
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-xl font-semibold text-red-600">
              {failed} ({total ? Math.round((failed / total) * 100) : 0}%)
            </p>
          </div>
        </div>
        
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} messages`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}