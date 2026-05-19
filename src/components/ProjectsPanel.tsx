'use client';

import { useState } from 'react';
import { X, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Project, ProjectStatus } from '@/types';

interface ProjectsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  done: 'Done',
  archived: 'Archived',
};

const STATUS_CYCLE: ProjectStatus[] = ['active', 'paused', 'done', 'archived'];

export function ProjectsPanel({ isOpen, onClose }: ProjectsPanelProps) {
  const {
    state,
    addProject,
    updateProject,
    deleteProject,
    addPriority,
    updatePriority,
    deletePriority,
  } = useStore();
  const { projects, priorities } = state.memory;

  const [newProject, setNewProject] = useState('');
  const [newPriority, setNewPriority] = useState('');

  if (!isOpen) return null;

  const rankedPriorities = [...priorities].sort((a, b) => a.rank - b.rank);

  const movePriority = (index: number, dir: -1 | 1) => {
    const target = rankedPriorities[index + dir];
    const current = rankedPriorities[index];
    if (!target || !current) return;
    // swap ranks
    updatePriority(current.id, { rank: target.rank });
    updatePriority(target.id, { rank: current.rank });
  };

  const cycleStatus = (p: Project) => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(p.status) + 1) % STATUS_CYCLE.length];
    updateProject(p.id, { status: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg glass rounded-2xl p-6 animate-scale-in max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-medium text-foreground">Projects & Priorities</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Standing context the planner remembers every day
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

        <div className="flex-1 overflow-y-auto space-y-8">
          {/* Priorities */}
          <section>
            <h3 className="text-sm font-medium text-foreground mb-3">Standing priorities</h3>

            <form
              onSubmit={e => {
                e.preventDefault();
                const t = newPriority.trim();
                if (!t) return;
                addPriority(t);
                setNewPriority('');
              }}
              className="flex gap-2 mb-3"
            >
              <input
                value={newPriority}
                onChange={e => setNewPriority(e.target.value)}
                placeholder="e.g. Ship the v2 launch"
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-card/40 border border-border/30
                         text-foreground placeholder:text-muted-foreground outline-none
                         focus:border-[#0A84FF]/60 transition-colors"
              />
              <button
                type="submit"
                className="w-9 h-9 rounded-lg bg-[#0A84FF] text-white flex items-center justify-center
                         hover:opacity-90 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {rankedPriorities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No priorities yet</p>
            ) : (
              <div className="space-y-2">
                {rankedPriorities.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 bg-card/40 rounded-lg border border-border/20"
                  >
                    <span className="text-xs font-medium text-muted-foreground w-5 text-center">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-foreground">{p.text}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => movePriority(i, -1)}
                        disabled={i === 0}
                        className="w-7 h-7 rounded-md hover:bg-card flex items-center justify-center
                                 disabled:opacity-30 transition-colors"
                      >
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => movePriority(i, 1)}
                        disabled={i === rankedPriorities.length - 1}
                        className="w-7 h-7 rounded-md hover:bg-card flex items-center justify-center
                                 disabled:opacity-30 transition-colors"
                      >
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => deletePriority(p.id)}
                        className="w-7 h-7 rounded-md hover:bg-red-500/10 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Projects */}
          <section>
            <h3 className="text-sm font-medium text-foreground mb-3">Projects</h3>

            <form
              onSubmit={e => {
                e.preventDefault();
                const t = newProject.trim();
                if (!t) return;
                addProject(t);
                setNewProject('');
              }}
              className="flex gap-2 mb-3"
            >
              <input
                value={newProject}
                onChange={e => setNewProject(e.target.value)}
                placeholder="e.g. Mobile app rebuild"
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-card/40 border border-border/30
                         text-foreground placeholder:text-muted-foreground outline-none
                         focus:border-[#0A84FF]/60 transition-colors"
              />
              <button
                type="submit"
                className="w-9 h-9 rounded-lg bg-[#0A84FF] text-white flex items-center justify-center
                         hover:opacity-90 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No projects yet</p>
            ) : (
              <div className="space-y-2">
                {projects.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 bg-card/40 rounded-lg border border-border/20"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="flex-1 text-sm text-foreground truncate">{p.name}</span>

                    <select
                      value={p.priority}
                      onChange={e =>
                        updateProject(p.id, { priority: Number(e.target.value) })
                      }
                      className="text-xs bg-card/60 border border-border/30 rounded-md px-2 py-1
                               text-muted-foreground outline-none"
                      title="Standing priority"
                    >
                      {[1, 2, 3, 4, 5].map(n => (
                        <option key={n} value={n}>P{n}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => cycleStatus(p)}
                      className="text-xs px-2 py-1 rounded-md bg-card/60 border border-border/30
                               text-muted-foreground hover:text-foreground transition-colors min-w-[68px]"
                      title="Click to change status"
                    >
                      {STATUS_LABEL[p.status]}
                    </button>

                    <button
                      onClick={() => deleteProject(p.id)}
                      className="w-7 h-7 rounded-md hover:bg-red-500/10 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-4 pt-4 border-t border-border/20">
          <p className="text-xs text-muted-foreground text-center">
            Stored locally and carried across every day
          </p>
        </div>
      </div>
    </div>
  );
}
