import Link from 'next/link';
import { Fragment } from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * components/ui/Breadcrumb.tsx
 * Accessible breadcrumb trail.
 * Pass the last item without an href to mark it as the current page.
 */
export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1 text-xs text-[#321327]/60">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <Fragment key={`${item.label}-${index}`}>
            {isLast || !item.href ? (
              <span
                aria-current={isLast ? 'page' : undefined}
                className={isLast ? 'text-[#840d5c] font-semibold truncate max-w-45' : ''}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-[#840d5c] transition-colors truncate max-w-35"
              >
                {item.label}
              </Link>
            )}

            {!isLast && (
              <ChevronRight size={12} className="shrink-0 opacity-40" aria-hidden="true" />
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
