import { useEffect, useState } from 'react';
import ModalShell from '../shared/ModalShell';
import { formatCurrency, getTodayInputValue } from '../../lib/utils';

export default function MemberPaymentModal({
  open,
  onClose,
  memberName,
  balance,
  onSubmit,
}) {
  const [date, setDate] = useState(getTodayInputValue());
  const [amountMode, setAmountMode] = useState('full');
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setDate(getTodayInputValue());
    setAmountMode('full');
    setCustomAmount('');
  }, [open]);

  const amount = amountMode === 'full' ? balance : Number(customAmount);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!amount || amount <= 0) {
      return;
    }

    onSubmit({
      date,
      amount,
    });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Record payment"
      className="max-w-lg"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="surface-panel space-y-3 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400">Member</span>
            <span className="text-right text-slate-100">{memberName}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400">Outstanding</span>
            <span className="text-slate-100">{formatCurrency(balance)}</span>
          </div>
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

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Amount
          </span>
          <select
            value={amountMode}
            onChange={(event) => setAmountMode(event.target.value)}
            className="input-field"
          >
            <option value="full">Full Amount</option>
            <option value="custom">Custom Amount</option>
          </select>
        </label>

        {amountMode === 'full' ? (
          <div className="surface-panel p-4">
            <p className="text-sm text-slate-400">Full Amount</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">
              {formatCurrency(balance)}
            </p>
          </div>
        ) : (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Custom Amount
            </span>
            <input
              type="number"
              min="0"
              max={balance}
              step="0.01"
              value={customAmount}
              onChange={(event) => setCustomAmount(event.target.value)}
              className="input-field"
              placeholder="0"
            />
          </label>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Submit
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
