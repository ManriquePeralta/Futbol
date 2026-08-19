/* =========================================================
   FUTBOLLE — CLÁSICO
   ========================================================= */

import {
  normalize,
  dailyIndex,
  escapeSelector
} from "./utils.js";

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
const WORD_LENGTH = 5;

const KEYBOARD_ROWS = [
  "QWERTYUIOP",
  "ASDFGHJKLÑ",
  "ZXCVBNM"
];


let state = null;
let ui = null;


/**
 * Conecta el módulo con el estado global y UI.
 */
export function initClassicModule(
  appState,
  appUI
) {

  state = appState;
  ui = appUI;


  buildBoard();
  buildKeyboard();


  ui.classicInput.addEventListener(
    "input",
    handleInput
  );


  ui.classicInput.addEventListener(
    "keydown",
    handleInputKeydown
  );

}


/**
 * Inicia partida clásica.
 */
export function initClassic() {

  if (!state.classicPlayers.length) {

    toast(
      "No hay jugadores disponibles para el clásico."
    );

    return;

  }


  const index =
    dailyIndex(
      state.classicPlayers.length
    );


  state.classic.answer =
    state.classicPlayers[index];

  state.classic.guesses = [];
  state.classic.over = false;


  ui.classicInput.disabled = false;


  clearInput(
    ui.classicInput,
    ui.classicSuggestions
  );


  buildBoard();
  resetKeyboard();

}


/**
 * Construye tablero.
 */
function buildBoard() {

  ui.classicBoard.innerHTML = "";


  for (
    let row = 0;
    row < MAX_ATTEMPTS;
    row++
  ) {

    const rowElement =
      document.createElement("div");

    rowElement.className =
      "classic-row";


    for (
      let col = 0;
      col < WORD_LENGTH;
      col++
    ) {

      const cell =
        document.createElement("div");

      cell.className =
        "classic-cell";

      cell.setAttribute(
        "aria-hidden",
        "true"
      );

      rowElement.appendChild(cell);

    }


    ui.classicBoard.appendChild(
      rowElement
    );

  }

}


/**
 * Construye teclado.
 */
function buildKeyboard() {

  ui.classicKeyboard.innerHTML = "";


  KEYBOARD_ROWS.forEach(
    (letters, rowIndex) => {

      const row =
        document.createElement("div");

      row.className =
        "key-row";


      if (rowIndex === 2) {

        addKey(
          row,
          "BORRAR",
          "wide",
          backspace
        );

      }


      [...letters].forEach(
        letter => {

          addKey(
            row,
            letter,
            "",
            () => typeLetter(letter)
          );

        }
      );


      if (rowIndex === 2) {

        addKey(
          row,
          "ENTER",
          "wide",
          submit
        );

      }


      ui.classicKeyboard.appendChild(
        row
      );

    }
  );

}


/**
 * Añade tecla.
 */
function addKey(
  row,
  label,
  extraClass,
  callback
) {

  const button =
    document.createElement("button");

  button.type = "button";

  button.className =
    `key ${extraClass}`;

  button.dataset.key =
    label;

  button.textContent =
    label;

  button.addEventListener(
    "click",
    callback
  );

  row.appendChild(button);

}


/**
 * Reinicia estados del teclado.
 */
function resetKeyboard() {

  ui.classicKeyboard
    .querySelectorAll(".key")
    .forEach(key => {

      key.dataset.state = "";

      key.classList.remove(
        "correct",
        "present",
        "absent"
      );

    });

}


/**
 * Escribe letra.
 */
export function typeLetter(letter) {

  if (state.classic.over) {
    return;
  }

  if (
    ui.classicInput.value.length >=
    WORD_LENGTH
  ) {
    return;
  }

  ui.classicInput.value +=
    letter;

  renderCurrentRow();

  handleInput();

}


/**
 * Borra letra.
 */
export function backspace() {

  if (state.classic.over) {
    return;
  }

  ui.classicInput.value =
    ui.classicInput.value.slice(
      0,
      -1
    );

  renderCurrentRow();

  handleInput();

}


/**
 * Renderiza lo escrito en la fila.
 */
function renderCurrentRow() {

  const row =
    ui.classicBoard.children[
      state.classic.guesses.length
    ];

  if (!row) {
    return;
  }


  [...row.children].forEach(
    cell => {

      cell.textContent = "";

      cell.classList.remove(
        "filled"
      );

    }
  );


  [...ui.classicInput.value]
    .forEach(
      (letter, index) => {

        const cell =
          row.children[index];

        if (!cell) {
          return;
        }

        cell.textContent =
          letter;

        cell.classList.add(
          "filled"
        );

      }
    );

}


/**
 * Maneja input.
 */
function handleInput() {

  if (state.classic.over) {
    return;
  }

  ui.classicInput.value =
    ui.classicInput.value
      .replace(
        /[^a-zA-ZñÑáéíóúÁÉÍÓÚüÜ]/g,
        ""
      )
      .toUpperCase()
      .slice(0, WORD_LENGTH);


  renderCurrentRow();
  showSuggestions();

}


/**
 * Teclado físico.
 */
function handleInputKeydown(event) {

  if (
    event.key === "Enter"
  ) {

    event.preventDefault();

    submit();

  }


  if (
    event.key === "Escape"
  ) {

    ui.classicSuggestions.style.display =
      "none";

  }

}


/**
 * Autocomplete.
 */
function showSuggestions() {

  const query =
    normalize(
      ui.classicInput.value
    );


  if (!query) {

    ui.classicSuggestions.innerHTML =
      "";

    ui.classicSuggestions.style.display =
      "none";

    return;

  }


  const matches =
    state.classicPlayers
      .filter(
        player =>
          normalize(
            player.surname
          ).startsWith(query)
      )
      .slice(0, 7);


  const suggestionElements =
    matches.map(
      player =>
        createSuggestion({

          title:
            player.surname,

          subtitle:
            `${player.name} · ${player.club}`,

          onClick: () => {

            ui.classicInput.value =
              player.surname;

            ui.classicSuggestions.style.display =
              "none";

            renderCurrentRow();

            ui.classicInput.focus();

          }

        })
    );


  renderSuggestions(
    ui.classicSuggestions,
    suggestionElements
  );

}


/**
 * Evalúa una palabra.
 */
export function evaluate(
  guess,
  target
) {

  const result =
    Array(target.length)
      .fill("absent");

  const counts = {};


  // Contamos letras del target.
  for (const char of target) {

    counts[char] =
      (counts[char] || 0) + 1;

  }


  // Primero correctas.
  [...guess].forEach(
    (char, index) => {

      if (
        char === target[index]
      ) {

        result[index] =
          "correct";

        counts[char]--;

      }

    }
  );


  // Después presentes.
  [...guess].forEach(
    (char, index) => {

      if (
        result[index] ===
        "correct"
      ) {
        return;
      }


      if (
        (counts[char] || 0) > 0
      ) {

        result[index] =
          "present";

        counts[char]--;

      }

    }
  );


  return result;

}


/**
 * Envía intento.
 */
export function submit() {

  if (state.classic.over) {
    return;
  }


  const guess =
    normalize(
      ui.classicInput.value
    );


  if (
    guess.length !==
    WORD_LENGTH
  ) {

    toast(
      "Escribí un apellido de 5 letras."
    );

    return;

  }


  const player =
    state.classicPlayers.find(
      candidate =>
        normalize(
          candidate.surname
        ) === guess
    );


  if (!player) {

    toast(
      "Ese apellido no está disponible."
    );

    return;

  }


  if (
    state.classic.guesses.includes(
      guess
    )
  ) {

    toast(
      "Ya probaste ese apellido."
    );

    return;

  }


  const rowIndex =
    state.classic.guesses.length;


  state.classic.guesses.push(
    guess
  );


  paintRow(
    guess,
    rowIndex
  );


  ui.classicInput.value = "";

  ui.classicSuggestions.style.display =
    "none";


  const answer =
    normalize(
      state.classic.answer.surname
    );


  if (
    guess === answer
  ) {

    finish(true);

    return;

  }


  if (
    state.classic.guesses.length >=
    MAX_ATTEMPTS
  ) {

    finish(false);

  }

}


/**
 * Pinta una fila.
 */
function paintRow(
  guess,
  rowIndex
) {

  const target =
    normalize(
      state.classic.answer.surname
    );

  const result =
    evaluate(
      guess,
      target
    );


  const row =
    ui.classicBoard.children[
      rowIndex
    ];


  [...guess].forEach(
    (letter, index) => {

      const cell =
        row.children[index];

      if (!cell) {
        return;
      }


      cell.textContent =
        letter;

      cell.classList.add(
        "filled",
        "pop"
      );


      cell.classList.remove(
        "correct",
        "present",
        "absent"
      );


      cell.classList.add(
        result[index]
      );


      setTimeout(
        () => {
          cell.classList.remove(
            "pop"
          );
        },
        150
      );

    }
  );


  updateKeyboard(
    guess,
    result
  );

}


/**
 * Actualiza teclado.
 */
function updateKeyboard(
  guess,
  result
) {

  const priority = {

    absent: 1,
    present: 2,
    correct: 3

  };


  [...guess].forEach(
    (letter, index) => {

      const key =
        ui.classicKeyboard.querySelector(
          `.key[data-key="${escapeSelector(letter)}"]`
        );

      if (!key) {
        return;
      }


      const newState =
        result[index];

      const oldState =
        key.dataset.state;


      if (
        !oldState ||
        priority[newState] >
        priority[oldState]
      ) {

        key.dataset.state =
          newState;

        key.classList.remove(
          "correct",
          "present",
          "absent"
        );

        key.classList.add(
          newState
        );

      }

    }
  );

}


/**
 * Finaliza partida.
 */
function finish(win) {

  state.classic.over =
    true;

  ui.classicInput.disabled =
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
        ? "¡Golazo!"
        : "Se terminó el partido",

    subtitle:
      win
        ? `Lo sacaste en ${state.classic.guesses.length} intento${state.classic.guesses.length === 1 ? "" : "s"}.`
        : "El jugador del día era:",

    answer:
      state.classic.answer.name,

    attempts:
      state.classic.guesses.length,

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
 * Estado del juego para compartir.
 */
export function getShareData() {

  return {

    mode: "classic",

    attempts:
      state.classic.guesses.length,

    maxAttempts:
      MAX_ATTEMPTS,

    over:
      state.classic.over

  };

}