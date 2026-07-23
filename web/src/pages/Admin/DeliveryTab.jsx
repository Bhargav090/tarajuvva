import { useState } from 'react';
import toast from 'react-hot-toast';
import { Input } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Skeleton';
import { useAdminDeliverySettings } from '../../hooks/useDeliverySettings';
import { DELIVERY_ZONE_LABELS, DELIVERY_ZONES } from '../../utils/delivery';

function toForm(settings) {
  return {
    shop_hyderabad: String(settings.shop?.hyderabad ?? ''),
    shop_outside: String(settings.shop?.outside ?? ''),
    reimagine_hyderabad: String(settings.reimagine?.hyderabad ?? ''),
    reimagine_outside: String(settings.reimagine?.outside ?? ''),
  };
}

export default function DeliveryTab() {
  const { settings, loading, submitting, save } = useAdminDeliverySettings();
  const [form, setForm] = useState(null);

  if (loading && !form) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  const values = form || toForm(settings);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...(p || values), [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await save({
      shop: {
        hyderabad: Number(values.shop_hyderabad),
        outside: Number(values.shop_outside),
      },
      reimagine: {
        hyderabad: Number(values.reimagine_hyderabad),
        outside: Number(values.reimagine_outside),
      },
    });
    if (result.ok) {
      toast.success('Delivery charges saved');
      setForm(null);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#241621] font-display mb-1">Delivery charges</h1>
        <p className="text-sm text-[#241621]/55 font-body">
          Set shipping fees for Shop checkout and Reimagine remake orders by delivery zone.
          Changes apply to new orders only.
        </p>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl p-6 sm:p-8 border border-[#241621]/8 space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[#241621] font-display">Shop</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label={`${DELIVERY_ZONE_LABELS[DELIVERY_ZONES.HYDERABAD]} (₹)`}
              name="shop_hyderabad"
              type="number"
              min="0"
              step="1"
              value={values.shop_hyderabad}
              onChange={onChange}
              required
            />
            <Input
              label={`${DELIVERY_ZONE_LABELS[DELIVERY_ZONES.OUTSIDE]} (₹)`}
              name="shop_outside"
              type="number"
              min="0"
              step="1"
              value={values.shop_outside}
              onChange={onChange}
              required
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[#241621] font-display">Reimagine (remake)</h2>
          <p className="text-xs text-[#241621]/45 font-body -mt-2">
            Charged on remake orders only. Customize / consultation has no delivery fee.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label={`${DELIVERY_ZONE_LABELS[DELIVERY_ZONES.HYDERABAD]} (₹)`}
              name="reimagine_hyderabad"
              type="number"
              min="0"
              step="1"
              value={values.reimagine_hyderabad}
              onChange={onChange}
              required
            />
            <Input
              label={`${DELIVERY_ZONE_LABELS[DELIVERY_ZONES.OUTSIDE]} (₹)`}
              name="reimagine_outside"
              type="number"
              min="0"
              step="1"
              value={values.reimagine_outside}
              onChange={onChange}
              required
            />
          </div>
        </section>

        <Button type="submit" variant="primary" loading={submitting}>
          Save delivery charges
        </Button>
      </form>
    </div>
  );
}
