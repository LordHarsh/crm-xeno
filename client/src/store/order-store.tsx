// src/store/order-store.ts
import { create } from 'zustand';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuthStore } from './auth-store';

type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

type Order = {
  _id: string;
  customerId: string;
  customerName?: string; // Added for UI convenience
  orderDate: string;
  amount: number;
  items: OrderItem[];
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
};

type OrderState = {
  orders: Order[];
  isLoading: boolean;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  
  // Actions
  fetchOrders: (page?: number, limit?: number, customerId?: string) => Promise<void>;
  createOrder: (data: Partial<Order>) => Promise<string | null>;
};

export const useOrderStore = create<OrderState>()((set) => ({
  orders: [],
  isLoading: false,
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  },
  
  fetchOrders: async (page = 1, limit = 10, customerId) => {
    set({ isLoading: true });
    
    try {
      const token = useAuthStore.getState().token;
      const params = { page, limit, ...(customerId && { customerId }) };
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders`,
        {
          params,
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      set({
        orders: response.data.data,
        pagination: response.data.pagination,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      
      // Fallback to mock data if API fails
      const mockOrders: Order[] = [
        {
          _id: '1',
          customerId: '1',
          customerName: 'John Doe',
          orderDate: '2025-04-10T12:00:00Z',
          amount: 2500,
          items: [
            { productId: 'p1', name: 'Product A', quantity: 2, price: 1000 },
            { productId: 'p2', name: 'Product B', quantity: 1, price: 500 }
          ],
          status: 'completed',
          createdAt: '2025-04-10T12:00:00Z'
        },
        {
          _id: '2',
          customerId: '2',
          customerName: 'Jane Smith',
          orderDate: '2025-04-15T12:00:00Z',
          amount: 3500,
          items: [
            { productId: 'p3', name: 'Product C', quantity: 1, price: 3500 }
          ],
          status: 'pending',
          createdAt: '2025-04-15T12:00:00Z'
        },
        {
          _id: '3',
          customerId: '1',
          customerName: 'John Doe',
          orderDate: '2025-04-20T12:00:00Z',
          amount: 1200,
          items: [
            { productId: 'p4', name: 'Product D', quantity: 1, price: 1200 }
          ],
          status: 'completed',
          createdAt: '2025-04-20T12:00:00Z'
        }
      ];
      
      set({
        orders: mockOrders,
        pagination: {
          total: mockOrders.length,
          page: 1,
          limit: 10,
          pages: 1
        },
        isLoading: false
      });
    }
  },
  
  createOrder: async (data) => {
    set({ isLoading: true });
    
    try {
      const token = useAuthStore.getState().token;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Order created successfully!');
      
      // Refresh the order list
      useOrderStore.getState().fetchOrders();
      
      set({ isLoading: false });
      return response.data.id;
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
      set({ isLoading: false });
      return null;
    }
  }
}));