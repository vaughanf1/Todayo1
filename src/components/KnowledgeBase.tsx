'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useKnowledgeBase } from '@/lib/useKnowledgeBase';

interface KnowledgeBaseProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KnowledgeBase({ isOpen, onClose }: KnowledgeBaseProps) {
  const { knowledgeBase, setKnowledgeBase, isLoaded } = useKnowledgeBase();
  const [localState, setLocalState] = useState(knowledgeBase);

  // Sync local state when knowledgeBase changes (on load)
  if (isLoaded && localState.about === '' && localState.priorities === '' && localState.preferences === '' &&
      (knowledgeBase.about || knowledgeBase.priorities || knowledgeBase.preferences)) {
    setLocalState(knowledgeBase);
  }

  if (!isOpen) return null;

  const handleSave = () => {
    setKnowledgeBase(localState);
    onClose();
  };

  const handleClose = () => {
    setLocalState(knowledgeBase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass rounded-2xl p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-medium text-foreground">Knowledge Base</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Help me prioritize your tasks better
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-card/60 border border-border/30 flex items-center justify-center
                     hover:bg-card transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              About You
            </label>
            <textarea
              value={localState.about}
              onChange={(e) => setLocalState(prev => ({ ...prev, about: e.target.value }))}
              placeholder="Your role, profession, goals... e.g., 'I'm a startup founder building an AI product. Currently raising seed round.'"
              className="w-full h-24 p-3 text-sm leading-relaxed
                       bg-card/50 backdrop-blur-sm rounded-xl
                       border border-border/50
                       placeholder:text-muted-foreground/50
                       text-foreground
                       focus:outline-none focus:ring-1 focus:ring-ring/50 focus:border-ring/50
                       resize-none transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Current Priorities
            </label>
            <textarea
              value={localState.priorities}
              onChange={(e) => setLocalState(prev => ({ ...prev, priorities: e.target.value }))}
              placeholder="What matters most right now... e.g., 'Closing investor meetings, shipping MVP by end of month, maintaining health.'"
              className="w-full h-24 p-3 text-sm leading-relaxed
                       bg-card/50 backdrop-blur-sm rounded-xl
                       border border-border/50
                       placeholder:text-muted-foreground/50
                       text-foreground
                       focus:outline-none focus:ring-1 focus:ring-ring/50 focus:border-ring/50
                       resize-none transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Work Preferences
            </label>
            <textarea
              value={localState.preferences}
              onChange={(e) => setLocalState(prev => ({ ...prev, preferences: e.target.value }))}
              placeholder="How you like to work... e.g., 'Deep work in mornings, meetings after lunch, exercise before dinner.'"
              className="w-full h-24 p-3 text-sm leading-relaxed
                       bg-card/50 backdrop-blur-sm rounded-xl
                       border border-border/50
                       placeholder:text-muted-foreground/50
                       text-foreground
                       focus:outline-none focus:ring-1 focus:ring-ring/50 focus:border-ring/50
                       resize-none transition-all duration-200"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-medium
                     bg-card/60 border border-border/30 text-muted-foreground
                     hover:bg-card hover:text-foreground transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-medium
                     bg-foreground text-background
                     hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
