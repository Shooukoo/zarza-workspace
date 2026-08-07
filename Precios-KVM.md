# RUBUS AI — Análisis de infraestructura para producción y presupuesto anual

**Documento ejecutivo para revisión y aprobación de gasto**

**Fecha**: Julio 2026  
**Proyecto**: Rubus AI — Plataforma de análisis fenológico de zarzamora con visión computacional    
**Horizonte**: 1 año de operación (después presupuestar renovaciones)


## 1. Arquitectura de 4 VPS 


- **4 VPS** preserva los beneficios de microservicios donde importan: aislamiento del motor de IA, separación de la capa de datos, y una capa edge pública segura, **sin pagar la complejidad operativa** (monitoreo, patches, backups, red privada) de 8 servidores donde solo 4 tienen justificación operativa hoy.

| # | Nombre | Contiene | Justificación | 
|---|---|---|---|
| 1 | **Edge / Gateway** | Reverse proxy (nginx) + TLS (Let's Encrypt) + zarza-web estática (React build) | Única capa que toca internet público; centraliza HTTPS, routing y sirve el frontend. Aislada de la lógica de negocio. |
| 2 | **App / Lógica** | fruit-backend (API REST + WebSocket) + fruit-ms (consumidor RabbitMQ) | Ambos servicios Node sin estado, mismo ciclo de release, mismo stack, livianos (~200-300MB RAM combinados). Fallos no se propagan a datos ni IA. |
| 3 | **Inferencia / IA** | fruit-inference (FastAPI + YOLOv8 en PyTorch) | Perfil de recursos radicalmente distinto: 1.5-3GB RAM (modelo cargado) + CPU alto en picos. Aislarlo evita degradar API/BD. **Candidato #1 para escalar si la demanda crece.** |
| 4 | **Datos / Persistencia** | PostgreSQL + RabbitMQ + Redis | Capa con estado crítico. Backups programados, acceso solo desde red privada, políticas de seguridad más estrictas. Nunca expuesta a internet. |

---

## 2. Especificación de recursos y precios por VPS (anual, 1 año)

Basado en análisis de dependencias, tamaño de código compilado y requisitos de PyTorch/Ultralytics.

**Precios Hostinger (plan anual, sin descuentos de 24 meses):**

| VPS | Plan | CPU | RAM | SSD | Precio anual (12 meses) | Justificación |
|---|---|---|---|---|---|---|
| 1. Edge | KVM 1 | 1 vCPU | 4 GB | 50 GB | **$1,391.88 MXN** | nginx + React ~1.8MB son mínimos. 4GB alcanza sobrado. |
| 2. App | KVM 2 | 2 vCPU | 8 GB | 100 GB | **2,111.88 MXN** | fruit-backend + fruit-ms ~300-450MB. 2 vCPU para I/O concurrente. |
| 3. Inferencia | KVM 4 | 4 vCPU | 16 GB | 200 GB | **$2,951.88 MXN** | PyTorch + YOLOv8 (~2.5-3GB). 4 vCPU para CPU-bound inference. **Cuello de botella.** |
| 4. Datos | KVM 4 | 4 vCPU | 16 GB | 200 GB | **2,951.88 MXN** | Postgres + RabbitMQ + Redis. 16GB para caché + queries concurrentes. |
| **SUBTOTAL VPS (anual)** | — | — | — | — | **$9,408 MXN** | |
| **Dominio (.mx)** | — | — | — | — | — | **$99.99 primer año MXN (Después $817)** | Estimado; varía por proveedor |
| **TOTAL INFRAESTRUCTURA (anual)** | — | — | — | — | — | **$11,142 MXN** | Equivale a $929 MXN/mes |


---

## 3. Costos de despliegue en Google Play Store

Para llevar la app móvil a producción, se requiere presencia en [Google Play Store](https://play.google.com/console).

| Concepto | Costo | Notas |
|---|---|---|
| **Registro de cuenta de desarrollador (one-time)** | **$437.50 MXN** | Pago único, válido de por vida. Se realiza en Google Play Console. |
| **Costo de publicación / actualización** | $0 | Google Play no cobra por publicar o actualizar apps gratuitas. |
| **Total Play Store año 1** | **$437.50 MXN** | Solo el registro.|

**Alternativa: distribuir también en App Store (Apple)**  
Si el cliente también quiere alcance en iOS:
- Registro de desarrollador Apple: $99 USD/año = **$1,732.50 MXN/año**
- Total App Store + Play Store: **$2,170 MXN/año** 

---

