'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { buildMemoryContext } from '@/lib/persistence';
import {
  CONTENT_STAGES,
  CONTENT_STAGE_LABEL,
  ContentPiece,
  ContentStage,
  ContentType,
} from '@/types';
import { cn, formatDateShort } from '@/lib/utils';
import {
  ArrowLeft,
  Youtube,
  Clapperboard,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  CalendarClock,
} from 'lucide-react';

interface ContentStudioProps {
  onBack: () => void;
}

const TYPE_META: Record<ContentType, { label: string; icon: typeof Youtube; color: string }> = {
  youtube: { label: 'YouTube', icon: Youtube, color: '#FF453A' },
  reel: { label: 'Reels', icon: Clapperboard, color: '#BF5AF2' },
};

export function ContentStudio({ onBack }: ContentStudioProps) {
  const {
    state,
    addContentIdea,
    applyContentPlan,
    setContentStage,
    deleteContent,
  } = useStore();

  const [activeType, setActiveType] = useState<ContentType>('youtube');
  const [input, setInput] = useState('');
  const [polishing, setPolishing] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<ContentStage | null>(null);

  const context = useMemo(
    () => buildMemoryContext(state.memory),
    [state.memory]
  );

  const pieces = useMemo(
    () =>
      state.memory.content
        .filter(p => p.type === activeType)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [state.memory.content, activeType]
  );

  const cadenceLabel =
    activeType === 'youtube'
      ? `${state.memory.cadence.youtubePerWeek}× / week`
      : `1 every ${state.memory.cadence.reelEveryNDays} days`;

  const polishIdea = async (piece: ContentPiece) => {
    setPolishing(prev => new Set(prev).add(piece.id));
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawTitle: piece.rawTitle,
          type: piece.type,
          context: context || undefined,
        }),
      });
      if (res.ok) applyContentPlan(piece.id, await res.json());
    } catch {
      // leave the raw idea in place; user can retry
    } finally {
      setPolishing(prev => {
        const next = new Set(prev);
        next.delete(piece.id);
        return next;
      });
    }
  };

  const handleAdd = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const piece = addContentIdea(activeType, text);
    await polishIdea(piece);
  };

  const handleDrop = (stage: ContentStage) => {
    if (draggedId) setContentStage(draggedId, stage);
    setDraggedId(null);
    setDragOverStage(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-4 glass">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-card/60 border border-border/30 flex items-center justify-center hover:bg-card transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-medium text-foreground">Content Studio</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target cadence · {cadenceLabel}
              </p>
            </div>
          </div>

          {/* Type tabs */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-card/60 border border-border/30">
            {(Object.keys(TYPE_META) as ContentType[]).map(type => {
              const meta = TYPE_META[type];
              const Icon = meta.icon;
              const active = activeType === type;
              return (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                    active
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" style={active ? undefined : { color: meta.color }} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Idea drop bar */}
        <div className="max-w-6xl mx-auto mt-4 flex items-center gap-2">
          <div className="flex-1 relative">
            <Sparkles
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder={`Drop a ${TYPE_META[activeType].label} idea — it gets polished + scheduled…`}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card/60 border border-border/30 text-sm
                       text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0A84FF]/50 transition-colors"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!input.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A84FF] text-white text-sm font-medium
                     hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-x-auto px-6 py-6">
        <div className="flex gap-4 min-w-max max-w-6xl mx-auto">
          {CONTENT_STAGES.map(stage => {
            const column = pieces.filter(p => p.stage === stage);
            return (
              <div
                key={stage}
                onDragOver={e => {
                  e.preventDefault();
                  setDragOverStage(stage);
                }}
                onDrop={() => handleDrop(stage)}
                className={cn(
                  'w-72 flex-shrink-0 rounded-2xl p-3 transition-colors',
                  dragOverStage === stage
                    ? 'bg-[#0A84FF]/10 border border-[#0A84FF]/40'
                    : 'bg-card/30 border border-border/20'
                )}
              >
                <div className="flex items-center justify-between px-1 mb-3">
                  <span className="text-sm font-medium text-foreground">
                    {CONTENT_STAGE_LABEL[stage]}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {column.length}
                  </span>
                </div>

                <div className="space-y-2 min-h-[80px]">
                  {column.map(piece => (
                    <ContentCard
                      key={piece.id}
                      piece={piece}
                      polishing={polishing.has(piece.id)}
                      expanded={expandedId === piece.id}
                      onToggle={() =>
                        setExpandedId(expandedId === piece.id ? null : piece.id)
                      }
                      onDragStart={() => setDraggedId(piece.id)}
                      onRepolish={() => polishIdea(piece)}
                      onDelete={() => deleteContent(piece.id)}
                    />
                  ))}
                  {column.length === 0 && (
                    <div className="text-xs text-muted-foreground/60 text-center py-6">
                      {stage === 'idea' ? 'Drop ideas here' : 'Drag cards here'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface ContentCardProps {
  piece: ContentPiece;
  polishing: boolean;
  expanded: boolean;
  onToggle: () => void;
  onDragStart: () => void;
  onRepolish: () => void;
  onDelete: () => void;
}

function ContentCard({
  piece,
  polishing,
  expanded,
  onToggle,
  onDragStart,
  onRepolish,
  onDelete,
}: ContentCardProps) {
  const needsPolish = !piece.outline && !polishing;
  const accent = TYPE_META[piece.type].color;

  return (
    <div
      draggable={!polishing}
      onDragStart={onDragStart}
      className={cn(
        'group relative rounded-xl bg-card/80 border border-border/30 p-3 cursor-grab active:cursor-grabbing',
        'hover:border-border/60 transition-colors',
        polishing && 'opacity-70'
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ backgroundColor: accent }}
        />
        <div className="flex-1 min-w-0">
          <button onClick={onToggle} className="text-left w-full">
            <p className="text-sm font-medium text-foreground leading-snug">
              {piece.title}
            </p>
          </button>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {polishing && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Polishing…
              </span>
            )}
            {piece.publishDate && !polishing && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarClock className="w-3 h-3" />
                Publish {formatDateShort(piece.publishDate)}
              </span>
            )}
            {needsPolish && (
              <button
                onClick={onRepolish}
                className="flex items-center gap-1 text-xs text-[#0A84FF] hover:opacity-80"
              >
                <Sparkles className="w-3 h-3" /> Polish
              </button>
            )}
          </div>

          {expanded && (
            <div className="mt-3 space-y-3 animate-fade-in">
              {piece.hook && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Hook
                  </p>
                  <p className="text-xs text-foreground/90 leading-relaxed">{piece.hook}</p>
                </div>
              )}
              {piece.outline && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Outline
                  </p>
                  <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                    {piece.outline}
                  </p>
                </div>
              )}
              {piece.publishDate && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <DateChip label="Script" date={piece.scriptDate} />
                  <DateChip label="Film" date={piece.shootDate} />
                  <DateChip label="Edit" date={piece.editDate} />
                  <DateChip label="Publish" date={piece.publishDate} />
                </div>
              )}
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 text-xs text-destructive/80 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DateChip({ label, date }: { label: string; date: string | null }) {
  return (
    <div className="rounded-lg bg-background/40 border border-border/20 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs text-foreground/90 tabular-nums">
        {date ? formatDateShort(date) : '—'}
      </p>
    </div>
  );
}
