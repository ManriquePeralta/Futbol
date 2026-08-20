/* =========================================================
   FUTBOLLE — UI
   ========================================================= */

import { displayValue } from "./utils.js";

const elements = {};

/* =========================================================
   INIT UI
   ========================================================= */

export function initUI() {
  /* -----------------------------------------
     COMUNES
     ----------------------------------------- */
  elements.message = document.getElementById("message");
  elements.modeDescription = document.getElementById("modeDescription");

  /* -----------------------------------------
     CLÁSICO
     ----------------------------------------- */
  elements.classicInput = document.getElementById("classicInput");
  elements.classicSuggestions = document.getElementById("classicSuggestions");
  elements.classicBoard = document.getElementById("classicBoard");
  elements.classicKeyboard = document.getElementById("classicKeyboard");

  /* -----------------------------------------
     ¿QUIÉN ES?
     ----------------------------------------- */
  elements.whoInput = document.getElementById("whoInput");
  elements.whoSuggestions = document.getElementById("whoSuggestions");
  elements.whoRows = document.getElementById("whoRows");

  /* -----------------------------------------
     CLUB
     ----------------------------------------- */
  elements.clubInput = document.getElementById("clubInput");
  elements.clubSuggestions = document.getElementById("clubSuggestions");
  elements.clubBoard = document.getElementById("clubBoard");
  elements.clubAttempts = document.getElementById("clubAttempts");
  elements.clubMessage = document.getElementById("clubMessage");
  elements.clubResult = document.getElementById("clubResult");

  /* -----------------------------------------
     EL INTRUSO
     ----------------------------------------- */
  elements.intrusoBoard = document.getElementById("intrusoBoard");
  elements.intrusoRound = document.getElementById("intrusoRound");
  elements.intrusoScore = document.getElementById("intrusoScore");
  elements.intrusoMessage = document.getElementById("intrusoMessage");
  elements.intrusoResult = document.getElementById("intrusoResult");
  elements.intrusoNewGame = document.getElementById("intrusoNewGame");

  /* -----------------------------------------
     ESTADÍSTICAS
     ----------------------------------------- */
  elements.streak = document.getElementById("streak");
  elements.played = document.getElementById("played");
  elements.wins = document.getElementById("wins");
}

/* =========================================================
   GET UI
   ========================================================= */

export function getUI() {
  return elements;
}

/* =========================================================
   TOAST
   ========================================================= */

export function toast(text, duration = 1800) {
  if (!elements.message) {
    console.warn("FUTBOLLE: #message no existe.");
    return;
  }

  elements.message.textContent = text;
  clearTimeout(window.__futbolleToast);

  window.__futbolleToast = setTimeout(() => {
    if (elements.message) {
      elements.message.textContent = "";
    }
  }, duration);
}

/* =========================================================
   DESCRIPTION
   ========================================================= */

export function setDescription(text) {
  if (!elements.modeDescription) return;
  elements.modeDescription.textContent = text;
}

/* =========================================================
   STATS
   ========================================================= */

export function updateStats(statsView) {
  if (!statsView) return;
  if (elements.played) elements.played.textContent = statsView.played;
  if (elements.streak) elements.streak.textContent = statsView.streak;
  if (elements.wins) elements.wins.textContent = statsView.winRate;
}

/* =========================================================
   CLEAR INPUT
   ========================================================= */

export function clearInput(input, suggestions) {
  if (input) input.value = "";
  if (suggestions) {
    suggestions.innerHTML = "";
    suggestions.style.display = "none";
  }
}

/* =========================================================
   CREATE SUGGESTION
   ========================================================= */

export function createSuggestion({ title, subtitle, onClick, highlighted = false, index }) {
  const item = document.createElement("div");
  item.className = highlighted ? "suggestion highlighted" : "suggestion";
  item.setAttribute("role", "option");
  item.setAttribute("aria-selected", highlighted ? "true" : "false");

  if (index !== undefined) {
    item.id = `suggestion-${index}`;
  }

  const main = document.createElement("div");
  main.className = "suggestion-main";

  const strong = document.createElement("strong");
  strong.textContent = displayValue(title);

  const small = document.createElement("small");
  small.textContent = displayValue(subtitle);

  main.appendChild(strong);
  main.appendChild(small);

  const arrow = document.createElement("span");
  arrow.className = "suggestion-arrow";
  arrow.textContent = "›";

  item.appendChild(main);
  item.appendChild(arrow);

  if (typeof onClick === "function") {
    item.addEventListener("click", onClick);
  }

  return item;
}

/* =========================================================
   RENDER SUGGESTIONS
   ========================================================= */

export function renderSuggestions(container, suggestions) {
  if (!container) return;
  container.innerHTML = "";

  if (Array.isArray(suggestions)) {
    suggestions.forEach(suggestion => {
      if (suggestion) container.appendChild(suggestion);
    });
  }

  const hasSuggestions = Array.isArray(suggestions) && suggestions.length > 0;
  container.style.display = hasSuggestions ? "block" : "none";
  container.setAttribute("role", "listbox");
}