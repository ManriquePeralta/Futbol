/* =========================================================
   FUTBOLLE — STATS
   ========================================================= */

import {
  winRate
} from "./utils.js";

const STORAGE_KEY =
  "futbolle_stats";


const DEFAULT_STATS = {
  played: 0,
  wins: 0,
  streak: 0
};


/**
 * Carga estadísticas.
 */
export function loadStats() {

  try {

    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!saved) {
      return {
        ...DEFAULT_STATS
      };
    }

    const parsed =
      JSON.parse(saved);

    return {

      played:
        Number(parsed.played) || 0,

      wins:
        Number(parsed.wins) || 0,

      streak:
        Number(parsed.streak) || 0

    };

  } catch {

    return {
      ...DEFAULT_STATS
    };

  }

}


/**
 * Guarda estadísticas.
 */
export function saveStats(stats) {

  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(stats)
    );

  } catch (error) {

    console.warn(
      "No se pudieron guardar las estadísticas.",
      error
    );

  }

}


/**
 * Registra una partida.
 */
export function registerGame(
  stats,
  win
) {

  stats.played++;

  if (win) {

    stats.wins++;
    stats.streak++;

  } else {

    stats.streak = 0;

  }

}


/**
 * Devuelve información preparada para UI.
 */
export function getStatsView(stats) {

  return {

    played: stats.played,

    wins: stats.wins,

    streak: stats.streak,

    winRate:
      `${winRate(stats)}%`

  };

}