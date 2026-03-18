# MASTER PROMPT: REGNA REVOLUTION / SPOT MASTER

> [!IMPORTANT]
> Lee este documento completo antes de iniciar cualquier tarea. Este es el punto de partida oficial para la implementación desde cero.

## 1. Misión del Proyecto
Construir un ecosistema de juego híbrido (físico/digital) con economía basada en Solana (USDC/SMDT), Backend en Go Fiber y una interfaz Web Premium con estética Cyberpunk/Glassmorphism.

## 2. Configuración del Entorno (Contexto Agente)
- **Instrucciones Canónicas**: Consultar el archivo [AGENTS.md](file:///c:/Users/Megav/Agentes/Spot-Master/AGENTS.md) para reglas de arquitectura, comandos de desarrollo y flujos de trabajo.
- **Sistema de Diseño**: Consultar [design_system.md](file:///c:/Users/Megav/Agentes/Spot-Master/design_system.md) para tokens de diseño, colores cyberpunk (`#030b16`, `#00d4ff`, `#ff2d78`) y guías de animación.
- **Orquestación**: Usar el [docker-compose.yml](file:///c:/Users/Megav/Agentes/Spot-Master/docker-compose.yml) para levantar la infraestructura (Backend, Frontend, DB Supabase).

## 3. Arquitectura del Ecosistema
| Usuario | Plataforma | Tecnología | Estética |
| :--- | :--- | :--- | :--- |
| **Inversionistas** | Investor Portal | Next.js + Solana SDK | Premium Gold |
| **Vendedores/Asesores** | Merchant Backoffice | Directus (CMS) | Professional Clean |
| **Jugadores/Clientes** | Core App / Marketplace | Next.js + Framer Motion | Cyberpunk Pink/Cyan |

## 4. Skills Especializadas (Locales)
Para implementar las funciones premium, utiliza las skills en la carpeta `.agents/skills/`:
- **[3D Generator](file:///c:/Users/Megav/Agentes/Spot-Master/.agents/skills/3d_generator/SKILL.md)**: Generación de prompts para vistas explotadas y assets visuales.
- **[Scroll-Stop](file:///c:/Users/Megav/Agentes/Spot-Master/.agents/skills/scroll_stop/SKILL.md)**: Implementación de la landing page con video controlado por scroll (Apple style).

## 5. Material Pre-Diseñado (Existente)
Contamos con assets ya avanzados de la fase previa en la carpeta `Pre-Designed_Assets/`:
- **Código y Snippets**: `Pre-Designed_Assets/Code_Snippets/` (Lógica de backend y utilidades).
- **Base de Datos**: `Pre-Designed_Assets/Database/` (Esquemas y estructuras).
- **Documentación**: `Pre-Designed_Assets/Documentation/` (Reglas y guías previas).

## 6. Conocimiento Externo y Biblioteca
- **Biblioteca Principal**: Ubicada en `c:/tmp/analisis_skills/biblioteca/BIBLIOTECA-Principal`. Contiene más de 1000 skills y estructuras de prompts.
- **Uso**: Si necesitas implementar una función nueva (ej. Auth, Pagos, Web3), busca primero en la biblioteca antes de crear desde cero.

## 6. Primeros Pasos para el Agente
1. Verificar que el entorno Docker esté arriba con `docker-compose up -d`.
2. Sincronizar la base de datos usando el workflow `smart-reset`.
3. Implementar la Landing Page siguiendo la skill de `scroll_stop`.
4. Integrar el código existente de `Pre-Designed_Assets/Code_Snippets` en la nueva estructura modular.
5. Configurar el Backend en Go utilizando los esquemas de base de datos en `Pre-Designed_Assets/Database`.

---
**Puntos Críticos de Referencia**:
- Biblioteca: `c:/tmp/analisis_skills/biblioteca/BIBLIOTECA-Principal`
- AGENTS.md: [Configuración Técnica](file:///c:/Users/Megav/Agentes/Spot-Master/AGENTS.md)
- Design System: [Guía Visual](file:///c:/Users/Megav/Agentes/Spot-Master/design_system.md)
