'use client';

import { useState } from 'react';
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
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [percentage, setPercentage] = useState(20);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const weekLabel = format(parseISO(week.week), 'MMM d, yyyy');
  const leavePct = week.leave_days.length * 20;
  const remaining = 100 - week.allocated_percentage - leavePct;

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
      body: JSON.stringify({ member_id: alloc.member_id, project_id: alloc.project_id, week_start: alloc.week_start }),
    });
    onSave();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="rounded-xl p-6 w-full max-w-md shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">{memberName}</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Week of {weekLabel}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Current allocations */}
        {week.allocations.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>CURRENT ALLOCATIONS</p>
            <div className="space-y-2">
              {week.allocations.map((a) => (
                <div key={a.project_id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--surface-2)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: a.project_color }} />
                    <span className="text-sm">{a.project_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-semibold">{a.percentage}%</span>
                    <button
                      onClick={() => remove(a)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {leavePct > 0 && (
          <div className="mb-4 rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: '#1a1a2e', border: '1px solid #3b3b5e' }}>
            <span className="text-sm">🌴</span>
            <span className="text-sm" style={{ color: '#a78bfa' }}>{leavePct}% time off this week</span>
          </div>
        )}

        {remaining > 0 ? (
          <>
            <div className="mb-4">
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>ADD ALLOCATION</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Project</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>
                    Allocation — <span className="font-semibold text-white">{percentage}%</span>
                    <span className="ml-2" style={{ color: 'var(--text-muted)' }}>(max {remaining}% available)</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={remaining}
                    step={5}
                    value={percentage}
                    onChange={(e) => setPercentage(Number(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                  <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {[20, 40, 60, 80, 100].filter(v => v <= remaining).map(v => (
                      <button key={v} onClick={() => setPercentage(v)} className="hover:text-white">{v}%</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

            <button
              onClick={save}
              disabled={saving || !projectId}
              className="w-full py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ background: '#7c3aed', color: 'white' }}
            >
              {saving ? 'Saving...' : 'Save allocation'}
            </button>
          </>
        ) : (
          <p className="text-sm text-center py-2" style={{ color: 'var(--text-muted)' }}>
            No capacity remaining this week.
          </p>
        )}
      </div>
    </div>
  );
}
