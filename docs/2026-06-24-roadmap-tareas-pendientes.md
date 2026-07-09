# RubusAI — Roadmap de Tareas Pendientes
**Fecha:** 2026-06-24
**Origen:** Cruce entre la auditoría técnica del 2026-05-22 (`docs/2026-05-22-audit-estado-proyecto.md`) y la lista de tareas pendientes del equipo.
---

## Cómo está organizado

Cada tarea tiene:
- **Qué es** — explicación en una o dos líneas, sin asumir que ya conoces el proyecto.
- **En qué consiste** — el trabajo concreto a hacer.
- **Objetivo** — por qué nos importa, qué problema resuelve.
- **Servicios involucrados** — para saber dónde tocar código.
- **Esfuerzo estimado** — Bajo / Medio / Alto / Muy Alto.

Las tareas están agrupadas por prioridad: Alta, Media, Baja/Investigación. Al final hay una sección de **lo que ya está hecho**, para que quien lea el documento sepa de dónde partimos.

---

## Prioridad Alta

### 1. Pipeline de reentrenamiento del modelo con feedback humano

**Qué es:** Ahora mismo el modelo de IA (YOLOv8, archivo `best.pt`) detecta etapas fenológicas de la zarzamora pero nunca aprende de sus propios errores: si se equivoca, nadie se lo puede corregir desde la aplicación. Esta tarea crea ese mecanismo de corrección y reentrenamiento.

**En qué consiste:**
1. Una pantalla en el panel web (`zarza-web`) donde un agrónomo o admin pueda ver una imagen analizada junto con lo que el modelo detectó (etapa, bounding boxes, si la marcó sana o enferma).
2. Permitir que esa persona corrija lo que está mal: cambiar la etapa fenológica asignada, marcar una detección como enfermedad (el modelo actual no tiene ninguna clase de enfermedad — esto también resuelve ese hueco), o indicar que faltó/sobró una detección.
3. Guardar esas correcciones en una tabla nueva en la base de datos (por ejemplo `ModelFeedback`), vinculada a la imagen original en R2 y al análisis correspondiente.
4. Un proceso (puede ser manual al principio, luego automatizable) que tome todas las correcciones acumuladas, las convierta a formato de entrenamiento de YOLO, y haga fine-tuning del modelo base.
5. Versionar los modelos resultantes (`best_v2.pt`, `best_v3.pt`...) y tener una forma de validar el nuevo modelo antes de ponerlo en producción, para no empeorar la precisión por accidente.

**Objetivo:** Que el modelo mejore con el tiempo en lugar de quedarse fijo desde que se entrenó por última vez, y que finalmente podamos detectar enfermedades (algo que la auditoría ya señalaba como pendiente, sección 3.1, pero que requería re-entrenar manualmente sin un mecanismo de feedback claro).

**Servicios involucrados:** `zarza-web` (UI de corrección), `fruit-backend` (API + tabla de feedback), `fruit-inference` (pipeline de reentrenamiento, `model_config.py`).

**Esfuerzo estimado:** Muy Alto. **Recomendación:** escribir un spec de diseño antes de tocar código — es la tarea más grande del roadmap y toca varios servicios a la vez.

---

### 2. Logging estructurado con traceId entre servicios

**Qué es:** Hoy cada servicio (`fruit-backend`, `fruit-ms`, `fruit-inference`) escribe sus propios logs sueltos (algunos con `console.log`, otros con `print()` de Python), sin relación entre ellos. Si una imagen falla en algún punto del flujo, no hay forma fácil de seguirle el rastro de un servicio a otro.

**En qué consiste:**
1. Instalar un logger estructurado (por ejemplo `nestjs-pino` o `winston`) en `fruit-backend` y `fruit-ms`, que escriba logs en formato JSON con campos fijos: `service`, `timestamp`, `traceId`, `level`, `message`.
2. Generar un `traceId` único cuando llega una imagen nueva (en el `POST /ingestion` de `fruit-backend`).
3. Propagar ese `traceId`: meterlo en los headers del mensaje de RabbitMQ (`nueva_fruta`), y que `fruit-ms` lo reciba, lo use en sus logs, y lo pase también en la llamada HTTP a `fruit-inference`.
4. Reemplazar los `print()` sueltos de `fruit-inference` por logging estructurado equivalente.

**Objetivo:** Poder seguir el camino completo de una imagen (subida → cola → inferencia → notificación) leyendo logs, en vez de adivinar en qué servicio se rompió algo. Esto es crítico una vez que el sistema esté en producción real con usuarios.

**Servicios involucrados:** `fruit-backend`, `fruit-ms`, `fruit-inference`.

**Esfuerzo estimado:** Medio.

---

### 3. Revisar las vistas por rol

**Qué es:** El sistema tiene 4 roles (`ADMIN`, `PRODUCTOR`, `AGRONOMO`, `MONITOR`) y cada uno debería ver solo la información que le corresponde (por ejemplo, un PRODUCTOR solo sus propios campos, un AGRONOMO solo los campos que tiene asignados). Esta tarea es una revisión manual para confirmar que eso se cumple de verdad en todas las pantallas y endpoints, no solo donde ya se probó.

**En qué consiste:**
1. Hacer una lista de todos los endpoints del backend y todas las pantallas de la app Flutter / panel web.
2. Para cada uno, anotar qué rol(es) debería ver qué datos, y comparar contra el comportamiento real (probando con un usuario de cada rol).
3. Documentar cualquier gap encontrado (datos que se filtran a un rol que no debería verlos, pantallas que faltan restringir, etc.) como tickets separados para corregir.

**Objetivo:** Evitar fugas de información entre productores/agrónomos/monitores y confirmar que el control de acceso (RBAC) funciona como se diseñó, no solo como se documentó.

**Servicios involucrados:** `fruit-backend` (guards y scoping de queries), `zarza_ai`, `zarza-web`.

**Esfuerzo estimado:** Bajo-Medio (es trabajo de revisión y QA; puede generar tickets de corrección de esfuerzo variable).

---

## Prioridad Media

### 4. Documentación de API con Swagger/OpenAPI

**Qué es:** El backend (`fruit-backend`) no tiene documentación interactiva de sus endpoints. Cualquiera que quiera consumir la API (el panel web, futuras integraciones, una persona nueva en el equipo) tiene que leer el código fuente para saber qué espera cada endpoint.

**En qué consiste:**
1. Instalar el paquete `@nestjs/swagger`.
2. Añadir decoradores `@ApiProperty` a los DTOs existentes (la mayoría ya usa `class-validator`, así que es un paso natural).
3. Añadir `@ApiTags` y `@ApiOperation` a los controladores.
4. Exponer la UI interactiva en una ruta como `/api/docs`.

**Objetivo:** Que cualquiera pueda ver y probar los endpoints sin leer el código, y facilitar el trabajo de quien desarrolle `zarza-web` o futuras integraciones.

**Servicios involucrados:** `fruit-backend`.

**Esfuerzo estimado:** Bajo.

---

### 5. Tests en fruit-ms

**Qué es:** `fruit-ms` es el microservicio que recibe el evento de "nueva fruta", llama a la inferencia, y guarda el resultado. Actualmente tiene **cero archivos de test** — ningún cambio futuro está protegido contra romper este flujo sin darse cuenta.

**En qué consiste:**
1. Tests unitarios del `InferenceMapper` (la pieza que traduce el reporte que devuelve `fruit-inference` al modelo `Analysis` que se guarda en base de datos) — es lógica con bastantes casos borde.
2. Test de integración del flujo completo: evento `nueva_fruta` → llamada a inferencia (mockeada) → persistencia en base de datos → notificación.
3. Tests de los `MessagePattern` `get_fruits` y `get_fruit_by_id`.

**Objetivo:** Detectar regresiones antes de que lleguen a producción. Hoy cualquier cambio en este servicio se prueba "a ojo".

**Servicios involucrados:** `fruit-ms`.

**Esfuerzo estimado:** Medio.

---

### 6. Dead Letter Queue (DLQ) y reintentos en RabbitMQ

**Qué es:** Si `fruit-ms` falla al procesar un evento `nueva_fruta` (por ejemplo, porque `fruit-inference` está caído o tarda demasiado), ese mensaje simplemente se pierde. No hay reintentos ni forma de recuperarlo.

**En qué consiste:**
1. Configurar una política de reintentos en el consumidor de `fruit-ms` (por ejemplo, 3 intentos con backoff exponencial).
2. Configurar un Dead Letter Exchange (DLX) en RabbitMQ para que, si se agotan los reintentos, el mensaje vaya a una cola separada en vez de desaparecer.
3. Esa cola de "mensajes muertos" debe quedar disponible para inspección manual (saber qué imágenes no se llegaron a procesar y por qué).

**Objetivo:** No perder silenciosamente análisis de productores cuando hay un problema temporal en el sistema (caída de `fruit-inference`, timeout, etc.).

**Servicios involucrados:** `fruit-ms`, RabbitMQ.

**Esfuerzo estimado:** Medio.

---

### 7. Cronograma de cosecha diferenciado por variedad

**Qué es:** Existen 4 variedades de zarzamora en el sistema (`regina`, `aketzali`, `amelali`, `erandi`), y cada una madura a un ritmo distinto en la realidad. Hoy el campo `variedad` llega en cada solicitud de inferencia y se reporta, pero **no afecta el cálculo** de cuántos días faltan para la cosecha — se usa la misma tabla de tiempos para todas las variedades.

**En qué consiste:**
1. Reemplazar el diccionario global `DIAS_PREDICCION` (en `fruit-inference/model_config.py`) por una matriz `variedad → etapa → días`.
2. Usar el campo `variedad` que ya llega en el request para elegir la fila correcta de esa matriz al construir el cronograma de cosecha.
3. Conseguir del equipo agronómico los tiempos reales de maduración por variedad (este es el insumo que falta más que el código en sí).

**Objetivo:** Predicciones de fecha de cosecha más precisas — hoy todas las variedades reciben la misma estimación aunque maduren a velocidades distintas.

**Servicios involucrados:** `fruit-inference`.

**Esfuerzo estimado:** Medio (el código es sencillo; lo que toma tiempo es conseguir los datos agronómicos reales).

---

### 8. Modal de validación de análisis en Flutter

**Qué es:** Un agrónomo puede aprobar o rechazar un análisis, y el backend ya soporta esto completamente (`PATCH /analyses/:id/validate`). Pero en la app Flutter ese flujo no tiene una pantalla real: hoy solo existe un aviso (snackbar) que dice "un agrónomo rechazó tu análisis", sin que el agrónomo tenga una forma cómoda de hacer esa validación con observaciones.

**En qué consiste:**
1. Construir un modal/pantalla donde el agrónomo vea el análisis, pueda escribir observaciones, y elija aprobar o rechazar.
2. Mostrar feedback visual de éxito o error al confirmar la acción.
3. Actualizar el estado del análisis en la lista (`AnalysesPage`) inmediatamente después de validar, sin necesitar refrescar manualmente.

**Objetivo:** Completar un flujo que ya existe en el backend pero que hoy es inutilizable de punta a punta desde la app.

**Servicios involucrados:** `zarza_ai`.

**Esfuerzo estimado:** Medio.

---

### 9. Flutter flavors (dev/staging/prod)

**Qué es:** Hoy las URLs del backend y del WebSocket en la app Flutter (`AppConstants`) dependen de pasar manualmente un flag `--dart-define` al compilar. No existe un mecanismo real de "flavors" que separe los entornos de desarrollo, staging y producción.

**En qué consiste:**
1. Configurar flavors nativos de Flutter (`dev`, `staging`, `prod`) tanto en Android (product flavors) como en iOS (schemes/configurations).
2. Definir un archivo de variables por entorno (`.env` por flavor, o `--dart-define-from-file`) con las URLs y claves correspondientes a cada uno.
3. Actualizar `AppConstants` para leer del flavor activo en vez de depender de que alguien recuerde pasar el flag correcto a mano.
4. Documentar cómo compilar/ejecutar cada flavor (ej. `flutter run --flavor dev`).

**Objetivo:** Evitar que alguien compile por error una build de desarrollo apuntando al backend de producción (o viceversa), y tener una build de staging confiable para probar antes de liberar a producción.

**Servicios involucrados:** `zarza_ai`.

**Esfuerzo estimado:** Bajo.

---

### 10. Logging de `/internal/notify` con IP de origen y rotación del secreto — ✅ Completada (2026-07-09)

> Resuelta: el endpoint loguea evento + IP de origen (`ip=`/`xff=`) en cada llamada, incluidos intentos con token inválido; `.gitignore` verificado en ambos servicios; proceso de rotación documentado en `SECURITY.md` (raíz) y `INTERNAL_NOTIFY_TOKEN` añadido a `fruit-backend/.env.example`. El gestor de secretos (punto 4) queda como mejora futura documentada.

**Qué es:** El endpoint interno `/internal/notify` de `fruit-backend` (que usa `fruit-ms` para disparar notificaciones WebSocket/push) ya registra el `userId` de cada llamada, pero no queda registro de la IP de origen, y el token compartido (`INTERNAL_NOTIFY_TOKEN`) no tiene ningún mecanismo de rotación.

**En qué consiste:**
1. Agregar la IP de origen (o el header correspondiente si hay proxy/load balancer de por medio) al log que ya existe en cada llamada a `/internal/notify`.
2. Confirmar que el `.env` con el token esté en `.gitignore` en todos los servicios que lo usan (`fruit-backend` y `fruit-ms`).
3. Definir y documentar un proceso de rotación periódica del token (al inicio puede ser manual: cambiar el valor y redesplegar ambos servicios).
4. (Opcional, a futuro) Mover el secreto a un gestor de secretos (AWS Secrets Manager, Vault) en vez de dejarlo como variable de entorno plana.

**Objetivo:** Poder auditar quién y desde dónde se están disparando notificaciones internas, y reducir el impacto si el token llega a filtrarse.

**Servicios involucrados:** `fruit-backend`, `fruit-ms`.

**Esfuerzo estimado:** Bajo.

---

## Prioridad Baja / Investigación

### 11. Investigar una red de localización/entrega offline (tipo "Buscar" de Apple)

**Qué es:** Cuando se crea una solicitud de muestreo para un monitor que ya está en la finca sin señal de internet, esa solicitud no le llega hasta que recupere conexión. Apple resuelve un problema parecido con su red "Buscar" (Find My): cada iPhone cercano puede actuar como relay para otro, incluso sin que su dueño se entere, usando Bluetooth de bajo consumo. Esta tarea es investigar si algo similar (o más simple) tiene sentido para nuestro caso.

**En qué consiste (es un spike de investigación, no implementación directa):**
1. Evaluar la opción "tipo Apple": que los teléfonos de otros usuarios de la app, cuando pasen cerca con conexión a internet, hagan de relay vía Bluetooth para entregar la solicitud al monitor desconectado. Es la opción más fiel a la idea original, pero también la de mayor esfuerzo de implementación (requiere diseñar un protocolo de relay, manejo de batería, privacidad, etc.).
2. Evaluar alternativas más simples: notificación por SMS si hay señal celular pero no datos móviles; o simplemente aceptar que la solicitud se sincronice cuando el monitor recupere señal (parecido a como ya funciona la cola offline de subida de imágenes, pero aplicado a solicitudes entrantes en vez de imágenes salientes).
3. Entregable de esta tarea: un documento corto comparando viabilidad, esfuerzo y limitaciones de cada opción — sin necesidad de escribir código todavía.

**Objetivo:** Que las solicitudes de muestreo lleguen a un monitor en campo aunque no tenga internet en el momento exacto en que se crea, sin necesidad de que el monitor revise la app activamente.

**Servicios involucrados:** `zarza_ai` (y potencialmente `fruit-backend` si se decide implementar alguna opción).

**Esfuerzo estimado:** Investigación primero (spike); la implementación dependerá de qué opción se elija.

---

### 12. Mejoras de diseño (UX/UI en Flutter)

**Qué es:** Conjunto de mejoras visuales y de experiencia de usuario en la app móvil, agrupadas como una sola línea de trabajo que se puede repartir en tickets individuales.

**En qué consiste:**
- **Modo oscuro real:** ya existe un `darkTheme` definido, pero está fijo — falta que respete `ThemeMode.system` (que siga la preferencia del sistema operativo del usuario).
- **Manejo de errores más descriptivo:** hoy los errores de red se muestran genéricos; traducir códigos de error comunes a mensajes accionables en español (ej. "Sin conexión — la imagen se guardó para sincronizar automáticamente").
- **Timeline visual de etapas fenológicas:** en la pantalla de detalle de un análisis (`ResultsScreen`), mostrar una barra de progreso o línea de tiempo visual en vez de solo texto.
- **Indicador de "procesando":** en el historial (`HistoryScreen`), mostrar un spinner o skeleton en el ítem mientras se espera el resultado del análisis vía WebSocket.

**Objetivo:** Mejorar la experiencia diaria de productores y monitores usando la app.

**Servicios involucrados:** `zarza_ai`.

**Esfuerzo estimado:** Bajo cada ítem — se pueden asignar como tickets separados.

---

### 13. Hallazgos de seguridad menores pendientes

**Qué es:** Tres hallazgos de seguridad de bajo riesgo de la auditoría original que siguen sin resolver. Son rápidos de implementar y buenos primeros tickets para alguien nuevo en el proyecto.

**En qué consiste:**
- **Cifrado del token FCM:** el campo `fcmToken` del usuario (usado para push notifications) se guarda en texto plano en la base de datos. Cifrarlo a nivel de aplicación (AES-256 con clave en variable de entorno) antes de guardarlo.
- **Autenticación en `fruit-inference`:** este servicio no valida quién le llama, solo confía en que no esté expuesto a internet. Añadir un header simple (`x-inference-token`) validado en un middleware de FastAPI, igual al patrón que ya se usa en `/internal/notify` de `fruit-backend`.
- **Validación de tamaño antes de descargar de R2:** `fruit-inference` descarga la imagen completa de Cloudflare R2 sin revisar su tamaño antes. Usar `HeadObject` para chequear el tamaño y rechazar (error 400) si excede un límite razonable (ej. 10MB), evitando que una imagen gigante tumbe el contenedor por falta de memoria.

**Objetivo:** Cerrar gaps de seguridad de bajo esfuerzo y bajo riesgo, pero que siguen abiertos.

**Servicios involucrados:** `fruit-backend` (cifrado fcmToken), `fruit-inference` (auth + validación de tamaño).

**Esfuerzo estimado:** Bajo cada uno.

---

### 14. Backlog sin trabajar todavía

Estas ideas están documentadas en la auditoría original pero no han tenido ningún movimiento. Se quedan en el backlog para retomar cuando haya espacio:

- **Mapa geográfico de análisis** — visualizar en un mapa (Google Maps/Mapbox) la ubicación de los análisis por campo, usando los datos GPS que ya existen.
- **Exportación de reportes PDF/Excel** — endpoint para que un agrónomo exporte los análisis de un campo.
- **Cache en Redis para el dashboard** — las métricas de `/admin/dashboard/*` son costosas de calcular en cada request.
- **Healthchecks en `docker-compose.yml`** — para que los servicios esperen correctamente a sus dependencias (ej. `fruit-ms` no debe procesar hasta que `fruit-inference` esté listo).
- **Compresión de imágenes antes del upload** — reducir tiempo de subida y costo de almacenamiento en R2.
- **Paginación consistente** — unificar `fruit-backend` (offset) y `fruit-ms` (cursor) a un solo esquema.
- **Notificaciones in-app persistentes** — una campana con historial de notificaciones leídas/no leídas, en vez de solo WebSocket/push efímero.
- **Soporte multi-campo en captura** — permitir elegir entre varios campos asignados antes de tomar la foto, en vez de uno fijo.

---

## Lo que ya está hecho (para contexto)

Para que quede claro de dónde partimos, esto ya está completado desde la auditoría del 2026-05-22:

- **Autenticación y scoping de WebSocket por usuario** — el gateway valida el JWT al conectar y separa los eventos por "room" de usuario, en vez de transmitir a todos los conectados.
- **Refresh tokens con rotación** — access token de 15 minutos, refresh token de 7 días, con detección de robo de token (rotación por familia) y revocación al hacer logout.
- **Panel web (`zarza-web`)** — ya tiene una implementación real en React/TypeScript (gestión de usuarios, análisis, solicitudes), no solo un directorio vacío como decía la auditoría original.
- **Corrección de vulnerabilidades de dependencias** reportadas por Dependabot en todo el monorepo.
- **Versionado de API (`/v1/`)** — `fruit-backend` usa URI Versioning de NestJS (`/api/v1/...`) con `defaultVersion: '1'`; permite añadir `/v2/` a futuro sin romper clientes. Actualizado `fruit-ms`, `zarza_ai` y `zarza-web` para apuntar a las rutas versionadas.
- **Auditoría de `/internal/notify` y rotación de `INTERNAL_NOTIFY_TOKEN`** (tarea #10, 2026-07-09) — log de evento + IP de origen en cada llamada (y en rechazos por token inválido), proceso de rotación manual documentado en `SECURITY.md`.
