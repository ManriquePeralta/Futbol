/* =========================================================
   FUTBOLLE — DATA
   ========================================================= */

import {
  normalize,
  getSurname
} from "./utils.js";


/**
 * Convierte un valor a número o null.
 */
function toNumber(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;

}


/**
 * Normaliza un jugador del JSON.
 */
export function normalizePlayer(raw, index) {

  const team =
    raw.team &&
    typeof raw.team === "object"
      ? raw.team
      : null;

  return {

    id: index + 1,

    name:
      typeof raw.name === "string"
        ? raw.name.trim()
        : "Jugador sin nombre",

    age:
      toNumber(raw.age),

    birth_date:
      raw.birth_date || null,

    height:
      toNumber(raw.height_cm),

    position:
      raw.position_label ||
      raw.position_detail ||
      raw.position ||
      "—",

    position_code:
      raw.position || null,

    position_detail:
      raw.position_detail || null,

    club:
      team?.name || "—",

    club_slug:
      team?.slug || null,

    club_code:
      team?.code || null,

    nationality:
      typeof raw.nationality === "string"
        ? raw.nationality.trim()
        : null,

    foot:
      raw.foot ||
      raw.preferred_foot ||
      raw.preferredFoot ||
      null,

    source:
      raw.source || null,

    source_url:
      raw.source_url || null,

    surname:
      getSurname(raw.name)

  };

}


/**
 * Genera la lista disponible para CLÁSICO.
 *
 * El clásico necesita apellidos únicos
 * de exactamente 5 letras.
 */
export function buildClassicPlayers(players) {

  const result = [];
  const used = new Set();

  for (const player of players) {

    const surname = normalize(
      player.surname
    );

    if (
      surname.length !== 5 ||
      used.has(surname)
    ) {
      continue;
    }

    used.add(surname);

    result.push({
      ...player,
      surname
    });

  }

  return result;

}


/**
 * Carga players.json.
 */
export async function loadPlayers() {

  const response = await fetch(
    "./data/players.json",
    {
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(
      `No se pudo cargar players.json: HTTP ${response.status}`
    );
  }

  const data = await response.json();

  if (
    !data ||
    !Array.isArray(data.players)
  ) {
    throw new Error(
      "players.json no contiene un array 'players'."
    );
  }

  const players = data.players
    .map(normalizePlayer)
    .filter(
      player =>
        player.name &&
        player.name !== "Jugador sin nombre"
    );

  return {
    meta: data,
    players,
    classicPlayers:
      buildClassicPlayers(players)
  };

}


/**
 * Busca jugador por nombre o apellido.
 */
export function findPlayer(
  players,
  query
) {

  const q = normalize(query);

  if (!q) {
    return null;
  }


  // Nombre completo exacto
  const exactName =
    players.find(
      player =>
        normalize(player.name) === q
    );

  if (exactName) {
    return exactName;
  }


  // Apellido exacto
  const exactSurname =
    players.find(
      player =>
        normalize(player.surname) === q
    );

  return exactSurname || null;

}


/**
 * Busca jugadores para autocomplete.
 */
export function searchPlayers(
  players,
  query,
  limit = 8
) {

  const q = normalize(query);

  if (!q) {
    return [];
  }

  return players
    .filter(player => {

      const name =
        normalize(player.name);

      const surname =
        normalize(player.surname);

      return (
        name.includes(q) ||
        surname.startsWith(q)
      );

    })
    .slice(0, limit);

}