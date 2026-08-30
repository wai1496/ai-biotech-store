# AI BioTech Master Build Dependency Graph

```mermaid
graph TD
  OPS[REQ-OPS Safety/Backup] --> VIS[REQ-VIS Product Visuals]
  OPS --> CAT[REQ-CAT Catalog/Data]
  OPS --> AUTH[REQ-AUTH Auth/Roles]
  VIS --> STO[REQ-STO Storefront]
  CAT --> STO
  AUTH --> ADM[REQ-ADM Super Admin]
  AUTH --> MEM[REQ-MEM Member Area]
  STO --> CART[REQ-STO Cart]
  MEM --> WAL[REQ-WAL Wallet]
  CART --> PAY[REQ-PAY Payment]
  WAL --> PAY
  PAY --> ORD[REQ-ORD Orders]
  ORD --> INV[REQ-INV Invoices]
  ORD --> SHIP[REQ-SHIP EasyParcel/SPX]
  SHIP --> TRACK[Tracking/Member Updates]
  CAT --> RES[REQ-RES Research]
  RES --> RAG[REQ-RAG RAG QA]
  RAG --> AI[REQ-AI Assistant/AI Center]
  ORD --> PRO[REQ-PRO Protocol Entitlement]
  CAT --> PRO
  ADM --> SET[REQ-SET Store Settings]
  ADM --> LOG[REQ-LOG Audit/System Logs]
  LOG --> REP[REQ-REP Reports]
  AUTH --> SEC[REQ-SEC Security]
  SHIP --> QA[REQ-QA Independent QA]
  INV --> QA
  PRO --> QA
  AI --> QA
  SEC --> QA
  REP --> QA
  QA --> RC[REQ-REL Release Candidate]
  RC --> OWNER[Owner Final Approval]
  OWNER --> PROD[Production]
```

## Gate Rules

1. A downstream requirement cannot be marked PASS if a required upstream dependency is FAIL/BLOCKED.
2. `REQ-OPS-001/002` gate all structural or destructive changes.
3. `REQ-CAT-001` gates storefront variant behavior, order integrity and protocol entitlement.
4. `REQ-AUTH-002` gates Admin, Member private data and Security.
5. `REQ-ORD-001` gates Invoice, Shipping and Protocol entitlement.
6. `REQ-QA-001` must pass before `REQ-REL-001` can request owner approval.
7. Production is unreachable until owner approval of the frozen release candidate.
