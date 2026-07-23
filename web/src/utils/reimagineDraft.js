const CUSTOMIZE_DRAFT_KEY = 'tj_reimagine_customize_draft';
const REMAKE_DRAFT_KEY = 'tj_reimagine_remake_draft';

function readDraft(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

function writeDraft(key, payload) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Quota / private mode — ignore
  }
}

function clearDraft(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function loadCustomizeDraft() {
  return readDraft(CUSTOMIZE_DRAFT_KEY);
}

export function saveCustomizeDraft({ details, cardStep }) {
  writeDraft(CUSTOMIZE_DRAFT_KEY, { details, cardStep });
}

export function clearCustomizeDraft() {
  clearDraft(CUSTOMIZE_DRAFT_KEY);
}

export function loadRemakeDraft() {
  return readDraft(REMAKE_DRAFT_KEY);
}

export function saveRemakeDraft({ details, cardStep, conversionId }) {
  writeDraft(REMAKE_DRAFT_KEY, { details, cardStep, conversionId });
}

export function clearRemakeDraft() {
  clearDraft(REMAKE_DRAFT_KEY);
}
