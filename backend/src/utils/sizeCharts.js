const { get, run } = require('../db/database');

const CHART_KEYS = ['letter_top', 'letter_bottom', 'numeric_top', 'numeric_bottom'];

const DEFAULT_COLUMNS = {
  letter_top: [
    { key: 'chest', label: 'Chest (cm)' },
    { key: 'shoulder', label: 'Shoulder (cm)' },
    { key: 'length', label: 'Length (cm)' },
    { key: 'sleeve', label: 'Sleeve (cm)' },
  ],
  letter_bottom: [
    { key: 'waist', label: 'Waist (cm)' },
    { key: 'hip', label: 'Hip (cm)' },
    { key: 'inseam', label: 'Inseam (cm)' },
    { key: 'length', label: 'Length (cm)' },
  ],
  numeric_top: [
    { key: 'chest', label: 'Chest (cm)' },
    { key: 'waist', label: 'Waist (cm)' },
    { key: 'hip', label: 'Hip (cm)' },
    { key: 'length', label: 'Length (cm)' },
  ],
  numeric_bottom: [
    { key: 'chest', label: 'Chest (cm)' },
    { key: 'waist', label: 'Waist (cm)' },
    { key: 'hip', label: 'Hip (cm)' },
    { key: 'length', label: 'Length (cm)' },
  ],
};

const DEFAULT_ROWS = {
  letter_top: [
    { size: 'XS', values: { chest: '84', shoulder: '38', length: '62', sleeve: '58' } },
    { size: 'S', values: { chest: '88', shoulder: '40', length: '64', sleeve: '59' } },
    { size: 'M', values: { chest: '92', shoulder: '42', length: '66', sleeve: '60' } },
    { size: 'L', values: { chest: '96', shoulder: '44', length: '68', sleeve: '61' } },
    { size: 'XL', values: { chest: '100', shoulder: '46', length: '70', sleeve: '62' } },
    { size: 'XXL', values: { chest: '104', shoulder: '48', length: '72', sleeve: '63' } },
  ],
  letter_bottom: [
    { size: 'XS', values: { waist: '66', hip: '88', inseam: '74', length: '96' } },
    { size: 'S', values: { waist: '70', hip: '92', inseam: '75', length: '98' } },
    { size: 'M', values: { waist: '74', hip: '96', inseam: '76', length: '100' } },
    { size: 'L', values: { waist: '78', hip: '100', inseam: '77', length: '102' } },
    { size: 'XL', values: { waist: '82', hip: '104', inseam: '78', length: '104' } },
    { size: 'XXL', values: { waist: '86', hip: '108', inseam: '79', length: '106' } },
  ],
  numeric_top: [
    { size: '28', values: { chest: '71', waist: '56', hip: '79', length: '38' } },
    { size: '30', values: { chest: '76', waist: '61', hip: '84', length: '39' } },
    { size: '32', values: { chest: '81', waist: '66', hip: '89', length: '40' } },
    { size: '34', values: { chest: '86', waist: '71', hip: '94', length: '41' } },
    { size: '36', values: { chest: '91', waist: '76', hip: '99', length: '42' } },
    { size: '38', values: { chest: '96', waist: '81', hip: '104', length: '43' } },
    { size: '40', values: { chest: '101', waist: '86', hip: '109', length: '44' } },
    { size: '42', values: { chest: '106', waist: '91', hip: '114', length: '45' } },
    { size: '44', values: { chest: '111', waist: '96', hip: '119', length: '46' } },
    { size: '46', values: { chest: '116', waist: '101', hip: '124', length: '47' } },
  ],
  numeric_bottom: [
    { size: '28', values: { chest: '71', waist: '56', hip: '79', length: '38' } },
    { size: '30', values: { chest: '76', waist: '61', hip: '84', length: '39' } },
    { size: '32', values: { chest: '81', waist: '66', hip: '89', length: '40' } },
    { size: '34', values: { chest: '86', waist: '71', hip: '94', length: '41' } },
    { size: '36', values: { chest: '91', waist: '76', hip: '99', length: '42' } },
    { size: '38', values: { chest: '96', waist: '81', hip: '104', length: '43' } },
    { size: '40', values: { chest: '101', waist: '86', hip: '109', length: '44' } },
    { size: '42', values: { chest: '106', waist: '91', hip: '114', length: '45' } },
    { size: '44', values: { chest: '111', waist: '96', hip: '119', length: '46' } },
    { size: '46', values: { chest: '116', waist: '101', hip: '124', length: '47' } },
  ],
};

function chartSettingKey(key) {
  return `size_chart_${key}`;
}

function defaultChart(key) {
  return {
    key,
    size_type: key.startsWith('letter') ? 'letter' : 'numeric',
    garment_type: key.endsWith('_top') ? 'top' : 'bottom',
    columns: DEFAULT_COLUMNS[key] || [],
    rows: DEFAULT_ROWS[key] || [],
  };
}

function normalizeChart(key, raw) {
  const base = defaultChart(key);
  if (!raw || typeof raw !== 'object') return base;
  const columns = Array.isArray(raw.columns)
    ? raw.columns
        .filter((c) => c && String(c.key || '').trim() && String(c.label || '').trim())
        .map((c) => ({ key: String(c.key).trim(), label: String(c.label).trim() }))
    : base.columns;
  const rows = Array.isArray(raw.rows)
    ? raw.rows
        .filter((r) => r && String(r.size || '').trim())
        .map((r) => ({
          size: key.startsWith('numeric')
            ? String(r.size).trim()
            : String(r.size).trim().toUpperCase(),
          values: columns.reduce((acc, col) => {
            const v = r.values?.[col.key];
            acc[col.key] = v != null ? String(v).trim() : '';
            return acc;
          }, {}),
        }))
    : base.rows;
  return { ...base, columns, rows };
}

async function getSizeChart(key) {
  if (!CHART_KEYS.includes(key)) return null;
  const row = await get('SELECT setting_value FROM site_settings WHERE setting_key = ?', [chartSettingKey(key)]);
  if (!row?.setting_value) return defaultChart(key);
  try {
    return normalizeChart(key, JSON.parse(row.setting_value));
  } catch {
    return defaultChart(key);
  }
}

async function getAllSizeCharts() {
  const charts = {};
  for (const key of CHART_KEYS) {
    charts[key] = await getSizeChart(key);
  }
  return charts;
}

async function saveSizeChart(key, payload) {
  if (!CHART_KEYS.includes(key)) {
    const err = new Error('Invalid size chart key');
    err.status = 400;
    throw err;
  }
  const chart = normalizeChart(key, payload);
  if (!chart.columns.length) {
    const err = new Error('At least one column is required');
    err.status = 400;
    throw err;
  }
  await run(
    `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
    [chartSettingKey(key), JSON.stringify({ columns: chart.columns, rows: chart.rows })]
  );
  return chart;
}

async function ensureDefaultSizeCharts() {
  for (const key of CHART_KEYS) {
    const existing = await get('SELECT setting_key FROM site_settings WHERE setting_key = ?', [chartSettingKey(key)]);
    if (!existing) {
      const chart = defaultChart(key);
      await run(
        `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)`,
        [chartSettingKey(key), JSON.stringify({ columns: chart.columns, rows: chart.rows })]
      );
    }
  }
}

function chartKeyForProduct(sizeType, garmentType) {
  if (!sizeType || !garmentType) return null;
  const key = `${sizeType}_${garmentType}`;
  return CHART_KEYS.includes(key) ? key : null;
}

module.exports = {
  CHART_KEYS,
  chartKeyForProduct,
  getSizeChart,
  getAllSizeCharts,
  saveSizeChart,
  ensureDefaultSizeCharts,
  defaultChart,
};
