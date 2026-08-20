/* =========================================================
   FUTBOLLE — CLUB
   "Reconocé el plantel"
   ========================================================= */

import { normalize } from "./utils.js";
import { saveStats } from "./stats.js";
import { createSuggestion, renderSuggestions, toast } from "./ui.js";

/* =========================================================
   ESTADO LOCAL
   ========================================================= */

let state = null;
let ui = null;

let targetClub = null;
let targetPlayers = [];

let attempts = [];
let gameOver = false;

let clubs = [];

/* =========================================================
   CONFIG
   ========================================================= */

const MAX_ATTEMPTS = 6;
const MAX_CLUES = 6;
const MIN_PLAYERS_PER_CLUB = 4;

/* =========================================================
   INIT MODULE
   ========================================================= */

export function initClubModule(appState, appUI) {
  state = appState;
  ui = appUI;
  bindEvents();
}

/* =========================================================
   RESOLVER ELEMENTOS DEL DOM (DINÁMICO)
   ========================================================= */

function getBoardElement() {
  return (
    ui?.clubBoard ||
    document.getElementById("clubBoard") ||
    document.getElementById("club-board") ||
    document.querySelector(".club-board")
  );
}

function getInputElement() {
  return (
    ui?.clubInput ||
    document.getElementById("clubInput") ||
    document.getElementById("club-input") ||
    document.querySelector(".club-input")
  );
}

function getSuggestionsElement() {
  return (
    ui?.clubSuggestions ||
    document.getElementById("clubSuggestions") ||
    document.getElementById("club-suggestions") ||
    document.querySelector(".club-suggestions")
  );
}

function getResultElement() {
  return (
    ui?.clubResult ||
    document.getElementById("clubResult") ||
    document.getElementById("club-result") ||
    document.querySelector(".club-result")
  );
}

function getMessageElement() {
  return (
    ui?.clubMessage ||
    document.getElementById("clubMessage") ||
    document.getElementById("club-message") ||
    document.querySelector(".club-message")
  );
}

function getAttemptsElement() {
  return (
    ui?.clubAttempts ||
    document.getElementById("clubAttempts") ||
    document.getElementById("club-attempts") ||
    document.querySelector(".club-attempts")
  );
}

/* =========================================================
   INICIAR PARTIDA
   ========================================================= */

export function initClub(forceNew = false) {
  if (!state?.players?.length) {
    console.warn("FUTBOLLE CLUB: no hay jugadores cargados en state.players");
    return;
  }

  if (!forceNew && targetClub && !gameOver) {
    return;
  }

  resetGame();
  buildClubPool();

  if (!clubs.length) {
    console.error("FUTBOLLE CLUB: no se pudieron agrupar clubes.");
    toast("No se encontraron clubes válidos en la base.", 3000);
    return;
  }

  chooseClub();
  renderInitialState();
}

/* =========================================================
   RESET
   ========================================================= */

function resetGame() {
  targetClub = null;
  targetPlayers = [];
  attempts = [];
  gameOver = false;

  const inputEl = getInputElement();
  if (inputEl) {
    inputEl.value = "";
    inputEl.disabled = false;
  }

  const suggEl = getSuggestionsElement();
  if (suggEl) {
    suggEl.innerHTML = "";
    suggEl.style.display = "none";
  }

  const boardEl = getBoardElement();
  if (boardEl) {
    boardEl.innerHTML = "";
  }

  const resEl = getResultElement();
  if (resEl) {
    resEl.innerHTML = "";
    resEl.classList.add("hidden");
  }

  const msgEl = getMessageElement();
  if (msgEl) {
    msgEl.textContent = "";
  }

  updateStatus();
}

/* =========================================================
   ARMAR POOL DE CLUBES
   ========================================================= */

function buildClubPool() {
  const grouped = new Map();

  for (const player of state.players) {
    const club = getPlayerClub(player);
    if (!club) continue;

    const key = normalize(club);
    if (!key) continue;

    if (!grouped.has(key)) {
      grouped.set(key, {
        name: club,
        players: []
      });
    }

    grouped.get(key).players.push(player);
  }

  clubs = [...grouped.values()]
    .filter(club => club.players.length >= MIN_PLAYERS_PER_CLUB)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  console.log(`FUTBOLLE CLUB: ${clubs.length} clubes disponibles.`);
}

/* =========================================================
   ELEGIR CLUB Y MEZCLAR JUGADORES
   ========================================================= */

function chooseClub() {
  const index = Math.floor(Math.random() * clubs.length);
  targetClub = clubs[index];
  targetPlayers = shuffle([...targetClub.players]);

  console.log("FUTBOLLE CLUB — Objetivo:", targetClub.name);
}

/* =========================================================
   EXTRACTORES DE DATOS CON FALLBACKS
   ========================================================= */

function getPlayerClub(player) {
  if (!player) return "";

  if (player.team && typeof player.team === "object") {
    return player.team.name || player.team.displayName || "";
  }

  if (typeof player.team === "string") return player.team;
  if (typeof player.teamName === "string") return player.teamName;
  if (typeof player.team_name === "string") return player.team_name;
  if (typeof player.club === "string") return player.club;
  if (typeof player.clubName === "string") return player.clubName;
  if (typeof player.equipo === "string") return player.equipo;
  if (typeof player.currentClub === "string") return player.currentClub;
  if (typeof player.current_team === "string") return player.current_team;

  return "";
}

function getPlayerName(player) {
  if (!player) return "Jugador";

  return (
    player.name ||
    player.displayName ||
    player.fullName ||
    player.shortName ||
    player.playerName ||
    player.nombre ||
    "Jugador Desconocido"
  );
}

function getPlayerPosition(player) {
  if (!player) return "";

  return (
    player.position_label ||
    player.positionName ||
    player.position_detail ||
    player.puesto ||
    player.position ||
    player.pos ||
    ""
  );
}

/* =========================================================
   RENDER DE PISTAS (REVELADAS + BLOQUEADAS)
   ========================================================= */

function renderInitialState() {
  renderCluesProgress();
  updateStatus();

  const inputEl = getInputElement();
  if (inputEl) {
    inputEl.focus();
  }
}

function revealNextClue() {
  renderCluesProgress();
}

function renderCluesProgress() {
  const boardEl = getBoardElement();
  
  if (!boardEl) {
    console.error("❌ ERROR CRÍTICO: No existe el elemento #clubBoard en el HTML.");
    return;
  }

  console.log("✅ Contenedor encontrado. Jugadores del club objetivo:", targetPlayers);

  boardEl.innerHTML = "";

  const revealedCount = Math.min(
    attempts.length + 1,
    MAX_CLUES,
    targetPlayers.length
  );

  for (let i = 0; i < MAX_CLUES; i++) {
    const card = document.createElement("div");
    card.className = "club-player-card";

    if (i < revealedCount && targetPlayers[i]) {
      const player = targetPlayers[i];
      const name = getPlayerName(player);
      const position = getPlayerPosition(player);

      card.classList.add("revealed");
      card.innerHTML = `
        <div class="club-player-number">${String(i + 1).padStart(2, "0")}</div>
        <div class="club-player-info">
          <strong>${escapeHTML(name)}</strong>
          ${position ? `<small>${escapeHTML(position)}</small>` : ""}
        </div>
        <div class="club-player-lock unlocked">👤</div>
      `;
    } else {
      card.classList.add("locked");
      card.innerHTML = `
        <div class="club-player-number">${String(i + 1).padStart(2, "0")}</div>
        <div class="club-player-info">
          <strong style="opacity: 0.5;">Pista bloqueada</strong>
          <small style="opacity: 0.4;">Fallá un intento para desbloquear</small>
        </div>
        <div class="club-player-lock">🔒</div>
      `;
    }

    boardEl.appendChild(card);
  }
}

/* =========================================================
   AUTOCOMPLETE
   ========================================================= */

function updateSuggestions() {
  const inputEl = getInputElement();
  const suggEl = getSuggestionsElement();

  if (!inputEl || !suggEl) return;

  const value = normalize(inputEl.value);
  if (!value) {
    suggEl.innerHTML = "";
    suggEl.style.display = "none";
    return;
  }

  const matches = clubs
    .filter(club => normalize(club.name).includes(value))
    .slice(0, 8);

  const suggestionElements = matches.map(club =>
    createSuggestion({
      title: club.name,
      subtitle: `${club.players.length} jugadores`,
      onClick: () => {
        if (gameOver) return;
        inputEl.value = club.name;
        hideSuggestions();
        submitClub(club.name);
      }
    })
  );

  renderSuggestions(suggEl, suggestionElements);
}

function hideSuggestions() {
  const suggEl = getSuggestionsElement();
  if (suggEl) {
    suggEl.innerHTML = "";
    suggEl.style.display = "none";
  }
}

/* =========================================================
   SUBMIT
   ========================================================= */

export function submitClub(value) {
  if (gameOver) return;

  const guess = String(value || "").trim();
  if (!guess) return;

  const match = clubs.find(
    club => normalize(club.name) === normalize(guess)
  );

  if (!match) {
    toast("Ese club no está en la base.", 2200);
    return;
  }

  const alreadyUsed = attempts.some(
    attempt => normalize(attempt) === normalize(match.name)
  );

  if (alreadyUsed) {
    toast("Ya probaste ese club.", 1800);
    return;
  }

  attempts.push(match.name);

  const correct = normalize(match.name) === normalize(targetClub.name);

  if (correct) {
    finishGame(true);
    return;
  }

  if (attempts.length >= MAX_ATTEMPTS) {
    finishGame(false);
    return;
  }

  // Desbloquear siguiente pista
  revealNextClue();
  updateStatus();
  toast("No es ese club.", 1200);
}

/* =========================================================
   FIN DE JUEGO Y RESULTADOS
   ========================================================= */

function finishGame(won) {
  gameOver = true;

  const inputEl = getInputElement();
  if (inputEl) {
    inputEl.disabled = true;
  }

  hideSuggestions();
  renderResult(won);
  updateStatsAfterGame(won);
}

function renderResult(won) {
  const message = won
    ? `¡Era ${targetClub.name}!`
    : `Era ${targetClub.name}.`;

  const msgEl = getMessageElement();
  if (msgEl) {
    msgEl.textContent = message;
  }

  const resEl = getResultElement();
  if (resEl) {
    resEl.classList.remove("hidden");
    resEl.innerHTML = `
      <div class="club-result-icon">${won ? "✓" : "×"}</div>
      <strong>${won ? "¡LO SACASTE!" : "CASI"}</strong>
      <span>${escapeHTML(targetClub.name)}</span>
      <small>${attempts.length} ${attempts.length === 1 ? "intento" : "intentos"}</small>
    `;
  }

  toast(message, 2500);
}

function updateStatus() {
  const attEl = getAttemptsElement();
  if (attEl) {
    attEl.textContent = `${attempts.length}/${MAX_ATTEMPTS}`;
  }
}

function updateStatsAfterGame(won) {
  if (!state?.stats) return;

  state.stats.played = (state.stats.played || 0) + 1;

  if (won) {
    state.stats.wins = (state.stats.wins || 0) + 1;
  }

  state.stats.currentStreak = won
    ? (state.stats.currentStreak || 0) + 1
    : 0;

  if (state.stats.currentStreak > (state.stats.bestStreak || 0)) {
    state.stats.bestStreak = state.stats.currentStreak;
  }

  saveStats(state.stats);
  document.dispatchEvent(new CustomEvent("futbolle:stats-changed"));
}

/* =========================================================
   EVENTOS
   ========================================================= */

function bindEvents() {
  const inputEl = getInputElement();
  const suggEl = getSuggestionsElement();

  if (inputEl) {
    inputEl.addEventListener("input", () => {
      updateSuggestions();
    });

    inputEl.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        hideSuggestions();
        return;
      }

      if (event.key !== "Enter") return;

      event.preventDefault();
      const value = inputEl.value;
      hideSuggestions();
      submitClub(value);
      inputEl.value = "";
    });

    document.addEventListener("click", event => {
      if (event.target === inputEl) return;
      if (suggEl && suggEl.contains(event.target)) return;
      hideSuggestions();
    });
  }
}

/* =========================================================
   COMPARTIR
   ========================================================= */

export function getShareData() {
  if (!targetClub) return null;

  return {
    title: "FUTBOLLE — CLUB",
    text:
      `⚽ FUTBOLLE CLUB\n\n` +
      `${targetClub.name}\n` +
      `${attempts.length}/${MAX_ATTEMPTS} intentos`
  };
}

/* =========================================================
   UTILIDADES
   ========================================================= */

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}