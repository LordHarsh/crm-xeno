// src/components/campaigns/rule-builder/rule-group.tsx
'use client';

import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import RuleItem from './rule-item';

interface RuleGroupProps {
  group: any;
  onChange: (group: any) => void;
  onDelete: () => void;
  isRoot?: boolean;
}

export default function RuleGroup({
  group,
  onChange,
  onDelete,
  isRoot = false
}: RuleGroupProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'GROUP',
    item: () => ({ type: 'GROUP', group }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    canDrag: !isRoot
  });
  
  const [{ isOver }, drop] = useDrop({
    accept: ['CONDITION', 'GROUP'],
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });
  
  // Connect drag and drop refs
  drag(drop(ref));
  
  // Add a new condition
  const addCondition = () => {
    const newGroup = { ...group };
    newGroup.conditions = [
      ...newGroup.conditions,
      { field: 'totalSpend', condition: '>', value: '' }
    ];
    onChange(newGroup);
  };
  
  // Add a nested group
  const addGroup = () => {
    const newGroup = { ...group };
    newGroup.conditions = [
      ...newGroup.conditions,
      {
        operator: 'AND',
        conditions: [
          { field: 'totalSpend', condition: '>', value: '' }
        ]
      }
    ];
    onChange(newGroup);
  };
  
  // Update a condition at a specific index
  const updateCondition = (index: number, condition: any) => {
    const newGroup = { ...group };
    newGroup.conditions[index] = condition;
    onChange(newGroup);
  };
  
  // Delete a condition at a specific index
  const deleteCondition = (index: number) => {
    const newGroup = { ...group };
    newGroup.conditions.splice(index, 1);
    onChange(newGroup);
  };
  
  // Toggle operator between AND/OR
  const toggleOperator = () => {
    const newGroup = { ...group };
    newGroup.operator = newGroup.operator === 'AND' ? 'OR' : 'AND';
    onChange(newGroup);
  };
  
  return (
    <div 
      ref={ref}
      className={cn(
        'border rounded-md p-3 mb-2',
        isOver ? 'border-primary/50 bg-primary/5' : 'border-border',
        isDragging ? 'opacity-50' : '',
        !isRoot && 'mt-2'
      )}
    >
      <div className="flex justify-between items-center mb-3">
        <Button
          type="button"
          onClick={toggleOperator}
          variant="ghost"
          size="sm"
          className={cn(
            'px-3 text-xs font-medium',
            group.operator === 'AND' 
              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
          )}
        >
          {group.operator}
        </Button>
        
        {!isRoot && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>
      
      <div className="space-y-2 pl-4 border-l-2 border-border">
        {group.conditions.map((condition: any, index: number) => (
          <div key={index}>
            {condition.operator ? (
              // Nested group
              <RuleGroup
                group={condition}
                onChange={(updatedGroup) => updateCondition(index, updatedGroup)}
                onDelete={() => deleteCondition(index)}
              />
            ) : (
              // Simple condition
              <RuleItem
                condition={condition}
                onChange={(updatedCondition) => updateCondition(index, updatedCondition)}
                onDelete={() => deleteCondition(index)}
              />
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-3 flex space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCondition}
          className="flex items-center gap-1"
        >
          <Plus size={14} />
          <span>Add Condition</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addGroup}
          className="flex items-center gap-1"
        >
          <Plus size={14} />
          <span>Add Group</span>
        </Button>
      </div>
    </div>
  );
}