/** Public URL for a stored hero image (binary served separately). */
function heroMediaUrl(id) {
  return `/api/media/hero/${id}`;
}

function reimagineMediaUrl(id) {
  return `/api/media/reimagine/${id}`;
}

function testimonialMediaUrl(id, index = 0) {
  return `/api/media/testimonial/${id}/${index}`;
}

/** Replace inline base64 with a media URL in API JSON responses. */
function withHeroMediaUrl(row) {
  if (!row) return null;
  return {
    id: row.id,
    width: row.width,
    height: row.height,
    aspect_label: row.aspect_label,
    context: row.context,
    is_active: row.is_active,
    created_at: row.created_at,
    image_path: heroMediaUrl(row.id),
  };
}

function withReimagineMediaUrl(row) {
  if (!row) return null;
  return {
    ...row,
    image_path: reimagineMediaUrl(row.id),
  };
}

module.exports = {
  heroMediaUrl,
  reimagineMediaUrl,
  testimonialMediaUrl,
  withHeroMediaUrl,
  withReimagineMediaUrl,
};
