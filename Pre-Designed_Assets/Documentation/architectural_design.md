# Arquitectura Unificada: Marketplace & Pickup Ecosystem

Este documento define el esquema modular necesario para integrar las funcionalidades de la "Pickup App" actual con el nuevo "Marketplace" del PRD, permitiendo aplicaciones espejo con base de datos compartida.

## 1. Inventario de Módulos Maestros (The Blueprint)

Para unificar ambos ecosistemas de forma escalable y blindada, el proyecto se divide en estos **8 bloques fundamentales**:

1.  **Módulo de Identidad & ACL**: Maneja los roles jerárquicos (Customer, Business, Counselor, Admin) y sus permisos globales.
2.  **Motor Financiero (Ledger)**: El cerebro contable central. Ejecuta la lógica 95/5 y gestiona carteras múltiples (`EARNINGS`, `INTERNAL`, `CASHBACK`) de forma atómica.
3.  **Sistema de Licenciamiento**: Controla el acceso de negocios basado en suscripciones anuales compradas vía consejeros.
4.  **Motor de Ventas & Cupones**: Capa de pedidos unificada. Procesa desde una hamburguesa (Pickup) hasta un cupón digital (Marketplace).
5.  **Marketing & Geo-Localization Engine**: Segmentación por radio geográfico e intereses para Ads, Banners y Sorteos (Raffles).
6.  **Red de Referidos & Metas**: Seguimiento de la jerarquía de consejeros y validación de bonos por cumplimiento (ej. 20 licencias/mes).
7.  **Logística de Cocina (KDS)**: Módulo operativo de alimentos, alimentado por el Motor de Ventas pero optimizado para agilidad de despacho.
8.  **Auditoría & Compliance**: Auditoría de logs inmutables, procesos de KYC y motor de detección de fraude.

---

## 2. Comparativa de Módulos y Gaps

| Módulo | Estado en Pickup App | Requerimiento Marketplace (PRD) | Gap / Modificación Necesaria |
| :--- | :--- | :--- | :--- |
| **Identidad** | Simple (Dueño/Cliente) | Jerarquía Completa | Mover a sistema de Roles polimórficos. |
| **Wallets** | Balance Único | Multicartera (Cashback/Internal) | Cambiar balance plano por cuentas vinculadas. |
| **Licencias** | No existe | Suscripciones Anuales | **Añadir**: Control de acceso por vigencia. |
| **Referidos** | Directo | Escala de Consejeros | **Blindar**: Comisiones condicionadas a metas. |
| **Ads/Geo** | No existe | Segmentación de Mapa | **Añadir**: Coordenadas e intereses del cliente. |

---

## 3. Propuesta de Arquitectura "Shared Core"

El blindaje se logra moviendo la lógica crítica a un **Núcleo Compartido** accesible por cualquier "app espejo":

### A. Capa de Datos Blindada
- **Finanzas**: Ninguna app edita balances directamente. Solo envían una `TransactionIntention` y el Núcleo ejecuta la doble entrada (ej: Venta -> +95% Business / +1% Fee Company / +1% Cashback).

### B. Módulos de Aplicación (Agilidad vs. Funcionalidad)
Las apps se consumen como plugins del núcleo:
- **Pickup App**: Versión ágil enfocada en despacho rápido (KDS).
- **Marketplace App**: Versión comercial enfocada en exploración y cupones.
- **Counselor App (Espejo)**: Interfaz ligera para que el consejero venda licencias y vea su crédito acumulado.

## 4. Evolución y Compartición de Funciones (Plug-and-Play)

La mayor ventaja de esta arquitectura es que los módulos funcionan como servicios independientes:

- **Módulos Transversales**: Si el día de mañana quieres que **Pickup** tenga **Ads**, simplemente habilitas el "conector" de Ads en la Pickup App. Como el Motor de Ads vive en el Core, no tienes que programarlo de nuevo; la lógica de impresiones y pagos ya es compatible.
- **Nuevas Áreas Comerciales**: Si decides añadir un segmento de "Servicios de Limpieza" (por ejemplo), creas un nuevo módulo funcional. Este nuevo módulo usará el mismo **Shared Core** para cobrar el 5% y manejar los saldos, sin que el Pickup o el Marketplace siquiera se enteren de su existencia.
- **Blindaje Total**: Cada módulo "pregunta" al Core antes de actuar. Esto evita que un error en el Marketplace pueda corromper los datos de la Pickup App.

---

## 5. Estrategia de Escalamiento

1.  **Micro-vistas**: Crear componentes UI que solo se cargan si el usuario tiene el rol adecuado.
2.  **Middlewares de Regla**: Un "Guardian" central que verifica licencias y metas antes de permitir operaciones comerciales.
3.  **Base de Datos Única**: Todas las apps apuntan al mismo Supabase, manteniendo los saldos sincronizados en tiempo real.
