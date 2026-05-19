'use client';

import { useState } from 'react';
import { X, Check, Minus } from 'lucide-react';
import { useStore } from '@/lib/store';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const { state } = useStore();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!isOpen) return null;

  // Most recent day first.
  const days = [...state.memory.history].sort((a, b) =>
    a.date < b.date ? 1 : -1
  );

  const fmtDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg glass rounded-2xl p-6 animate-scale-in max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-medium text-foreground">History</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Every past day, archived automatically
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-card/60 border border-border/30 flex items-center justify-center
                     hover:bg-card transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {days.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No past days yet — your first day rolls over here tomorrow
            </p>
          ) : (
            <div className="space-y-2">
              {days.map(day => {
                const isOpen = expanded === day.id;
                return (
                  <div
                    key={day.id}
                    className="bg-card/40 rounded-lg border border-border/20 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpanded(isOpen ? null : day.id)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-card/60 transition-colors"
                    >
                      <span className="flex-1 text-sm font-medium text-foreground">
                        {fmtDate(day.date)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {day.completedCount}/{day.totalCount} done
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-3 pb-3 space-y-1.5">
                        {day.tasks.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-1">
                            No tasks recorded
                          </p>
                        ) : (
                          day.tasks.map(t => {
                            const done = t.status === 'completed';
                            return (
                              <div
                                key={t.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <span
                                  className={
                                    'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ' +
                                    (done
                                      ? 'bg-[#30D158]/20'
                                      : 'bg-muted/30')
                                  }
                                >
                                  {done ? (
                                    <Check className="w-3 h-3 text-[#30D158]" />
                                  ) : (
                                    <Minus className="w-3 h-3 text-muted-foreground" />
                                  )}
                                </span>
                                <span
                                  className={
                                    'flex-1 ' +
                                    (done
                                      ? 'text-muted-foreground line-through'
                                      : 'text-foreground')
                                  }
                                >
                                  {t.title}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
