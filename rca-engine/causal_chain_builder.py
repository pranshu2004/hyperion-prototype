import networkx as nx

def build_causal_chain(graph, top_candidate, anomalous_services, timeline):
    """
    Reconstructs the failure propagation path from the root cause outwards.
    """
    if top_candidate not in graph:
        return [top_candidate]

    # Find all anomalous services that rely on the root cause
    impacted_ancestors = [n for n in nx.ancestors(graph, top_candidate) if n in anomalous_services]
    
    # Sort them by the timeline (when they failed)
    # Failures propagate upstream: Callee fails -> Caller times out shortly after
    impacted_ancestors.sort(key=lambda x: timeline.get(x, float('inf')))
    
    # The chain starts at the root cause, propagating outwards
    chain = [top_candidate] + impacted_ancestors
    
    return chain