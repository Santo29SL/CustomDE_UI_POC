# 📊 Custom UI Medallion Pipeline Testing Platform

An enterprise-grade, monorepo architecture engineered for manual orchestration, real-time pipeline testing, and end-to-end lineage visualization across **Medallion Data Lakehouses (Bronze ➔ Silver ➔ Gold)**.

This repository integrates an automated data orchestration layer, a scalable .NET service proxy gateway, and a modern Angular management dashboard.

---

## 🏗️ System Architecture

+---------------------------------------+|       Angular 18 Management UI        ||          (fabric-frontend)            |+---------------------------------------+│▼ [HTTP REST / WebSockets]+---------------------------------------+|        .NET 8 Core API Gateway        ||            (FabricGateway)            |+---------------------------------------+│▼ [Subprocess / gRPC Triggers]+---------------------------------------+|        Mage AI Pipeline Engine        ||           (my_mage_project)           |+---------------------------------------+│┌─────────────────────┴─────────────────────┐▼                                           ▼[ dbt Core Models ]                         [ Infrastructure ]- Silver: stg_users, stg_orders             - AWS EMR Ingestion- Gold: customer_retention                  - SSH Tunneling Proxies
