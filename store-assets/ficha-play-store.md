# Ficha de Play Store — TinkuyHub

Borrador para copiar/pegar en Play Console. Revísalo y ajusta el tono si quieres — está escrito para calzar con los límites de caracteres de cada campo.

## Nombre de la app (máx. 30 caracteres)
```
TinkuyHub: Voluntariado
```
(23 caracteres)

## Descripción corta (máx. 80 caracteres)
```
Encuentra eventos de voluntariado cerca de ti y transforma tu comunidad.
```
(74 caracteres)

## Descripción completa (máx. 4000 caracteres)
```
TinkuyHub conecta a personas voluntarias con organizaciones que necesitan
manos para generar impacto real en su comunidad.

QUÉ PUEDES HACER

🗺️ Descubre eventos cerca de ti
Explora un mapa con eventos de voluntariado — limpieza de playas,
reforestación, apoyo educativo, campañas sociales y más — filtrados por tipo
y ubicación.

✅ Inscríbete en segundos
Únete a un evento con un solo toque. Recibirás confirmación por correo con
todos los detalles: fecha, horario, requisitos y punto de encuentro.

🏅 Gana puntos, insignias y sube de nivel
Cada evento al que asistes suma puntos. Acumula rachas semanales, desbloquea
insignias por categoría (ambiental, educativo, social) y compite en el
ranking de voluntarios.

🔔 Notificaciones de eventos cercanos
Activa las notificaciones y entérate cuando se publique un evento nuevo
cerca de tu ubicación.

🏢 Para organizaciones y empresas
¿Representas una ONG o una empresa con programa de voluntariado corporativo?
Publica tus eventos, gestiona inscripciones y confirma la asistencia el
mismo día desde tu celular.

📸 Comparte el impacto
Sube fotos de los eventos, deja tu reseña y comparte tus logros e insignias
en redes sociales.

TinkuyHub es gratuito, tanto para voluntarios como para organizaciones.

¿Tienes dudas o sugerencias? Escríbenos a soporte@tinkuyhub.com
```
(~1250 caracteres, deja mucho margen)

## Categoría
Primaria: **Social** (alternativa razonable: **Estilo de vida**)

## Etiquetas / palabras clave sugeridas
voluntariado, ONG, comunidad, impacto social, eventos, Perú

## Correo de contacto del desarrollador
`soporte@tinkuyhub.com` (confirma que este buzón existe antes de publicarlo — ya se usa también en la Política de Privacidad y en la pantalla de eliminación de cuenta)

## URL de la Política de Privacidad
```
https://eventos.tinkuyhub.com/privacidad
```

## URL de eliminación de datos (Data Safety)
```
https://eventos.tinkuyhub.com/eliminar-cuenta
```

---

# Cuestionario de clasificación de contenido (IARC)

Respuestas sugeridas — confírmalas tú mismo en el formulario real, esto es una guía:

| Pregunta | Respuesta |
|---|---|
| Violencia | No |
| Contenido sexual | No |
| Lenguaje ofensivo | No |
| Sustancias controladas | No |
| Juego con dinero real / apuestas | No |
| ¿Los usuarios pueden interactuar entre sí? | **Sí** — perfiles públicos, seguir a organizaciones, comentarios/reseñas de eventos |
| ¿Los usuarios pueden compartir su ubicación? | **Sí** — ubicación aproximada/precisa para eventos cercanos |
| ¿Permite compras dentro de la app? | No |

Con estas respuestas el resultado esperado es una clasificación equivalente a "Para todos" (PEGI 3 / Everyone), pero puede variar levemente por región — el cuestionario es dinámico.

---

# Formulario de Seguridad de Datos (Data Safety)

Esta sección es la más sensible del formulario: Google la compara contra el comportamiento real de la app. Lo que sigue está basado en el código actual, no en lo que "debería" hacer.

## ¿La app recolecta o comparte alguno de estos tipos de datos?

| Categoría | Recolectado | Compartido con terceros | Detalle |
|---|---|---|---|
| Nombre | Sí | No | Perfil de usuario |
| Correo electrónico | Sí | No | Cuenta, notificaciones |
| Número de teléfono | Sí | No | Registro de cuenta |
| Dirección | Sí | No | Solo cuentas de organización (dirección fiscal) |
| ID de usuario | Sí | No | ID interno de Supabase Auth |
| Ubicación aproximada | Sí | No | Mapa de eventos, notificaciones de proximidad |
| Ubicación precisa | Sí | No | Igual que arriba, si el usuario otorga permiso preciso |
| Fotos | Sí | No | Fotos de evento y de perfil |
| Otra info del usuario (biografía, redes sociales) | Sí | No | Campos opcionales del perfil |
| Identificadores del dispositivo (token FCM) | Sí | No | Para notificaciones push |

## ¿Por qué "Compartido con terceros" = No en casi todo?

Google distingue entre **procesar datos en tu nombre** (proveedores como Supabase, Cloudinary, Firebase, Resend — esto NO cuenta como "compartir" bajo su definición, es infraestructura) y **compartir datos con un tercero para sus propios fines** (esto sí habría que declararlo como "Sí", y no es el caso aquí — nadie vende ni reutiliza los datos). Aun así, **verifica esta interpretación directamente en la ayuda de Play Console al momento de llenarlo** — es el punto donde más apps reciben observaciones, y las reglas se actualizan con frecuencia.

## ¿Los datos están cifrados en tránsito?
**Sí** (HTTPS en toda la app).

## ¿El usuario puede pedir que se borren sus datos?
**Sí** — desde la app (Perfil → Eliminar cuenta) o sin iniciar sesión en `https://eventos.tinkuyhub.com/eliminar-cuenta`.

## ¿Para qué se usan los datos? (marcar todas las que apliquen)
- Funcionalidad de la app ✅
- Personalización ✅ (recomendación de eventos cercanos)
- Comunicaciones ✅ (confirmaciones por correo, notificaciones push)
- Publicidad o marketing ❌
- Analítica ❌ *(salvo que decidas agregar Firebase Analytics más adelante — hoy no está integrado)*
