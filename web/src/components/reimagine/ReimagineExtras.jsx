import DropZone from '../ui/DropZone';

const FIELD =
  'w-full px-4 py-3 border border-black bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm resize-none';

/** Photos, notes, and preferred pickup date — shown below garment/transform selection. */
export default function ReimagineExtras({ details, setDetails, files, addFiles, removeFile }) {
  return (
    <div className="mt-8 pt-8 border-t border-black/10 space-y-6">
      <div>
        <label className="block text-xs font-mono-tj uppercase tracking-[0.16em] text-black/60 mb-3">
          Upload a photo of the garment
        </label>
        <DropZone files={files} onAdd={addFiles} onRemove={removeFile} variant="compact" />
      </div>

      <div>
        <label className="block text-xs font-mono-tj uppercase tracking-[0.16em] text-black/60 mb-3">
          Notes (optional)
        </label>
        <textarea
          name="notes"
          value={details.notes || ''}
          onChange={(e) => setDetails((p) => ({ ...p, notes: e.target.value }))}
          rows={4}
          placeholder="Fit preferences, sentimental details, anything we should know…"
          className={FIELD}
        />
      </div>

      <div>
        <label className="block text-xs font-mono-tj uppercase tracking-[0.16em] text-black/60 mb-3">
          Preferred pickup date
        </label>
        <input
          type="date"
          name="pickup_date"
          value={details.pickup_date || ''}
          onChange={(e) => setDetails((p) => ({ ...p, pickup_date: e.target.value }))}
          min={new Date().toISOString().slice(0, 10)}
          className="w-full max-w-xs px-4 py-3 border border-black bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm"
        />
      </div>
    </div>
  );
}
