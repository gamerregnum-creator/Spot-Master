# MEMORIA DEL PROYECTO: Regna Revolution

Este documento contiene las reglas fundamentales e inmutables del protocolo. Estas reglas deben ser seguidas por todos los agentes y desarrolladores bajo cualquier circunstancia.

## Reglas de Gobernanza y Distribución de Fondos

> [!IMPORTANT]
> **INMUTABILIDAD DEL CORE DE DISTRIBUCIÓN Y UNIDADES VIP**
> El proceso de distribución y el cálculo de unidades VIP son sagrados y no pueden modificarse.

1.  **Flujo Intocable**: El flujo de 4 fases (Generación -> Distribución Inicial -> Consolidación del Staking Pool -> Asignación Final) es el **Core Inmutable** del protocolo.
2.  **Cálculo VIP Inmutable**: Las unidades VIP se calculan **individualmente por holder**, redondeando siempre **hacia abajo** (Floor).
    - **Fórmula**: `Tokens_en_Staking / 100` (Redondeo al entero inferior).
    - **Alcance**: Solo aplican los tokens en **circulación pública** (Máximo 15,000 tokens / 150 unidades). Los tokens de empresa/sistema NO generan unidades VIP.
3.  **Activación de Ciclo**: En cada activación de ciclo trimestral, se debe realizar un conteo inmediato de las unidades activas. Los incrementos por ventas en el juego deben reflejarse al instante en la wallet VIP.
4.  **Modificaciones Permitidas**: Solo se permite modificar el contrato inteligente para reajustar los **porcentajes** específicos dentro de esta estructura fija.
5.  **Excepción Crítica**: El core jamás se podrá cambiar a menos que exista una instrucción explícita que ordene cambiar el **Flujo del Protocolo y el Schema Técnico**.
4.  **Referencia Técnica**: Cualquier agente debe consultar siempre el [protocol_logic_schema.md](file:///c:/Users/Megav/.gemini/antigravity/brain/23bbb149-53fa-4711-9af8-a908cffbcaa3/protocol_logic_schema.md) como la única fuente de verdad lógica.

## Flujo Completo del Dinero (Money Flow)

### Conceptos Clave
- **SECTOR (antes "Commerce")**: Área Comercial del ecosistema Regna Global (turismo, alimentación, tecnología, moda, etc.)
- **STORE**: Negocio individual asociado a un Sector
- **Bridge**: Contrato que recibe ganancias de cada core comercial y las redistribuye (75% staking, 25% promociones)
- **Revenue Router**: Contrato que distribuye ingresos directos en 7 destinos configurables

### Token Supply (50,000 tokens fijos)
| Wallet | Tokens | % | Tipo |
|--------|--------|---|------|
| Empresa | 20,000 | 40% | Sistema (perma-staked) |
| Donaciones | 5,000 | 10% | Sistema (perma-staked) |
| Desarrollo | 5,000 | 10% | Sistema (perma-staked) |
| Reinversión | 5,000 | 10% | Sistema (perma-staked) |
| **Circulación Pública** | **15,000** | **30%** | Holders humanos |

### FUENTE 1: Ventas Directas STORE (Revenue Router Mode 0)
Cada venta en Spot Master se distribuye en 7 destinos (on-chain, configurable, debe sumar 10000 bps):
- 10% → Referral Vault (recompensas a sponsors)
- 20% → Torneo Wallet (premios de ranking)
- 5% → VIP Pool Vault (dividendos mensuales VIP)
- 5% → National Pool
- 30% → Staking Vault (dividendos trimestrales)
- 20% → Ops Wallet (operaciones)
- 10% → Fondo Promoción Jugadores

### FUENTE 2: Comisiones de Stores Afiliados (vía Licencia)
Un Store se asocia al ecosistema mediante una **licencia anual** (COUPON_ONLY / MARKETPLACE_ONLY / BOTH_ADS).
Al activarse, acuerda un **% de comisión entre 5% y 20%** por cada venta procesada en la plataforma.
El Store conserva el resto (100% - comisión%) ya que es su servicio vendido.
> Endpoint: `POST /api/v1/revenue/distribute/:business_id` con body `{ "sale_total": <monto> }`
```
Venta de $200, comisión 10% → $20 procesados / $180 quedan con el Store
│
Los $20 se dividen en 5 partes iguales ($4 c/u):
├── 1/5 → CASHBACK (cliente que compró)
├── 1/5 → MERCHANT_REFERRER (quien referenció al comercio)
├── 1/5 → CUSTOMER_SPONSOR (sponsor del cliente)
├── 1/5 → CLIENT_POOL (fondo promociones)
└── 1/5 → COMPANY SHARE
           ├── 50% → ECOSYSTEM_RESERVED (backend)
           └── 50% → Bridge → Router Mode 1 (SECTOR)
                               ├── 75% → Staking Vault
                               └── 25% → Promoción Jugadores
```

### FUENTE 3: Licencias y Servicios
> **Regla Fija**: Siempre 50/50. El Store es un comercio independiente — no accedemos a sus ganancias.
> Cada Sector tiene sus propios gastos, por lo que el 50% queda reservado en backend.
```
Total - ConsultantCut - PoolCut = Net Profit
├── Consultant Cut         → CONSULTANT_CUT (ledger)
├── Pool Cut               → CLIENT_POOL_CUT (ledger)
└── Net Profit (siempre):
    ├── 50% → ECOSYSTEM_RESERVED (cubre gastos del Sector)
    └── 50% → Bridge → Router Mode 1 (SECTOR)
                        ├── 75% → Staking Vault
                        └── 25% → Promoción Jugadores
```

### FUENTE 4: Bridge (Ingresos de Cores Comerciales)
El contrato Bridge recibe ganancias de cada Sector (área comercial core del sistema):
- **75% → Staking Vault** (alimenta el pool de dividendos trimestrales)
- **25% → Pool de Promociones para Jugadores**

### DESTINO: Staking Dividends (6 ciclos de 88 días)
```
Staking Vault (acumula de todas las fuentes)
│
├── 6 ciclos prefijados: Abr 2026 → Sep 2027
├── Holders stakean tokens ANTES del inicio del ciclo
├── Al finalizar: reward_per_token = total_USDC × 1,000,000 / total_tokens
│
├── HOLDERS PÚBLICOS: claim_dividends()
│   → Reciben USDC proporcional + tokens devueltos
│
└── EMPRESA (35,000 tokens perma-staked):
    distribute_company_dividends()
    ├── 4/7 (~57%) → Wallet Empresa (20k tokens)
    ├── 1/7 (~14%) → Wallet Donaciones (5k tokens)
    ├── 1/7 (~14%) → Wallet Reinversión (5k tokens)
    └── 1/7 (~14%) → Wallet Desarrollo (5k tokens)
```
> La proporción 4/7, 1/7, 1/7, 1/7 refleja exactamente la proporción de tokens de cada wallet del sistema.
> Visto desde fuera: 40% empresa, 10% donaciones, 10% desarrollo, 10% reinversión, 30% holders públicos.

### DESTINO: VIP Pool (Mensual)
- Solo holders de circulación pública (wallets de sistema EXCLUIDAS)
- **Fórmula VIP**: `unidades = floor(balance / vip_unit_size)` donde `vip_unit_size = 100`
- Max teórico: 15,000 / 100 = 150 unidades VIP
- `reward_per_unit = total_USDC × 1,000,000 / total_units`
- Pull pattern: holder reclama con `claim_vip_reward()`

### DESTINO: Referral System
- Admin registra relación sponsor↔player on-chain
- Cuando player compra → `credit_reward()` acredita % al sponsor
- Pull pattern: sponsor reclama con `claim_reward()`

### DESTINO: Unity Pool (Rush Hour por Store)
El merchant activa un Rush Hour poniendo una comisión elevada. El sistema calcula la diferencia
con la comisión base y la divide en dos partes iguales: descuento al cliente y contribución al pool.

**Fórmula por venta (precio original $200, base 5%, rush 20%):**
```
Diferencia        = rush_hour_commission_pct - base_commission_pct = 20% - 5% = 15%
Descuento cliente = 15% / 2 = 7.5% de $200 = $15.00  (aplicado al artículo en la orden)
Contribución pool = 15% / 2 = 7.5% de $200 = $15.00  (acumulado en unity_pool)
Precio que paga el cliente = $200 - $15 = $185.00
Comisión base (5-partes) sigue igual sobre precio original = $10.00
Merchant neta = $185 - $10 - $15 = $160.00
```

**Reglas:**
- `target_participants`: mínimo 100, máximo 500
- Al llegar al target → Rush Hour cierra automáticamente → status = `WINNER`
- El descuento aplica SOLO mientras haya cupos abiertos (status = `LIVE`)
- Al cerrar → precios y comisiones vuelven a los valores originales
- `PickWinner()` → 1 ganador aleatorio recibe todo el `accumulated_amount`
- Después de la rifa → status = `EXPIRED`
- `allow_multi_entry`: define si el mismo cliente puede participar más de una vez
- Tablas DB: `unity_pools`, `unity_pool_participants` (en `03_core_business.sql`)
- Endpoint: `POST /api/v1/revenue/distribute/:id` body: `{sale_total, user_id, order_id}`

### Seguridad: Patrón Admin/Guardian (Todos los Contratos)
- **2 Admins**: Operaciones normales, multisig para cambios críticos
- **1 Guardian**: Llave maestra de emergencia (Ledger/Squads)
  - Pausa instantánea sin multisig
  - Cancelación de propuestas sin timelock
  - Reemplazo de admins sin timelock
  - Guardian nunca puede ser admin
- **Timelock 24h**: Cambios de porcentajes, wallets, y transferencia de admin

---
*Última actualización: 24 de marzo de 2026*
