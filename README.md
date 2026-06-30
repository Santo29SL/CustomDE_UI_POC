# 📊 Custom UI Medallion Pipeline Testing Platform

An enterprise-grade, monorepo architecture engineered for manual orchestration, real-time pipeline testing, and end-to-end lineage visualization across **Medallion Data Lakehouses (Bronze ➔ Silver ➔ Gold)**.

This repository integrates an automated data orchestration layer, a scalable .NET service proxy gateway, and a modern Angular management dashboard.

---

## 🏗️ System Architecture

+---------------------------------------+|       Angular 18 Management UI        ||          (fabric-frontend)            |+---------------------------------------+│▼ [HTTP REST / WebSockets]+---------------------------------------+|        .NET 8 Core API Gateway        ||            (FabricGateway)            |+---------------------------------------+│▼ [Subprocess / gRPC Triggers]+---------------------------------------+|        Mage AI Pipeline Engine        ||           (my_mage_project)           |+---------------------------------------+│┌─────────────────────┴─────────────────────┐▼                                           ▼[ dbt Core Models ]                         [ Infrastructure ]- Silver: stg_users, stg_orders             - AWS EMR Ingestion- Gold: customer_retention                  - SSH Tunneling Proxies


The application separates concerns into three decoupled system domains:
1. **Data Orchestration & Transformation (`my_mage_project`)**: Leverages **Mage AI** and **dbt (Data Build Tool)** to compile and execute batch ETL data models, moving streaming transaction footprints into validated business reporting metrics.
2. **Backend Infrastructure Proxy (`FabricGateway`)**: A secure **C# / .NET** web service that securely forwards pipeline triggers, queries processing status, manages configuration environments, and proxies connections.
3. **Control Center Dashboard (`fabric-frontend`)**: A modular **Angular Single-Page Application (SPA)** offering real-time system status widgets, execution log monitors, and manual orchestration execution controls.

---

## 🛠️ Project Structure

```text
CustomDE_UI_POC/
├── my_mage_project/          # Data Orchestration & DBT Workspace
│   ├── dbt/                  # dbt analytics pipeline architecture
│   │   └── models/           # Data layers (Silver: cleaning / Gold: business logic)
│   ├── pipelines/            # Mage workflow DAG configurations
│   ├── .ssh_tunnel/          # Infrastructure credential templates (AWS EMR)
│   ├── metadata.yaml         # Cloud resource blueprint definitions
│   └── start_platform.sh     # Automation boot script
├── FabricGateway/            # .NET Application Proxy Gateway
│   ├── Program.cs            # Services dependency injection & routing pipeline
│   ├── FabricGateway.csproj  # Package reference and build management
│   └── appsettings.json      # Backend hosting configurations
└── fabric-frontend/          # Web Client Environment
    ├── src/                  # Component architecture, styles, and state assets
    ├── package.json          # Node dependency profiles and scripting shortcuts
    └── tsconfig.json         # Strict TypeScript compilation rules
```

---

## ⚡ Deployment & Quick Start

### System Prerequisites
Ensure your local host machine has the following frameworks installed:
* **Docker Desktop** (Engine `v24.0+`)
* **.NET SDK** (`v8.0` or higher)
* **Node.js** (`v18+` or `v20+`) & **npm**

---

### Step-by-Step Execution Sequence

#### 1. Bootstrap the Data Engine & Transformation Layer
Navigate into your pipeline folder to spin up the containerized data orchestration node:
```bash
cd my_mage_project
# Build and deploy the local Mage runtime environment
docker build -t mage-platform-core .
docker run -d -p 6789:6789 --name engineering-engine mage-platform-core
```
*To run raw local testing validation profiles and check dbt compiling steps immediately:*
```bash
chmod +x start_platform.sh && ./start_platform.sh
```

#### 2. Initialize the .NET Service Layer
Open a new terminal tab and start up the communication proxy gateway:
```bash
cd FabricGateway
dotnet restore
dotnet run --configuration Debug
```
*The service will hook up and listen dynamically at: `http://localhost:5000` / `https://localhost:5001`.*

#### 3. Build & Serve the Angular Frontend
Install external packages and run the optimization compiler to launch the dashboard interface:
```bash
cd fabric-frontend
npm install
npm run start
```
*Access the development dashboard server directly inside your web browser at:* `http://localhost:4200`

---

## 🧪 Pipeline Profiling & Validation Matrix

The transformation repository automatically checks, verifies, and transforms structured target models. The layout isolates data stages using standard relational schemas:

| Pipeline Layer | Managed Data Model File | Business Operation Context |
| :--- | :--- | :--- |
| **Silver Ingestion** | `stg_users.sql`, `stg_stocklogs.sql` | Deserialization, sanitization, and casting parameters |
| **Silver Aggregation** | `stg_orders.sql`, `stg_restocks.sql` | Transaction validation and delta parsing computations |
| **Gold Reporting** | `customer_loyalty_segments.sql` | RFM modeling and behavior target mapping matrices |
| **Gold Analytics** | `customer_retention.sql` | Churn profiling and lifecycle calculation metrics |

---

## 🛡️ Security & Environment Strategy
* **Infrastructure Security:** Production setups connect securely via keys in the `.ssh_tunnel/` directory.
* **Credentials:** Never upload active cloud access codes or AWS tokens. Keep credential overrides saved inside a local `.env` or local `appsettings.Development.json` file.

---

## 📄 Distribution
This monorepo layout functions as an active Data Engineering Proof of Concept (PoC) pipeline workspace.
