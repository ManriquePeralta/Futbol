/* =========================================================
   FUTBOLLE — PHYSICAL KEYBOARD
   ========================================================= */

import {
  normalize
} from "./utils.js";


let state = null;

let classic = null;
let who = null;


/**
 * Inicializa teclado físico.
 */
export function initKeyboard(
  appState,
  classicModule,
  whoModule
) {

  state = appState;

  classic = classicModule;
  who = whoModule;


  document.addEventListener(
    "keydown",
    handleKeydown
  );

}


/**
 * Maneja teclado físico.
 */
function handleKeydown(event) {

  /*
   * Si el usuario está escribiendo
   * en un input, dejamos que el input
   * se encargue.
   */
  const active =
    document.activeElement;


  const isInput =
    active?.tagName === "INPUT" ||
    active?.tagName === "TEXTAREA";


  if (isInput) {
    return;
  }


  /*
   * CLÁSICO
   */
  if (
    state.mode === "classic"
  ) {

    if (
      /^[a-zA-ZñÑ]$/.test(
        event.key
      )
    ) {

      event.preventDefault();

      classic.typeLetter(
        normalize(event.key)
      );

      return;

    }


    if (
      event.key === "Backspace"
    ) {

      event.preventDefault();

      classic.backspace();

      return;

    }


    if (
      event.key === "Enter"
    ) {

      event.preventDefault();

      classic.submit();

    }

  }


  /*
   * ¿QUIÉN ES?
   *
   * Acá no forzamos teclas porque
   * es un input de texto normal.
   */

}