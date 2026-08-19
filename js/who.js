/* =========================================================
   FUTBOLLE — ¿QUIÉN ES?
   ========================================================= */

import {
  normalize,
  dailyIndex,
  displayValue
} from "./utils.js";

import {
  findPlayer,
  searchPlayers
} from "./data.js";

import {
  toast,
  clearInput,
  createSuggestion,
  renderSuggestions
} from "./ui.js";

import {
  showResult
} from "./modal.js";

import {
  registerGame,
  saveStats
} from "./stats.js";


const MAX_ATTEMPTS = 6;

let state = null;
let ui = null;


/**
 * Inicializa módulo.
 */
export function initWhoModule(
  appState,
  appUI
) {

  state = appState;
  ui = appUI;


  ui.whoInput.addEventListener(
    "input",
    handleInput
  );


  ui.whoInput.addEventListener(
    "keydown",
    handleKeydown
  );

}


/**
 * Inicializa partida.
 */
export function initWho() {

  if (!state.players.length) {
    return;
  }


  const index =
    dailyIndex(
      state.players.length,
      17
    );


  state.who.answer =
    state.players[index];

  state.who.guesses = [];
  state.who.over = false;


  ui.whoInput.disabled = false;


  clearInput(
    ui.whoInput,
    ui.whoSuggestions
  );


  ui.whoRows.innerHTML = "";

}


/**
 * Maneja input.
 */
function handleInput() {

  if (state.who.over) {
    return;
  }

  showSuggestions();

}


/**
 * Maneja teclado.
 */
function handleKeydown(event) {

  if (
    event.key === "Enter"
  ) {

    event.preventDefault();

    submit();

  }


  if (
    event.key === "Escape"
  ) {

    ui.whoSuggestions.style.display =
      "none";

  }

}


/**
 * Autocomplete.
 */
function showSuggestions() {

  const matches =
    searchPlayers(
      state.players,
      ui.whoInput.value,
      8
    );


  const elements =
    matches.map(
      player =>
        createSuggestion({

          title:
            player.name,

          subtitle:
            `${player.club} · ${player.position}`,

          onClick: () => {

            ui.whoInput.value =
              player.name;

            ui.whoSuggestions.style.display =
              "none";

            ui.whoInput.focus();

          }

        })
    );


  renderSuggestions(
    ui.whoSuggestions,
    elements
  );

}


/**
 * Compara jugadores.
 */
export function compare(
  guess,
  target
) {

  return {

    club:
      compareClub(
        guess,
        target
      ),

    position:
      comparePosition(
        guess,
        target
      ),

    nationality:
      compareExact(
        guess.nationality,
        target.nationality
      ),

    age:
      compareNumber(
        guess.age,
        target.age,
        2
      ),

    foot:
      compareExact(
        guess.foot,
        target.foot
      )

  };

}


/**
 * Club.
 */
function compareClub(
  guess,
  target
) {

  if (
    !guess.club ||
    guess.club === "—" ||
    !target.club ||
    target.club === "—"
  ) {
    return "wrong";
  }

  return normalize(guess.club) ===
    normalize(target.club)
      ? "correct"
      : "wrong";

}


/**
 * Posición.
 */
function comparePosition(
  guess,
  target
) {

  if (
    guess.position_code &&
    target.position_code &&
    normalize(
      guess.position_code
    ) ===
    normalize(
      target.position_code
    )
  ) {
    return "correct";
  }


  if (
    guess.position_detail &&
    target.position_detail &&
    normalize(
      guess.position_detail
    ) ===
    normalize(
      target.position_detail
    )
  ) {
    return "correct";
  }


  if (
    guess.position_code &&
    target.position_code
  ) {

    const groupGuess =
      getPositionGroup(
        guess.position_code
      );

    const groupTarget =
      getPositionGroup(
        target.position_code
      );

    if (
      groupGuess &&
      groupGuess === groupTarget
    ) {
      return "close";
    }

  }


  return "wrong";

}


/**
 * Agrupa posiciones.
 */
function getPositionGroup(
  position
) {

  const code =
    normalize(position);

  if (code === "GK") {
    return "GK";
  }

  if ([
    "DF",
    "CB",
    "LB",
    "RB",
    "LWB",
    "RWB",
    "SW"
  ].includes(code)) {
    return "DF";
  }

  if ([
    "MF",
    "CM",
    "DM",
    "AM",
    "LM",
    "RM",
    "WM"
  ].includes(code)) {
    return "MF";
  }

  if ([
    "FW",
    "ST",
    "CF",
    "LW",
    "RW"
  ].includes(code)) {
    return "FW";
  }

  return null;

}


/**
 * Compara valores exactos.
 */
function compareExact(
  guess,
  target
) {

  if (
    !guess ||
    !target
  ) {
    return "wrong";
  }

  return normalize(guess) ===
    normalize(target)
      ? "correct"
      : "wrong";

}


/**
 * Compara números.
 */
function compareNumber(
  guess,
  target,
  tolerance
) {

  if (
    guess === null ||
    guess === undefined ||
    target === null ||
    target === undefined
  ) {
    return "wrong";
  }


  const a = Number(guess);
  const b = Number(target);


  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b)
  ) {
    return "wrong";
  }


  if (a === b) {
    return "correct";
  }


  if (
    Math.abs(a - b) <= tolerance
  ) {
    return "close";
  }


  return "wrong";

}


/**
 * Envía intento.
 */
export function submit() {

  if (state.who.over) {
    return;
  }


  const query =
    ui.whoInput.value.trim();


  if (!query) {

    toast(
      "Escribí un jugador."
    );

    return;

  }


  const player =
    findPlayer(
      state.players,
      query
    );


  if (!player) {

    toast(
      "No encontramos ese jugador."
    );

    return;

  }


  if (
    state.who.guesses.some(
      guess =>
        guess.id === player.id
    )
  ) {

    toast(
      "Ya probaste ese jugador."
    );

    return;

  }


  state.who.guesses.push(
    player
  );


  addRow(player);


  ui.whoInput.value = "";

  ui.whoSuggestions.style.display =
    "none";


  if (
    player.id ===
    state.who.answer.id
  ) {

    finish(true);

    return;

  }


  if (
    state.who.guesses.length >=
    MAX_ATTEMPTS
  ) {

    finish(false);

  }

}


/**
 * Agrega fila de pistas.
 */
function addRow(player) {

  const result =
    compare(
      player,
      state.who.answer
    );


  const row =
    document.createElement("div");

  row.className =
    "hints-row";

  row.setAttribute(
    "role",
    "row"
  );


  const values = [

    [
      player.name,
      "reveal"
    ],

    [
      displayValue(player.club),
      result.club
    ],

    [
      displayValue(player.position),
      result.position
    ],

    [
      displayValue(
        player.nationality
      ),
      result.nationality
    ],

    [
      player.age !== null
        ? `${player.age} años`
        : "—",
      result.age
    ],

    [
      displayValue(player.foot),
      result.foot
    ]

  ];


  values.forEach(
    ([value, stateClass]) => {

      const cell =
        document.createElement("div");

      cell.className =
        `hint-cell ${stateClass}`;

      cell.textContent =
        String(value ?? "—");

      row.appendChild(cell);

    }
  );


  ui.whoRows.appendChild(
    row
  );


  row.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });

}


/**
 * Finaliza.
 */
function finish(win) {

  state.who.over =
    true;

  ui.whoInput.disabled =
    true;


  registerGame(
    state.stats,
    win
  );

  saveStats(
    state.stats
  );


  showResult({

    win,

    title:
      win
        ? "¡Lo encontraste!"
        : "Se terminó el partido",

    subtitle:
      win
        ? `Descubriste al jugador en ${state.who.guesses.length} intento${state.who.guesses.length === 1 ? "" : "s"}.`
        : "El jugador del día era:",

    answer:
      state.who.answer.name,

    attempts:
      state.who.guesses.length,

    stats:
      state.stats

  });


  document.dispatchEvent(
    new CustomEvent(
      "futbolle:stats-changed"
    )
  );

}


/**
 * Datos para compartir.
 */
export function getShareData() {

  return {

    mode: "who",

    attempts:
      state.who.guesses.length,

    maxAttempts:
      MAX_ATTEMPTS,

    over:
      state.who.over

  };

}