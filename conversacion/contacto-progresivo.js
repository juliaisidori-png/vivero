// ORGANISMO CUIR 001 — CONTACTO PROGRESIVO
// Sostener: crecimiento orgánico más rápido para que VOZSEMILLA alcance antes su expansión.
// Soltar: descenso suave hasta volver a reposo.
// Incluye protecciones para que el contacto nunca quede trabado en 100%.

actualizarContacto = function(ahora, dt) {
  if (contactoActivo) {
    const sostenido = Math.max(0, (ahora - tiempoInicioContacto) / 1000);

    // Antes: constante 2.0. Ahora: 1.15.
    // Conserva la misma forma de curva, pero recorre mucho antes sus estados.
    const objetivo = 1 - Math.exp(-sostenido / 1.15);
    const suavizado = 1 - Math.exp(-dt * 7.0);
    nivelContacto += (objetivo - nivelContacto) * suavizado;
  } else {
    // La retirada sigue siendo lenta: conserva una memoria breve del contacto.
    nivelContacto *= Math.exp(-dt / 2.2);
    if (nivelContacto < 0.002) nivelContacto = 0;
  }

  nivelContacto = limitar(nivelContacto, 0, 1);
  actualizarInterfazContacto();
};

function liberarContacto() {
  contactoActivo = false;
}

window.addEventListener('mouseup', liberarContacto, true);
window.addEventListener('pointerup', liberarContacto, true);
window.addEventListener('pointercancel', liberarContacto, true);
window.addEventListener('blur', liberarContacto);

document.addEventListener('visibilitychange', function() {
  if (document.hidden) liberarContacto();
});

window.addEventListener('keyup', function(event) {
  if (event.key && event.key.toLowerCase() === 't') liberarContacto();
}, true);
