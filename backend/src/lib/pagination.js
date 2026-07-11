/** Parse page/limit query params for list endpoints. */
function parsePagination(query = {}, { defaultLimit = 10, maxLimit = 50 } = {}) {
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
  const rawLimit = Number.parseInt(String(query.limit ?? String(defaultLimit)), 10) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function paginationMeta({ page, limit, total }) {
  const totalPages = Math.max(1, Math.ceil(Number(total || 0) / limit));
  return {
    page,
    limit,
    total: Number(total || 0),
    totalPages,
    hasMore: page < totalPages,
  };
}

module.exports = { parsePagination, paginationMeta };
