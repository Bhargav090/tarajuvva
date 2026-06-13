import { Link } from 'react-router-dom';
import Button from './Button';

/**
 * Consistent CTA row for post-submit / success screens.
 * actions: { to?, label, variant?, onClick? }[]
 */
export default function SuccessNav({ actions, className = '' }) {
  if (!actions?.length) return null;

  return (
    <div className={`mt-8 flex flex-wrap gap-3 justify-center ${className}`}>
      {actions.map(({ to, label, variant = 'outline', onClick }) =>
        onClick ? (
          <Button key={label} type="button" variant={variant} onClick={onClick}>
            {label}
          </Button>
        ) : (
          <Link key={label} to={to}>
            <Button variant={variant}>{label}</Button>
          </Link>
        ),
      )}
    </div>
  );
}
