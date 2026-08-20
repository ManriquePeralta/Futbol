/* =========================================================
   FUTBOLLE — APP
   ========================================================= */

import {
  state
} from "./state.js";

import {
  loadPlayers
} from "./data.js";

import {
  loadStats,
  getStatsView
} from "./stats.js";

import {
  initUI,
  getUI,
  updateStats,
  toast
} from "./ui.js";

import {
  initModals
} from "./modal.js";

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

import {
  initKeyboard
} from "./keyboard.js";

import {
  initShare
} from "./share.js";


/* =========================================================
   DETECTAR JUEGO
   ========================================================= */

const game =
  document.body.dataset.game;

if (
  game !== "classic" &&
  game !== "who"
) {

  throw new Error(
    "FUTBOLLE: <body data-game=\"classic|who\"> es requerido."
  );

}

state.mode =
  game;


/* =========================================================
   INIT UI
   ========================================================= */

initUI();

const ui =
  getUI();


/* =========================================================
   STATS
   ========================================================= */

state.stats =
  loadStats();

updateStats(
  getStatsView(
    state.stats
  )
);


/* =========================================================
   MODALS
   ========================================================= */

initModals();


/* =========================================================
   MÓDULO DEL JUEGO ACTUAL
   ========================================================= */

if (game === "classic") {

  initClassicModule(
    state,
    ui
  );

}

if (game === "who") {

  initWhoModule(
    state,
    ui
  );

}


/* =========================================================
   KEYBOARD
   ========================================================= */

if (game === "classic") {

  initKeyboard(
    state,
    {
      typeLetter:
        (...args) =>
          typeLetter(...args),

      backspace:
        (...args) =>
          backspace(...args),

      submit:
        (...args) =>
          classicSubmit(...args)
    },
    null
  );

}


/* =========================================================
   SHARE
   ========================================================= */

if (game === "classic") {

  initShare(
    state,
    {
      getShareData:
        () =>
          getClassicShareData()
    },
    null
  );

}

if (game === "who") {

  initShare(
    state,
    null,
    {
      getShareData:
        () =>
          getWhoShareData()
    }
  );

}


/* =========================================================
   CAMBIO DE ESTADÍSTICAS
   ========================================================= */

document.addEventListener(
  "futbolle:stats-changed",
  () => {

    updateStats(
      getStatsView(
        state.stats
      )
    );

  }
);


/* =========================================================
   NUEVA PARTIDA
   ========================================================= */

const newGameBtn =
  document.getElementById(
    "newGameBtn"
  );

if (newGameBtn) {

  newGameBtn.addEventListener(
    "click",
    () => {

      if (game === "classic") {
        initClassic(true);
        return;
      }

      if (game === "who") {
        initWho(true);
      }

    }
  );

}


/* =========================================================
   CARGAR DATOS
   ========================================================= */

async function startApp() {

  try {

    /* -----------------------------------------
       DESCRIPCIÓN
       ----------------------------------------- */

    if (ui.modeDescription) {

      ui.modeDescription.textContent =
        game === "classic"
          ? "Adiviná el apellido en 6 intentos."
          : "Descubrí al jugador usando sus datos.";

    }


    /* -----------------------------------------
       DESHABILITAR INPUT
       ----------------------------------------- */

    if (ui.classicInput) {

      ui.classicInput.disabled =
        true;

    }

    if (ui.whoInput) {

      ui.whoInput.disabled =
        true;

    }


    /* -----------------------------------------
       CARGAR JUGADORES
       ----------------------------------------- */

    const data =
      await loadPlayers();


    state.players =
      data.players;

    state.classicPlayers =
      data.classicPlayers;


    console.log(
      "FUTBOLLE — jugadores:",
      state.players.length
    );

    console.log(
      "FUTBOLLE — clásicos:",
      state.classicPlayers.length
    );


    /* -----------------------------------------
       INICIAR SOLO EL JUEGO ACTUAL
       ----------------------------------------- */

    if (game === "classic") {

      initClassic();

    }

    if (game === "who") {

      initWho();

    }


    /* -----------------------------------------
       CONFIRMACIÓN
       ----------------------------------------- */

    toast(
      `${state.players.length} jugadores cargados.`,
      1300
    );


  } catch (error) {

    console.error(
      "FUTBOLLE:",
      error
    );


    if (ui.modeDescription) {

      ui.modeDescription.textContent =
        "No se pudo cargar la base de jugadores.";

    }


    toast(
      "Error cargando players.json.",
      4000
    );

  }

}


/* =========================================================
   START
   ========================================================= */

startApp();
