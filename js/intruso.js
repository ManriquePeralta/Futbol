/* =========================================================
   FUTBOLLE — INTRUSO
   "Encontrá al que no encaja"
   ========================================================= */

import { normalize } from "./utils.js";
import { saveStats } from "./stats.js";

/* =========================================================
   ESTADO
   ========================================================= */

let state = null;
let ui = null;

let players = [];
let round = null;

let currentRound = 0;
const ROUNDS = 6;
const PLAYERS_PER_ROUND = 4;

let score = 0;
let gameOver = false;
let locked = false;

/* =========================================================
   INIT
   ========================================================= */

export function initIntrusoModule(appState, appUI) {
  state = appState;
  ui = appUI;
  bindEvents();
}

/* =========================================================
   NUEVA PARTIDA
   ========================================================= */

export function initIntruso(forceNew = false) {
  if (!state?.players?.length) {
    return;
  }

  if (!forceNew && round && !gameOver) {
    return;
  }

  players = state.players.filter(isValidPlayer);

  if (players.length < PLAYERS_PER_ROUND) {
    console.error("FUTBOLLE INTRUSO: no hay suficientes jugadores.");
    return;
  }

  currentRound = 0;
  score = 0;
  gameOver = false;
  locked = false;

  if (ui.intrusoResult) {
    ui.intrusoResult.innerHTML = "";
    ui.intrusoResult.classList.add("hidden");
  }

  if (ui.intrusoScore) {
    ui.intrusoScore.textContent = "0";
  }

  if (ui.intrusoMessage) {
    ui.intrusoMessage.textContent = "";
    ui.intrusoMessage.className = "intruso-message";
  }

  nextRound();
}

/* =========================================================
   SIGUIENTE RONDA
   ========================================================= */

function nextRound() {
  locked = false;
  currentRound++;

  if (currentRound > ROUNDS) {
    finishGame();
    return;
  }

  round = generateRound();

  if (!round) {
    console.error("FUTBOLLE INTRUSO: no se pudo generar una ronda.");
    return;
  }

  renderRound();
}

/* =========================================================
   GENERAR RONDA
   ========================================================= */

function generateRound() {
  const generators = [
    generateClubRound,
    generateNationalityRound,
    generatePositionRound,
    generateAgeRound,
    generateHeightRound
  ];

  shuffle(generators);

  for (const generator of generators) {
    const result = generator();
    if (result) {
      return result;
    }
  }

  return generateFallbackRound();
}

/* =========================================================
   CLUB
   ========================================================= */

function generateClubRound() {
  const groups = groupBy(players, player => getClub(player));
  const validGroups = [...groups.values()].filter(group => group.length >= 4);

  if (!validGroups.length) return null;

  const group = randomItem(validGroups);
  const commonPlayers = sample(group, 3);
  const commonClub = normalize(getClub(group[0]));

  const outsiders = players.filter(
    player => normalize(getClub(player)) !== commonClub
  );

  if (!outsiders.length) return null;

  const intruder = randomItem(outsiders);

  return createRound(
    [...commonPlayers, intruder],
    "club",
    getClub(group[0])
  );
}

/* =========================================================
   NACIONALIDAD
   ========================================================= */

function generateNationalityRound() {
  const groups = groupBy(players, player => getNationality(player));
  const validGroups = [...groups.values()].filter(
    group => group.length >= 4 && getNationality(group[0])
  );

  if (!validGroups.length) return null;

  const group = randomItem(validGroups);
  const common = sample(group, 3);
  const nationality = normalize(getNationality(group[0]));

  const outsiders = players.filter(
    player =>
      normalize(getNationality(player)) &&
      normalize(getNationality(player)) !== nationality
  );

  if (!outsiders.length) return null;

  const intruder = randomItem(outsiders);

  return createRound(
    [...common, intruder],
    "nationality",
    getNationality(group[0])
  );
}

/* =========================================================
   POSICIÓN
   ========================================================= */

function generatePositionRound() {
  const groups = groupBy(players, player => getPosition(player));
  const validGroups = [...groups.values()].filter(
    group => group.length >= 4 && getPosition(group[0])
  );

  if (!validGroups.length) return null;

  const group = randomItem(validGroups);
  const common = sample(group, 3);
  const position = normalize(getPosition(group[0]));

  const outsiders = players.filter(
    player =>
      normalize(getPosition(player)) &&
      normalize(getPosition(player)) !== position
  );

  if (!outsiders.length) return null;

  const intruder = randomItem(outsiders);

  return createRound(
    [...common, intruder],
    "position",
    getPosition(group[0])
  );
}

/* =========================================================
   EDAD
   ========================================================= */

function generateAgeRound() {
  const available = players.filter(player =>
    Number.isFinite(Number(player.age))
  );

  if (available.length < PLAYERS_PER_ROUND) return null;

  const young = available.filter(player => Number(player.age) <= 24);
  const old = available.filter(player => Number(player.age) >= 30);

  if (young.length < 3 || old.length < 1) return null;

  return createRound(
    [...sample(young, 3), randomItem(old)],
    "age",
    "menores de 25"
  );
}

/* =========================================================
   ALTURA
   ========================================================= */

function generateHeightRound() {
  const available = players.filter(player =>
    Number.isFinite(Number(player.height_cm))
  );

  const short = available.filter(player => Number(player.height_cm) <= 180);
  const tall = available.filter(player => Number(player.height_cm) >= 190);

  if (short.length < 3 || tall.length < 1) return null;

  return createRound(
    [...sample(short, 3), randomItem(tall)],
    "height",
    "miden 180 cm o menos"
  );
}

/* =========================================================
   FALLBACK
   ========================================================= */

function generateFallbackRound() {
  const selected = sample(players, PLAYERS_PER_ROUND);
  return createRound(selected, "fallback", null);
}

/* =========================================================
   CREAR RONDA
   ========================================================= */

function createRound(selectedPlayers, category, commonValue) {
  const shuffled = shuffle([...selectedPlayers]);

  const intruder =
    category === "fallback"
      ? Math.floor(Math.random() * PLAYERS_PER_ROUND)
      : shuffled.findIndex(
          player =>
            !belongsToPattern(player, selectedPlayers, category, commonValue)
        );

  if (intruder < 0) return null;

  return {
    players: shuffled,
    intruderIndex: intruder,
    category,
    commonValue
  };
}

/* =========================================================
   PERTENECE AL PATRÓN
   ========================================================= */

function belongsToPattern(player, selectedPlayers, category, commonValue) {
  switch (category) {
    case "club":
      return normalize(getClub(player)) === normalize(commonValue);
    case "nationality":
      return normalize(getNationality(player)) === normalize(commonValue);
    case "position":
      return normalize(getPosition(player)) === normalize(commonValue);
    case "age":
      return Number(player.age) <= 24;
    case "height":
      return Number(player.height_cm) <= 180;
    default:
      return true;
  }
}

/* =========================================================
   RENDER
   ========================================================= */

function renderRound() {
  if (!ui.intrusoBoard) return;

  ui.intrusoBoard.innerHTML = "";

  if (ui.intrusoRound) {
    ui.intrusoRound.textContent = `${currentRound}/${ROUNDS}`;
  }

  if (ui.intrusoScore) {
    ui.intrusoScore.textContent = score;
  }

  if (ui.intrusoMessage) {
    ui.intrusoMessage.textContent = "";
    ui.intrusoMessage.className = "intruso-message";
  }

  round.players.forEach((player, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "intruso-player";
    card.dataset.index = index;

    card.innerHTML = `
      <span class="intruso-number">${index + 1}</span>

      <span class="intruso-player-main">
        <strong>${escapeHTML(getPlayerName(player))}</strong>
        <small class="intruso-meta">${escapeHTML(getClub(player))}</small>
      </span>

      <span class="intruso-position">${escapeHTML(getPositionLabel(player))}</span>
    `;

    card.addEventListener("click", () => selectPlayer(index));
    ui.intrusoBoard.appendChild(card);
  });
}

/* =========================================================
   SELECCIONAR
   ========================================================= */

function selectPlayer(index) {
  if (locked || gameOver || !round) return;

  locked = true;

  const cards = ui.intrusoBoard?.querySelectorAll(".intruso-player");
  const correct = index === round.intruderIndex;

  cards?.forEach((card, cardIndex) => {
    card.disabled = true;
    card.classList.add("revealed"); // Revela el club y la posición al responder

    if (cardIndex === round.intruderIndex) {
      card.classList.add("correct");
    }

    if (cardIndex === index && !correct) {
      card.classList.add("wrong");
    }
  });

  if (correct) {
    score++;
    showRoundMessage(true);
  } else {
    showRoundMessage(false);
  }

  if (ui.intrusoScore) {
    ui.intrusoScore.textContent = score;
  }

  setTimeout(() => {
    nextRound();
  }, 1200);
}

/* =========================================================
   MENSAJE DE RONDA
   ========================================================= */

function showRoundMessage(correct) {
  if (!ui.intrusoMessage) return;

  ui.intrusoMessage.textContent = correct
    ? "¡CORRECTO! ENCONTRASTE AL INTRUSO"
    : "INCORRECTO. ESE JUGADOR SÍ PERTENECÍA AL GRUPO";

  ui.intrusoMessage.className = correct
    ? "intruso-message correct"
    : "intruso-message wrong";
}

/* =========================================================
   FIN DEL JUEGO
   ========================================================= */

function finishGame() {
  gameOver = true;

  if (ui.intrusoBoard) {
    ui.intrusoBoard
      .querySelectorAll(".intruso-player")
      .forEach(card => (card.disabled = true));
  }

  updateStatsAfterGame();

  if (ui.intrusoResult) {
    ui.intrusoResult.classList.remove("hidden");
    ui.intrusoResult.innerHTML = `
      <div class="intruso-result-icon">${score >= 4 ? "✓" : "!"}</div>
      <strong>${
        score === ROUNDS
          ? "PERFECTO"
          : score >= 4
          ? "MUY BIEN"
          : "A SEGUIR PRACTICANDO"
      }</strong>
      <span>${score}/${ROUNDS}</span>
      <small>intrusos encontrados</small>
    `;
  }
}

/* =========================================================
   ESTADÍSTICAS
   ========================================================= */

function updateStatsAfterGame() {
  if (!state?.stats) return;

  state.stats.played = (state.stats.played || 0) + 1;
  const won = score >= 4;

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
  if (ui?.intrusoNewGame) {
    ui.intrusoNewGame.addEventListener("click", () => initIntruso(true));
  }
}

/* =========================================================
   SHARE
   ========================================================= */

export function getShareData() {
  if (!gameOver) return null;

  return {
    title: "FUTBOLLE — EL INTRUSO",
    text:
      `🕵️ FUTBOLLE EL INTRUSO\n\n` +
      `${score}/${ROUNDS} intrusos encontrados\n` +
      `⚽ ${score >= 4 ? "Ganado" : "Perdido"}`
  };
}

/* =========================================================
   DATOS & GETTERS
   ========================================================= */

function isValidPlayer(player) {
  return player && getPlayerName(player) && getClub(player);
}

function getPlayerName(player) {
  return (
    player.name ||
    player.fullName ||
    player.nombre ||
    player.playerName ||
    "Jugador"
  );
}

function getClub(player) {
  if (player.team && typeof player.team === "object") {
    return player.team.name || "";
  }
  return (
    player.club ||
    player.team ||
    player.teamName ||
    player.equipo ||
    player.clubName ||
    player.currentClub ||
    player.current_team ||
    ""
  );
}

function getNationality(player) {
  return (
    player.nationality ||
    player.nationality_name ||
    player.pais ||
    player.country ||
    ""
  );
}

function getPosition(player) {
  return (
    player.position_label ||
    player.position_detail ||
    player.position ||
    player.pos ||
    player.positionName ||
    player.puesto ||
    ""
  );
}

function getPositionLabel(player) {
  return player.position_label || getPosition(player);
}

/* =========================================================
   UTILIDADES
   ========================================================= */

function groupBy(array, callback) {
  const map = new Map();
  array.forEach(item => {
    const value = callback(item);
    if (!value) return;
    const key = normalize(value);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return map;
}

function sample(array, amount) {
  return shuffle([...array]).slice(0, amount);
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

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