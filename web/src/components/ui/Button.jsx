import { motion } from 'framer-motion';

/**
 * Reusable Button — light brand theme.
 * variant: 'primary' | 'burgundy' | 'red' | 'blue' | 'outline' | 'outline-green' |
 *          'outline-burgundy' | 'ghost' | 'dark'
 * size: 'sm' | 'md' | 'lg' | 'xl'
 */

const VARIANTS = {
  primary: {
    base:  'bg-[var(--tj-shop)] text-black font-bold',
    hover: 'hover:bg-[var(--tj-shop-deep)] hover:shadow-[0_8px_24px_rgba(200,255,46,0.35)]',
  },
  burgundy: {
    base:  'bg-[#7A063C] text-[#eef4d1] font-bold',
    hover: 'hover:bg-[#7d0d25] hover:shadow-[0_8px_24px_rgba(108,11,32,0.3)]',
  },
  red: {
    base:  'bg-[#e34334] text-white font-bold',
    hover: 'hover:bg-[#c93b2d]',
  },
  blue: {
    base:  'bg-[#1b4e81] text-white font-bold',
    hover: 'hover:bg-[#014580]',
  },
  dark: {
    base:  'bg-[#241621] text-[#eef4d1] font-bold',
    hover: 'hover:bg-[#4a1f47]',
  },
  outline: {
    base:  'border-2 border-[#241621]/25 text-[#241621] font-semibold bg-transparent',
    hover: 'hover:border-[#241621]/50 hover:bg-[#241621]/5',
  },
  'outline-green': {
    base:  'border-2 border-[var(--tj-shop)] text-[var(--tj-shop-deep)] font-semibold bg-transparent',
    hover: 'hover:bg-[var(--tj-shop)]/10',
  },
  'outline-burgundy': {
    base:  'border-2 border-[#7A063C] text-[#7A063C] font-semibold bg-transparent',
    hover: 'hover:bg-[#7A063C]/8',
  },
  ghost: {
    base:  'text-[#241621]/60 font-medium bg-transparent',
    hover: 'hover:text-[#241621]',
  },
};

const SIZES = {
  sm:  'px-4 py-2 text-xs rounded-xl gap-1.5',
  md:  'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg:  'px-7 py-3.5 text-sm rounded-xl gap-2',
  xl:  'px-9 py-4 text-base rounded-2xl gap-3',
};

const ICON_SIZE = { sm: 13, md: 15, lg: 16, xl: 18 };

export default function Button({
  children, variant = 'primary', size = 'md',
  icon: Icon, iconPosition = 'left',
  loading = false, fullWidth = false, disabled = false,
  className = '', onClick, type = 'button',
}) {
  const v  = VARIANTS[variant] || VARIANTS.primary;
  const sz = SIZES[size] || SIZES.md;
  const is = ICON_SIZE[size] || 15;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.97 }}
      className={[
        'inline-flex items-center justify-center transition-all duration-300 tracking-wide',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        v.base, v.hover, sz,
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {loading && (
        <span className="inline-block rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
          style={{ width: is, height: is }} />
      )}
      {!loading && Icon && iconPosition === 'left' && <Icon size={is} className="flex-shrink-0" />}
      {children && <span className="font-display">{children}</span>}
      {!loading && Icon && iconPosition === 'right' && <Icon size={is} className="flex-shrink-0" />}
    </motion.button>
  );
}
