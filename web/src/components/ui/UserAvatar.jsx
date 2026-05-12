/**
 * Google profile URLs (lh3.googleusercontent.com) often return 403 without
 * referrerPolicy="no-referrer" because the CDN rejects some Referer values.
 */
export default function UserAvatar({ src, alt, className }) {
  if (!src) return null;
  const needsNoReferrer = /googleusercontent\.com|ggpht\.com/i.test(src);
  return (
    <img
      src={src}
      alt={alt || ''}
      className={className}
      referrerPolicy={needsNoReferrer ? 'no-referrer' : undefined}
      loading="lazy"
      decoding="async"
    />
  );
}
