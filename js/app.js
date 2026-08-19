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
  renderMode,
  toast
} from "./ui.js";

import {
  initModals
} from "./modal.js";

import {
  initClassicModule,
  initClassic
} from "./classic.js";

import {
  initWhoModule,
  initWho
} from "./who.js";

import {
  initKeyboard
} from "./keyboard.js";

import {
  initShare
} from "./share.js";


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
   MODULES
   ========================================================= */

initClassicModule(
  state,
  ui
);

initWhoModule(
  state,
  ui
);

initKeyboard(
  state,
  {
    typeLetter:
      (...args) =>
        import("./classic.js")
          .then(module =>
            module.typeLetter(...args)
          ),

    backspace:
      (...args) =>
        import("./classic.js")
          .then(module =>
            module.backspace(...args)
          ),

    submit:
      (...args) =>
        import("./classic.js")
          .then(module =>
            module.submit(...args)
          )

  },
  {
    submit:
      (...args) =>
        import("./who.js")
          .then(module =>
            module.submit(...args)
          )
  }
);

initShare(
  state,
  {
    getShareData:
      () =>
        import("./classic.js")
          .then(module =>
            module.getShareData()
          )
  },
  {
    getShareData:
      () =>
        import("./who.js")
          .then(module =>
            module.getShareData()
          )
  }
);


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
   CAMBIO DE MODO
   ========================================================= */

ui.modeButtons.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        switchMode(
          button.dataset.mode
        );

      }
    );

  }
);


function switchMode(
  newMode
) {

  state.mode =
    newMode;

  renderMode(
    state.mode
  );


  if (
    state.mode === "classic"
  ) {

    ui.classicInput.focus();

  } else {

    ui.whoInput.focus();

  }

}


/* =========================================================
   NUEVA PARTIDA
   ========================================================= */

document
  .getElementById("newGameBtn")
  .addEventListener(
    "click",
    () => {

      if (
        state.mode === "classic"
      ) {

        initClassic();

      } else {

        initWho();

      }

    }
  );


/* =========================================================
   CARGAR DATOS
   ========================================================= */

async function startApp() {

  try {

    ui.modeDescription.textContent =
      "Cargando jugadores...";

    ui.classicInput.disabled =
      true;

    ui.whoInput.disabled =
      true;


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


    /*
     * Inicializar ambos juegos.
     */
    initClassic();

    initWho();


    /*
     * Arrancar en clásico.
     */
    switchMode(
      "classic"
    );


    toast(
      `${state.players.length} jugadores cargados.`,
      1300
    );


  } catch (error) {

    console.error(
      "FUTBOLLE:",
      error
    );


    ui.modeDescription.textContent =
      "No se pudo cargar la base de jugadores.";


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