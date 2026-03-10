import requests
import logging

JAEGER_API_URL = "http://localhost:16686/api/traces"
logger = logging.getLogger(__name__)

def fetch_traces(service="api-gateway", limit=200):
    """Fetch recent traces from Jaeger for a specific entry service."""
    params = {
        "service": service,
        "limit": limit
    }
    try:
        response = requests.get(JAEGER_API_URL, params=params, timeout=5)
        response.raise_for_status()
        traces = response.json().get("data", [])
        return traces
    except requests.RequestException as e:
        logger.error(f"Failed to fetch traces from Jaeger: {e}")
        return []