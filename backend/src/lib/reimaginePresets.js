/** Canonical reimagine garment + preset slots (mirrors web/src/utils/constants.js). */
const TRANSFORMATIONS = {
  saree: ['Dress', 'Co-ord Set', 'Blouse + Skirt', 'Cape + Palazzos', 'Custom'],
  kurti: ['Skirt', 'Halter Top', 'Crop Top', 'Peplum Top', 'Custom'],
  shirt: ['Japanese Shirt', 'Corset Back', 'Tote Bag', 'Patchwork', 'Custom'],
  pant: ['Jorts (Shorts)', 'Flared Pants', 'Skirt', 'Palazzo', 'Custom'],
};

const GARMENT_LABELS = {
  saree: 'Saree',
  kurti: 'Kurti',
  shirt: 'Shirt',
  pant: 'Pant',
};

function allSlots() {
  const garments = Object.keys(TRANSFORMATIONS).map((id) => ({
    garment_type: id,
    transformation: '',
    label: GARMENT_LABELS[id] || id,
    kind: 'garment',
  }));

  const presets = [];
  for (const [garment_type, list] of Object.entries(TRANSFORMATIONS)) {
    for (const transformation of list) {
      presets.push({
        garment_type,
        transformation,
        label: transformation,
        kind: 'preset',
      });
    }
  }

  return { garments, presets, all: [...garments, ...presets] };
}

function isValidSlot(garment_type, transformation = '') {
  const t = transformation || '';
  if (!TRANSFORMATIONS[garment_type]) return false;
  if (t === '') return true;
  return TRANSFORMATIONS[garment_type].includes(t);
}

module.exports = { TRANSFORMATIONS, GARMENT_LABELS, allSlots, isValidSlot };
