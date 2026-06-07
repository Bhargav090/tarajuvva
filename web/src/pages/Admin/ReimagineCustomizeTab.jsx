import { useState } from 'react';
import toast from 'react-hot-toast';
import { Input, Textarea } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Skeleton';
import { useAdminReimagineCustomizeSettings } from '../../hooks/useReimagineCustomize';

export default function ReimagineCustomizeTab() {
  const { settings, loading, submitting, save } = useAdminReimagineCustomizeSettings();
  const [form, setForm] = useState(null);

  if (loading && !form) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  const values = form || {
    price: String(settings.price ?? 199),
    feature: settings.feature || '',
    description: settings.description || '',
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...(p || values), [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await save({
      price: parseInt(values.price, 10) || 0,
      feature: values.feature.trim(),
      description: values.description.trim(),
    });
    if (result.ok) {
      toast.success('Customize settings saved');
      setForm(null);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-[#241621] font-display mb-1">Reimagine · Customize</h1>
      <p className="text-sm text-[#241621]/55 font-body mb-8">
        Controls the price and feature copy shown when customers click <strong>Customize</strong> on the Reimagine page.
      </p>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl p-6 sm:p-8 border border-[#241621]/8 space-y-5">
        <Input
          label="Consultation price (₹)"
          name="price"
          type="number"
          min="0"
          value={values.price}
          onChange={onChange}
          required
          placeholder="199"
        />
        <Input
          label="Feature title"
          name="feature"
          value={values.feature}
          onChange={onChange}
          required
          placeholder="15 min consultation call"
        />
        <Textarea
          label="Feature description"
          name="description"
          rows={5}
          value={values.description}
          onChange={onChange}
          required
          placeholder="What the customer gets with this consultation…"
        />
        <Button type="submit" variant="primary" loading={submitting}>
          Save settings
        </Button>
      </form>
    </div>
  );
}
