def parse_traces(raw_traces):
    """Convert Jaeger JSON into structured spans and cross-service interactions."""
    spans_data = []
    service_calls = [] 

    for trace in raw_traces:
        processes = trace.get("processes", {})
        span_map = {} 

        for span in trace.get("spans", []):
            span_id = span["spanID"]
            process_id = span["processID"]
            service_name = processes.get(process_id, {}).get("serviceName", "unknown")

            # Extract parent span
            parent_span_id = None
            for ref in span.get("references", []):
                if ref.get("refType") == "CHILD_OF":
                    parent_span_id = ref.get("spanID")

            # Determine error status from OTel tags
            is_error = False
            for tag in span.get("tags", []):
                if tag["key"] == "error" and tag["value"] == True:
                    is_error = True
                if tag["key"] == "http.status_code" and isinstance(tag["value"], int) and tag["value"] >= 500:
                    is_error = True

            parsed_span = {
                "trace_id": span["traceID"],
                "span_id": span_id,
                "parent_span_id": parent_span_id,
                "service_name": service_name,
                "operation_name": span["operationName"],
                "start_time": span["startTime"],
                "duration": span["duration"], # microseconds
                "status": "ERROR" if is_error else "OK"
            }
            span_map[span_id] = parsed_span
            spans_data.append(parsed_span)

        # Map Service-to-Service dependencies
        for span_id, span in span_map.items():
            parent_id = span["parent_span_id"]
            if parent_id and parent_id in span_map:
                parent_span = span_map[parent_id]
                caller = parent_span["service_name"]
                callee = span["service_name"]
                
                # We only care about edges between different services
                if caller != callee: 
                    service_calls.append({
                        "caller": caller,
                        "callee": callee,
                        "duration": span["duration"]
                    })

    return {"spans": spans_data, "service_calls": service_calls}