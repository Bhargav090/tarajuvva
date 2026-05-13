export default function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-[#a8c422]/10 flex items-center justify-center mb-5">
          <Icon size={28} className="text-[#a8c422]" />
        </div>
      )}
      <h3 className="text-xl font-bold text-[#341631] font-display mb-2">{title}</h3>
      {desc && <p className="text-[#341631]/55 font-body text-sm max-w-sm">{desc}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
