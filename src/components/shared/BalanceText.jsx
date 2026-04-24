import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';

export default function BalanceText({
  balance,
  className,
  positiveLabel = 'owes me',
  negativeLabel = 'I owe',
  zeroLabel = 'Settled up',
  compact = false,
}) {
  if (!balance) {
    return (
      <span className={cn('text-sm text-slate-400', className)}>
        {zeroLabel}
      </span>
    );
  }

  const isPositive = balance > 0;
  const amount = formatCurrency(Math.abs(balance));

  return (
    <span
      className={cn(
        'text-sm font-semibold',
        isPositive ? 'text-success' : 'text-danger',
        className,
      )}
    >
      {isPositive ? '+' : '-'}
      {amount}
      {compact ? null : ` ${isPositive ? positiveLabel : negativeLabel}`}
    </span>
  );
}
