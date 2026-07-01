import { brandLogoForForeground } from '../../utils/brandLogo';

export default function BrandLogo({ foreground = '#0a0a0a', className = 'h-12 md:h-14 w-auto object-contain' }) {
  return (
    <img
      src={brandLogoForForeground(foreground)}
      alt="Tarajuvva"
      className={className}
      decoding="async"
    />
  );
}
