/* =========================================================
   FUTBOLLE — STATE
   ========================================================= */

export const state = {

  mode: "classic",

  players: [],

  classicPlayers: [],

  classic: {
    answer: null,
    guesses: [],
    over: false
  },

  who: {
    answer: null,
    guesses: [],
    over: false
  },

  stats: {
    played: 0,
    wins: 0,
    streak: 0
  }

};