export default function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-[#c8ff2e]/10 flex items-center justify-center mb-5">
          <Icon size={28} className="text-[#c8ff2e]" />
        </div>
      )}
      <h3 className="text-xl font-bold text-[#241621] font-display mb-2">{title}</h3>
      {desc && <p className="text-[#241621]/55 font-body text-sm max-w-sm">{desc}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
