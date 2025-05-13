// src/components/layout/header.tsx
'use client';
import { usePathname } from 'next/navigation';
import { PlusCircle, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Get page title based on current path
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/dashboard/campaigns') return 'Campaigns';
    if (pathname === '/dashboard/campaigns/create') return 'Create Campaign';
    if (pathname === '/dashboard/customers') return 'Customers';
    if (pathname === '/dashboard/orders') return 'Orders';
    return '';
  };
  
  // Determine if we should show the "Create" button
  const shouldShowCreateButton = () => {
    if (pathname === '/dashboard/campaigns') return true;
    if (pathname === '/dashboard/customers') return true;
    return false;
  };
  
  // Handle create button click
  const handleCreateClick = () => {
    if (pathname === '/dashboard/campaigns') {
      router.push('/dashboard/campaigns/create');
    } else if (pathname === '/dashboard/customers') {
      router.push('/dashboard/customers/create');
    }
  };
  
  return (
    <header className="bg-background border-b border-border p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">{getPageTitle()}</h1>
      
      <div className="flex items-center gap-2">
        {shouldShowCreateButton() && (
          <Button
            size="sm"
            onClick={handleCreateClick}
            className="flex items-center gap-1"
          >
            <PlusCircle size={16} />
            <span>Create</span>
          </Button>
        )}
        
        <Button variant="ghost" size="icon">
          <Bell size={18} />
        </Button>
      </div>
    </header>
  );
}