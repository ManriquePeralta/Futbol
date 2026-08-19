/* =========================================================
   FUTBOLLE — UTILS
   ========================================================= */


/**
 * Normaliza texto para búsquedas y comparaciones.
 */
export function normalize(value) {

  return String(value ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ñ/g, "N")
    .replace(/[^A-Z0-9 ]/g, "")
    .trim();

}


/**
 * Devuelve el índice correspondiente al día actual.
 *
 * El offset permite que dos modos tengan
 * jugadores diarios diferentes.
 */
export function dailyIndex(length, offset = 0) {

  if (!length) {
    return 0;
  }

  const day = Math.floor(
    Date.now() / 86400000
  );

  return Math.abs(
    (day + offset) % length
  );

}


/**
 * Obtiene el apellido.
 */
export function getSurname(name) {

  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return parts.length
    ? parts[parts.length - 1]
    : "";

}


/**
 * Escapa caracteres especiales para CSS.escape.
 */
export function escapeSelector(value) {

  if (
    typeof CSS !== "undefined" &&
    typeof CSS.escape === "function"
  ) {
    return CSS.escape(value);
  }

  return String(value).replace(
    /([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g,
    "\\$1"
  );

}


/**
 * Delay simple.
 */
export function sleep(ms) {

  return new Promise(
    resolve => setTimeout(resolve, ms)
  );

}


/**
 * Porcentaje de victorias.
 */
export function winRate(stats) {

  if (!stats.played) {
    return 0;
  }

  return Math.round(
    stats.wins / stats.played * 100
  );

}


/**
 * Convierte un valor a "—".
 */
export function displayValue(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return String(value);

}