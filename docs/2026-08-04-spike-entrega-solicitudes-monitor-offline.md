# Spike: entrega de solicitudes de muestreo a monitores sin internet en campo

**Fecha:** 2026-08-04
**Origen:** [[2026-06-24-roadmap-tareas-pendientes|Roadmap de tareas pendientes]], punto 11, prioridad Baja/Investigación.
**Tipo:** Investigación (spike), sin código.

## Problema

Un monitor en campo sin señal de datos no recibe una solicitud de muestreo hasta que recupera conectividad y abre la app. Hoy la entrega depende de dos canales — WebSocket y FCM (`fruit-backend/src/fcm`, `fruit-backend/src/solicitudes/solicitudes.service.ts`) — que **requieren ambos que el dispositivo del monitor tenga internet activo**. Sin señal, el mensaje queda pendiente en la cola de FCM sin garantía de tiempo de entrega.

## Punto de partida: lo que ya existe

La app (`zarza_ai`) ya resuelve un problema simétrico — subida de imágenes sin conexión — con una cola offline local: `ConnectivityService` (paquete `connectivity_plus`) detecta el cambio de conectividad, `AutoSyncService` dispara la sincronización, y `SyncService` reintenta contra el backend con `offlineSyncId` como clave idempotente, todo persistido en SQLite (Drift). Es un mecanismo **reactivo del propio dispositivo**: nadie empuja nada, el device "tira" de la cola cuando reconecta. No existe hoy nada de Bluetooth, mesh o P2P en ningún servicio del repo. Ver [[2026-04-29-offline-sync]].

## Opción 1 — Relay Bluetooth tipo Find My

Réplica del protocolo de Apple: dispositivos con la app, al pasar cerca de un monitor desconectado, recogerían y reenviarían la solicitud vía BLE sin intervención de su dueño.

**Cómo funciona el original:** el device "perdido" transmite anuncios BLE con una clave pública que rota cada 15 minutos; cualquier iPhone cercano con internet ("Finder") escucha pasivamente, cifra su ubicación con esa clave (ECIES) y la sube a iCloud; solo el dueño puede descifrarla. El relay es anónimo y pasivo — el Finder nunca sabe qué está transmitiendo ni para quién.

**Por qué es difícil de replicar en una app de terceros (no en el sistema operativo):**

- **iOS y Android no exponen relay BLE a nivel de OS para apps de terceros.** El bearer de advertising simultáneo + scan + relay que usa BLE Mesh no está soportado de forma nativa en ninguno de los dos sistemas; hay que implementarlo a mano sobre Core Bluetooth / Android BLE APIs.
- **Background es el obstáculo central.** En iOS, la app deja de anunciar y escuchar en segundo plano salvo con background modes específicos y restricciones (no arranca en background antes del primer desbloqueo si el device está cifrado). En Android, desde la versión 7 el sistema corta scans de más de 30s sin `ScanFilter`, Android 12 redujo aún más la frecuencia de scan en background, y hay restricciones agresivas por fabricante (Samsung "Deep Sleeping", MIUI battery saver) que requieren que el usuario desactive manualmente la optimización de batería. Es decir: **el relay solo funcionaría de forma confiable si la app del "finder" está abierta en primer plano**, lo cual contradice la premisa de "sin que el dueño se entere".
- **Apple logra esto porque controla el OS.** Su implementación corre a nivel de sistema (Localizar), no como app de App Store — tiene privilegios de background BLE que ninguna app de terceros puede obtener. Replicarlo "tal cual" no es solo un problema de esfuerzo de ingeniería, es una limitación de plataforma.
- **Diseño de protocolo no trivial:** claves rotatorias, cifrado end-to-end para que el relay no vea el contenido de la solicitud, deduplicación de mensajes relayed por múltiples nodos, TTL/expiración, y manejo de que el "área de cobertura" depende de cuántos usuarios de la app (no del público general, como Apple) pasen cerca del monitor — con la base de usuarios actual de Zarza (equipos de campo pequeños), la densidad de "finders" cercanos probablemente sea insuficiente para que el relay funcione en la práctica.
- **Batería y privacidad:** exige justificar ante el usuario por qué la app usa Bluetooth y ubicación en background constantemente (permisos sensibles en ambos stores), y consentimiento explícito para actuar como relay de otros.

**Viabilidad:** baja en el corto/mediano plazo. Técnicamente posible pero con una limitación de plataforma difícil de sortear (background BLE) y una limitación de escala (pocos usuarios = pocos relays posibles). **Esfuerzo:** muy alto (protocolo propio, permisos de ambos SO, pruebas en campo con dispositivos reales, cumplimiento de políticas de privacidad de Apple/Google para apps que hacen scanning BLE en background).

## Opción 2 — SMS como canal de respaldo

Enviar la solicitud (o un aviso corto) por SMS cuando el monitor tiene señal celular pero no datos.

- **Viable técnicamente y de bajo esfuerzo relativo:** requiere integrar un proveedor (Twilio u otro) en `fruit-backend`, un fallback en `solicitudes.service.ts` que detecte fallo/timeout de FCM y dispare SMS, y un campo de teléfono verificado por usuario.
- **Costo no trivial en la región:** SMS a México cuesta del orden de USD 0.15 por mensaje con Twilio (uno de los destinos más caros del catálogo), a lo que se suman cargos de operador. Si el volumen de solicitudes es bajo (equipos de campo pequeños) el costo total es manejable; si crece, conviene comparar con proveedores locales/regionales antes de comprometerse a Twilio.
- **Limitación real:** solo resuelve el caso "hay señal celular pero no datos" — si el monitor está en una zona sin cobertura de ningún tipo (común en fincas rurales alejadas), SMS tampoco llega. No resuelve el caso general, solo amplía el margen.
- **UX más pobre:** un SMS no puede llevar toda la estructura de una solicitud (campo, tarea, ubicación); serviría como aviso ("tienes una solicitud nueva, abre la app") más que como payload completo.

**Viabilidad:** alta como complemento, no como solución única. **Esfuerzo:** bajo-medio.

## Opción 3 — Cola de sincronización diferida (simétrica a la de imágenes)

Aplicar el mismo patrón que ya funciona para subida de imágenes, pero en la dirección contraria: la solicitud se crea y persiste normalmente en el backend (ya ocurre hoy), y el propio dispositivo del monitor la "descubre" en cuanto recupera conectividad — vía reconexión de WebSocket (que ya re-sincroniza notificaciones) o un endpoint de polling/pull al reconectar, reutilizando `ConnectivityService`/`AutoSyncService` que ya existen en `zarza_ai`.

- **No requiere protocolo nuevo ni infraestructura nueva:** el backend ya guarda la solicitud y ya la notifica por WebSocket/FCM; lo que falta es garantizar que, al reconectar, la app haga un pull explícito de "solicitudes pendientes no vistas" en vez de depender solo de que el push haya llegado (FCM puede perderse o llegar tarde incluso con conexión intermitente).
- **Esfuerzo bajo:** un endpoint `GET /solicitudes?estado=pendiente&noVistas=true` (o reutilizar el existente con un flag), y en Flutter enganchar ese pull al mismo listener de `onConnectivityChanged` que ya dispara `AutoSyncService`.
- **Limitación:** no resuelve el objetivo original de "entrega mientras está sin señal" — el monitor sigue sin enterarse hasta que recupera conexión y la app hace el pull. Es exactamente el statu quo actual, solo que más confiable (no depende únicamente de que el push de FCM no se haya perdido).

**Viabilidad:** muy alta, es una extensión directa de un patrón ya probado en el repo. **Esfuerzo:** bajo.

## Comparación

| Opción | Resuelve "sin señal en el momento exacto" | Esfuerzo | Riesgos / limitaciones principales |
|---|---|---|---|
| 1. Relay BLE tipo Find My | Sí, en teoría — en la práctica, depende de que haya otros usuarios de la app cerca con la app abierta | Muy alto | Background BLE restringido por iOS/Android para apps de terceros; densidad de usuarios insuficiente; protocolo de cifrado y privacidad propio; permisos sensibles |
| 2. SMS de respaldo | Parcial — solo si hay señal celular sin datos | Bajo-medio | Costo por mensaje (~USD 0.15 en México con Twilio); no cubre zonas sin cobertura celular alguna; payload limitado |
| 3. Sync diferida al reconectar | No — mismo comportamiento actual, pero más confiable | Bajo | No resuelve el objetivo de "sin señal en el momento", solo mejora la confiabilidad de lo que ya hay |

## Recomendación

Ninguna opción por sí sola cumple el objetivo completo ("que llegue aunque no tenga internet en el momento, sin revisar la app activamente") sin asumir un costo de ingeniería desproporcionado para el tamaño actual del equipo de monitores.

Sugerencia de secuencia pragmática:

1. **Implementar la Opción 3 ya** (esfuerzo bajo, mejora real e inmediata sobre el statu quo, reutiliza infraestructura existente).
2. **Evaluar la Opción 2 como complemento** si, en la práctica, el equipo confirma que los monitores suelen tener señal celular (llamadas/SMS) sin datos móviles en las fincas — vale la pena una encuesta rápida al equipo de campo antes de invertir en la integración.
3. **Dejar la Opción 1 en el backlog de investigación**, no de implementación. Antes de retomarla, valdría la pena confirmar dos cosas con datos reales: (a) cuántos monitores/usuarios de la app suelen coincidir físicamente en una misma finca en un mismo día, y (b) si Android permite un foreground service de BLE lo suficientemente aceptable en batería como para que valga la pena — iOS seguirá siendo la limitación dura. Sin esos datos, el esfuerzo de diseñar un protocolo de relay propio no está justificado.

## Fuentes consultadas

- [Bluetooth Low Energy – background mode on iOS](https://wojciechkulik.pl/xamarin-ios/bluetooth-low-energy-background-mode-on-ios)
- [10 Reasons why BLE Mesh Has Struggled to Gain Traction — Argenox](https://argenox.com/blog/10-reasons-why-ble-mesh-has-struggled-to-gain-traction)
- [Android BLE Scanning in 2026: Why Your App Stops Finding Devices in the Background](https://bleadvertiserapp.medium.com/android-ble-scanning-in-2026-why-your-app-stops-finding-devices-in-the-background-and-how-to-fix-ba5ae06c17c3)
- [Background BLE scan in DOZE mode on Android devices](https://proandroiddev.com/background-ble-scan-in-doze-mode-on-android-devices-3c2ce1764570)
- [Find My security — Apple Support](https://support.apple.com/guide/security/find-my-security-sec6cbc80fd0/web)
- [Symbolic verification of Apple's Find My location-tracking protocol](https://arxiv.org/html/2510.14589v1)
- [SMS Pricing in Mexico for Text Messaging — Twilio](https://www.twilio.com/en-us/sms/pricing/mx)
- [Twilio SMS API cost: complete pricing breakdown for 2026](https://apidog.com/blog/twilio-sms-api-cost/)
