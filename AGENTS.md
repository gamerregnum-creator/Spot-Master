# AGENTS.md

## Resumen del Proyecto
- **Nombre**: Regna Revolution
- **Objetivo**: Sistema de Smart Contracts Solana y Backend Go con UI Premium.
- **Stack**: Go (Fiber), Postgres (Supabase), Solana (Anchor/Rust), Next.js (Frontend), Docker (Orquestación).

## Comandos de Desarrollo
- **Levantar Entorno**: `docker-compose up -d`
- **Reset Base de Datos**: `workflow: smart-reset`
- **Generar Assets 3D**: `skill: 3d_asset_generator`

## Reglas de Arquitectura
1.  **Backend**: Seguir patrón modular (`cmd/`, `internal/`, `pkg/`) en Go Fiber.
2.  **Frontend**: Usar componentes de `design_system.md`. Priorizar animaciones scroll-driven con Framer Motion o Scroll-Stop Canvas.
3.  **UI/UX**: Estética Cyberpunk/Premium. Colores base: `#030b16` (Deep), `#00d4ff` (Cyan), `#ff2d78` (Pink).
4.  **Seguridad**: Validar siempre con `SecurityAuditor` antes de desplegar contratos Solana.

## Patrones Web (Basados en Web Finales)
- **Landing**: Header translúcido (20px blur), Hero con gradientes Pink-Purple, Secciones con Snap-Scroll.
- **Interacción**: Micro-animaciones en botones, efectos de brillo (glow) en tarjetas glassmorphism.
- **Contenido**: Adaptar el portal de inversores y landing de Spot-Master a "Regna Revolution".

## Flujo de Trabajo (Workflows)
- Todos los cambios deben ser validados mediante el plan de verificación en `implementation_plan.md`.
- Usar sub-agentes para tareas pesadas de investigación.

## Referencias
- Biblioteca de Skills: `C:\tmp\analisis_skills\biblioteca`
- Manual de Estilo: `design_system.md`
