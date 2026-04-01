'use client';

import { WeekData } from '@/lib/types';

interface Props {
  data: WeekData;
  onClick: () => void;
}

type DayState =
  | { type: 'leave' }
  | { type: 'holiday'; name: string }
  | { type: 'project'; color: string; name: string }
  | { type: 'available' };

export default function CapacityCell({ data, onClick }: Props) {
  const { leave_days, holiday_days, allocations } = data;

  const slots: DayState[] = Array.from({ length: 5 }, () => ({ type: 'available' }));

  for (const d of leave_days) slots[d] = { type: 'leave' };
  for (const h of holiday_days) slots[h.day] = { type: 'holiday', name: h.name };

  // Fill project allocations left-to-right into non-off slots
  const freeSlots = slots.map((s, i) => s.type === 'available' ? i : -1).filter(i => i >= 0);
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
      className="relative flex rounded-md overflow-hidden cursor-pointer group transition-all hover:ring-2 hover:ring-violet-400 hover:ring-offset-1"
      style={{ height: 64, border: '1px solid var(--border)' }}
    >
      {slots.map((slot, i) => {
        const isLeave   = slot.type === 'leave';
        const isHoliday = slot.type === 'holiday';
        const isProject = slot.type === 'project';
        const prevSame =
          i > 0 &&
          slots[i - 1].type === slot.type &&
          (!isProject || (slots[i - 1] as { name: string }).name === (slot as { name: string }).name) &&
          (!isHoliday || (slots[i - 1] as { name: string }).name === (slot as { name: string }).name);

        const bg = isLeave   ? '#ede9fe'
                 : isHoliday ? '#fef3c7'
                 : isProject ? (slot as { color: string }).color + '22'
                 : 'white';

        const borderColor = isLeave   ? '#c4b5fd'
                          : isHoliday ? '#fcd34d'
                          : isProject ? (slot as { color: string }).color + '55'
                          : '#e5e7eb';

        const textColor = isLeave   ? '#7c3aed'
                        : isHoliday ? '#92400e'
                        : isProject ? (slot as { color: string }).color
                        : 'transparent';

        const label = isLeave   ? '🌴 Off'
                    : isHoliday ? `🏛️ ${(slot as { name: string }).name}`
                    : isProject ? (slot as { name: string }).name
                    : '';

        return (
          <div
            key={i}
            className="h-full flex items-center relative overflow-hidden flex-1"
            style={{ background: bg, borderRight: i < 4 ? `1px solid ${borderColor}` : 'none' }}
          >
            {!prevSame && label && (
              <span
                className="absolute left-0 right-0 px-2 text-xs font-semibold truncate select-none"
                style={{ color: textColor }}
              >
                {label}
              </span>
            )}
          </div>
        );
      })}

      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 z-10">
        <span className="text-xs font-semibold text-slate-700 bg-white/80 px-2 py-0.5 rounded-full shadow-sm">Edit</span>
      </div>
    </div>
  );
}
