'use client';

import { useCallback, useEffect, useState } from 'react';
import { format, addWeeks, subWeeks } from 'date-fns';
import { getWeekStart, getWeeks, formatWeek } from '@/lib/dates';
import { MemberCapacity, Project, TeamMember, WeekData } from '@/lib/types';
import CapacityCell from '@/components/CapacityCell';
import AllocationModal from '@/components/AllocationModal';
import AddProjectModal from '@/components/AddProjectModal';
import AddMemberModal from '@/components/AddMemberModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

const WEEK_COUNT = 13;
const MEMBER_COL = 200;
const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16',
];

interface ModalState {
  type: 'allocation';
  memberId: string;
  memberName: string;
  week: WeekData;
}

export default function Home() {
  const router = useRouter();
  const [windowStart, setWindowStart] = useState<Date>(() => getWeekStart(new Date()));
  const [capacity, setCapacity] = useState<MemberCapacity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [weekWidth, setWeekWidth] = useState(600);
  const [editingProjectColor, setEditingProjectColor] = useState<string | null>(null);
  const [copyingWeek, setCopyingWeek] = useState<string | null>(null);

  useEffect(() => {
    function measure() {
      setWeekWidth(Math.floor((window.innerWidth - MEMBER_COL - 48) / 2));
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const weeks = getWeeks(windowStart, WEEK_COUNT);
  const from = formatWeek(weeks[0]);
  const to = formatWeek(weeks[weeks.length - 1]);

  const load = useCallback(async () => {
    setLoading(true);
    const [capRes, projRes, memRes] = await Promise.all([
      fetch(`/api/capacity?from=${from}&to=${to}`),
      fetch('/api/projects'),
      fetch('/api/members'),
    ]);
    const [cap, proj, mem] = await Promise.all([capRes.json(), projRes.json(), memRes.json()]);
    setCapacity(cap);
    setProjects(proj);
    setMembers(mem);
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  async function copyFromLastWeek(week: string) {
    setCopyingWeek(week);
    const res = await fetch('/api/allocations/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_week: week }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error ?? 'Copy failed');
    else if (data.copied === 0) alert(data.message ?? 'Nothing to copy');
    else load();
    setCopyingWeek(null);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function syncFactorial() {
    setSyncing(true);
    const res = await fetch('/api/factorial/sync', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) alert(data.error ?? 'Sync failed');
    else { alert(data.message ?? `Updated ${data.updated} member(s)`); load(); }
    setSyncing(false);
  }

  async function deleteMember(id: string) {
    if (!confirm('Remove this team member?')) return;
    await fetch(`/api/members/${id}`, { method: 'DELETE' });
    load();
  }

  async function deleteProject(id: string) {
    if (!confirm('Delete this project?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    load();
  }

  async function updateProjectColor(id: string, color: string) {
    const project = projects.find(p => p.id === id)!;
    await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: project.name, color }),
    });
    setEditingProjectColor(null);
    load();
  }

  const todayWeek = formatWeek(getWeekStart(new Date()));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b bg-white sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-white text-sm">⚡</div>
          <h1 className="text-base font-semibold">Team Capacity</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={syncFactorial} disabled={syncing}>
            {syncing ? 'Syncing…' : '↻ Sync Factorial'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAddMember(true)}>
            + Member
          </Button>
          <Button size="sm" onClick={() => setShowAddProject(true)} className="bg-violet-600 hover:bg-violet-700">
            + Project
          </Button>
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
            Sign out
          </Button>
        </div>
      </header>

      {/* Legend */}
      {projects.length > 0 && (
        <div className="flex items-center gap-3 px-6 py-2.5 border-b bg-slate-50 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Projects</span>
          {projects.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 group relative">
              <button
                onClick={() => setEditingProjectColor(editingProjectColor === p.id ? null : p.id)}
                className="w-2.5 h-2.5 rounded-full transition-transform hover:scale-125"
                style={{ background: p.color }}
                title="Change color"
              />
              <span className="text-xs text-foreground">{p.name}</span>
              <button
                onClick={() => deleteProject(p.id)}
                className="text-xs opacity-0 group-hover:opacity-100 text-destructive transition-opacity"
              >×</button>
              {editingProjectColor === p.id && (
                <div className="absolute top-5 left-0 z-30 bg-white rounded-lg shadow-lg border p-2 flex gap-1.5 flex-wrap" style={{ width: 136 }}>
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => updateProjectColor(p.id, c)}
                      className="w-5 h-5 rounded-full hover:scale-110 transition-transform focus:outline-none"
                      style={{ background: c, outline: c === p.color ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-200" />
            <span className="text-xs text-muted-foreground">Time off</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-200" />
            <span className="text-xs text-muted-foreground">Public holiday</span>
          </div>
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b bg-white sticky top-[53px] z-10">
        <Button variant="outline" size="sm" onClick={() => setWindowStart(getWeekStart(new Date()))} className="text-xs">
          Today
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="px-2" onClick={() => setWindowStart(w => subWeeks(w, WEEK_COUNT))} title="Previous period">←</Button>
          <span className="text-sm font-medium tabular-nums min-w-[180px] text-center">
            {format(weeks[0], 'MMM d')} – {format(weeks[weeks.length - 1], 'MMM d, yyyy')}
          </span>
          <Button variant="ghost" size="sm" className="px-2" onClick={() => setWindowStart(w => addWeeks(w, WEEK_COUNT))} title="Next period">→</Button>
        </div>
        {loading && <Badge variant="secondary" className="ml-auto text-xs font-normal">Loading…</Badge>}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <p className="text-lg">No team members yet</p>
            <Button onClick={() => setShowAddMember(true)} className="bg-violet-600 hover:bg-violet-700">
              Add your first member
            </Button>
          </div>
        ) : (
          <div style={{ minWidth: 'max-content' }}>
            {/* Week headers */}
            <div className="flex mb-2">
              <div style={{ width: MEMBER_COL, flexShrink: 0 }} />
              {weeks.map(w => {
                const isCurrent = formatWeek(w) === todayWeek;
                return (
                  <div
                    key={w.toISOString()}
                    className="flex-shrink-0 px-3 flex items-center gap-2 group/week"
                    style={{ width: weekWidth }}
                  >
                    <span className={`text-xs font-medium ${isCurrent ? 'text-violet-600' : 'text-muted-foreground'}`}>
                      {format(w, 'EEE MMM d')}
                    </span>
                    {isCurrent && <Badge className="text-xs bg-violet-100 text-violet-700 hover:bg-violet-100 px-1.5 py-0">Now</Badge>}
                    <button
                      onClick={() => copyFromLastWeek(formatWeek(w))}
                      disabled={copyingWeek === formatWeek(w)}
                      title="Copy allocations from previous week"
                      className="opacity-0 group-hover/week:opacity-100 transition-opacity text-muted-foreground hover:text-foreground disabled:opacity-40 text-xs leading-none"
                    >
                      {copyingWeek === formatWeek(w) ? '…' : '⎘'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            {capacity.map(({ member, weeks: memberWeeks }) => (
              <div key={member.id} className="flex items-center mb-2">
                {/* Sticky member col */}
                <div
                  className="flex items-center gap-2.5 flex-shrink-0 group pr-3"
                  style={{ width: MEMBER_COL, position: 'sticky', left: 0, background: 'white', zIndex: 5 }}
                >
                  <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium truncate" style={{ maxWidth: MEMBER_COL - 72 }} title={member.name}>
                    {member.name}
                  </span>
                  <button
                    onClick={() => deleteMember(member.id)}
                    className="text-xs opacity-0 group-hover:opacity-100 text-destructive transition-opacity flex-shrink-0"
                  >×</button>
                </div>

                {memberWeeks.map(weekData => (
                  <div key={weekData.week} style={{ width: weekWidth, flexShrink: 0, padding: '0 6px' }}>
                    <CapacityCell
                      data={weekData}
                      onClick={() => {
                        if (projects.length === 0) { alert('Add a project first'); return; }
                        setModal({ type: 'allocation', memberId: member.id, memberName: member.name, week: weekData });
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal?.type === 'allocation' && (
        <AllocationModal
          memberId={modal.memberId}
          memberName={modal.memberName}
          week={modal.week}
          projects={projects}
          onClose={() => setModal(null)}
          onSave={load}
        />
      )}
      {showAddProject && <AddProjectModal onClose={() => setShowAddProject(false)} onSave={load} />}
      {showAddMember && <AddMemberModal onClose={() => setShowAddMember(false)} onSave={load} />}
    </div>
  );
}
