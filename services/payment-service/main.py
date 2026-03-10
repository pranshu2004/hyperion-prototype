from fastapi import FastAPI
import logging
import asyncio
import os
import httpx
from datetime import datetime

# --- OpenTelemetry Imports ---
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

# --- OpenTelemetry Setup ---
SERVICE_NAME = "payment-service"

resource = Resource(attributes={"service.name": SERVICE_NAME})
provider = TracerProvider(resource=resource)
trace.set_tracer_provider(provider)

otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://jaeger:4317")
otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

# Instrument HTTPX for all outgoing requests
HTTPXClientInstrumentor().instrument()

app = FastAPI(title=SERVICE_NAME)

# Instrument FastAPI for all incoming requests
FastAPIInstrumentor.instrument_app(app)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("payment-service")

API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://api-gateway:8000")

async def get_fault_mode():
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"{API_GATEWAY_URL}/fault-state")
            return res.json().get("fault_mode", "normal")
        except Exception:
            return "normal"

@app.post("/process-payment")
async def process_payment():
    # Check for Fault Injection
    fault_mode = await get_fault_mode()
    if fault_mode == "payment_latency":
        logger.warning(f"[{datetime.utcnow().isoformat()}] [payment-service] simulated payment_latency fault")
        await asyncio.sleep(5)

    logger.info(f"[{datetime.utcnow().isoformat()}] [payment-service] POST /process-payment success")
    return {
        "payment_success": True
    }