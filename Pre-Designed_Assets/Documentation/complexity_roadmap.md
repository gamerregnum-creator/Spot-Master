# Reporte de Complejidad: Modularización e Independencia de Segmentos

Para lograr que **Pickup** y **Marketplace** funcionen como sistemas independientes (sin "atarse" entre sí) pero compartiendo la base de usuarios y saldos, la estrategia óptima es un **Desacoplamiento en 3 Fases**.

## 📊 Evaluación de Complejidad

| Fase de Trabajo | Complejidad | Tiempo (Velocidad Agencial) | Impacto en Escalabilidad |
| :--- | :---: | :---: | :--- |
| **1. Extracción del Shared Core** | **Media (5/10)** | **4-8 Horas** | **Crítico**: Blindaje del cerebro financiero. |
| **2. Modularización de Vistas** | **Baja (2/10)** | **2-4 Horas** | **Alto**: Habilitación de "Mirror Apps". |
| **3. Módulos Nuevos (Ads, Licencias)**| **Media (6/10)** | **1-2 Días** | **Variable**: Lógica de negocio del PRD. |

---

## 🗺️ Hoja de Ruta (LEGO Architecture)

### Paso 1: El "Shared Core" (El Cerebro)
En lugar de que cada app tenga su propia lógica de comisiones, creamos un módulo central blindado que se encarga de:
- **Roles Globales**: Unificar si eres Counselor o Business en una tabla maestra.
- **Ledger Universal**: Una sola lógica de transacción que ambas apps llaman por igual.
- **Acceso Blindado**: Si el Marketplace intenta tocar una función de Pickup, el Core lo bloquea.

### Paso 2: Separación de Segmentos (The Walls)
Para evitar la mezcla de segmentos empresariales indeseada:
- **Namespacing en Base de Datos**: Las tablas de Pickup se agrupan (ej. `pickup_orders`) y las de Marketplace en otro grupo (ej. `market_items`).
- **Independencia en Vistas**: El Marketplace ni siquiera sabe que existe el KDS. La Pickup App ni siquiera sabe que hay Ads.

### Paso 3: Aplicaciones Espejo ( independientes)
Podemos estructurar el proyecto de dos formas:
1.  **Folders**: Mismo dominio, rutas `/pickup` y `/market`. (Más ágil).
2.  **Subdominios**: `pickup.tuapp.com` y `market.tuapp.com`. (Máximo aislamiento).

---

## 🛡️ Blindaje y Mantenimiento

**¿Qué pasa si el proyecto escala?**
Al tener el motor financiero en el **Core**, si mañana decides cambiar la comisión del 5% al 6%, solo cambias **UNA LÍNEA** de código en el Core y se actualiza instantáneamente en el Pickup, el Marketplace y cualquier app futura.

**¿Es difícil?**
- **No es difícil**, es una cuestión de **orden**. 
- Lo que tenemos hoy en `pickup-app` es una base sólida, pero "ancha". El siguiente paso es "adelgazarla" moviendo lo inteligente a la carpeta de librerías compartidas.

> [!IMPORTANT]
> Esta arquitectura permite lo que pides: **Independencia total de segmentos**. Si un día decides vender la parte de Pickup, el Marketplace puede seguir funcionando sin tocar ni una línea de código adicional.
