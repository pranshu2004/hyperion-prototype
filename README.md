# Hyperion: Causal AI for Automated Root Cause Analysis

## Architecture Overview
Hyperion is an automated Root Cause Analysis (RCA) pipeline designed for complex microservice environments. When an incident occurs, errors cascade through dependencies, creating alert fatigue. Hyperion ingests distributed traces, reconstructs the system topology, and applies temporal and causal reasoning to mathematically isolate the true origin of the failure.

## Tech Stack
* **RCA Engine (Backend):** Python, FastAPI, NetworkX (Graph Mathematics)
* **Telemetry Pipeline:** OpenTelemetry, Jaeger
* **Dashboard (Frontend):** Next.js (App Router), Tailwind CSS, Framer Motion
* **Graph Visualization:** `@xyflow/react` (React Flow)
* **Infrastructure:** Docker Compose (Microservices & Load Generation)

## Key Components & Data Flow
1. **Load Generation & Telemetry:** An active load generator simulates traffic against a containerized microservice cluster. Services are instrumented with OpenTelemetry, pushing traces to Jaeger.
2. **The RCA Brain (`rca-engine/`):** A stateless FastAPI engine that actively polls Jaeger. 
    * Parses raw spans to build a live Directed Acyclic Graph (DAG) of service dependencies.
    * Executes a temporal analyzer to track the chronological sequence of span failures.
    * Runs a ranking algorithm to weigh anomaly strength, blast radius, and temporal priority to determine the absolute root cause.
3. **The SRE Dashboard (`dashboard/`):** A Next.js application polling the backend API. It utilizes React Flow to render a live topology map. During an incident, it dynamically visualizes the blast radius, the causal chain, and the incident timeline.

## 🚀 Note for Reviewers (Local Setup)
Because Hyperion analyzes live network traffic, distributed traces, and cascading anomalies, a static web deployment cannot demonstrate the product's value. 
To evaluate the MVP:
1. Please view our **2-minute demo video** (Link in submission form) to see the engine catching failures in real-time.
2. To run the environment locally:
   ```bash
   # 1. Start the infrastructure
   cd infra && docker-compose up -d --build
   
   # 2. Start the RCA engine
   cd ../rca-engine && python main.py
   
   # 3. Start the dashboard
   cd ../dashboard && npm run dev