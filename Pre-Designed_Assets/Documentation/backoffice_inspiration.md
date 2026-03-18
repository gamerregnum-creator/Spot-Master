# Inspiración para Backoffices: Regna Revolution

Para que el ecosistema sea intuitivo y profesional, cada rol debe tener una "vista" que resuelva sus problemas específicos sin distracciones. Aquí tienes las consideraciones clave por perfil.

---

## 1. 🛡️ Admin Dashboard (El Puesto de Mando)
**Enfoque**: Salud del sistema, auditoría y control global.
- **KPIs Globales**: Ventas totales por segmento (Market vs Pickup), Crecimiento de usuarios y Consejeros.
- **Gestión de Entidades**: Lista de usuarios con capacidad de "Congelar" cuentas o cambiar roles manualmente.
- **Auditoría Financiera**: Vista directa del **Ledger Maestro**. Ver el balance de los Pools (Promos/Pool) y los ingresos de la Empresa.
- **Moderación de Negocios**: Aprobación de nuevas tiendas y validación de licencias manuales si falla el automático.

**Tip de Diseño**: Usa un "Command Center" con gráficos minimalistas y alertas rojas solo para fallos críticos (ej. balance inconsistente).

---

## 2. 👨‍🍳 Business Panel (El Motor de Operaciones)
**Enfoque**: Velocidad, gestión de inventario y finanzas propias.
- **KDS Board (Pickup)**: Vista optimizada para cocina con el motor de bacheo (lo que ya tenemos).
- **Control de Licencia**: Contador de días restantes y botón de renovación rápida.
- **Finanzas del Negocio**: Visualización del balance `EARNINGS` y botón de retiro.
- **Editor de Catálogo**: Carga rápida de ítems con toggle para "Agotado" y configuración de Bacheo.

**Tip de Diseño**: El color del estado de la orden es el rey. Usa colores vivos que faciliten la lectura a distancia en una cocina.

---

## 3. 💼 Counselor Portal (La Red de Vendedores)
**Enfoque**: Comisiones, metas y crecimiento de red.
- **Goal Tracker**: Gráfico circular con el "Target 20" (Licencias vendidas vs Meta para bonos).
- **Feed de Comisiones**: Notificaciones en vivo: "Has ganado $X por la compra de Y en el negocio Z".
- **Internal Spending Tracker**: Visualización del 20% bloqueado y lista de comercios donde puede gastarlo.
- **Mi Red**: Árbol de negocios afiliados y estado de sus licencias.

**Tip de Diseño**: Gamificación. Haz que se sienta como un juego donde subir de nivel depende del volumen de ventas.

---

## 4. 📱 Customer App (La Experiencia del Comprador)
**Enfoque**: Facilidad de compra, seguimiento y fidelización.
- **Tracker en vivo**: ¿En qué paso está mi pedido? (Aceptado -> En Cocina -> Listo).
- **Billetera Digital**: Saldo de `CASHBACK` destacada como "Dinero Gratis" para incentivar el gasto.
- **Referidos**: Copia rápida del enlace de invitación y contador de amigos que han comprado.
- **Raffles & Ads**: Botón para canjear cupones y participar en sorteos activos.

**Tip de Diseño**: Enfoque "Mobile-First". Botones grandes, gestos táctiles y una navegación fluida entre segmentos.

---

## 🗺️ Hoja de Búsqueda para Inspiración Visual
Si quieres buscar ejemplos de interfaces reales en Google o Pinterest, usa estos términos:
1. **Admin**: *"Fintech Dashboard UI Admin template"* o *"SaaS multi-tenant admin panel"*.
2. **Business**: *"Restaurant POS KDS dashboard UI"* o *"Shopify Vendor Panel UX"*.
3. **Counselor**: *"Affiliate Marketing Dashboard Analytics"* o *"Sales Representative CRM UI Layout"*.
4. **Customer**: *"Modern Super App Mobile UI design"* o *"Digital Wallet App UX/UI inspiration"*.

> [!IMPORTANT]
> Al construir sobre el **Shared Core**, todas estas interfaces beberán de la misma fuente de datos. Esto garantiza que si un Admin congela un Negocio, el Cliente lo verá cerrado al instante en su app.
