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
const INPUT_DEBOUNCE_MS = 150;
const AGE_CLOSE_THRESHOLD = 4; // diferencia <= 4 años => naranja, > 4 => rojo

let state = null;
let ui = null;
let currentSuggestions = [];
let highlightedIndex = -1;
let debounceTimer = null;

/**
 * Inicializa módulo.
 */
export function initWhoModule(appState, appUI) {
  state = appState;
  ui = appUI;
  ui.whoInput.addEventListener("input", handleInput);
  ui.whoInput.addEventListener("keydown", handleKeydown);
  document.addEventListener("click", handleOutsideClick);
}

/**
 * Inicializa partida.
 * @param {boolean} forceRandom - Fuerza a elegir un jugador al azar (Unlimited).
 */
export function initWho(forceRandom = false) {
  if (!state.players.length) return;

  let chosenPlayer;

  if (forceRandom || state.who.isUnlimited) {
    state.who.isUnlimited = true;
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * state.players.length);
    } while (
      state.players.length > 1 &&
      state.who.answer &&
      state.players[randomIndex].id === state.who.answer.id
    );
    chosenPlayer = state.players[randomIndex];
  } else {
    const index = dailyIndex(state.players.length, 17);
    chosenPlayer = state.players[index];
  }

  state.who.answer = chosenPlayer;
  state.who.guesses = [];
  state.who.over = false;
  ui.whoInput.disabled = false;
  clearInput(ui.whoInput, ui.whoSuggestions);
  ui.whoRows.innerHTML = "";
  resetSuggestionState();
}

/**
 * Maneja input (con debounce).
 */
function handleInput() {
  if (state.who.over) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(showSuggestions, INPUT_DEBOUNCE_MS);
}

/**
 * Maneja teclado: navegación de sugerencias + submit.
 */
function handleKeydown(event) {
  const suggestionsOpen = currentSuggestions.length > 0 &&
    ui.whoSuggestions.style.display !== "none";

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
 * Sugerencias autocomplete.
 */
function showSuggestions() {
  currentSuggestions = searchPlayers(state.players, ui.whoInput.value, 8);
  highlightedIndex = -1;
  renderCurrentSuggestions();
}

function renderCurrentSuggestions() {
  const elements = currentSuggestions.map((player, i) =>
    createSuggestion({
      title: player.name,
      subtitle: `${player.club} • ${player.position}`,
      highlighted: i === highlightedIndex,
      index: i,
      onClick: () => selectSuggestion(player)
    })
  );
  renderSuggestions(ui.whoSuggestions, elements);
}

function updateHighlight() {
  renderCurrentSuggestions();
  const highlightedEl = document.getElementById(`suggestion-${highlightedIndex}`);
  if (highlightedEl) {
    highlightedEl.scrollIntoView({ block: "nearest" });
  }
}

function selectSuggestion(player) {
  ui.whoInput.value = player.name;
  closeSuggestions();
  ui.whoInput.focus();
}

function closeSuggestions() {
  ui.whoSuggestions.style.display = "none";
  resetSuggestionState();
}

function resetSuggestionState() {
  currentSuggestions = [];
  highlightedIndex = -1;
}

function handleOutsideClick(event) {
  if (!ui?.whoSuggestions) return;
  const clickedInside = ui.whoInput.contains(event.target) ||
    ui.whoSuggestions.contains(event.target);
  if (!clickedInside) {
    closeSuggestions();
  }
}

/**
 * Compara atributos entre jugadores.
 */
export function compare(guess, target) {
  return {
    club: compareClub(guess, target),
    position: comparePosition(guess, target),
    nationality: compareExact(guess.nationality, target.nationality),
    age: compareNumber(guess.age, target.age)
  };
}

function compareClub(guess, target) {
  if (!guess.club || !target.club) return "wrong";
  return normalize(guess.club) === normalize(target.club) ? "correct" : "wrong";
}

/**
 * Posición: correcta (verde) o incorrecta (rojo). Sin estado intermedio.
 */
function comparePosition(guess, target) {
  if (
    guess.position_code &&
    target.position_code &&
    normalize(guess.position_code) === normalize(target.position_code)
  ) {
    return "correct";
  }
  if (
    guess.position_detail &&
    target.position_detail &&
    normalize(guess.position_detail) === normalize(target.position_detail)
  ) {
    return "correct";
  }
  return "wrong";
}

function compareExact(guess, target) {
  if (!guess || !target) return "wrong";
  return normalize(guess) === normalize(target) ? "correct" : "wrong";
}

/**
 * Edad: verde exacta, naranja si difiere <= 4 años, rojo si difiere más.
 * Incluye dirección (up/down) para la flecha.
 */
function compareNumber(guess, target) {
  if (
    guess === null ||
    guess === undefined ||
    target === null ||
    target === undefined
  ) {
    return { state: "wrong", direction: null };
  }
  const a = Number(guess);
  const b = Number(target);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { state: "wrong", direction: null };
  }
  const diff = Math.abs(a - b);
  if (diff === 0) return { state: "correct", direction: null };

  const direction = b > a ? "up" : "down";
  if (diff <= AGE_CLOSE_THRESHOLD) return { state: "close", direction };
  return { state: "wrong", direction };
}

/**
 * Envía intento.
 */
export function submit() {
  if (state.who.over) return;
  const query = ui.whoInput.value.trim();

  if (!query) {
    toast("Escribí un jugador.");
    return;
  }

  const player = findPlayer(state.players, query);

  if (!player) {
    toast("No encontramos ese jugador.");
    return;
  }

  if (state.who.guesses.some(guess => guess.id === player.id)) {
    toast("Ya probaste ese jugador.");
    return;
  }

  state.who.guesses.push(player);
  addRow(player);
  ui.whoInput.value = "";
  closeSuggestions();

  if (player.id === state.who.answer.id) {
    finish(true);
    return;
  }

  if (state.who.guesses.length >= MAX_ATTEMPTS) {
    finish(false);
  }
}

/**
 * Agrega fila de pistas. Sin columna de pie.
 */
function addRow(player) {
  const result = compare(player, state.who.answer);

  const row = document.createElement("div");
  row.className = "hints-row";
  row.setAttribute("role", "row");

  const values = [
    { value: player.name, stateClass: "reveal", label: "Jugador" },
    { value: displayValue(player.club), stateClass: result.club, label: "Club" },
    { value: displayValue(player.position), stateClass: result.position, label: "Posición" },
    { value: displayValue(player.nationality), stateClass: result.nationality, label: "Nacionalidad" },
    {
      value: player.age !== null ? `${player.age} años` : "—",
      stateClass: result.age.state,
      direction: result.age.direction,
      label: "Edad"
    }
  ];

  values.forEach(({ value, stateClass, direction, label }) => {
    const cell = document.createElement("div");
    cell.className = `hint-cell ${stateClass}`.trim();
    cell.setAttribute("role", "cell");
    cell.setAttribute("aria-label", `${label}: ${value ?? "—"}`);

    const text = document.createElement("span");
    text.className = "hint-cell-value";
    text.textContent = String(value ?? "—");
    cell.appendChild(text);

    if (direction) {
      const arrow = document.createElement("span");
      arrow.className = `hint-arrow hint-arrow-${direction}`;
      arrow.textContent = direction === "up" ? "▲" : "▼";
      cell.appendChild(arrow);
    }

    row.appendChild(cell);
  });

  ui.whoRows.appendChild(row);
  row.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

/**
 * Finaliza partida.
 */
function finish(win) {
  state.who.over = true;
  ui.whoInput.disabled = true;

  registerGame(state.stats, win);
  saveStats(state.stats);

  showResult({
    win,
    title: win ? "¡Lo encontraste!" : "Se terminó el partido",
    subtitle: win
      ? `Descubriste al jugador en ${state.who.guesses.length} intento${state.who.guesses.length === 1 ? "" : "s"}.`
      : "El jugador era:",
    answer: state.who.answer.name,
    attempts: state.who.guesses.length,
    stats: state.stats
  });

  state.who.isUnlimited = true;

  document.dispatchEvent(new CustomEvent("futbolle:stats-changed"));
}

/**
 * Datos para compartir, con grid de emojis (sin pie).
 */
export function getShareData() {
  const grid = state.who.guesses.map(guess => {
    const result = compare(guess, state.who.answer);
    const states = [
      result.club,
      result.position,
      result.nationality,
      result.age.state
    ];
    return states.map(stateToEmoji).join("");
  }).join("\n");

  return {
    mode: "who",
    attempts: state.who.guesses.length,
    maxAttempts: MAX_ATTEMPTS,
    over: state.who.over,
    win: state.who.over && state.who.guesses.some(g => g.id === state.who.answer.id),
    grid
  };
}

function stateToEmoji(s) {
  if (s === "correct") return "🟩";
  if (s === "close") return "🟧";
  return "🟥";
}