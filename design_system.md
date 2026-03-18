# Design System: Regna Revolution

## Color Palette (Premium Cyberpunk)
- **Background Deep**: `#030b16`
- **Surface (Card)**: `#071428`
- **Accent Cyan**: `#00d4ff` (Primary Glow)
- **Accent Pink**: `#ff2d78` (Secondary Action)
- **Accent Purple**: `#7b2fff` (Transitions)
- **Accent Gold**: `#ffc907` (Investor/VIP)
- **Success Green**: `#00e676`

## Typography
- **Headings**: `Orbitron`, sans-serif (Weights: 700, 900)
- **Body**: `Saira`, sans-serif (Weights: 400, 500, 600)
- **Monospace**: `JetBrains Mono`

## UI Components
- **Glassmorphism**: `background: rgba(7, 20, 40, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(0, 212, 255, 0.15);`
- **Glow Effects**: `box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);`

## Animation Strategy
1.  **Scroll-Driven Video**: Use `scroll-stop-builder` technique for the Hero deconstruction.
2.  **Parallax Particles**: Background starfield using canvas.
3.  **Micro-interactions**: Scale `1.05` on hover for buttons, eased transitions (300ms cubic-bezier).
4.  **Snap-Scroll**: Sticky sections for feature explainers.
