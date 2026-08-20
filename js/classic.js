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
let currentSuggestions = [];
let highlightedIndex = -1;

/**
 * Conecta el módulo con el estado global y UI.
 */
export function initClassicModule(appState, appUI) {
  state = appState;
  ui = appUI;
  buildBoard();
  buildKeyboard();
  ui.classicInput.addEventListener("input", handleInput);
  ui.classicInput.addEventListener("keydown", handleInputKeydown);
  document.addEventListener("click", handleOutsideClick);
}

/**
 * Inicia partida clásica.
 * @param {boolean} forceRandom - Fuerza a elegir un jugador al azar (Unlimited).
 */
export function initClassic(forceRandom = false) {
  if (!state.classicPlayers.length) {
    toast("No hay jugadores disponibles para el clásico.");
    return;
  }

  let chosenPlayer;

  if (forceRandom || state.classic.isUnlimited) {
    state.classic.isUnlimited = true;
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * state.classicPlayers.length);
    } while (
      state.classicPlayers.length > 1 &&
      state.classic.answer &&
      state.classicPlayers[randomIndex].surname === state.classic.answer.surname
    );
    chosenPlayer = state.classicPlayers[randomIndex];
  } else {
    const index = dailyIndex(state.classicPlayers.length);
    chosenPlayer = state.classicPlayers[index];
  }

  state.classic.answer = chosenPlayer;
  state.classic.guesses = [];
  state.classic.over = false;
  ui.classicInput.disabled = false;
  clearInput(ui.classicInput, ui.classicSuggestions);
  buildBoard();
  resetKeyboard();
  resetSuggestionState();
}

/**
 * Construye tablero.
 */
function buildBoard() {
  ui.classicBoard.innerHTML = "";
  for (let row = 0; row < MAX_ATTEMPTS; row++) {
    const rowElement = document.createElement("div");
    rowElement.className = "classic-row";
    rowElement.setAttribute("role", "row");
    for (let col = 0; col < WORD_LENGTH; col++) {
      const cell = document.createElement("div");
      cell.className = "classic-cell";
      cell.setAttribute("role", "cell");
      cell.setAttribute("aria-label", "Casillero vacío");
      rowElement.appendChild(cell);
    }
    ui.classicBoard.appendChild(rowElement);
  }
}

/**
 * Construye teclado.
 */
function buildKeyboard() {
  ui.classicKeyboard.innerHTML = "";
  KEYBOARD_ROWS.forEach((letters, rowIndex) => {
    const row = document.createElement("div");
    row.className = "key-row";
    if (rowIndex === 2) {
      addKey(row, "BORRAR", "wide", backspace);
    }
    [...letters].forEach(letter => {
      addKey(row, letter, "", () => typeLetter(letter));
    });
    if (rowIndex === 2) {
      addKey(row, "ENTER", "wide", submit);
    }
    ui.classicKeyboard.appendChild(row);
  });
}

/**
 * Añade tecla.
 */
function addKey(row, label, extraClass, callback) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `key ${extraClass}`.trim();
  button.dataset.key = label;
  button.dataset.state = "";
  button.textContent = label;
  button.addEventListener("click", callback);
  row.appendChild(button);
}

/**
 * Reinicia estados del teclado.
 */
function resetKeyboard() {
  ui.classicKeyboard.querySelectorAll(".key").forEach(key => {
    key.dataset.state = "";
    key.classList.remove("correct", "present", "absent");
  });
}

/**
 * Escribe letra.
 */
export function typeLetter(letter) {
  if (state.classic.over) return;
  if (ui.classicInput.value.length >= WORD_LENGTH) return;
  ui.classicInput.value += letter;
  renderCurrentRow();
  handleInput();
}

/**
 * Borra letra.
 */
export function backspace() {
  if (state.classic.over) return;
  ui.classicInput.value = ui.classicInput.value.slice(0, -1);
  renderCurrentRow();
  handleInput();
}

/**
 * Renderiza lo escrito en la fila activa.
 */
function renderCurrentRow() {
  const row = ui.classicBoard.children[state.classic.guesses.length];
  if (!row) return;
  [...row.children].forEach(cell => {
    cell.textContent = "";
    cell.classList.remove("filled");
    cell.setAttribute("aria-label", "Casillero vacío");
  });
  [...ui.classicInput.value].forEach((letter, index) => {
    const cell = row.children[index];
    if (!cell) return;
    cell.textContent = letter;
    cell.classList.add("filled");
    cell.setAttribute("aria-label", `Letra ${letter}`);
  });
}

/**
 * Maneja input.
 */
function handleInput() {
  if (state.classic.over) return;
  ui.classicInput.value = ui.classicInput.value
    .replace(/[^a-zA-ZñÑ ]/g, "")
    .toUpperCase()
    .slice(0, WORD_LENGTH);
  renderCurrentRow();
  showSuggestions();
}

/**
 * Maneja teclado físico: navegación de sugerencias + submit/escape.
 */
function handleInputKeydown(event) {
  const suggestionsOpen = currentSuggestions.length > 0 &&
    ui.classicSuggestions.style.display !== "none";

  if (event.key === "ArrowDown") {
    if (suggestionsOpen) {
      event.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, currentSuggestions.length - 1);
      updateHighlight();
    }
    return;
  }

  if (event.key === "ArrowUp") {
    if (suggestionsOpen) {
      event.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
      updateHighlight();
    }
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (suggestionsOpen && highlightedIndex >= 0) {
      selectSuggestion(currentSuggestions[highlightedIndex]);
    } else {
      submit();
    }
    return;
  }

  if (event.key === "Escape") {
    closeSuggestions();
  }
}

/**
 * Sugerencias de autocompletado.
 */
function showSuggestions() {
  const query = normalize(ui.classicInput.value);
  if (!query) {
    closeSuggestions();
    return;
  }
  currentSuggestions = state.classicPlayers
    .filter(player => normalize(player.surname).startsWith(query))
    .slice(0, 7);
  highlightedIndex = -1;

  renderCurrentSuggestions();

  if (currentSuggestions.length === 0) {
    ui.classicSuggestions.style.display = "none";
  }
}

/**
 * Renderiza las sugerencias actuales marcando la resaltada.
 */
function renderCurrentSuggestions() {
  const suggestionElements = currentSuggestions.map((player, i) =>
    createSuggestion({
      title: player.surname,
      subtitle: `${player.name} • ${player.club}`,
      highlighted: i === highlightedIndex,
      onClick: () => selectSuggestion(player)
    })
  );
  renderSuggestions(ui.classicSuggestions, suggestionElements);
}

function updateHighlight() {
  renderCurrentSuggestions();
  const highlightedEl = ui.classicSuggestions.children[highlightedIndex];
  if (highlightedEl) {
    highlightedEl.scrollIntoView({ block: "nearest" });
  }
}

function selectSuggestion(player) {
  ui.classicInput.value = player.surname;
  closeSuggestions();
  renderCurrentRow();
  ui.classicInput.focus();
}

function closeSuggestions() {
  ui.classicSuggestions.style.display = "none";
  resetSuggestionState();
}

function resetSuggestionState() {
  currentSuggestions = [];
  highlightedIndex = -1;
}

function handleOutsideClick(event) {
  if (!ui?.classicSuggestions) return;
  const clickedInside = ui.classicInput.contains(event.target) ||
    ui.classicSuggestions.contains(event.target);
  if (!clickedInside) {
    closeSuggestions();
  }
}

/**
 * Evalúa letras de la palabra ingresada.
 */
export function evaluate(guess, target) {
  const result = Array(target.length).fill("absent");
  const counts = {};

  for (const char of target) {
    counts[char] = (counts[char] || 0) + 1;
  }

  // Aciertos exactos (verde)
  [...guess].forEach((char, index) => {
    if (char === target[index]) {
      result[index] = "correct";
      counts[char]--;
    }
  });

  // Letras presentes en otra posición (amarillo)
  [...guess].forEach((char, index) => {
    if (result[index] === "correct") return;
    if ((counts[char] || 0) > 0) {
      result[index] = "present";
      counts[char]--;
    }
  });

  return result;
}

/**
 * Envía intento.
 */
export function submit() {
  if (state.classic.over) return;
  const guess = normalize(ui.classicInput.value);

  if (guess.length !== WORD_LENGTH) {
    toast("Escribí un apellido de 5 letras.");
    return;
  }

  const player = state.classicPlayers.find(
    candidate => normalize(candidate.surname) === guess
  );

  if (!player) {
    toast("Ese apellido no está disponible.");
    return;
  }

  if (state.classic.guesses.includes(guess)) {
    toast("Ya probaste ese apellido.");
    return;
  }

  const rowIndex = state.classic.guesses.length;
  state.classic.guesses.push(guess);
  paintRow(guess, rowIndex);
  ui.classicInput.value = "";
  closeSuggestions();

  const answer = normalize(state.classic.answer.surname);

  if (guess === answer) {
    finish(true);
    return;
  }

  if (state.classic.guesses.length >= MAX_ATTEMPTS) {
    finish(false);
  }
}

/**
 * Pinta una fila del tablero.
 */
function paintRow(guess, rowIndex) {
  const target = normalize(state.classic.answer.surname);
  const result = evaluate(guess, target);
  const row = ui.classicBoard.children[rowIndex];

  [...guess].forEach((letter, index) => {
    const cell = row.children[index];
    if (!cell) return;
    cell.textContent = letter;
    cell.classList.add("filled", "pop");
    cell.classList.remove("correct", "present", "absent");
    cell.classList.add(result[index]);
    cell.setAttribute("aria-label", `Letra ${letter}: ${stateLabel(result[index])}`);
    setTimeout(() => {
      cell.classList.remove("pop");
    }, 150);
  });

  updateKeyboard(guess, result);
}

function stateLabel(s) {
  if (s === "correct") return "correcta";
  if (s === "present") return "presente en otra posición";
  return "no está en la palabra";
}

/**
 * Actualiza colores del teclado.
 */
function updateKeyboard(guess, result) {
  const priority = {
    absent: 1,
    present: 2,
    correct: 3
  };

  [...guess].forEach((letter, index) => {
    const key = ui.classicKeyboard.querySelector(
      `.key[data-key="${escapeSelector(letter)}"]`
    );
    if (!key) return;

    const newState = result[index];
    const oldState = key.dataset.state;

    if (!oldState || priority[newState] > priority[oldState]) {
      key.dataset.state = newState;
      key.classList.remove("correct", "present", "absent");
      key.classList.add(newState);
    }
  });
}

/**
 * Finaliza la partida.
 */
function finish(win) {
  state.classic.over = true;
  ui.classicInput.disabled = true;

  registerGame(state.stats, win);
  saveStats(state.stats);

  showResult({
    win,
    title: win ? "¡Golazo!" : "Se terminó el partido",
    subtitle: win
      ? `Lo sacaste en ${state.classic.guesses.length} intento${state.classic.guesses.length === 1 ? "" : "s"}.`
      : "El jugador era:",
    answer: state.classic.answer.name,
    attempts: state.classic.guesses.length,
    stats: state.stats
  });

  state.classic.isUnlimited = true;

  document.dispatchEvent(new CustomEvent("futbolle:stats-changed"));
}

/**
 * Estado para compartir, con grid de emojis tipo Wordle.
 */
export function getShareData() {
  const target = normalize(state.classic.answer.surname);

  const grid = state.classic.guesses.map(guess => {
    const result = evaluate(guess, target);
    return result.map(stateToEmoji).join("");
  }).join("\n");

  const lastGuess = state.classic.guesses[state.classic.guesses.length - 1];
  const win = state.classic.over && lastGuess === target;

  return {
    mode: "classic",
    attempts: state.classic.guesses.length,
    maxAttempts: MAX_ATTEMPTS,
    over: state.classic.over,
    win,
    grid
  };
}

function stateToEmoji(s) {
  if (s === "correct") return "🟩";
  if (s === "present") return "🟨";
  return "⬛";
}