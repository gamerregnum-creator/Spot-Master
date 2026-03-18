# Estrategia de Limpieza: Smart Reset (Fase 1)

Para comenzar la Fase 1 con el pie derecho, realizaremos un **Smart Reset**. No borraremos todo, sino que "limpiamos el escenario" para las nuevas reglas de negocio.

## ✅ Lo que se SALVA (The Assets)
- **`auth.users`**: No queremos que nadie tenga que registrarse de nuevo.
- **`restaurants`**: Los perfiles de negocio ya creados.
- **`menu_items` & `categories`**: Tu catálogo de productos (Hamburguesas, Yaroas, etc.) se preserva para no tener que cargarlo de nuevo.
- **`referrals`**: La estructura de quién invitó a quién (aunque la lógica de comisiones cambie, la relación es valiosa).

## 🧹 Lo que se LIMPIA (The Operational Data)
- **`transactions`**: **BORRADO TOTAL**. El nuevo sistema de multi-carteras (`EARNINGS`, `CASHBACK`, `INTERNAL`) es incompatible con el registro actual.
- **`orders` & `order_items`**: **BORRADO TOTAL**. Para que el KDS y el Ledger nazcan sincronizados con el nuevo núcleo.
- **Balances de Usuario**: Se resetearán a $0.00 para migrar a la nueva estructura de wallets polimórficas.

---

## 🛠️ Proceso de Transición (Migration Path)

1.  **Backup de Catálogo**: Exportaremos los menús actuales para asegurar que nada se pierda.
2.  **Migración de Esquema**:
    - Añadiremos los campos de **Rol** a los perfiles de usuario.
    - Crearemos la tabla de **Wallets** (las sub-carteras).
3.  **Wipe Operativo**: Ejecución de un Script SQL que limpie órdenes y transacciones viejas.
4.  **Inyección de Licencias**: Asignaremos licencias "Alpha" a los negocios actuales para que sigan operando mientras implementamos el Marketplace.

---

## 🚀 Beneficio de esta Estrategia
Al hacer este **Smart Reset**, obtienes la limpieza de un proyecto nuevo pero con la ventaja de tener ya tu menú y tus usuarios cargados. Es el equilibrio perfecto entre agilidad y seguridad.

> [!IMPORTANT]
> Al limpiar las transacciones ahora, eliminamos cualquier posibilidad de que arrastremos errores de cálculo del pasado al nuevo sistema blindado.
