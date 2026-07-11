import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Save } from 'lucide-react';
import api from '../../utils/api';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Skeleton';
import { SIZE_CHART_OPTIONS } from '../../utils/sizeConstants';

function slugKey(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 32) || 'col';
}

export default function SizeChartsTab() {
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };
  const [charts, setCharts] = useState({});
  const [activeKey, setActiveKey] = useState(SIZE_CHART_OPTIONS[0].key);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCharts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/size-charts', { headers: authHeader });
      setCharts(data.charts || {});
      const key = activeKey || SIZE_CHART_OPTIONS[0].key;
      setDraft(JSON.parse(JSON.stringify(data.charts?.[key] || null)));
    } catch {
      toast.error('Could not load size charts');
    } finally {
      setLoading(false);
    }
  }, [activeKey]);

  useEffect(() => {
    loadCharts();
  }, []);

  useEffect(() => {
    if (charts[activeKey]) {
      setDraft(JSON.parse(JSON.stringify(charts[activeKey])));
    }
  }, [activeKey, charts]);

  const updateColumn = (index, field, value) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const columns = [...prev.columns];
      const col = { ...columns[index], [field]: value };
      if (field === 'label') {
        col.key = slugKey(value);
      }
      columns[index] = col;
      return { ...prev, columns };
    });
  };

  const addColumn = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      const key = `col_${prev.columns.length + 1}`;
      const columns = [...prev.columns, { key, label: `Column ${prev.columns.length + 1}` }];
      const rows = prev.rows.map((row) => ({
        ...row,
        values: { ...row.values, [key]: row.values?.[key] ?? '' },
      }));
      return { ...prev, columns, rows };
    });
  };

  const removeColumn = (index) => {
    setDraft((prev) => {
      if (!prev || prev.columns.length <= 1) return prev;
      const removed = prev.columns[index];
      const columns = prev.columns.filter((_, i) => i !== index);
      const rows = prev.rows.map((row) => {
        const values = { ...row.values };
        delete values[removed.key];
        return { ...row, values };
      });
      return { ...prev, columns, rows };
    });
  };

  const updateRowSize = (index, size) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const rows = [...prev.rows];
      rows[index] = { ...rows[index], size };
      return { ...prev, rows };
    });
  };

  const updateRowCell = (rowIndex, colKey, value) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const rows = [...prev.rows];
      rows[rowIndex] = {
        ...rows[rowIndex],
        values: { ...rows[rowIndex].values, [colKey]: value },
      };
      return { ...prev, rows };
    });
  };

  const addRow = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      const values = prev.columns.reduce((acc, col) => {
        acc[col.key] = '';
        return acc;
      }, {});
      return { ...prev, rows: [...prev.rows, { size: '', values }] };
    });
  };

  const removeRow = (index) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, rows: prev.rows.filter((_, i) => i !== index) };
    });
  };

  const onSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { data } = await api.put(
        `/admin/size-charts/${activeKey}`,
        { columns: draft.columns, rows: draft.rows },
        { headers: authHeader }
      );
      setCharts((prev) => ({ ...prev, [activeKey]: data.chart }));
      setDraft(JSON.parse(JSON.stringify(data.chart)));
      toast.success('Size chart saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save chart');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-black text-[#341631] font-display mb-2">Size charts</h1>
      <p className="text-sm text-[#341631]/55 font-body mb-8 max-w-2xl">
        Manage measurement tables for letter (XS–XXL) and numeric (28–46) sizing, separately for tops and bottoms.
        Products use the chart that matches their size type and garment type.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {SIZE_CHART_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setActiveKey(opt.key)}
            className={`px-3.5 py-2 text-xs font-bold font-display border transition-colors ${
              activeKey === opt.key
                ? 'bg-[#a8e000] text-white border-[#a8e000]'
                : 'bg-white text-[#341631]/60 border-[#341631]/20 hover:border-[#341631]/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {draft && (
        <div className="bg-white rounded-2xl border border-[#341631]/8 p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#341631] font-display uppercase tracking-wider">Columns</h2>
              <button
                type="button"
                onClick={addColumn}
                className="text-xs font-bold text-[#a8e000] flex items-center gap-1 hover:underline font-display"
              >
                <Plus size={12} /> Add column
              </button>
            </div>
            <div className="space-y-2">
              {draft.columns.map((col, i) => (
                <div key={`${col.key}-${i}`} className="flex gap-2 items-center">
                  <input
                    value={col.label}
                    onChange={(e) => updateColumn(i, 'label', e.target.value)}
                    placeholder="Column label"
                    className="flex-1 px-3 py-2 text-sm border border-[#341631]/20 focus:outline-none focus:border-[#a8e000]"
                  />
                  <button
                    type="button"
                    onClick={() => removeColumn(i)}
                    disabled={draft.columns.length <= 1}
                    className="p-2 text-[#e34334]/70 hover:text-[#e34334] disabled:opacity-30"
                    aria-label="Remove column"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#341631] font-display uppercase tracking-wider">Rows</h2>
              <button
                type="button"
                onClick={addRow}
                className="text-xs font-bold text-[#a8e000] flex items-center gap-1 hover:underline font-display"
              >
                <Plus size={12} /> Add row
              </button>
            </div>
            <div className="overflow-x-auto border border-[#341631]/10">
              <table className="w-full text-sm font-display min-w-[480px]">
                <thead className="bg-[#341631]/5">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase">Size</th>
                    {draft.columns.map((col) => (
                      <th key={col.key} className="px-3 py-2 text-left text-xs font-bold uppercase whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {draft.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t border-[#341631]/8">
                      <td className="px-2 py-1.5">
                        <input
                          value={row.size}
                          onChange={(e) => updateRowSize(rowIndex, e.target.value)}
                          placeholder="M / 32"
                          className="w-20 px-2 py-1.5 text-sm border border-[#341631]/20 focus:outline-none focus:border-[#a8e000]"
                        />
                      </td>
                      {draft.columns.map((col) => (
                        <td key={col.key} className="px-2 py-1.5">
                          <input
                            value={row.values?.[col.key] ?? ''}
                            onChange={(e) => updateRowCell(rowIndex, col.key, e.target.value)}
                            className="w-full min-w-[4rem] px-2 py-1.5 text-sm border border-[#341631]/20 focus:outline-none focus:border-[#a8e000]"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => removeRow(rowIndex)}
                          className="p-1 text-[#e34334]/70 hover:text-[#e34334]"
                          aria-label="Remove row"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Button type="button" variant="primary" icon={Save} loading={saving} onClick={onSave}>
            Save chart
          </Button>
        </div>
      )}
    </div>
  );
}
