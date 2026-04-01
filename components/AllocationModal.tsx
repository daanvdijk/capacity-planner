'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Project, WeekData } from '@/lib/types';
import { format, parseISO } from 'date-fns';

interface Props {
  memberId: string;
  memberName: string;
  week: WeekData;
  projects: Project[];
  onClose: () => void;
  onSave: () => void;
}

export default function AllocationModal({ memberId, memberName, week, projects, onClose, onSave }: Props) {
  const weekLabel = format(parseISO(week.week), 'MMM d, yyyy');
  const leavePct = week.leave_days.length * 20;
  const holidayPct = week.holiday_days.length * 20;
  const remaining = 100 - week.allocated_percentage - leavePct - holidayPct;

  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [percentage, setPercentage] = useState(() => Math.min(20, Math.floor(remaining / 5) * 5 || 5));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError('');
    const res = await fetch('/api/allocations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, project_id: projectId, week_start: week.week, percentage }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? 'Failed to save');
    } else {
      onSave();
      onClose();
    }
    setSaving(false);
  }

  async function remove(alloc: { member_id: string; project_id: string; week_start: string }) {
    await fetch('/api/allocations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alloc),
    });
    onSave();
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{memberName}</DialogTitle>
          <p className="text-sm text-muted-foreground">Week of {weekLabel}</p>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Current allocations */}
          {week.allocations.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current allocations</p>
              <div className="space-y-1.5">
                {week.allocations.map(a => (
                  <div key={a.project_id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: a.project_color }} />
                      <span className="text-sm font-medium">{a.project_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums">{a.percentage}%</span>
                      <button onClick={() => remove(a)} className="text-xs text-destructive hover:underline">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {leavePct > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
              <span>🌴</span>
              <span className="text-sm text-violet-700">{leavePct}% personal time off</span>
            </div>
          )}
          {week.holiday_days.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <span>🏛️</span>
              <div>
                {week.holiday_days.map(h => (
                  <p key={h.day} className="text-sm text-amber-800">{h.name}</p>
                ))}
              </div>
            </div>
          )}

          {remaining > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add allocation</p>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Project</label>
                <Select value={projectId} onValueChange={v => v && setProjectId(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Allocation</label>
                  <span className="text-sm font-semibold tabular-nums text-primary">{percentage}%</span>
                </div>
                <input
                  type="range"
                  min={5} max={remaining} step={5}
                  value={percentage}
                  onChange={e => setPercentage(Number(e.target.value))}
                  className="w-full accent-violet-600"
                />
                <div className="flex justify-between">
                  {[20, 40, 60, 80, 100].filter(v => v <= remaining).map(v => (
                    <button
                      key={v}
                      onClick={() => setPercentage(v)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button onClick={save} disabled={saving || !projectId} className="w-full">
                {saving ? 'Saving…' : 'Save allocation'}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-center text-muted-foreground py-2">No capacity remaining this week.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
