import pandas as pd
import numpy as np

def extract_signals(parsed_trace_data):
    """Compute request, error, and latency metrics per service."""
    spans = parsed_trace_data.get("spans", [])
    if not spans:
        return {}

    df = pd.DataFrame(spans)
    metrics = {}

    for service, group in df.groupby("service_name"):
        req_count = len(group)
        err_count = len(group[group["status"] == "ERROR"])
        # Convert duration from microseconds to milliseconds
        durations = group["duration"].values / 1000.0 

        avg_lat = np.mean(durations) if req_count > 0 else 0
        p95_lat = np.percentile(durations, 95) if req_count > 0 else 0
        err_rate = err_count / req_count if req_count > 0 else 0

        metrics[service] = {
            "request_count": int(req_count),
            "error_count": int(err_count),
            "error_rate": float(err_rate),
            "avg_latency": float(avg_lat),
            "p95_latency": float(p95_lat)
        }
        
    return metrics