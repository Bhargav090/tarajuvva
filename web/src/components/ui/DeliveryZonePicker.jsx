import { DELIVERY_ZONE_OPTIONS, getDeliveryFee } from '../../utils/delivery';

/**
 * @param {'shop' | 'reimagine'} channel
 * @param {import('../../utils/delivery').DELIVERY_FEES} [fees]
 */
export default function DeliveryZonePicker({
  channel,
  value,
  onChange,
  name = 'delivery_zone',
  fees,
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-bold uppercase tracking-[0.18em] text-black/45 font-display mb-1">
        Delivery location *
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {DELIVERY_ZONE_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          const fee = getDeliveryFee(channel, opt.value, fees);
          return (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                selected
                  ? 'border-black bg-black/[0.04]'
                  : 'border-black/15 hover:border-black/40 bg-white'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="mt-1 accent-black"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#0a0a0a] font-display">
                  {opt.label}
                </span>
                <span className="block text-xs text-black/50 font-body mt-0.5 leading-snug">
                  {opt.hint}
                </span>
                <span className="block text-xs font-mono-tj uppercase tracking-[0.12em] text-black/70 mt-1.5">
                  ₹{fee.toLocaleString('en-IN')} delivery
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
