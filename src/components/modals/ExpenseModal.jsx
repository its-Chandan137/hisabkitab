import { useEffect, useState } from 'react';
import ModalShell from '../shared/ModalShell';
import {
  formatCurrency,
  getTodayInputValue,
  roundCurrency,
} from '../../lib/utils';

export default function ExpenseModal({
  open,
  onClose,
  group,
  friends,
  onSave,
}) {
  const [item, setItem] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidBy, setPaidBy] = useState('me');
  const [date, setDate] = useState(getTodayInputValue());

  useEffect(() => {
    if (!open) {
      return;
    }

    setItem('');
    setTotalAmount('');
    setPaidBy('me');
    setDate(getTodayInputValue());
  }, [open, group?.id]);

  const members =
    group?.members
      .map((member) => friends.find((friend) => friend.id === member.friendId))
      .filter(Boolean) || [];

  const splitAmount =
    group && Number(totalAmount)
      ? roundCurrency(Number(totalAmount) / (group.members.length + 1))
      : 0;

  const handleSubmit = (event) => {
    event.preventDefault();

    const result = onSave({
      groupId: group.id,
      item,
      totalAmount: Number(totalAmount),
      paidBy,
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
      title={`Add expense to ${group?.name || ''}`}
      description="HisabKitab will update this group's balances without changing your personal friend ledgers."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Item / description
          </span>
          <input
            type="text"
            value={item}
            onChange={(event) => setItem(event.target.value)}
            className="input-field"
            placeholder="Dinner, cabs, snacks..."
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Total amount
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={totalAmount}
              onChange={(event) => setTotalAmount(event.target.value)}
              className="input-field"
              placeholder="₹ 0"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Paid by
            </span>
            <select
              value={paidBy}
              onChange={(event) => setPaidBy(event.target.value)}
              className="input-field"
            >
              <option value="me">Me</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
        </div>

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

        <div className="surface-panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-electric-300/70">
            Auto split
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-100">
            {formatCurrency(splitAmount || 0)} per person
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Split is calculated as total amount divided by all members,
            including you.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save expense
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
