# Guion del video — Hackathon (máx. 3:00, solo voz)

> Ritmo de lectura: unas 150 palabras por minuto (2,5 palabras por segundo). Cada parte tiene un
> tope de palabras: si alguien se pasa, se recorta texto, no se habla más rápido.

## Estructura y tiempos

| Parte | Tiempo | Duración | Quién | Contenido | Palabras máx. |
| --- | --- | --- | --- | --- | --- |
| 1 | 0:00 – 0:30 | 30 s | Dev 1 | Presentación y problema | ✅ ya grabado |
| 2 | 0:30 – 1:05 | 35 s | Dev 2 | La solución | 85 |
| 3 | 1:05 – 1:45 | 40 s | Dev 3 | Qué recibe el coordinador | 100 |
| 4 | 1:45 – 2:25 | 40 s | Dev 4 | Cómo decide el motor | 100 |
| 5 | 2:25 – 2:55 | 30 s | Dev 5 | Cómo lo construimos, impacto y cierre | 70 |
| — | 2:55 – 3:00 | 5 s | — | Margen | — |

Si la Parte 1 dura más de 30 s, el ajuste sale de la Parte 5.

---

## Parte 2 — La solución (0:30 – 1:05) · 35 s

> Por eso creamos **TutorAssigner**, un sistema que hace ese cruce en segundos.
> El coordinador registra a cada tutor una sola vez: qué materias domina y a qué nivel, sus
> horarios de la semana, su prioridad por experiencia y cuántos estudiantes puede atender.
> Después registra la solicitud del estudiante: la materia, cuándo puede y sus preferencias, como
> modalidad virtual o un tutor en particular.
> Con eso, el sistema compara la solicitud contra todos los tutores a la vez. Y aquí viene lo mejor…

---

## Parte 3 — Qué recibe el coordinador (1:05 – 1:45) · 40 s

> Con un clic, el coordinador recibe al mejor tutor para esa solicitud, con un puntaje de
> cero a cien.
> No es una caja negra: el sistema explica por qué lo eligió. Por ejemplo: «domina Cálculo
> uno con cinco de cinco, comparte tres horas con tu disponibilidad y atiende virtual, como
> pediste».
> Recibe las dos mejores alternativas, cuántos puntos las separan, y la lista de tutores
> descartados con su motivo.
> Y el coordinador tiene la última palabra: confirma la recomendación, o elige otra opción dejando
> el motivo. Al confirmar, la carga del tutor se actualiza sola para la siguiente asignación.

---

## Parte 4 — Cómo decide el motor (1:45 – 2:25) · 40 s

> ¿Cómo decide? En tres pasos.
> Primero, filtros: si el tutor no comparte con el estudiante un bloque completo de sesión, o ya
> no tiene cupo, queda fuera.
> Segundo, un puntaje con cinco criterios ponderados: dominio de la materia, compatibilidad
> horaria, experiencia, preferencias cumplidas y balance de carga, para no saturar siempre al
> mismo tutor. Los pesos se pueden ajustar y cada cambio queda versionado.
> Tercero, un desempate determinista: mismos datos, mismo resultado, siempre.
> Sin azar y sin IA externa: cada recomendación se puede reproducir y auditar. Y lo respaldan casi
> cincuenta pruebas automáticas.

**Nota:** hoy el motor tiene 48 tests. Si el número cambia, ajustar a «casi cincuenta» o «más de
cincuenta».

---

## Parte 5 — Cómo lo construimos, impacto y cierre (2:25 – 2:55) · 30 s

> Lo construimos cinco personas en paralelo sin pisarnos: un monolito modular con React, Node,
> PostgreSQL y Docker, donde el motor es una librería independiente y los contratos se comparten
> entre frontend y backend.
> Lo que antes era una tarde cruzando horarios a mano, ahora es un clic, con asignaciones más
> justas y explicables.
> **TutorAssigner: el tutor perfecto para cada estudiante.**

---

## Checklist de grabación

- [ ] El nombre del producto coincide con el que dijo Dev 1.
- [ ] Cada uno graba en un lugar sin eco, con el mismo micrófono si se puede, y a volumen parecido.
- [ ] Leer en voz alta y cronometrar cada parte antes de grabar; el total no puede pasar de 3:00.
- [ ] Dejar medio segundo de silencio al inicio y al final de cada parte para facilitar los cortes.
- [ ] Música de fondo suave y libre de derechos, más baja que la voz (opcional).
