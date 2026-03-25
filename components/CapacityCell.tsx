'use client';

import { WeekData } from '@/lib/types';

interface Props {
  data: WeekData;
  onClick: () => void;
}

type DayState =
  | { type: 'leave' }
  | { type: 'project'; color: string; name: string }
  | { type: 'available' };

export default function CapacityCell({ data, onClick }: Props) {
  const { leave_days, allocations } = data;

  // Build a 5-slot map (Mon=0 … Fri=4)
  const slots: DayState[] = Array.from({ length: 5 }, () => ({ type: 'available' }));

  for (const d of leave_days) {
    slots[d] = { type: 'leave' };
  }

  // Fill project allocations into non-leave slots from left
  const freeSlots = slots.map((s, i) => (s.type === 'available' ? i : -1)).filter(i => i >= 0);
  let slotIdx = 0;
  for (const alloc of allocations) {
    const days = Math.max(1, Math.round(alloc.percentage / 20));
    for (let i = 0; i < days && slotIdx < freeSlots.length; i++) {
      slots[freeSlots[slotIdx]] = { type: 'project', color: alloc.project_color, name: alloc.project_name };
      slotIdx++;
    }
  }

  return (
    <div
      onClick={onClick}
      className="relative flex rounded-lg overflow-hidden cursor-pointer group transition-all hover:ring-1 hover:ring-violet-400"
      style={{ height: 64 }}
    >
      {slots.map((slot, i) => {
        const isLeave = slot.type === 'leave';
        const isProject = slot.type === 'project';
        const prevSame = i > 0 && slots[i - 1].type === slot.type &&
          (isProject ? (slots[i - 1] as { name: string }).name === (slot as { name: string }).name : true);

        const bg = isLeave
          ? 'rgba(139,92,246,0.25)'
          : isProject
          ? (slot as { color: string }).color + '28'
          : 'var(--surface-2)';

        const borderColor = isLeave
          ? 'rgba(139,92,246,0.4)'
          : isProject
          ? (slot as { color: string }).color + '55'
          : 'var(--border)';

        return (
          <div
            key={i}
            className="h-full flex items-center relative overflow-hidden flex-1"
            style={{
              background: bg,
              borderRight: i < 4 ? `1px solid ${borderColor}` : 'none',
            }}
          >
            {/* Show label only on the first slot of each run */}
            {!prevSame && (
              <span
                className="absolute left-0 right-0 px-2 text-xs font-semibold truncate leading-none select-none"
                style={{
                  color: isLeave ? '#a78bfa' : isProject ? (slot as { color: string }).color : 'transparent',
                }}
              >
                {isLeave ? '🌴 Off' : isProject ? (slot as { name: string }).name : ''}
              </span>
            )}
          </div>
        );
      })}

      {/* Hover overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        style={{ background: 'rgba(0,0,0,0.4)' }}
      >
        <span className="text-xs text-white font-medium">Edit</span>
      </div>
    </div>
  );
}
