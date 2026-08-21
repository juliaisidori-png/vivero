// ORGANISMO CUIR 001 — CONTACTO PROGRESIVO
// El contacto ya no sube ni cae de forma lineal rígida.
// Sostener: crecimiento orgánico y progresivo.
// Soltar: descenso suave hasta volver a reposo.

actualizarContacto = function(ahora, dt) {
  if (contactoActivo) {
    const sostenido = Math.max(0, (ahora - tiempoInicioContacto) / 1000);

    // Curva de crecimiento: perceptible desde el inicio,
    // media hacia 2–3 s y cercana al máximo hacia 5–6 s.
    const objetivo = 1 - Math.exp(-sostenido / 2.0);

    // Seguimiento suave del objetivo para evitar saltos.
    const suavizado = 1 - Math.exp(-dt * 5.0);
    nivelContacto += (objetivo - nivelContacto) * suavizado;
  } else {
    // Al soltar, la expansión conserva una memoria breve y se apaga gradualmente.
    // Aproximadamente 6–8 s desde 100% hasta quedar casi extinguida.
    nivelContacto *= Math.exp(-dt / 2.2);

    if (nivelContacto < 0.002) nivelContacto = 0;
  }

  nivelContacto = limitar(nivelContacto, 0, 1);
  actualizarInterfazContacto();
};
