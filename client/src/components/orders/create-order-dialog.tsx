// src/components/orders/create-order-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useOrderStore } from '@/store/order-store';
import { useCustomerStore } from '@/store/customer-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { PlusCircle, Trash2 } from 'lucide-react';

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock products for demonstration
const PRODUCTS = [
  { id: 'p1', name: 'Product A', price: 1000 },
  { id: 'p2', name: 'Product B', price: 500 },
  { id: 'p3', name: 'Product C', price: 3500 },
  { id: 'p4', name: 'Product D', price: 1200 },
  { id: 'p5', name: 'Product E', price: 800 },
];

export default function CreateOrderDialog({ open, onOpenChange }: CreateOrderDialogProps) {
  const [formData, setFormData] = useState({
    customerId: '',
    items: [{ productId: '', quantity: 1 }]
  });
  
  const { createOrder, isLoading } = useOrderStore();
  const { customers, fetchCustomers } = useCustomerStore();
  
  useEffect(() => {
    if (open && customers.length === 0) {
      fetchCustomers();
    }
  }, [open, customers.length, fetchCustomers]);
  
  const handleCustomerChange = (value: string) => {
    setFormData(prev => ({ ...prev, customerId: value }));
  };
  
  const handleProductChange = (index: number, productId: string) => {
    const newItems = [...formData.items];
    newItems[index].productId = productId;
    setFormData(prev => ({ ...prev, items: newItems }));
  };
  
  const handleQuantityChange = (index: number, quantity: number) => {
    const newItems = [...formData.items];
    newItems[index].quantity = quantity;
    setFormData(prev => ({ ...prev, items: newItems }));
  };
  
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1 }]
    }));
  };
  
  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData(prev => ({ ...prev, items: newItems }));
  };
  
  const calculateTotal = () => {
    return formData.items.reduce((total, item) => {
      const product = PRODUCTS.find(p => p.id === item.productId);
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.customerId) {
      toast.error('Please select a customer');
      return;
    }
    
    if (formData.items.some(item => !item.productId)) {
      toast.error('Please select products for all items');
      return;
    }
    
    // Convert form data to order format
    const orderItems = formData.items.map(item => {
      const product = PRODUCTS.find(p => p.id === item.productId)!;
      return {
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        price: product.price
      };
    });
    
    const selectedCustomer = customers.find(c => c._id === formData.customerId);
    
    const orderData = {
      customerId: formData.customerId,
      customerName: selectedCustomer?.name,
      orderDate: new Date().toISOString(),
      amount: calculateTotal(),
      items: orderItems,
      status: 'completed' as const
    };
    
    const success = await createOrder(orderData);
    
    if (success) {
      setFormData({
        customerId: '',
        items: [{ productId: '', quantity: 1 }]
      });
      onOpenChange(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="customer">Customer *</Label>
            <Select
              value={formData.customerId}
              onValueChange={handleCustomerChange}
            >
              <SelectTrigger id="customer">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map(customer => (
                  <SelectItem key={customer._id} value={customer._id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Order Items *</Label>
            {formData.items.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Select
                  value={item.productId}
                  onValueChange={(value) => handleProductChange(index, value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCTS.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - ₹{product.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                
                {formData.items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="flex items-center gap-1"
            >
              <PlusCircle size={14} />
              <span>Add Item</span>
            </Button>
          </div>
          
          <div className="bg-muted p-2 rounded-md">
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-medium">₹{calculateTotal().toLocaleString()}</span>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}