# AI BioTech Master Build Dependency Graph

This graph is the Graph Mode contract. A downstream work package cannot be marked `PASS` while a required upstream node is `FAIL`, `BLOCKED`, `NOT TESTED` or `NEEDS OWNER`.

```mermaid
graph TD
  OWNERREQ[Approved owner requirements] --> OPS[OPS Safety + Baseline]
  OPS --> ENV[ENV Single staging contract]
  OPS --> REG[Requirements Registry + QAMap]
  REG --> ENV

  ENV --> SECBASE[Auth/RLS/Secrets baseline]
  ENV --> ARCH[Architecture cleanup]
  ARCH --> VIS[Single Product Visual Resolver]
  ARCH --> CAT[Catalog + Variant Integrity]

  VIS --> VIAL[Vial Master]
  VIS --> PEN[Pen Master]
  VIS --> CART[Cartridge Master]
  VIAL --> STO[Storefront]
  PEN --> STO
  CART --> STO
  CAT --> STO

  SECBASE --> AUTH[Registration/Login/Roles]
  AUTH --> ADM[Super Admin]
  AUTH --> MEM[Member Area]
  CAT --> ADM
  CAT --> MEM

  STO --> CARTFLOW[Exact Variant Cart]
  MEM --> WAL[Wallet Ledger]
  CARTFLOW --> CHECKOUT[Checkout]
  WAL --> CHECKOUT
  AUTH --> CHECKOUT

  CHECKOUT --> PAY[ToyyibPay Safe Payment]
  PAY --> ORD[Order]
  CAT --> ORD
  ORD --> INV[Invoice]
  ORD --> SHIP[EasyParcel Fulfilment]
  SHIP --> SPX[SPX Preference / Alternatives]
  SPX --> AWB[AWB + Waybill]
  AWB --> TRACK[Tracking + Member View]

  CAT --> RES[Research Catalog]
  RES --> RAG[RAGOps Grounding]
  RAG --> AI[Peptide Assistant + AI Center]
  AUTH --> AI

  ORD --> ENT[Protocol Entitlement]
  CAT --> ENT
  PAY --> ENT
  ENT --> PRO[Format-aware Protocol]
  PRO --> PDF[One-page PDF + Member Download]

  ADM --> SET[Store Settings + Maintenance]
  ADM --> LOG[Audit + System Logs]
  SET --> EMAIL[Email/Notifications]
  LOG --> REPORT[Reports + Exports]
  AUTH --> SECURITY[Full Security Gate]
  SECBASE --> SECURITY
  VIS --> SECURITY

  STO --> E2E[Browser E2E]
  ADM --> E2E
  MEM --> E2E
  INV --> E2E
  TRACK --> E2E
  PDF --> E2E
  AI --> E2E

  VIS --> VISREG[Visual Regression]
  STO --> VISREG
  ADM --> VISREG
  SECBASE --> INTQA[Supabase Integration QA]
  CAT --> INTQA
  PAY --> INTQA
  SHIP --> INTQA
  PRO --> INTQA

  REPORT --> FULLQA[Full Independent QA]
  SECURITY --> FULLQA
  E2E --> FULLQA
  VISREG --> FULLQA
  INTQA --> FULLQA
  EMAIL --> FULLQA

  FULLQA --> RC[Release Candidate]
  RC --> FINALOWNER[One Final Owner Approval]
  FINALOWNER --> PROD[Production]
  PROD --> SMOKE[Production Smoke Test]
  SMOKE --> LOCK[Release Locked]
```

## Exact identity chain

```mermaid
flowchart LR
  P[Product] --> S[Strength / Volume]
  S --> F[Format]
  F --> V[Variant ID]
  V --> SKU[SKU]
  SKU --> PRICE[Price]
  PRICE --> STOCK[Available Stock]
  STOCK --> CART[Cart Line]
  CART --> ORDER[Order Item]
  ORDER --> INVOICE[Invoice Line]
  ORDER --> SHIPMENT[Shipment]
  SHIPMENT --> TRACKING[Tracking]
  ORDER --> ENTITLEMENT[Protocol Entitlement]
```

## Environment contract chain

```mermaid
flowchart LR
  CONFIG[Shared Environment Config] --> STOREFRONT[Storefront]
  CONFIG --> ADMIN[Admin]
  CONFIG --> API[Vercel APIs]
  CONFIG --> TESTS[Tests]
  STOREFRONT --> ONE[(One Staging Supabase)]
  ADMIN --> ONE
  API --> ONE
  TESTS --> ONE
```

## Gate rules

1. `REQ-OPS-001..005` gate all structural/destructive work.
2. `REQ-ENV-001..005` must pass before Admin, Auth, payment, shipping or protocol writes are trusted.
3. `REQ-VIS-001` gates Vial, Pen, Cartridge and all storefront visual assertions.
4. `REQ-CAT-001/002` gate cart, order, invoice, shipment and protocol entitlement.
5. `REQ-AUTH-002/006` gate Admin, Member, wallet, invoice, shipment and protocol private data.
6. `REQ-PAY-001` gates valid order creation in payment flows.
7. `REQ-ORD-001/002` gate invoice, EasyParcel/SPX and protocol entitlement.
8. `REQ-SHIP-007/008` gate the `Shipped` order state.
9. `REQ-PRO-001..003` gate member protocol download.
10. `REQ-SEC-001..005` must pass before full QA can pass.
11. `REQ-QA-001..010` must pass before a release candidate is frozen.
12. Production is unreachable until `REQ-REL-004` records explicit final owner approval.
13. A Vercel `READY` state is deployment evidence only and never bypasses these gates.