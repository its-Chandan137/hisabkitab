import { AlertTriangle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import ModalShell from '../shared/ModalShell';

export default function FriendOptionsModal({
  open,
  onClose,
  friend,
  canDelete,
  deleteHint,
  onSaveName,
  onDelete,
}) {
  const [name, setName] = useState(friend?.name || '');

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(friend?.name || '');
  }, [open, friend?.id, friend?.name]);

  const handleSave = (event) => {
    event.preventDefault();

    const result = onSaveName(name);

    if (result.success) {
      onClose();
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={friend ? `Manage ${friend.name}` : 'Manage friend'}
      description="Rename this friend or remove them if they are no longer part of your ledger."
    >
      <div className="space-y-6">
        <form className="space-y-4" onSubmit={handleSave}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Edit name
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="input-field"
            />
          </label>
          <button type="submit" className="btn-primary">
            Save name
          </button>
        </form>

        <div className="surface-panel border border-danger/20 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-danger/10 p-2 text-danger">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">
                Delete friend
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                {deleteHint ||
                  'Deleting a friend removes their standalone transactions too.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!canDelete}
            onClick={() => {
              const result = onDelete();

              if (result?.success) {
                onClose();
              }
            }}
            className="btn-danger mt-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete friend
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
