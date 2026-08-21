// ORGANISMO CUIR 001 — PRESENCIA DE VOZSEMILLA
// En reposo, VOZSEMILLA conserva el volumen elegido.
// La expansión por contacto hace crecer su presencia de forma no lineal:
// casi nada al principio, más desde la mitad y con fuerza cerca del máximo.

const actualizarTrackAntesPresenciaVozsemilla = actualizarTrack;

actualizarTrack = function(nombre, track, tiempo) {
  actualizarTrackAntesPresenciaVozsemilla(nombre, track, tiempo);

  if (nombre !== 'vozsemilla' || !track || !track.audio) return;

  const expansion = valor('vozsemillaExpansion');
  const contacto = valor('vozsemillaContact');
  const intensidad = limitar(expansion * contacto * nivelContacto, 0, 1);

  // Curva muy contenida al comienzo y mucho más abierta cerca del máximo.
  const curvaPresencia = Math.pow(intensidad, 2.35);

  // En expansión máxima, la voz principal puede ganar hasta aprox. 3.4x
  // respecto de su presencia estable. Los fragmentos verborrágicos se suman aparte.
  const multiplicador = mezclar(1, 3.4, curvaPresencia);

  track.audio.volume = limitar(track.audio.volume * multiplicador, 0, 1);
};
