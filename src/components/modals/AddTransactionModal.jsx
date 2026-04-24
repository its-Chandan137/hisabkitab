import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import ModalShell from '../shared/ModalShell';
import { getTodayInputValue, cn } from '../../lib/utils';

const transactionTabs = [
  {
    id: 'given',
    label: 'Given',
    icon: ArrowUpRight,
    activeClass: 'border-danger/[0.35] bg-danger/10 text-danger',
  },
  {
    id: 'received',
    label: 'Received',
    icon: ArrowDownLeft,
    activeClass: 'border-success/[0.35] bg-success/10 text-success',
  },
];

export default function AddTransactionModal({
  open,
  onClose,
  friend,
  onSave,
}) {
  const [type, setType] = useState('given');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [date, setDate] = useState(getTodayInputValue());

  useEffect(() => {
    if (!open) {
      return;
    }

    setType('given');
    setAmount('');
    setPurpose('');
    setDate(getTodayInputValue());
  }, [open, friend?.id]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const result = onSave({
      friendId: friend.id,
      type,
      amount: Number(amount),
      purpose,
      date,
    });

    if (result.success) {
      onClose();
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Add transaction for ${friend?.name || ''}`}
      description="Capture money given or received. The balance updates instantly."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          {transactionTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = type === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setType(tab.id)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                  isActive
                    ? tab.activeClass
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-electric-500/25',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Amount
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="input-field"
              placeholder="₹ 0"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Purpose
            </span>
            <input
              type="text"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              className="input-field"
              placeholder="Lunch, travel, rent..."
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="input-field"
            />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
