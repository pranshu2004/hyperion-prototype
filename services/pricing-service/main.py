from fastapi import FastAPI
import logging
from datetime import datetime
import os

# --- OpenTelemetry Imports ---
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

# --- OpenTelemetry Setup ---
SERVICE_NAME = "pricing-service"

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
logger = logging.getLogger("pricing-service")

@app.post("/calculate-price")
async def calculate_price():
    logger.info(f"[{datetime.utcnow().isoformat()}] [pricing-service] POST /calculate-price success")
    return {
        "price": 240
    }