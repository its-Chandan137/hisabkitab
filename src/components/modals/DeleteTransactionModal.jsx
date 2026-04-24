import { Trash2 } from 'lucide-react';
import ModalShell from '../shared/ModalShell';
import { formatCurrency, formatDisplayDate } from '../../lib/utils';

export default function DeleteTransactionModal({
  open,
  onClose,
  transaction,
  onDelete,
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Delete transaction"
      description="Are you sure you want to delete this transaction?"
      className="max-w-lg"
    >
      {transaction ? (
        <div className="space-y-5">
          <div className="surface-panel space-y-3 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Date</span>
              <span className="text-slate-100">
                {formatDisplayDate(transaction.date)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Purpose</span>
              <span className="text-right text-slate-100">
                {transaction.purpose}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Amount</span>
              <span className="text-slate-100">
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(transaction.id);
                onClose();
              }}
              className="btn-danger"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
