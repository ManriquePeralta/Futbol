/* =========================================================
   FUTBOLLE — SHARE
   ========================================================= */

import {
  toast
} from "./ui.js";


let state = null;
let classic = null;
let who = null;


/**
 * Inicializa compartir.
 */
export function initShare(
  appState,
  classicModule,
  whoModule
) {

  state = appState;

  classic = classicModule;
  who = whoModule;


  document
    .getElementById("shareBtn")
    .addEventListener(
      "click",
      share
    );

}


/**
 * Comparte resultado.
 */
async function share() {

  const data =
    state.mode === "classic"
      ? classic.getShareData()
      : who.getShareData();


  const modeName =
    state.mode === "classic"
      ? "Clásico"
      : "¿Quién es?";


  const text =
`FUTBOLLE ⚽

Modo: ${modeName}
Resultado: ${data.attempts}/${data.maxAttempts}

https://futbolle.com`;


  try {

    if (
      navigator.share
    ) {

      await navigator.share({

        title:
          "FUTBOLLE",

        text

      });

      return;

    }


    await copyText(text);

    toast(
      "Resultado copiado."
    );

  } catch {

    try {

      await copyText(text);

      toast(
        "Resultado copiado."
      );

    } catch {

      toast(
        "No se pudo compartir."
      );

    }

  }

}


/**
 * Copia texto.
 */
async function copyText(text) {

  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {

    await navigator.clipboard.writeText(
      text
    );

    return;

  }


  const textarea =
    document.createElement("textarea");

  textarea.value =
    text;

  textarea.style.position =
    "fixed";

  textarea.style.opacity =
    "0";

  document.body.appendChild(
    textarea
  );

  textarea.select();

  document.execCommand(
    "copy"
  );

  textarea.remove();

}