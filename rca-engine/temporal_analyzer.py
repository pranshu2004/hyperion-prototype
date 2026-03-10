def analyze_temporal_failures(parsed_trace_data, anomalous_services):
    """
    Determines the earliest anomaly timestamp (end time) for each failing service.
    Errors propagate bottom-up, so the first span to END with an error is the root cause.
    """
    timeline = {}
    spans = parsed_trace_data.get("spans", [])

    for span in spans:
        svc = span["service_name"]
        if svc in anomalous_services and span["status"] == "ERROR":
            # CHANGE: Look at when the error finished, not when the request started!
            end_time = span["start_time"] + span["duration"]
            if svc not in timeline or end_time < timeline[svc]:
                timeline[svc] = end_time
                
    # Fallback for pure latency anomalies without hard ERROR tags
    for svc in anomalous_services:
        if svc not in timeline:
            svc_spans = [s["start_time"] + s["duration"] for s in spans if s["service_name"] == svc]
            if svc_spans:
                timeline[svc] = min(svc_spans)
            else:
                timeline[svc] = 0

    return timeline