import { Check, Cloud, RefreshCw, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

export default function SyncStatusButton({ status, onRetry, className }) {
  const { addToast } = useToast();

  const isSyncing = status === 'syncing';
  const isSynced = status === 'synced';
  const isError = status === 'error';

  const handleClick = () => {
    if (!isError) {
      return;
    }

    addToast({
      title: 'Sync failed. Click to retry.',
      message: 'Retrying your latest encrypted data now.',
      tone: 'danger',
    });
    void onRetry();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isError}
      className={cn(
        'relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/5 transition',
        isSyncing
          ? 'border-electric-500/30 text-electric-300'
          : isSynced
            ? 'border-success/30 text-success'
            : isError
              ? 'border-danger/30 text-danger'
              : 'border-white/10 text-slate-500',
        !isError ? 'cursor-default' : 'hover:bg-danger/10',
        className,
      )}
      title={
        isSyncing
          ? 'Syncing data'
          : isSynced
            ? 'Data synced'
            : isError
              ? 'Sync failed. Click to retry.'
              : 'Cloud sync idle'
      }
      aria-label={
        isError ? 'Sync failed. Click to retry.' : 'Cloud sync status'
      }
    >
      <Cloud className={cn('h-5 w-5', isSyncing ? 'animate-pulse' : '')} />

      {isSyncing ? (
        <RefreshCw className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 animate-spin rounded-full bg-ink p-[1px] text-electric-300" />
      ) : null}

      {isSynced ? (
        <span className="absolute -right-0.5 -top-0.5 rounded-full bg-ink p-[1px]">
          <Check className="h-3.5 w-3.5 text-success" />
        </span>
      ) : null}

      {isError ? (
        <span className="absolute -right-0.5 -top-0.5 rounded-full bg-ink p-[1px]">
          <X className="h-3.5 w-3.5 text-danger" />
        </span>
      ) : null}
    </button>
  );
}
