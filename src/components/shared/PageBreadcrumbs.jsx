import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function PageBreadcrumbs({ items, mobileBackTo = '/dashboard' }) {
  const navigate = useNavigate();

  return (
    <div className="mb-4 flex items-center gap-3 sm:mb-6">
      <button
        type="button"
        onClick={() => navigate(mobileBackTo)}
        className="inline-flex items-center gap-2 rounded-full border border-electric-500/15 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:border-electric-500/30 hover:text-slate-100 sm:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1 overflow-hidden">
        <ol className="flex min-w-0 items-center gap-1 text-sm">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
                {item.to ? (
                  <Link
                    to={item.to}
                    className={
                      isLast
                        ? 'max-w-[8rem] truncate text-electric-200 sm:max-w-[14rem]'
                        : 'max-w-[5.5rem] truncate text-slate-500 transition hover:text-electric-300 sm:max-w-[10rem]'
                    }
                    title={item.label}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={
                      isLast
                        ? 'max-w-[8rem] truncate text-electric-200 sm:max-w-[14rem]'
                        : 'max-w-[5.5rem] truncate text-slate-500 sm:max-w-[10rem]'
                    }
                    title={item.label}
                  >
                    {item.label}
                  </span>
                )}

                {!isLast ? (
                  <span className="shrink-0 text-slate-600">&gt;</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
