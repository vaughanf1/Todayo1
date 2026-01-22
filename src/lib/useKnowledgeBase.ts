'use client';

import { useState, useEffect, useCallback } from 'react';

export interface KnowledgeFile {
  name: string;
  content: string;
  addedAt: string;
}

const STORAGE_KEY = 'todayo_knowledge_base';

export function useKnowledgeBase() {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as KnowledgeFile[];
        setFiles(parsed);
      } catch {
        // Invalid state, use default
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever files change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    }
  }, [files, isLoaded]);

  const addFile = useCallback((file: KnowledgeFile) => {
    setFiles(prev => {
      // Check if file with same name already exists
      const exists = prev.some(f => f.name === file.name);
      if (exists) {
        // Replace existing file
        return prev.map(f => f.name === file.name ? file : f);
      }
      return [...prev, file];
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Get combined content for AI context
  const getContextString = useCallback(() => {
    if (files.length === 0) return '';

    const parts = files.map(file => {
      return `=== ${file.name} ===\n${file.content}`;
    });

    return `USER KNOWLEDGE BASE:\n${parts.join('\n\n')}`;
  }, [files]);

  return {
    files,
    addFile,
    removeFile,
    clearFiles,
    getContextString,
    isLoaded,
    hasFiles: files.length > 0,
  };
}
