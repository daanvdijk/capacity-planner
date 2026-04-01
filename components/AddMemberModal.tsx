'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FactorialEmployee } from '@/lib/factorial';

interface Props {
  onClose: () => void;
  onSave: () => void;
}

function highlight(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-violet-100 text-violet-800 rounded-sm px-0">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function AddMemberModal({ onClose, onSave }: Props) {
  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState<FactorialEmployee[]>([]);
  const [selected, setSelected] = useState<FactorialEmployee | null>(null);
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/factorial/employees').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setEmployees(data);
    }).catch(() => {});
  }, []);

  const filtered = query.trim()
    ? employees.filter(e =>
        e.full_name.toLowerCase().includes(query.toLowerCase()) ||
        e.email?.toLowerCase().includes(query.toLowerCase())
      )
    : employees;

  // Reset cursor when filter changes
  useEffect(() => { setCursor(0); }, [query]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`) as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  function pick(emp: FactorialEmployee) {
    setSelected(emp);
    setQuery(emp.full_name);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!filtered.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter')     { e.preventDefault(); pick(filtered[cursor]); }
    if (e.key === 'Escape')    { setSelected(null); setQuery(''); }
  }

  const showDropdown = query.trim().length > 0 && !selected;
  const isManual = query.trim().length > 0 && filtered.length === 0;

  async function save() {
    const name = selected ? selected.full_name : query.trim();
    if (!name) { setError('Enter a name'); return; }
    setSaving(true);
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email: selected?.email ?? null,
        factorial_id: selected ? String(selected.id) : null,
        location_id: selected?.location_id ? String(selected.location_id) : null,
      }),
    });
    if (!res.ok) setError('Failed to add member');
    else { onSave(); onClose(); }
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b">
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Search input */}
          <div className="relative">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
              <Input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null); }}
                onKeyDown={handleKey}
                placeholder={employees.length > 0 ? `Search ${employees.length} employees…` : 'Enter name…'}
                className="pl-8"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setSelected(null); inputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none"
                >×</button>
              )}
            </div>

            {/* Dropdown results */}
            {showDropdown && (
              <div
                ref={listRef}
                className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg overflow-hidden"
                style={{ maxHeight: 220, overflowY: 'auto' }}
              >
                {filtered.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">
                    No match — will be added manually
                  </div>
                ) : (
                  filtered.map((emp, i) => (
                    <button
                      key={emp.id}
                      data-idx={i}
                      onClick={() => pick(emp)}
                      className="w-full text-left px-3 py-2.5 text-sm flex items-center justify-between transition-colors"
                      style={{ background: i === cursor ? 'var(--accent)' : 'white' }}
                      onMouseEnter={() => setCursor(i)}
                    >
                      <span className="font-medium">{highlight(emp.full_name, query)}</span>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">
                        {highlight(emp.email ?? '', query)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected employee chip */}
          {selected && (
            <div className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-violet-900">{selected.full_name}</p>
                {selected.email && <p className="text-xs text-violet-600">{selected.email}</p>}
              </div>
              <button
                onClick={() => { setSelected(null); setQuery(''); inputRef.current?.focus(); }}
                className="text-violet-400 hover:text-violet-700 text-lg leading-none ml-3"
              >×</button>
            </div>
          )}

          {/* Manual entry hint */}
          {isManual && (
            <p className="text-xs text-muted-foreground">
              No Factorial match — "<span className="font-medium text-foreground">{query}</span>" will be added without time-off sync.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={save}
            disabled={saving || !query.trim()}
            className="w-full bg-violet-600 hover:bg-violet-700"
          >
            {saving ? 'Adding…' : selected ? `Add ${selected.full_name.split(' ')[0]}` : 'Add member'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
