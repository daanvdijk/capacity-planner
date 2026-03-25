'use client';

import { useEffect, useState } from 'react';
import { FactorialEmployee } from '@/lib/factorial';

interface Props {
  onClose: () => void;
  onSave: () => void;
}

export default function AddMemberModal({ onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [factorialId, setFactorialId] = useState('');
  const [employees, setEmployees] = useState<FactorialEmployee[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [useFactorial, setUseFactorial] = useState(false);

  useEffect(() => {
    fetch('/api/factorial/employees').then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setEmployees(data);
        setUseFactorial(true);
      }
    }).catch(() => {});
  }, []);

  function selectEmployee(emp: FactorialEmployee) {
    setName(emp.full_name);
    setEmail(emp.email ?? '');
    setFactorialId(String(emp.id));
  }

  async function save() {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim() || null, factorial_id: factorialId || null }),
    });
    if (!res.ok) {
      setError('Failed to add member');
    } else {
      onSave();
      onClose();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="rounded-xl p-6 w-full max-w-sm shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add Team Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>

        {useFactorial && employees.length > 0 && (
          <div className="mb-4">
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              IMPORT FROM FACTORIAL
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg" style={{ border: '1px solid var(--border)' }}>
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => selectEmployee(emp)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-violet-600/20 transition-colors flex justify-between items-center"
                  style={factorialId === String(emp.id) ? { background: '#7c3aed33' } : {}}
                >
                  <span>{emp.full_name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{emp.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Name</label>
            <input
              autoFocus={!useFactorial}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@company.com"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>
          {!useFactorial && (
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Factorial Employee ID (optional)</label>
              <input
                type="text"
                value={factorialId}
                onChange={(e) => setFactorialId(e.target.value)}
                placeholder="123456"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="mt-4 w-full py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ background: '#7c3aed', color: 'white' }}
        >
          {saving ? 'Adding...' : 'Add member'}
        </button>
      </div>
    </div>
  );
}
