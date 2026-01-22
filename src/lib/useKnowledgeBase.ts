'use client';

import { useState, useEffect, useCallback } from 'react';
import { KnowledgeBase } from '@/types';

const STORAGE_KEY = 'todayo_knowledge_base';

const defaultKnowledgeBase: KnowledgeBase = {
  about: '',
  priorities: '',
  preferences: '',
};

export function useKnowledgeBase() {
  const [knowledgeBase, setKnowledgeBaseState] = useState<KnowledgeBase>(defaultKnowledgeBase);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as KnowledgeBase;
        setKnowledgeBaseState(parsed);
      } catch {
        // Invalid state, use default
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage on change
  const setKnowledgeBase = useCallback((updates: Partial<KnowledgeBase>) => {
    setKnowledgeBaseState(prev => {
      const newState = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

  const clearKnowledgeBase = useCallback(() => {
    setKnowledgeBaseState(defaultKnowledgeBase);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Get a formatted string for AI context
  const getContextString = useCallback(() => {
    const parts: string[] = [];
    if (knowledgeBase.about.trim()) {
      parts.push(`About the user: ${knowledgeBase.about.trim()}`);
    }
    if (knowledgeBase.priorities.trim()) {
      parts.push(`Current priorities: ${knowledgeBase.priorities.trim()}`);
    }
    if (knowledgeBase.preferences.trim()) {
      parts.push(`Work preferences: ${knowledgeBase.preferences.trim()}`);
    }
    return parts.join('\n');
  }, [knowledgeBase]);

  return {
    knowledgeBase,
    setKnowledgeBase,
    clearKnowledgeBase,
    getContextString,
    isLoaded,
  };
}
