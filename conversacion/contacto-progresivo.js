// ORGANISMO CUIR 001 — CONTACTO PROGRESIVO
// Sostener: crecimiento orgánico y progresivo.
// Soltar: descenso suave hasta volver a reposo.
// Incluye protecciones para que el contacto nunca quede trabado en 100%.

actualizarContacto = function(ahora, dt) {
  if (contactoActivo) {
    const sostenido = Math.max(0, (ahora - tiempoInicioContacto) / 1000);

    const objetivo = 1 - Math.exp(-sostenido / 2.0);
    const suavizado = 1 - Math.exp(-dt * 5.0);
    nivelContacto += (objetivo - nivelContacto) * suavizado;
  } else {
    // Caída gradual: conserva una memoria breve del contacto pero siempre retorna.
    nivelContacto *= Math.exp(-dt / 2.2);
    if (nivelContacto < 0.002) nivelContacto = 0;
  }

  nivelContacto = limitar(nivelContacto, 0, 1);
  actualizarInterfazContacto();
};

function liberarContacto() {
  contactoActivo = false;
}

// Si el mouse se suelta fuera del documento o la ventana pierde foco,
// evitamos que el contacto quede artificialmente encendido.
window.addEventListener('mouseup', liberarContacto, true);
window.addEventListener('pointerup', liberarContacto, true);
window.addEventListener('pointercancel', liberarContacto, true);
window.addEventListener('blur', liberarContacto);

// Al cambiar de pestaña no puede mantenerse un contacto físico ficticio.
document.addEventListener('visibilitychange', function() {
  if (document.hidden) liberarContacto();
});

// Refuerzo específico para la tecla T, incluso en fase de captura.
window.addEventListener('keyup', function(event) {
  if (event.key && event.key.toLowerCase() === 't') liberarContacto();
}, true);
