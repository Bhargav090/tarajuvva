// Disabled — admin hero images no longer served; heroes use static frontend assets.
// function heroMediaUrl(id) {
//   return `/api/media/hero/${id}`;
// }

function reimagineMediaUrl(id) {
  return `/api/media/reimagine/${id}`;
}

function testimonialMediaUrl(id, index = 0) {
  return `/api/media/testimonial/${id}/${index}`;
}

function conversionMediaUrl(id, side = 'from') {
  return `/api/media/conversion/${id}/${side === 'to' ? 'to' : 'from'}`;
}

// function withHeroMediaUrl(row) {
//   if (!row) return null;
//   return {
//     id: row.id,
//     width: row.width,
//     height: row.height,
//     aspect_label: row.aspect_label,
//     context: row.context,
//     is_active: row.is_active,
//     created_at: row.created_at,
//     image_path: heroMediaUrl(row.id),
//   };
// }

function withReimagineMediaUrl(row) {
  if (!row) return null;
  return {
    ...row,
    image_path: reimagineMediaUrl(row.id),
  };
}

module.exports = {
  reimagineMediaUrl,
  testimonialMediaUrl,
  conversionMediaUrl,
  withReimagineMediaUrl,
};
