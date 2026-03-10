from fastapi import FastAPI, HTTPException
import logging
import os
import httpx
from datetime import datetime

# --- OpenTelemetry Imports ---
from opentelemetry import trace
from opentelemetry.trace.status import Status, StatusCode
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

# --- OpenTelemetry Setup ---
SERVICE_NAME = "driver-matching-service"

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
logger = logging.getLogger("driver-matching-service")

API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://api-gateway:8000")

async def get_fault_mode():
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"{API_GATEWAY_URL}/fault-state")
            return res.json().get("fault_mode", "normal")
        except Exception:
            return "normal"

@app.post("/match-driver")
async def match_driver():
    fault_mode = await get_fault_mode()
    if fault_mode == "driver_failure":
        error_msg = "Driver matching service unavailable"
        logger.error(f"[{datetime.utcnow().isoformat()}] [driver-matching-service] {error_msg}")
        
        # Realistic Error Recording
        current_span = trace.get_current_span()
        simulated_err = Exception(error_msg)
        current_span.record_exception(simulated_err)
        current_span.set_status(Status(StatusCode.ERROR, error_msg))
        
        raise HTTPException(status_code=500, detail=error_msg)

    logger.info(f"[{datetime.utcnow().isoformat()}] [driver-matching-service] POST /match-driver success")
    return {
        "driver_id": "driver_123",
        "driver_name": "Rahul"
    }