import toast from 'react-hot-toast';
import { useAdminContact } from '../../hooks/useAdmin';
import StatusSelect from '../../components/ui/StatusSelect';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { CONTACT_STATUSES } from '../../utils/constants';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ContactTab() {
  const { entries, loading, updateStatus } = useAdminContact();

  if (loading) return <TableSkeleton rows={6} cols={4} />;

  const newCount = entries.filter((e) => e.status === 'new').length;

  const onUpdate = async (id, status) => {
    try {
      await updateStatus(id, status);
      toast.success(status === 'reached_out' ? 'Marked as reached out' : 'Marked as new');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-8">
        <div>
          <h1 className="text-2xl font-black text-[#241621] font-display mb-1">Get in Touch</h1>
          <p className="text-sm text-[#241621]/50 font-body">
            Inquiries from the footer form. Mark as reached out once you have followed up.
          </p>
        </div>
        <p className="text-xs font-mono-tj uppercase tracking-wider text-[#241621]/45">
          {newCount} new · {entries.length} total
        </p>
      </div>

      <div className="space-y-3">
        {entries.map((e) => (
          <div
            key={e.id}
            className="bg-white rounded-xl px-5 py-4 border border-[#241621]/8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="font-semibold text-[#241621] font-display text-sm">{e.name}</p>
                <Badge status={e.status} />
              </div>
              <p className="text-xs text-[#241621]/45 font-body">
                <a href={`mailto:${e.email}`} className="hover:underline">
                  {e.email}
                </a>
                {e.phone ? (
                  <>
                    {' · '}
                    <a href={`tel:${e.phone}`} className="hover:underline">
                      {e.phone}
                    </a>
                  </>
                ) : null}
              </p>
              <p className="mt-2 text-sm text-[#241621]/80 font-body whitespace-pre-wrap break-words">
                {e.message}
              </p>
              <p className="mt-2 text-[11px] text-[#241621]/35 font-body">{formatDate(e.created_at)}</p>
            </div>
            <div className="shrink-0">
              <StatusSelect
                value={e.status || 'new'}
                options={CONTACT_STATUSES}
                onUpdate={(s) => onUpdate(e.id, s)}
              />
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-[#241621]/40 font-body text-sm py-8 text-center">No inquiries yet.</p>
        )}
      </div>
    </div>
  );
}
