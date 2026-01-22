'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { getGreeting } from '@/lib/utils';
import { useKnowledgeBase } from '@/lib/useKnowledgeBase';
import { UserMenu } from './UserMenu';
import { KnowledgeBase } from './KnowledgeBase';

interface InputScreenProps {
  onSubmit: (text: string, knowledgeContext?: string) => void;
  isLoading: boolean;
}

export function InputScreen({ onSubmit, isLoading }: InputScreenProps) {
  const [text, setText] = useState('');
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const { getContextString, hasFiles } = useKnowledgeBase();
  const greeting = getGreeting();

  const handleSubmit = () => {
    if (text.trim() && !isLoading) {
      const context = getContextString();
      onSubmit(text.trim(), context || undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-12">
      {/* Header */}
      <header className="flex justify-end gap-2 mb-8">
        <button
          onClick={() => setShowKnowledgeBase(true)}
          className={`w-9 h-9 rounded-full border flex items-center justify-center
                   hover:bg-card transition-colors ${
                     hasFiles
                       ? 'bg-foreground/10 border-foreground/30'
                       : 'bg-card/60 border-border/30'
                   }`}
          title="Knowledge Base"
        >
          <FileText className={`w-4 h-4 ${hasFiles ? 'text-foreground' : 'text-muted-foreground'}`} />
        </button>
        <UserMenu />
      </header>

      {/* Knowledge Base Modal */}
      <KnowledgeBase
        isOpen={showKnowledgeBase}
        onClose={() => setShowKnowledgeBase(false)}
      />

      <div className="flex-1 flex flex-col items-center justify-center">
      <div className="w-full max-w-md animate-fade-in">
        {/* Greeting */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-foreground mb-3">
            {greeting}.
          </h1>
          <p className="text-muted-foreground text-lg font-light">
            What&apos;s on your plate today?
          </p>
        </div>

        {/* Text Input */}
        <div className="relative animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste or type your tasks...

• Reply to investor emails
• Finish pitch deck
• Call mom
• Gym at 5pm
• Review pull requests"
            className="w-full h-56 p-5 text-base leading-relaxed
                       bg-card/50 backdrop-blur-sm rounded-2xl
                       border border-border/50
                       placeholder:text-muted-foreground/50
                       text-foreground
                       focus:outline-none focus:ring-1 focus:ring-ring/50 focus:border-ring/50
                       resize-none transition-all duration-200"
            disabled={isLoading}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading}
          className="w-full mt-6 py-4 px-6
                     bg-foreground text-background
                     rounded-xl font-medium text-base
                     disabled:opacity-30 disabled:cursor-not-allowed
                     hover:opacity-90 active:scale-[0.98]
                     transition-all duration-200 flex items-center justify-center gap-3
                     animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              <span className="font-light">Planning your day...</span>
            </>
          ) : (
            <>
              <span>Plan My Day</span>
              <kbd className="text-xs opacity-50 bg-background/10 px-2 py-0.5 rounded">⌘↵</kbd>
            </>
          )}
        </button>

        {/* Hint */}
        <p className="text-center text-sm text-muted-foreground/60 mt-6 font-light animate-fade-in" style={{ animationDelay: '0.3s' }}>
          Include times for fixed appointments
        </p>
      </div>
      </div>
    </div>
  );
}
