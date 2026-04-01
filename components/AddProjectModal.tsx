'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16',
];

interface Props {
  onClose: () => void;
  onSave: () => void;
}

export default function AddProjectModal({ onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), color }),
    });
    if (!res.ok) setError('Failed to create project');
    else { onSave(); onClose(); }
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Project name</label>
            <Input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
              placeholder="e.g. Website Redesign"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    background: c,
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-sm text-foreground">{name || 'Project preview'}</span>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? 'Creating…' : 'Create project'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
