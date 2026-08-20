/* =========================================================
   FUTBOLLE — SHARE
   ========================================================= */

import { toast } from "./ui.js";

export function initShare(state, classicHandlers, customHandlers) {
  const shareBtn = document.getElementById("shareBtn");

  // Validación de seguridad: si el botón no existe en la vista actual, no hacer nada
  if (!shareBtn) {
    return;
  }

  shareBtn.addEventListener("click", async () => {
    let shareData = null;

    if (customHandlers?.getShareData) {
      shareData = customHandlers.getShareData();
    } else if (classicHandlers?.getShareData) {
      shareData = classicHandlers.getShareData();
    }

    if (!shareData) {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("Share API error:", err);
        }
      }
    }

    // Fallback: copiar al portapapeles
    try {
      await navigator.clipboard.writeText(shareData.text);
      toast("¡Resultado copiado al portapapeles!", 2000);
    } catch (e) {
      toast("No se pudo copiar el resultado.", 2000);
    }
  });
}