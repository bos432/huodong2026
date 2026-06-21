export type TenantRegionBoundaryPointLike = { lat: number; lng: number };

export type TenantRegionShape = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  boundaryPoints?: TenantRegionBoundaryPointLike[] | null;
};

const EPSILON = 1e-12;

export function tenantRegionShapesConflict(first: TenantRegionShape, second: TenantRegionShape) {
  const firstPolygon = tenantRegionPolygon(first.boundaryPoints);
  const secondPolygon = tenantRegionPolygon(second.boundaryPoints);
  if (firstPolygon.length && secondPolygon.length) return tenantRegionPolygonsConflict(firstPolygon, secondPolygon);
  if (firstPolygon.length) return tenantRegionPolygonCircleConflict(firstPolygon, second.latitude, second.longitude, second.radiusMeters);
  if (secondPolygon.length) return tenantRegionPolygonCircleConflict(secondPolygon, first.latitude, first.longitude, first.radiusMeters);
  const distance = geoDistanceMeters(first.latitude, first.longitude, second.latitude, second.longitude);
  return distance < first.radiusMeters + second.radiusMeters;
}

function tenantRegionPolygon(points?: TenantRegionBoundaryPointLike[] | null) {
  return Array.isArray(points) && points.length >= 3 ? points : [];
}

function tenantRegionPolygonsConflict(first: TenantRegionBoundaryPointLike[], second: TenantRegionBoundaryPointLike[]) {
  return first.some((point) => pointInTenantRegionPolygon(point.lat, point.lng, second)) || second.some((point) => pointInTenantRegionPolygon(point.lat, point.lng, first)) || tenantRegionPolygonEdgesIntersect(first, second);
}

function tenantRegionPolygonCircleConflict(polygon: TenantRegionBoundaryPointLike[], centerLat: number, centerLng: number, radiusMeters: number) {
  return pointInTenantRegionPolygon(centerLat, centerLng, polygon) || polygon.some((point) => geoDistanceMeters(point.lat, point.lng, centerLat, centerLng) <= radiusMeters) || tenantRegionPolygonDistanceToPointMeters(polygon, centerLat, centerLng) <= radiusMeters;
}

function pointInTenantRegionPolygon(latitude: number, longitude: number, points: TenantRegionBoundaryPointLike[]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const yi = points[i].lat;
    const xi = points[i].lng;
    const yj = points[j].lat;
    const xj = points[j].lng;
    if (pointOnTenantRegionSegment({ lat: latitude, lng: longitude }, points[j], points[i])) return true;
    const intersects = yi > latitude !== yj > latitude && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function tenantRegionPolygonEdgesIntersect(first: TenantRegionBoundaryPointLike[], second: TenantRegionBoundaryPointLike[]) {
  for (let i = 0; i < first.length; i += 1) {
    const a1 = first[i];
    const a2 = first[(i + 1) % first.length];
    for (let j = 0; j < second.length; j += 1) {
      if (tenantRegionSegmentsIntersect(a1, a2, second[j], second[(j + 1) % second.length])) return true;
    }
  }
  return false;
}

function tenantRegionSegmentsIntersect(a1: TenantRegionBoundaryPointLike, a2: TenantRegionBoundaryPointLike, b1: TenantRegionBoundaryPointLike, b2: TenantRegionBoundaryPointLike) {
  const d1 = tenantRegionOrientation(a1, a2, b1);
  const d2 = tenantRegionOrientation(a1, a2, b2);
  const d3 = tenantRegionOrientation(b1, b2, a1);
  const d4 = tenantRegionOrientation(b1, b2, a2);
  if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  return (
    (d1 === 0 && pointOnTenantRegionSegment(b1, a1, a2)) ||
    (d2 === 0 && pointOnTenantRegionSegment(b2, a1, a2)) ||
    (d3 === 0 && pointOnTenantRegionSegment(a1, b1, b2)) ||
    (d4 === 0 && pointOnTenantRegionSegment(a2, b1, b2))
  );
}

function tenantRegionOrientation(a: TenantRegionBoundaryPointLike, b: TenantRegionBoundaryPointLike, c: TenantRegionBoundaryPointLike) {
  const value = (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
  return Math.abs(value) < EPSILON ? 0 : value > 0 ? 1 : -1;
}

function pointOnTenantRegionSegment(point: TenantRegionBoundaryPointLike, start: TenantRegionBoundaryPointLike, end: TenantRegionBoundaryPointLike) {
  if (tenantRegionOrientation(start, end, point) !== 0) return false;
  return point.lng >= Math.min(start.lng, end.lng) - EPSILON && point.lng <= Math.max(start.lng, end.lng) + EPSILON && point.lat >= Math.min(start.lat, end.lat) - EPSILON && point.lat <= Math.max(start.lat, end.lat) + EPSILON;
}

function tenantRegionPolygonDistanceToPointMeters(polygon: TenantRegionBoundaryPointLike[], latitude: number, longitude: number) {
  const center = { x: 0, y: 0 };
  const projected = polygon.map((point) => projectTenantRegionPointToMeters(point.lat, point.lng, latitude, longitude));
  return projected.reduce((min, point, index) => Math.min(min, distancePointToSegmentMeters(center, point, projected[(index + 1) % projected.length])), Number.POSITIVE_INFINITY);
}

function projectTenantRegionPointToMeters(latitude: number, longitude: number, referenceLat: number, referenceLng: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  return {
    x: toRad(longitude - referenceLng) * earthRadius * Math.cos(toRad(referenceLat)),
    y: toRad(latitude - referenceLat) * earthRadius
  };
}

function distancePointToSegmentMeters(point: { x: number; y: number }, start: { x: number; y: number }, end: { x: number; y: number }) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function geoDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}
