/* =========================================================
   FUTBOLLE — APP
   ========================================================= */

import { state } from "./state.js";

/* =========================================================
   CLUB
   ========================================================= */
import {
  initClubModule,
  initClub,
  submitClub,
  getShareData as getClubShareData
} from "./club.js";

/* =========================================================
   DATA
   ========================================================= */
import { loadPlayers } from "./data.js";

/* =========================================================
   STATS
   ========================================================= */
import { loadStats, getStatsView } from "./stats.js";

/* =========================================================
   UI
   ========================================================= */
import { initUI, getUI, updateStats, toast } from "./ui.js";

/* =========================================================
   MODALS
   ========================================================= */
import { initModals } from "./modal.js";

/* =========================================================
   CLASSIC
   ========================================================= */
import {
  initClassicModule,
  initClassic,
  typeLetter,
  backspace,
  submit as classicSubmit,
  getShareData as getClassicShareData
} from "./classic.js";

/* =========================================================
   WHO
   ========================================================= */
import {
  initWhoModule,
  initWho,
  submit as whoSubmit,
  getShareData as getWhoShareData
} from "./who.js";

/* =========================================================
   KEYBOARD
   ========================================================= */
import { initKeyboard } from "./keyboard.js";

/* =========================================================
   SHARE
   ========================================================= */
import { initShare } from "./share.js";

/* =========================================================
   DETECTAR JUEGO O PORTADA
   ========================================================= */

const game = document.body.dataset.game || "home";

state.mode = game;

/* =========================================================
   INIT UI & MODALS (GLOBAL PARA TODAS LAS PÁGINAS)
   ========================================================= */

initUI();
const ui = getUI();

// Inicializar modales en todas las páginas donde existan
initModals();

/* =========================================================
   STATS
   ========================================================= */

state.stats = loadStats();

if (state.stats) {
  updateStats(getStatsView(state.stats));
}

/* =========================================================
   MÓDULOS ESPECÍFICOS SEGÚN EL MODO
   ========================================================= */

if (game === "classic") {
  initClassicModule(state, ui);

  initKeyboard(
    state,
    {
      typeLetter: (...args) => typeLetter(...args),
      backspace: (...args) => backspace(...args),
      submit: (...args) => classicSubmit(...args)
    },
    null
  );

  initShare(
    state,
    {
      getShareData: () => getClassicShareData()
    },
    null
  );
}

if (game === "who") {
  initWhoModule(state, ui);

  initShare(state, null, {
    getShareData: () => getWhoShareData()
  });
}

if (game === "club") {
  initClubModule(state, ui);

  initShare(state, null, {
    getShareData: () => getClubShareData()
  });
}

/* =========================================================
   CAMBIO DE ESTADÍSTICAS
   ========================================================= */

document.addEventListener("futbolle:stats-changed", () => {
  updateStats(getStatsView(state.stats));
});

/* =========================================================
   NUEVA PARTIDA
   ========================================================= */

const newGameBtn = document.getElementById("newGameBtn");

if (newGameBtn) {
  newGameBtn.addEventListener("click", () => {
    if (game === "classic") {
      initClassic(true);
    } else if (game === "who") {
      initWho(true);
    } else if (game === "club") {
      initClub(true);
    }
  });
}

/* =========================================================
   CARGAR DATOS E INICIAR JUEGO
   ========================================================= */

async function startApp() {
  // Si estamos en la home/portada sin modo activo, no cargamos módulos de juego
  if (game === "home") {
    return;
  }

  try {
    /* -----------------------------------------
       DESCRIPCIÓN
    ----------------------------------------- */
    if (ui.modeDescription) {
      if (game === "classic") {
        ui.modeDescription.textContent = "Adiviná el apellido en 6 intentos.";
      } else if (game === "who") {
        ui.modeDescription.textContent = "Descubrí al jugador usando sus datos.";
      } else if (game === "club") {
        ui.modeDescription.textContent = "Reconocé el club a partir de sus jugadores.";
      }
    }

    /* -----------------------------------------
       DESHABILITAR INPUTS HASTA CARGAR
    ----------------------------------------- */
    if (ui.classicInput) ui.classicInput.disabled = true;
    if (ui.whoInput) ui.whoInput.disabled = true;
    if (ui.clubInput) ui.clubInput.disabled = true;

    /* -----------------------------------------
       CARGAR JUGADORES
    ----------------------------------------- */
    const data = await loadPlayers();

    state.players = data.players || [];
    state.classicPlayers = data.classicPlayers || [];

    console.log("FUTBOLLE — jugadores:", state.players.length);
    console.log("FUTBOLLE — clásicos:", state.classicPlayers.length);

    /* -----------------------------------------
       HABILITAR E INICIAR MODO
    ----------------------------------------- */
    if (ui.classicInput) ui.classicInput.disabled = false;
    if (ui.whoInput) ui.whoInput.disabled = false;
    if (ui.clubInput) ui.clubInput.disabled = false;

    if (game === "classic") {
      initClassic();
    } else if (game === "who") {
      initWho();
    } else if (game === "club") {
      initClub();
    }

    toast(`${state.players.length} jugadores cargados.`, 1300);
  } catch (error) {
    console.error("FUTBOLLE:", error);

    if (ui.modeDescription) {
      ui.modeDescription.textContent = "No se pudo cargar la base de jugadores.";
    }

    toast("Error cargando players.json.", 4000);
  }
}

/* =========================================================
   START
   ========================================================= */

startApp();