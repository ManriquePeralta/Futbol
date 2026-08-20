/* =========================================================
   FUTBOLLE — APP
   ========================================================= */

import { state } from "./state.js";

/* =========================================================
   JUEGOS
   ========================================================= */
import {
  initClubModule,
  initClub,
  submitClub,
  getShareData as getClubShareData
} from "./club.js";

import {
  initClassicModule,
  initClassic,
  typeLetter,
  backspace,
  submit as classicSubmit,
  getShareData as getClassicShareData
} from "./classic.js";

import {
  initWhoModule,
  initWho,
  submit as whoSubmit,
  getShareData as getWhoShareData
} from "./who.js";

// Si tenés un intruso.js, importalo acá:
let initIntrusoModule, initIntruso, getIntrusoShareData;
try {
  const intrusoModule = await import("./intruso.js");
  initIntrusoModule = intrusoModule.initIntrusoModule;
  initIntruso = intrusoModule.initIntruso;
  getIntrusoShareData = intrusoModule.getShareData;
} catch (e) {
  // Ignorar si aún no existe intruso.js
}

/* =========================================================
   DATA & STATS
   ========================================================= */
import { loadPlayers } from "./data.js";
import { loadStats, getStatsView } from "./stats.js";

/* =========================================================
   UI & MODALS
   ========================================================= */
import { initUI, getUI, updateStats, toast } from "./ui.js";
import { initModals } from "./modal.js";
import { initKeyboard } from "./keyboard.js";
import { initShare } from "./share.js";

/* =========================================================
   DETECTAR MODO ACTUAL
   ========================================================= */
const game = document.body.dataset.game || "home";
state.mode = game;

/* =========================================================
   INIT UI & MODALES GLOBALES
   ========================================================= */
initUI();
const ui = getUI();
initModals();

/* =========================================================
   STATS
   ========================================================= */
state.stats = loadStats();
if (state.stats) {
  updateStats(getStatsView(state.stats));
}

/* =========================================================
   INICIALIZAR MÓDULO CORRESPONDIENTE
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
    { getShareData: () => getClassicShareData() },
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

if (game === "intruso" && typeof initIntrusoModule === "function") {
  initIntrusoModule(state, ui);
  if (typeof getIntrusoShareData === "function") {
    initShare(state, null, {
      getShareData: () => getIntrusoShareData()
    });
  }
}

/* =========================================================
   CAMBIO DE ESTADÍSTICAS
   ========================================================= */
document.addEventListener("futbolle:stats-changed", () => {
  updateStats(getStatsView(state.stats));
});

/* =========================================================
   BOTONES DE NUEVA PARTIDA
   ========================================================= */
const newGameBtn = document.getElementById("newGameBtn") || ui.intrusoNewGame;

if (newGameBtn) {
  newGameBtn.addEventListener("click", () => {
    if (game === "classic") initClassic(true);
    else if (game === "who") initWho(true);
    else if (game === "club") initClub(true);
    else if (game === "intruso" && typeof initIntruso === "function") initIntruso(true);
  });
}

/* =========================================================
   CARGA DE DATOS & START APP
   ========================================================= */
async function startApp() {
  if (game === "home") return;

  try {
    if (ui.modeDescription) {
      if (game === "classic") ui.modeDescription.textContent = "Adiviná el apellido en 6 intentos.";
      else if (game === "who") ui.modeDescription.textContent = "Descubrí al jugador usando sus datos.";
      else if (game === "club") ui.modeDescription.textContent = "Reconocé el club a partir de sus jugadores.";
      else if (game === "intruso") ui.modeDescription.textContent = "Encontrá al jugador que no encaja.";
    }

    if (ui.classicInput) ui.classicInput.disabled = true;
    if (ui.whoInput) ui.whoInput.disabled = true;
    if (ui.clubInput) ui.clubInput.disabled = true;

    const data = await loadPlayers();
    state.players = data.players || [];
    state.classicPlayers = data.classicPlayers || [];

    if (ui.classicInput) ui.classicInput.disabled = false;
    if (ui.whoInput) ui.whoInput.disabled = false;
    if (ui.clubInput) ui.clubInput.disabled = false;

    if (game === "classic") initClassic();
    else if (game === "who") initWho();
    else if (game === "club") initClub();
    else if (game === "intruso" && typeof initIntruso === "function") initIntruso();

    toast(`${state.players.length} jugadores cargados.`, 1300);
  } catch (error) {
    console.error("FUTBOLLE:", error);
    if (ui.modeDescription) {
      ui.modeDescription.textContent = "No se pudo cargar la base de jugadores.";
    }
    toast("Error cargando players.json.", 4000);
  }
}

startApp();