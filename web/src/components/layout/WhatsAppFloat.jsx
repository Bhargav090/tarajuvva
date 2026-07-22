import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { WHATSAPP_LINK, WHATSAPP_DISPLAY } from '../../utils/constants';

/** Fixed WhatsApp chat button — hidden on admin routes. */
export default function WhatsAppFloat() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return null;

  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat on WhatsApp ${WHATSAPP_DISPLAY}`}
      className="fixed bottom-5 right-5 z-[90] inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white pl-3.5 pr-4 py-3 shadow-[4px_4px_0_0_#0a0a0a] border-2 border-black hover:brightness-105 transition"
    >
      <MessageCircle size={20} strokeWidth={2.25} />
      <span className="text-xs font-display font-bold uppercase tracking-wider hidden sm:inline">
        Chat
      </span>
    </a>
  );
}
