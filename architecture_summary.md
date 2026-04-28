# Architecture & Current State Summary

## High-Level Architecture
The system is built to demonstrate automated root cause analysis (RCA). Data flows in the following manner:
1. **Load Generation & Microservices**: A load generator sends traffic to the `api-gateway`, which sequentially interacts with downstream services (e.g., `ride-service`). Services run inside Docker containers managed by docker-compose.
2. **Telemetry & Tracing (Jaeger)**: Services are instrumented with OpenTelemetry. They export distributed traces to Jaeger.
3. **RCA Engine (FastAPI)**: The Python backend ([rca-engine/main.py](file:///home/pranshu/hyperion-prototype/rca-engine/main.py)) acts as the brain. It polls raw traces from Jaeger, parses them to build a service topology, extracts latency/error metrics, detects anomalies, and uses temporal analysis to rank root causes and build causal chains.
4. **Dashboard (Next.js)**: The Next.js frontend ([dashboard/app/page.tsx](file:///home/pranshu/hyperion-prototype/dashboard/app/page.tsx)) polls the RCA engine API and visualizes the system's live state, incident timelines, and dependency graphs using React Flow.

## Core Directory Structure
```text
.
├── dashboard/               (Next.js React Frontend)
│   ├── app/
│   │   └── page.tsx         (Main dashboard UI and React Flow visualization)
│   ├── public/              (Static assets)
│   ├── next.config.ts
│   └── package.json
├── frontend/                (Legacy/alternative frontend directory)
│   ├── src/                 (Source code)
│   └── package.json
└── rca-engine/              (Python FastAPI Analytics Backend)
    ├── main.py              (FastAPI entry point, exposed at :8008)
    ├── trace_ingestor.py    (Fetches traces from Jaeger)
    ├── trace_parser.py      (Parses raw traces)
    ├── graph_builder.py     (Constructs Directed Acyclic Graph of dependencies)
    ├── anomaly_detector.py  (Detects latency/error anomalies)
    ├── temporal_analyzer.py (Analyzes the temporal sequence of failures)
    ├── root_cause_ranker.py (Ranks services to isolate the root cause)
    └── causal_chain_builder.py (Traces propagation paths)
```

## API Contract (`GET http://localhost:8008/api/analyze`)
The RCA engine returns system status, graphing elements, and incident information (if active).

**Schema when healthy:**
```json
{
  "status": "healthy",
  "graph": {
    "nodes": [
      {
        "id": "api-gateway",
        "anomalous": false,
        "error_rate": 0,
        "avg_latency": 1.2
      }
    ],
    "edges": [
      {
        "source": "api-gateway",
        "target": "ride-service"
      }
    ]
  }
}
```

**Schema during an active incident:**
```json
{
  "status": "incident",
  "root_cause": {
    "service": "database",
    "confidence": 0.95
  },
  "causal_chain": ["database", "ride-service", "api-gateway"],
  "incident_timeline": [
    {
      "timestamp": "14:32:01",
      "message": "database anomaly detected"
    }
  ],
  "evidence": [
    "High error rate observed (0.85)",
    "Earliest anomaly detected in the temporal chain"
  ],
  "graph": {
    "nodes": [
      {
        "id": "database",
        "anomalous": true,
        "error_rate": 0.85,
        "avg_latency": 540.2
      }
    ],
    "edges": [
      {
        "source": "ride-service",
        "target": "database"
      }
    ]
  }
}
```

## UI State
The Next.js dashboard provides a live, real-time representation of the system using dark-mode aesthetics.
* **React Flow (`@xyflow/react`)**: Renders the core dependency topology, mapping services to interactive nodes. Uses custom node types ([CustomServiceNode](file:///home/pranshu/hyperion-prototype/dashboard/app/page.tsx#73-147)) to display latency/error rate data directly on the graph.
* **Dagre Layout Engine**: Automatically calculates the graph layout (hierarchical top-to-bottom) ensuring consistent and non-overlapping node positioning.
* **Framer Motion**: Drives smooth visual feedback, including pop-layout transitions between healthy and incident states, animated timeline elements, and progress bars for the Causal Confidence meter.
* **Real-time Polling**: Polling the RCA API every 5 seconds to seamlessly update graph rendering (e.g. turning nodes red when anomalous/root-cause) without remounting the layout entirely.
* **Replay Mechanics**: An interactive "Replay" feature simulates the temporal propagation of the incident across the nodes.
