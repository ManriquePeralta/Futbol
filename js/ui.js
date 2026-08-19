/* =========================================================
   FUTBOLLE — UI
   ========================================================= */

import {
  displayValue
} from "./utils.js";


const elements = {};


/**
 * Inicializa referencias DOM.
 */
export function initUI() {

  elements.message =
    document.getElementById("message");

  elements.modeDescription =
    document.getElementById(
      "modeDescription"
    );

  elements.classicMode =
    document.getElementById(
      "classicMode"
    );

  elements.whoMode =
    document.getElementById(
      "whoMode"
    );

  elements.classicInput =
    document.getElementById(
      "classicInput"
    );

  elements.whoInput =
    document.getElementById(
      "whoInput"
    );

  elements.classicSuggestions =
    document.getElementById(
      "classicSuggestions"
    );

  elements.whoSuggestions =
    document.getElementById(
      "whoSuggestions"
    );

  elements.classicBoard =
    document.getElementById(
      "classicBoard"
    );

  elements.whoRows =
    document.getElementById(
      "whoRows"
    );

  elements.classicKeyboard =
    document.getElementById(
      "classicKeyboard"
    );

  elements.streak =
    document.getElementById("streak");

  elements.played =
    document.getElementById("played");

  elements.wins =
    document.getElementById("wins");

  elements.modeButtons =
    [...document.querySelectorAll(
      ".mode-button"
    )];

}


/**
 * Devuelve los elementos.
 */
export function getUI() {
  return elements;
}


/**
 * Cambia mensaje temporal.
 */
export function toast(text, duration = 1800) {

  elements.message.textContent = text;

  clearTimeout(
    window.__futbolleToast
  );

  window.__futbolleToast =
    setTimeout(() => {

      elements.message.textContent = "";

    }, duration);

}


/**
 * Cambia descripción.
 */
export function setDescription(text) {

  elements.modeDescription.textContent =
    text;

}


/**
 * Actualiza estadísticas.
 */
export function updateStats(statsView) {

  elements.played.textContent =
    statsView.played;

  elements.streak.textContent =
    statsView.streak;

  elements.wins.textContent =
    statsView.winRate;

}


/**
 * Cambia el modo visual.
 */
export function renderMode(mode) {

  elements.modeButtons.forEach(
    button => {

      button.classList.toggle(
        "active",
        button.dataset.mode === mode
      );

    }
  );


  elements.classicMode.classList.toggle(
    "hidden",
    mode !== "classic"
  );

  elements.whoMode.classList.toggle(
    "hidden",
    mode !== "who"
  );


  setDescription(
    mode === "classic"
      ? "Adiviná el apellido en 6 intentos."
      : "Descubrí al jugador usando sus datos."
  );

}


/**
 * Limpia un input y autocomplete.
 */
export function clearInput(
  input,
  suggestions
) {

  input.value = "";

  suggestions.innerHTML = "";

  suggestions.style.display =
    "none";

}


/**
 * Crea una sugerencia.
 */
export function createSuggestion(
  {
    title,
    subtitle,
    onClick
  }
) {

  const item =
    document.createElement("div");

  item.className =
    "suggestion";

  item.setAttribute(
    "role",
    "option"
  );

  const main =
    document.createElement("div");

  main.className =
    "suggestion-main";


  const strong =
    document.createElement("strong");

  strong.textContent =
    displayValue(title);


  const small =
    document.createElement("small");

  small.textContent =
    displayValue(subtitle);


  main.appendChild(strong);
  main.appendChild(small);


  const arrow =
    document.createElement("span");

  arrow.className =
    "suggestion-arrow";

  arrow.textContent = "›";


  item.appendChild(main);
  item.appendChild(arrow);


  item.addEventListener(
    "click",
    onClick
  );


  return item;

}


/**
 * Muestra sugerencias.
 */
export function renderSuggestions(
  container,
  suggestions
) {

  container.innerHTML = "";

  suggestions.forEach(
    suggestion =>
      container.appendChild(
        suggestion
      )
  );

  container.style.display =
    suggestions.length
      ? "block"
      : "none";

}