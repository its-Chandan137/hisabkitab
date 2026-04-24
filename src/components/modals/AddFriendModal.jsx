import { useEffect, useState } from 'react';
import ModalShell from '../shared/ModalShell';

export default function AddFriendModal({ open, onClose, onSave }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setName('');
    setError('');
  }, [open]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const result = onSave(name);

    if (!result.success) {
      setError(result.message);
      return;
    }

    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Add friend"
      description="Create a new ledger card instantly and keep it encrypted on this device."
      className="max-w-md"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Friend name
          </span>
          <input
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            className="input-field"
            placeholder="Enter a name"
            autoFocus
          />
        </label>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

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
