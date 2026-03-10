# Hyperion — Autonomous Root Cause Analysis

Hyperion is a prototype AI-assisted Root Cause Analysis system designed to reduce Mean Time To Know (MTTK) for microservice incidents.

Built for the Microsoft AI Unlocked Hackathon.

## Features

- Microservice test environment (Ride Booking System)
- Fault injection framework
- OpenTelemetry tracing
- Distributed trace ingestion via Jaeger
- Dependency graph reconstruction
- Telemetry anomaly detection
- Root cause ranking engine
- Interactive RCA dashboard
- Failure propagation replay

## Architecture

Telemetry → Graph Builder → Signal Extraction → RCA Engine → Dashboard

## Tech Stack

Backend:
- Python
- FastAPI
- NetworkX
- Pandas

Observability:
- OpenTelemetry
- Jaeger

Frontend:
- Next.js
- ReactFlow
- TailwindCSS

Infrastructure:
- Docker

## Demo

See the hackathon demo video for the full workflow.

## License

MIT
