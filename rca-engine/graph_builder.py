import networkx as nx

def build_service_graph(parsed_trace_data):
    """Constructs a directed graph of service dependencies."""
    G = nx.DiGraph()
    service_calls = parsed_trace_data.get("service_calls", [])

    edge_stats = {}
    for call in service_calls:
        caller = call["caller"]
        callee = call["callee"]
        edge = (caller, callee)

        if edge not in edge_stats:
            edge_stats[edge] = {"count": 0, "total_latency": 0}

        edge_stats[edge]["count"] += 1
        edge_stats[edge]["total_latency"] += call["duration"]

    for (caller, callee), stats in edge_stats.items():
        avg_latency = stats["total_latency"] / stats["count"]
        # Add edges with attributes to the NetworkX graph
        G.add_edge(caller, callee, call_count=stats["count"], average_latency=avg_latency)

    return G