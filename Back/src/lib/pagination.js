/**
 * Paginación opt-in para los listados.
 *
 * Si la petición no trae `?page` ni `?limit`, devuelve null y el controlador
 * sigue devolviendo todos los registros (compatibilidad hacia atrás con el
 * frontend actual). Si trae alguno, se pagina con un tope máximo de seguridad
 * para que `?limit=999999` no pueda traer la tabla entera.
 *
 * @param {object} query  req.query
 * @param {object} [opts]
 * @param {number} [opts.defaultLimit=20]
 * @param {number} [opts.maxLimit=100]
 * @returns {{ page: number, limit: number, skip: number, take: number } | null}
 */
export function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  if (query.page === undefined && query.limit === undefined) return null;

  let page = Number.parseInt(query.page ?? "1", 10);
  let limit = Number.parseInt(query.limit ?? String(defaultLimit), 10);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/**
 * Arma el bloque `pagination` de la respuesta a partir del total y de cuántos
 * registros se devolvieron en esta página.
 */
export function buildPaginationMeta({ page, limit }, total, returned) {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasMore: (page - 1) * limit + returned < total,
  };
}
