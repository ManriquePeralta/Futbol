/* =========================================================
   FUTBOLLE — MODALS
   ========================================================= */

import { winRate } from "./utils.js";

let resultModal = null;
let helpModal = null;
let statsModal = null;

/* =========================================================
   INIT MODALS
   ========================================================= */

export function initModals() {
  resultModal = document.getElementById("resultModal");
  helpModal = document.getElementById("helpModal");
  statsModal = document.getElementById("statsModal");

  /* -----------------------------------------
     AYUDA
     ----------------------------------------- */
  const helpBtn = document.getElementById("helpBtn");
  const closeHelp = document.getElementById("closeHelp");

  if (helpBtn && helpModal) {
    helpBtn.addEventListener("click", () => openModal(helpModal));
  }

  if (closeHelp && helpModal) {
    closeHelp.addEventListener("click", () => closeModal(helpModal));
  }

  /* -----------------------------------------
     ESTADÍSTICAS
     ----------------------------------------- */
  const statsBtn = document.getElementById("statsBtn");
  const closeStats = document.getElementById("closeStats");

  if (statsBtn && statsModal) {
    statsBtn.addEventListener("click", () => openModal(statsModal));
  }

  if (closeStats && statsModal) {
    closeStats.addEventListener("click", () => closeModal(statsModal));
  }

  /* -----------------------------------------
     RESULTADO
     ----------------------------------------- */
  const closeResult = document.getElementById("closeResult");

  if (closeResult && resultModal) {
    closeResult.addEventListener("click", () => closeModal(resultModal));
  }

  /* -----------------------------------------
     CIERRE UNIVERSAL (BOTONES data-close-modal O .modal-close)
     ----------------------------------------- */
  document.querySelectorAll("[data-close-modal], .modal-close").forEach((btn) => {
    btn.addEventListener("click", () => {
      const parentModal = btn.closest(".modal");
      if (parentModal) {
        closeModal(parentModal);
      } else {
        closeAllModals();
      }
    });
  });

  /* -----------------------------------------
     CLICK FUERA DEL MODAL
     ----------------------------------------- */
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });

  /* -----------------------------------------
     TECLA ESCAPE
     ----------------------------------------- */
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllModals();
    }
  });
}

/* =========================================================
   OPEN
   ========================================================= */

export function openModal(modal) {
  if (!modal) return;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

/* =========================================================
   CLOSE
   ========================================================= */

export function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

export function closeAllModals() {
  closeModal(resultModal);
  closeModal(helpModal);
  closeModal(statsModal);
}

/* =========================================================
   RESULT
   ========================================================= */

export function showResult({ win, title, subtitle, answer, attempts, stats }) {
  const resultTitle = document.getElementById("resultTitle");
  const resultSubtitle = document.getElementById("resultSubtitle");
  const resultAnswer = document.getElementById("resultAnswer");
  const resultAttempts = document.getElementById("resultAttempts");
  const resultPlayed = document.getElementById("resultPlayed");
  const resultWinRate = document.getElementById("resultWinRate");
  const resultIcon = document.getElementById("resultIcon");

  if (resultTitle) resultTitle.textContent = title;
  if (resultSubtitle) resultSubtitle.textContent = subtitle;
  if (resultAnswer) resultAnswer.textContent = answer;
  if (resultAttempts) resultAttempts.textContent = attempts;

  if (resultPlayed && stats) {
    resultPlayed.textContent = stats.played;
  }

  if (resultWinRate && stats) {
    resultWinRate.textContent = `${winRate(stats)}%`;
  }

  if (resultIcon) {
    resultIcon.textContent = win ? "⚽" : "🕐";
  }

  openModal(resultModal);
}