export interface RouteCoord {
  lat: number;
  lng: number;
}

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng] pairs for Leaflet
  distanceMetres: number;
  durationSeconds: number;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

type NodeId = string;
interface Edge {
  to: NodeId;
  weight: number;
}

let geojsonGraphLoaded = false;
const graph: Map<NodeId, Edge[]> = new Map();
const nodeCoords: Map<NodeId, [number, number]> = new Map(); // lat, lng

async function loadGraph() {
  if (geojsonGraphLoaded) return;
  const res = await fetch("/assets/campus-path/map.geojson");
  if (!res.ok) throw new Error("Failed to load map.geojson");
  const data = await res.json();

  const addNode = (lat: number, lng: number) => {
    // Keep 6 decimal places to uniquely identify nodes (approx 10cm accuracy)
    const id = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (!graph.has(id)) {
      graph.set(id, []);
      nodeCoords.set(id, [lat, lng]);
    }
    return id;
  };

  const addEdge = (id1: NodeId, id2: NodeId, weight: number) => {
    const edges1 = graph.get(id1)!;
    if (!edges1.find((e) => e.to === id2)) {
      edges1.push({ to: id2, weight });
    }
    const edges2 = graph.get(id2)!;
    if (!edges2.find((e) => e.to === id1)) {
      edges2.push({ to: id1, weight });
    }
  };

  // Build basic graph from LineStrings
  for (const feature of data.features) {
    if (feature.geometry.type === "LineString") {
      const coords = feature.geometry.coordinates; // [lng, lat]
      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const id1 = addNode(p1[1], p1[0]);
        const id2 = addNode(p2[1], p2[0]);
        const dist = getDistance(p1[1], p1[0], p2[1], p2[0]);
        addEdge(id1, id2, dist);
      }
    }
  }

  // Glue nearby nodes together (in case LineStrings are disjoint)
  const nodes = Array.from(nodeCoords.entries());
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const [id1, [lat1, lng1]] = nodes[i];
      const [id2, [lat2, lng2]] = nodes[j];
      const dist = getDistance(lat1, lng1, lat2, lng2);
      if (dist < 10) {
        addEdge(id1, id2, dist);
      }
    }
  }

  geojsonGraphLoaded = true;
  console.log(`[GeoJSON Graph] Loaded ${nodes.length} nodes`);
}

function findNearestNode(lat: number, lng: number): NodeId | null {
  let nearest: NodeId | null = null;
  let minDist = Infinity;
  for (const [id, [nLat, nLng]] of nodeCoords.entries()) {
    const d = getDistance(lat, lng, nLat, nLng);
    if (d < minDist) {
      minDist = d;
      nearest = id;
    }
  }
  return nearest;
}

function shortestPath(start: NodeId, end: NodeId): NodeId[] | null {
  const distances = new Map<NodeId, number>();
  const previous = new Map<NodeId, NodeId>();
  const unvisited = new Set<NodeId>();

  for (const node of graph.keys()) {
    distances.set(node, Infinity);
    unvisited.add(node);
  }
  distances.set(start, 0);

  while (unvisited.size > 0) {
    let current: NodeId | null = null;
    let minDistance = Infinity;
    for (const node of unvisited) {
      const dist = distances.get(node)!;
      if (dist < minDistance) {
        minDistance = dist;
        current = node;
      }
    }

    if (current === null || current === end) break;
    unvisited.delete(current);

    const edges = graph.get(current) || [];
    for (const edge of edges) {
      if (!unvisited.has(edge.to)) continue;
      const alt = distances.get(current)! + edge.weight;
      if (alt < distances.get(edge.to)!) {
        distances.set(edge.to, alt);
        previous.set(edge.to, current);
      }
    }
  }

  if (distances.get(end) === Infinity) return null;

  const path: NodeId[] = [];
  let curr: NodeId | undefined = end;
  while (curr) {
    path.unshift(curr);
    curr = previous.get(curr);
  }
  return path;
}

export async function getWalkingRoute(
  from: RouteCoord,
  to: RouteCoord
): Promise<RouteResult | null> {
  try {
    await loadGraph();

    const startNode = findNearestNode(from.lat, from.lng);
    const endNode = findNearestNode(to.lat, to.lng);

    if (!startNode || !endNode) {
      console.warn("[GeoJSON Routing] No start/end nodes found");
      return null;
    }

    const pathNodes = shortestPath(startNode, endNode);
    if (!pathNodes) {
      console.warn("[GeoJSON Routing] No path found between nodes");
      return null;
    }

    let totalDistance = getDistance(
      from.lat,
      from.lng,
      nodeCoords.get(startNode)![0],
      nodeCoords.get(startNode)![1]
    );

    const coordinates: [number, number][] = [[from.lat, from.lng]];

    for (let i = 0; i < pathNodes.length; i++) {
      const coords = nodeCoords.get(pathNodes[i])!;
      coordinates.push(coords);
      if (i > 0) {
        totalDistance += getDistance(
          nodeCoords.get(pathNodes[i - 1])![0],
          nodeCoords.get(pathNodes[i - 1])![1],
          coords[0],
          coords[1]
        );
      }
    }

    totalDistance += getDistance(
      nodeCoords.get(endNode)![0],
      nodeCoords.get(endNode)![1],
      to.lat,
      to.lng
    );
    coordinates.push([to.lat, to.lng]);

    // Average walking speed ~1.4 m/s
    const durationSeconds = totalDistance / 1.4;

    console.log(
      `[GeoJSON Routing] Found path of ${totalDistance.toFixed(
        1
      )}m across ${pathNodes.length} nodes`
    );

    return {
      coordinates,
      distanceMetres: totalDistance,
      durationSeconds,
    };
  } catch (err) {
    console.error("Local GeoJSON routing failed:", err);
    return null; // fallback to straight line
  }
}
