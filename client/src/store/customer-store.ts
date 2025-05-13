// src/store/customer-store.ts
import { create } from 'zustand';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuthStore } from './auth-store';

type Customer = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  totalSpend: number;
  lastPurchaseDate: string | null;
  visits: number;
  tags: string[];
  createdAt: string;
};

type CustomerState = {
  customers: Customer[];
  isLoading: boolean;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  
  // Actions
  fetchCustomers: (page?: number, limit?: number) => Promise<void>;
  createCustomer: (data: Partial<Customer>) => Promise<string | null>;
};

export const useCustomerStore = create<CustomerState>()((set) => ({
  customers: [],
  isLoading: false,
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  },
  
  fetchCustomers: async (page = 1, limit = 10) => {
    set({ isLoading: true });
    
    try {
      const token = useAuthStore.getState().token;
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customers`,
        {
          params: { page, limit },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      set({
        customers: response.data.data,
        pagination: response.data.pagination,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
      
      // Fallback to mock data if API fails
      const mockCustomers = [
        {
          _id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+91 9876543210',
          totalSpend: 15000,
          lastPurchaseDate: '2025-04-15',
          visits: 8,
          tags: ['loyal', 'high-value'],
          createdAt: '2025-01-10T12:00:00Z'
        },
        {
          _id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+91 9876543211',
          totalSpend: 8500,
          lastPurchaseDate: '2025-05-01',
          visits: 5,
          tags: ['new-customer'],
          createdAt: '2025-02-15T12:00:00Z'
        },
        {
          _id: '3',
          name: 'Rajesh Kumar',
          email: 'rajesh@example.com',
          phone: '+91 9876543212',
          totalSpend: 25000,
          lastPurchaseDate: '2025-02-20',
          visits: 12,
          tags: ['loyal', 'premium'],
          createdAt: '2025-01-05T12:00:00Z'
        },
        {
          _id: '4',
          name: 'Priya Sharma',
          email: 'priya@example.com',
          phone: '+91 9876543213',
          totalSpend: 5000,
          lastPurchaseDate: '2025-01-10',
          visits: 3,
          tags: ['inactive'],
          createdAt: '2025-03-20T12:00:00Z'
        }
      ];
      
      set({
        customers: mockCustomers,
        pagination: {
          total: mockCustomers.length,
          page: 1,
          limit: 10,
          pages: 1
        },
        isLoading: false
      });
    }
  },
  
  createCustomer: async (data) => {
    set({ isLoading: true });
    
    try {
      const token = useAuthStore.getState().token;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customers`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Customer created successfully!');
      
      // Refresh the customer list
      useCustomerStore.getState().fetchCustomers();
      
      set({ isLoading: false });
      return response.data.id;
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer');
      set({ isLoading: false });
      return null;
    }
  }
}));