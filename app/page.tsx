'use client';

import { useCallback, useEffect, useState } from 'react';
import { format, addWeeks, subWeeks } from 'date-fns';
import { getWeekStart, getWeeks, formatWeek } from '@/lib/dates';
import { MemberCapacity, Project, TeamMember, WeekData } from '@/lib/types';
import CapacityCell from '@/components/CapacityCell';
import AllocationModal from '@/components/AllocationModal';
import AddProjectModal from '@/components/AddProjectModal';
import AddMemberModal from '@/components/AddMemberModal';

const WEEK_COUNT = 13; // ~3 months
const MEMBER_COL = 200;

interface ModalState {
  type: 'allocation';
  memberId: string;
  memberName: string;
  week: WeekData;
}

export default function Home() {
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

  useEffect(() => {
    function measure() {
      // Fit exactly 2 weeks in the scrollable area (viewport minus member col and padding)
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

  async function deleteMember(id: string) {
    if (!confirm('Remove this team member?')) return;
    await fetch(`/api/members/${id}`, { method: 'DELETE' });
    load();
  }

  async function syncFactorial() {
    setSyncing(true);
    const res = await fetch('/api/factorial/sync', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? 'Sync failed');
    } else {
      alert(`Synced ${data.total} employees — ${data.added} added, ${data.updated} updated`);
      load();
    }
    setSyncing(false);
  }

  async function deleteProject(id: string) {
    if (!confirm('Delete this project? All allocations will be removed.')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    load();
  }

  const todayWeek = formatWeek(getWeekStart(new Date()));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: '#7c3aed' }}>⚡</div>
          <h1 className="text-base font-semibold tracking-tight">Team Capacity</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={syncFactorial}
            disabled={syncing}
            className="text-sm px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10 cursor-pointer disabled:opacity-50"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            {syncing ? 'Syncing…' : '↻ Sync Factorial'}
          </button>
          <button
            onClick={() => setShowAddMember(true)}
            className="text-sm px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10 cursor-pointer"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            + Member
          </button>
          <button
            onClick={() => setShowAddProject(true)}
            className="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
            style={{ background: '#7c3aed', color: 'white' }}
          >
            + Project
          </button>
        </div>
      </header>

      {/* Projects legend */}
      {projects.length > 0 && (
        <div className="flex items-center gap-4 px-6 py-3 flex-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>PROJECTS</span>
          {projects.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5 group">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
              <span className="text-xs">{p.name}</span>
              <button
                onClick={() => deleteProject(p.id)}
                className="text-xs opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity ml-0.5 cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-4">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(139,92,246,0.5)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Time off</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(16,185,129,0.3)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Available</span>
          </div>
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center gap-3 px-6 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setWindowStart(w => subWeeks(w, WEEK_COUNT))}
          className="text-sm px-3 py-1 rounded-lg transition-colors hover:bg-white/10 cursor-pointer"
          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          ← Prev
        </button>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {format(weeks[0], 'MMM d')} – {format(weeks[weeks.length - 1], 'MMM d, yyyy')}
        </span>
        <button
          onClick={() => setWindowStart(w => addWeeks(w, WEEK_COUNT))}
          className="text-sm px-3 py-1 rounded-lg transition-colors hover:bg-white/10 cursor-pointer"
          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          Next →
        </button>
        <button
          onClick={() => setWindowStart(getWeekStart(new Date()))}
          className="text-xs px-2 py-1 rounded transition-colors hover:bg-white/10 ml-1 cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
        >
          Today
        </button>
      </div>

      {/* Main grid */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>No team members yet</p>
            <button
              onClick={() => setShowAddMember(true)}
              className="text-sm px-4 py-2 rounded-lg font-medium cursor-pointer"
              style={{ background: '#7c3aed', color: 'white' }}
            >
              Add your first member
            </button>
          </div>
        ) : (
          <div style={{ minWidth: 'max-content' }}>
            {/* Week headers */}
            <div className="flex mb-2">
              {/* Sticky spacer matching member col */}
              <div style={{ width: MEMBER_COL, flexShrink: 0 }} />
              {weeks.map((w) => {
                const isCurrentWeek = formatWeek(w) === todayWeek;
                return (
                  <div
                    key={w.toISOString()}
                    className="text-xs font-medium px-3 flex-shrink-0"
                    style={{
                      width: weekWidth,
                      color: isCurrentWeek ? '#a78bfa' : 'var(--text-muted)',
                    }}
                  >
                    <span>{format(w, 'EEE MMM d')}</span>
                    {isCurrentWeek && <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#7c3aed33', color: '#a78bfa' }}>Now</span>}
                  </div>
                );
              })}
            </div>

            {/* Member rows */}
            {capacity.map(({ member, weeks: memberWeeks }) => (
              <div key={member.id} className="flex items-center mb-2 gap-0">
                {/* Member name — sticky */}
                <div
                  className="flex items-center gap-2 flex-shrink-0 group z-10"
                  style={{ width: MEMBER_COL, position: 'sticky', left: 0, background: 'var(--background)' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{ background: '#7c3aed33', color: '#a78bfa' }}
                  >
                    {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm truncate" style={{ maxWidth: MEMBER_COL - 60 }} title={member.name}>{member.name}</span>
                  <button
                    onClick={() => deleteMember(member.id)}
                    className="text-xs opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity flex-shrink-0 cursor-pointer"
                  >
                    ×
                  </button>
                </div>

                {/* Week cells */}
                {memberWeeks.map((weekData) => (
                  <div key={weekData.week} style={{ width: weekWidth, flexShrink: 0, padding: '0 6px' }}>
                    <CapacityCell
                      data={weekData}
                      onClick={() => {
                        if (projects.length === 0) {
                          alert('Add a project first');
                          return;
                        }
                        setModal({ type: 'allocation', memberId: member.id, memberName: member.name, week: weekData });
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="fixed bottom-4 right-4 text-xs px-3 py-1.5 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            Refreshing...
          </div>
        )}
      </div>

      {/* Modals */}
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
