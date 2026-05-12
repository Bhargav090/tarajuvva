import { AccentPill } from './Badge';

/**
 * SectionHeader — consistent heading block for each section.
 */
export default function SectionHeader({
  pill, pillColor, title, titleLight,
  subtitle, center = true, action,
  titleClass = '',
}) {
  return (
    <div className={`${center ? 'text-center' : ''} mb-12 sm:mb-16`}>
      {pill && (
        <div className={`flex ${center ? 'justify-center' : ''} mb-4`}>
          <AccentPill color={pillColor}>{pill}</AccentPill>
        </div>
      )}
      <h2 className={`font-display font-black leading-[1.05] tracking-tight text-[#341631] ${titleClass || 'text-4xl sm:text-5xl lg:text-6xl'}`}>
        {title}
        {titleLight && (
          <span className="block font-light text-[#341631]/50 mt-1">{titleLight}</span>
        )}
      </h2>
      {subtitle && (
        <p className="mt-5 text-base sm:text-lg text-[#341631]/60 font-display leading-relaxed max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
      {action && <div className={`mt-6 flex ${center ? 'justify-center' : ''}`}>{action}</div>}
    </div>
  );
}
