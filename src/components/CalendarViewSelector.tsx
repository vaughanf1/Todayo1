'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { CalendarView } from '@/types';

interface CalendarViewSelectorProps {
  value: CalendarView;
  onChange: (view: CalendarView) => void;
}

const views: { value: CalendarView; label: string; icon: typeof Calendar }[] = [
  { value: 'day', label: 'Day', icon: Calendar },
  { value: 'week', label: 'Week', icon: CalendarDays },
  { value: 'month', label: 'Month', icon: CalendarRange },
];

export function CalendarViewSelector({ value, onChange }: CalendarViewSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentView = views.find(v => v.value === value) || views[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                 bg-card/60 border border-border/30
                 hover:bg-card transition-colors text-sm"
      >
        <currentView.icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-foreground font-medium">{currentView.label}</span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-32 glass rounded-xl overflow-hidden animate-scale-in z-30">
          {views.map((view) => {
            const Icon = view.icon;
            const isSelected = value === view.value;
            return (
              <button
                key={view.value}
                onClick={() => {
                  onChange(view.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm
                         hover:bg-card/60 transition-colors ${
                           isSelected ? 'bg-card/40 text-foreground' : 'text-muted-foreground'
                         }`}
              >
                <Icon className="w-4 h-4" />
                <span>{view.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
