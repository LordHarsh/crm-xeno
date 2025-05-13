// src/components/campaigns/rule-builder/rule-item.tsx
'use client';

import { useRef } from 'react';
import { useDrag } from 'react-dnd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Field options for rule builder
const FIELD_OPTIONS = [
  { value: 'totalSpend', label: 'Total Spend' },
  { value: 'visits', label: 'Number of Visits' },
  { value: 'lastPurchaseDate', label: 'Last Purchase Date' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'tags', label: 'Customer Tags' }
];

interface RuleItemProps {
  condition: any;
  onChange: (condition: any) => void;
  onDelete: () => void;
}

export default function RuleItem({ condition, onChange, onDelete }: RuleItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  // Set up drag functionality
  const [{ isDragging }, drag] = useDrag({
    type: 'CONDITION',
    item: () => ({ type: 'CONDITION', condition }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });
  
  // Apply drag ref
  drag(ref);
  
  // Handle field change
  const handleFieldChange = (value: string) => {
    const field = value;
    const updatedCondition = { ...condition, field };
    
    // Reset condition and value when field changes
    if (field === 'totalSpend' || field === 'visits') {
      updatedCondition.condition = '>';
      updatedCondition.value = '';
    } else if (field === 'lastPurchaseDate') {
      updatedCondition.condition = 'before';
      updatedCondition.value = '';
    } else if (field === 'inactive') {
      updatedCondition.condition = 'for';
      updatedCondition.value = '90';
    } else if (field === 'tags') {
      updatedCondition.condition = 'contains';
      updatedCondition.value = '';
    }
    
    onChange(updatedCondition);
  };
  
  // Get available conditions based on the selected field
  const getConditionsForField = (field: string) => {
    switch (field) {
      case 'totalSpend':
      case 'visits':
        return [
          { value: '>', label: '>' },
          { value: '>=', label: '>=' },
          { value: '<', label: '<' },
          { value: '<=', label: '<=' },
          { value: '=', label: '=' },
          { value: '!=', label: '!=' }
        ];
      case 'lastPurchaseDate':
        return [
          { value: 'before', label: 'Before' },
          { value: 'after', label: 'After' },
          { value: 'on', label: 'On' }
        ];
      case 'inactive':
        return [
          { value: 'for', label: 'For' }
        ];
      case 'tags':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'not_contains', label: 'Does not contain' }
        ];
      default:
        return [];
    }
  };
  
  // Render appropriate input for value based on field type
  const renderValueInput = () => {
    switch (condition.field) {
      case 'totalSpend':
        return (
          <div className="flex items-center">
            <span className="mr-1">₹</span>
            <Input
              type="number"
              value={condition.value}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="w-24"
              placeholder="Amount"
            />
          </div>
        );
      case 'visits':
        return (
          <Input
            type="number"
            value={condition.value}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
            className="w-24"
            placeholder="Count"
          />
        );
      case 'lastPurchaseDate':
        return (
          <Input
            type="date"
            value={condition.value}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
          />
        );
      case 'inactive':
        return (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={condition.value}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="w-16"
              placeholder="90"
            />
            <span>days</span>
          </div>
        );
      case 'tags':
        return (
          <Input
            type="text"
            value={condition.value}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
            placeholder="e.g., loyal"
          />
        );
      default:
        return null;
    }
  };
  
  const conditions = getConditionsForField(condition.field);
  
  return (
    <div 
      ref={ref}
      className={cn(
        'flex items-center gap-2 p-2 rounded-md bg-muted/50',
        isDragging ? 'opacity-50' : ''
      )}
    >
      <Select
        defaultValue={condition.field}
        onValueChange={handleFieldChange}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Field" />
        </SelectTrigger>
        <SelectContent>
          {FIELD_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select
        defaultValue={condition.condition}
        onValueChange={(value) => onChange({ ...condition, condition: value })}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Condition" />
        </SelectTrigger>
        <SelectContent>
          {conditions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {renderValueInput()}
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
}