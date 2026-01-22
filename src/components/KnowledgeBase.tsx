'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileText, Trash2 } from 'lucide-react';
import { useKnowledgeBase } from '@/lib/useKnowledgeBase';

interface KnowledgeBaseProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KnowledgeBase({ isOpen, onClose }: KnowledgeBaseProps) {
  const { files, addFile, removeFile, isLoaded } = useKnowledgeBase();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    setError(null);

    for (const file of Array.from(selectedFiles)) {
      try {
        // Check file type
        if (!file.name.endsWith('.txt') && !file.name.endsWith('.pdf')) {
          setError('Only .txt and .pdf files are supported');
          continue;
        }

        // Check file size (max 1MB)
        if (file.size > 1024 * 1024) {
          setError('File size must be less than 1MB');
          continue;
        }

        let content = '';

        if (file.name.endsWith('.txt')) {
          // Read text file
          content = await file.text();
        } else if (file.name.endsWith('.pdf')) {
          // For PDF, we'll extract text on the server or just store a note
          // For now, read as text (basic extraction)
          content = await extractPdfText(file);
        }

        if (content.trim()) {
          addFile({
            name: file.name,
            content: content.trim(),
            addedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        setError(`Failed to read ${file.name}`);
      }
    }

    setIsUploading(false);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0 && fileInputRef.current) {
      // Create a new FileList-like object
      const dt = new DataTransfer();
      for (const file of Array.from(droppedFiles)) {
        dt.items.add(file);
      }
      fileInputRef.current.files = dt.files;
      fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass rounded-2xl p-6 animate-scale-in max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-medium text-foreground">Knowledge Base</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload files to help prioritize your tasks
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

        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center cursor-pointer
                   hover:border-foreground/30 hover:bg-card/30 transition-all mb-4"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground font-medium">
            {isUploading ? 'Uploading...' : 'Drop files here or click to upload'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports .txt and .pdf files (max 1MB)
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        {/* Files List */}
        <div className="flex-1 overflow-y-auto">
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No files uploaded yet
            </p>
          ) : (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-card/40 rounded-lg border border-border/20"
                >
                  <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.content.length} characters
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="w-8 h-8 rounded-full hover:bg-red-500/10 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-border/20">
          <p className="text-xs text-muted-foreground text-center">
            Files are stored locally and used to provide context when planning your day
          </p>
        </div>
      </div>
    </div>
  );
}

// Basic PDF text extraction (reads raw text, won't work for all PDFs)
async function extractPdfText(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Convert to string and try to extract text between stream objects
    // This is a very basic extraction that works for simple PDFs
    let text = '';
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const content = decoder.decode(uint8Array);

    // Look for text between BT and ET markers (basic PDF text extraction)
    const textMatches = content.match(/\(([^)]+)\)/g);
    if (textMatches) {
      text = textMatches
        .map(match => match.slice(1, -1))
        .filter(t => t.length > 1 && /[a-zA-Z]/.test(t))
        .join(' ');
    }

    // If no text found, return a note
    if (!text.trim()) {
      return `[PDF file: ${file.name} - content could not be extracted. Please use a .txt file for best results.]`;
    }

    return text;
  } catch {
    return `[PDF file: ${file.name} - content could not be extracted]`;
  }
}
