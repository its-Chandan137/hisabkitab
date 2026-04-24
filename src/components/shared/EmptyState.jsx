import { CircleDashed } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function EmptyState({
  icon: Icon = CircleDashed,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'glass-card flex flex-col items-center justify-center px-6 py-10 text-center',
        className,
      )}
    >
      <div className="rounded-3xl border border-electric-500/25 bg-electric-500/10 p-4 text-electric-300">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
