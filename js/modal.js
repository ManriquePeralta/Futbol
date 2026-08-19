/* =========================================================
   FUTBOLLE — MODALS
   ========================================================= */

import {
  winRate
} from "./utils.js";


let resultModal;
let helpModal;


/**
 * Inicializa modales.
 */
export function initModals() {

  resultModal =
    document.getElementById(
      "resultModal"
    );

  helpModal =
    document.getElementById(
      "helpModal"
    );


  document
    .getElementById("helpBtn")
    .addEventListener(
      "click",
      () => openModal(helpModal)
    );


  document
    .getElementById("closeHelp")
    .addEventListener(
      "click",
      () => closeModal(helpModal)
    );


  document
    .getElementById("closeResult")
    .addEventListener(
      "click",
      () => closeModal(resultModal)
    );


  document
    .querySelectorAll(".modal")
    .forEach(modal => {

      modal.addEventListener(
        "click",
        event => {

          if (
            event.target === modal
          ) {
            closeModal(modal);
          }

        }
      );

    });


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key !== "Escape"
      ) {
        return;
      }

      closeModal(resultModal);
      closeModal(helpModal);

    }
  );

}


/**
 * Abre modal.
 */
export function openModal(modal) {

  if (!modal) {
    return;
  }

  modal.classList.add("show");

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

}


/**
 * Cierra modal.
 */
export function closeModal(modal) {

  if (!modal) {
    return;
  }

  modal.classList.remove("show");

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

}


/**
 * Muestra resultado.
 */
export function showResult({
  win,
  title,
  subtitle,
  answer,
  attempts,
  stats
}) {

  document.getElementById(
    "resultTitle"
  ).textContent = title;


  document.getElementById(
    "resultSubtitle"
  ).textContent = subtitle;


  document.getElementById(
    "resultAnswer"
  ).textContent = answer;


  document.getElementById(
    "resultAttempts"
  ).textContent = attempts;


  document.getElementById(
    "resultPlayed"
  ).textContent = stats.played;


  document.getElementById(
    "resultWinRate"
  ).textContent =
    `${winRate(stats)}%`;


  document.getElementById(
    "resultIcon"
  ).textContent =
    win ? "⚽" : "🕐";


  openModal(resultModal);

}