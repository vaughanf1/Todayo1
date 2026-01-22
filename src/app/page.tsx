'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { StoreProvider, useStore } from '@/lib/store';
import { scheduleTasks } from '@/lib/scheduler';
import { InputScreen, Timeline, ActiveTask } from '@/components';
import { AIParseResponse } from '@/types';

const DotScreenShader = dynamic(
  () => import('@/components/ui/dot-shader-background').then(mod => ({ default: mod.DotScreenShader })),
  { ssr: false }
);

function AppContent() {
  const { state, setDayPlan, setView } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (text: string, knowledgeContext?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, knowledgeContext }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse tasks');
      }

      const data: AIParseResponse = await response.json();

      if (!data.tasks || data.tasks.length === 0) {
        throw new Error('No tasks found in input');
      }

      const dayPlan = scheduleTasks(data.tasks, text);
      setDayPlan(dayPlan);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewDay = () => {
    setView('input');
  };

  return (
    <main className="min-h-screen relative">
      {/* Shader Background */}
      <div className="fixed inset-0 z-0">
        <DotScreenShader />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {error && (
          <div className="fixed top-4 left-4 right-4 z-50 p-4 glass rounded-xl animate-slide-up">
            <div className="flex items-center justify-between">
              <span className="text-destructive">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {state.view === 'input' && (
          <InputScreen onSubmit={handleSubmit} isLoading={isLoading} />
        )}

        {state.view === 'timeline' && (
          <Timeline onNewDay={handleNewDay} />
        )}

        {state.view === 'active-task' && (
          <ActiveTask />
        )}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
