# MASTER IMPLEMENTATION PROMPT: Marketplace & Pickup Modular Ecosystem

## 🎯 Objetivo General
Construir una plataforma de aplicaciones espejo (Pickup App, Marketplace, Counselor Panel) fundamentada en un **Shared Core (Núcleo Compartido)** blindado. El sistema debe gestionar identidades jerárquicas, un ledger financiero inmutable de doble entrada y módulos comerciales independientes (LEGO architecture) que puedan compartirse o aislarse según el segmento de negocio.

---

## 🛠️ Fase 1: El Shared Core (Fundamento y Blindaje)

### 1.1 Identidad & Perfiles Polimórficos
- **Implementación**: Crear una tabla `user_profiles` que actúe como un ACL (Access Control List).
- **Roles**: `Customer`, `Business`, `Counselor`, `Admin`.
- **Mejora sugerida**: Implementar "Multi-persona". Un mismo usuario puede ser `Customer` y `Counselor` simultáneamente, compartiendo el Auth pero con balances separados.

### 1.2 Ledger Financiero Maestro (95/5 Logic)
- **Implementación**: Sistema de **Múltiples Wallets** por usuario:
  - `EARNINGS` (Cash out permitido).
  - `INTERNAL_CREDIT` (20% bloqueado para reinversión - Counselors).
  - `CASHBACK` (Acumulado de compras).
  - `GLOBAL_POOL` (Admin, Raffles).
- **Atmosicidad**: Todas las ventas deben pasar por un **Server Action transaccional** (Postgres Transaction) que ejecute el split: 95% Negocio / 1% Cashback / 1% Consejero Negocio / 1% Patrocinador Cliente / 1% Pool / 1% Company.

---

## 🍳 Fase 2: Módulos de Aplicación (Segmentación Agresiva)

### 2.1 Módulo Pickup App (Operativo)
- **KDS Batching Inteligente**: Lotes de producción secuenciales (Ej: Capacidad 20. Si hay 25, son 2 ciclos de tiempo).
- **Batching Buffering**: Botón "BUFF" que selecciona órdenes hasta llenar la capacidad del lote.
- **Mejora sugerida**: Arquitectura **Event-Driven**. Cada cambio en el KDS dispara una notificación via WebSockets/Supabase Realtime para actualizar el mapa de cliente sin consultas repetitivas.

### 2.2 Módulo Marketplace (Comercial)
- **Logica de Cupones/Licencias**: Implementar las 3 licencias anuales (`Coupon`, `Marketplace`, `Both+Ads`).
- **Control de Acceso**: Middleware que bloquea funciones de venta si la licencia anual (via Counselor) ha expirado.
- **Mejora sugerida**: Implementar **Headless CMS para Ads**. Permitir que los negocios suban sus banners y el Core gestione las reglas de visualización (1 ad/hora por cliente).

---

## 🚀 Fase 3: Ecosistema de Crecimiento & Red

### 3.1 Red de Consejeros (Counselor Network)
- **Jerarquía**: Un solo nivel de patrocinio entre consejeros.
- **Regla del 5% de Referido**: Los bonos solo se liberan si el consejero patrocinado logra el "Target 20" (ventas de licencias en el mes).
- **Internal Spending Credit**: Bloqueo automático del 20% de ganancias del consejero.

### 3.2 Motor de Marketing & Raffles
- **Geo-Targeting**: Segmentación por radio (ej. 30km) e intereses del cliente para Ads y Emails.
- **Sistema de Raffles**: Los primeros X clientes que compren/canjeen entran en el sorteo. El premio se calcula dinámicamente: `% del pool + % de ventas cualificadas`.

---

## ✨ Mejoras y Adiciones Sugeridas (The "Pro" Layer)

1.  **State Machines para Órdenes**: Definir estados de órden (`PENDING` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `DELIVERED`) mediante una máquina de estados para evitar transiciones ilegales.
2.  **Observabilidad Financiera**: Dashboard de Admin para auditoría en tiempo real de los Pools. Cada centavo debe estar justificado en la tabla de transacciones.
3.  **UI Kit Global (Theming)**: Crear un sistema de diseño con Tailwind para que todas las "apps espejo" compartan la misma estética premium (glassmorphism, micro-animaciones, modos oscuros profundos).
4.  **Sincronización de Balances via Triggers**: Usar disparadores de base de datos para que los balances se recalculen solo cuando hay una nueva entrada en el ledger, garantizando seguridad del 100%.

---

## 📝 Instrucciones de Ejecución
- **Stack**: Next.js 15+ (App Router), Supabase (Auth, DB, Realtime, Functions), Tailwind CSS, Lucide React, Shadcn UI.
- **Regla de Oro**: "Ninguna lógica de negocio vive en la aplicación; todo vive en el **Core**". La aplicación es solo una ventana.
