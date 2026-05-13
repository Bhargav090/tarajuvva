import { useState } from 'react';
import { User } from 'lucide-react';

import { FONT_STACK } from '../../utils/fontStack';
function avatarInitial(name) {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const ch = [...trimmed][0];
  if (/[A-Za-z0-9]/.test(ch)) return ch.toUpperCase();
  return null;
}

function needsNoReferrer(src) {
  return /googleusercontent\.com|ggpht\.com/i.test(src);
}

/**
 * Profile image with initials / icon fallback.
 * Initials use the main stack (Roc Grotesk); missing glyphs fall through to Outfit.
 */
export default function UserAvatar({ src, alt, name, className = '', fallbackClassName = '' }) {
  const [imgError, setImgError] = useState(false);
  const label = name || alt;
  const initial = avatarInitial(label);
  const showImg = Boolean(src) && !imgError;
  const shellClass = ['flex shrink-0 items-center justify-center overflow-hidden', className, fallbackClassName]
    .filter(Boolean)
    .join(' ');

  if (showImg) {
    return (
      <img
        src={src}
        alt={label || 'User'}
        className={`object-cover ${className}`.trim()}
        referrerPolicy={needsNoReferrer(src) ? 'no-referrer' : undefined}
        loading="lazy"
        decoding="async"
        onError={() => setImgError(true)}
      />
    );
  }

  if (initial) {
    return (
      <span className={shellClass} style={{ fontFamily: FONT_STACK }} title={label}>
        {initial}
      </span>
    );
  }

  return (
    <span className={shellClass} title={label || 'User'} aria-label={label || 'User'}>
      <User className="w-[55%] h-[55%]" strokeWidth={2} />
    </span>
  );
}
