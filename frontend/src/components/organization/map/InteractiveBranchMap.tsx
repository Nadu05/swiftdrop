'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass,
  Crosshair,
  Maximize2,
  MapPin,
  Minus,
  Move,
  Plus,
  Radar,
} from 'lucide-react';
import {
  clampCoordinates,
  getRecommendedZoomForRadiusKm,
  latLngToWorldPixel,
  radiusKmToPixels,
  worldPixelToLatLng,
} from '@/lib/geocoding';
import type { ServiceAreaResponse } from '@/types/organization.types';

export interface InteractiveBranchMapProps {
  /**
   * Branch marker latitude (-90 to 90).
   */
  latitude: number;
  /**
   * Branch marker longitude (-180 to 180).
   */
  longitude: number;
  /**
   * Optional branch display label for the marker tooltip.
   */
  branchLabel?: string;
  /**
   * Optional branch code badge.
   */
  branchCode?: string;
  /**
   * Whether the user can click the map or drag the marker to select coordinates.
   * Set `true` in Create/Edit Branch; `false` in read-only Branch Details.
   */
  interactive?: boolean;
  /**
   * Callback fired when the user clicks the map or finishes dragging the marker.
   */
  onLocationChange?: (
    latitude: number,
    longitude: number,
    interactionType: 'click' | 'drag'
  ) => void;
  /**
   * Optional service areas returned by Member 03's backend (`ServiceAreaResponse[]`).
   * Rendered as circular coverage zones around `(area.centerLatitude, area.centerLongitude)`
   * using `area.maxRadiusKm`.
   */
  serviceAreas?: ServiceAreaResponse[];
  /**
   * Optional ID of a specific service area to highlight on the map.
   */
  selectedServiceAreaId?: number | null;
  /**
   * Optional callback when a service area circle/badge is clicked.
   */
  onSelectServiceArea?: (area: ServiceAreaResponse) => void;
  /**
   * Initial zoom level (7 to 18).
   */
  initialZoom?: number;
  /**
   * Height class or style height in pixels (defaults to 380).
   */
  heightPx?: number;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 7;
const MAX_ZOOM = 18;

function getTileUrlTemplate(): string {
  const envTemplate = process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim();
  if (envTemplate && envTemplate.includes('{z}')) {
    return envTemplate;
  }
  return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
}

function buildTileUrl(template: string, z: number, x: number, y: number): string {
  const maxTile = Math.pow(2, z);
  const wrappedX = ((x % maxTile) + maxTile) % maxTile;
  return template
    .replace('{z}', String(z))
    .replace('{x}', String(wrappedX))
    .replace('{y}', String(y));
}

/**
 * Interactive Web Mercator Slippy Map with Draggable Branch Marker & Circular Service-Area Visualization
 * Member 04 — Head Office Organization Admin UI
 */
function InteractiveBranchMap({
  latitude,
  longitude,
  branchLabel,
  branchCode,
  interactive = false,
  onLocationChange,
  serviceAreas = [],
  selectedServiceAreaId = null,
  onSelectServiceArea,
  initialZoom,
  heightPx = 380,
}: InteractiveBranchMapProps) {
  const safeMarker = useMemo(
    () => clampCoordinates(latitude, longitude),
    [latitude, longitude]
  );

  // Compute recommended initial zoom if service areas exist
  const computedInitialZoom = useMemo(() => {
    if (initialZoom !== undefined) return initialZoom;
    if (serviceAreas.length > 0) {
      const maxRadius = Math.max(
        ...serviceAreas.map((sa) => Number(sa.maxRadiusKm) || 0)
      );
      if (maxRadius > 0) {
        return getRecommendedZoomForRadiusKm(maxRadius);
      }
    }
    return 14;
  }, [initialZoom, serviceAreas]);

  const [zoom, setZoom] = useState<number>(computedInitialZoom);
  const [viewCenter, setViewCenter] = useState<{ latitude: number; longitude: number }>(
    safeMarker
  );
  const [draggingMarkerCoords, setDraggingMarkerCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isPanningMap, setIsPanningMap] = useState<boolean>(false);
  const [tileLoadErrorCount, setTileLoadErrorCount] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 760,
    height: heightPx,
  });

  const panStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startWorldX: number;
    startWorldY: number;
    hasMoved: boolean;
  } | null>(null);

  const isDraggingMarkerRef = useRef<boolean>(false);

  // Keep map centered when external coordinates change (e.g. selecting an address search result)
  useEffect(() => {
    if (!isDraggingMarkerRef.current) {
      setViewCenter(safeMarker);
    }
  }, [safeMarker.latitude, safeMarker.longitude]);

  // Adjust zoom automatically when service areas first arrive on Branch Details
  useEffect(() => {
    if (initialZoom === undefined && serviceAreas.length > 0) {
      const maxRadius = Math.max(
        ...serviceAreas.map((sa) => Number(sa.maxRadiusKm) || 0)
      );
      if (maxRadius > 0) {
        setZoom(getRecommendedZoomForRadiusKm(maxRadius));
      }
    }
  }, [initialZoom, serviceAreas]);

  // Measure map viewport width/height responsively
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewportSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };

    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateSize);
      observer.observe(el);
      return () => observer.disconnect();
    }
    return undefined;
  }, [heightPx]);

  const activeMarker = draggingMarkerCoords ?? safeMarker;

  const centerWorld = useMemo(
    () => latLngToWorldPixel(viewCenter.latitude, viewCenter.longitude, zoom),
    [viewCenter.latitude, viewCenter.longitude, zoom]
  );

  const topLeftWorldX = centerWorld.x - viewportSize.width / 2;
  const topLeftWorldY = centerWorld.y - viewportSize.height / 2;

  // Compute visible raster tiles covering the viewport
  const tiles = useMemo(() => {
    const template = getTileUrlTemplate();
    const minTileX = Math.floor(topLeftWorldX / TILE_SIZE);
    const maxTileX = Math.floor((topLeftWorldX + viewportSize.width) / TILE_SIZE);
    const minTileY = Math.floor(topLeftWorldY / TILE_SIZE);
    const maxTileY = Math.floor((topLeftWorldY + viewportSize.height) / TILE_SIZE);
    const maxTileIndex = Math.pow(2, zoom) - 1;

    const list: {
      key: string;
      url: string;
      left: number;
      top: number;
    }[] = [];

    for (let tx = minTileX; tx <= maxTileX; tx += 1) {
      for (let ty = minTileY; ty <= maxTileY; ty += 1) {
        if (ty < 0 || ty > maxTileIndex) continue;
        list.push({
          key: `${zoom}-${tx}-${ty}`,
          url: buildTileUrl(template, zoom, tx, ty),
          left: Math.round(tx * TILE_SIZE - topLeftWorldX),
          top: Math.round(ty * TILE_SIZE - topLeftWorldY),
        });
      }
    }
    return list;
  }, [topLeftWorldX, topLeftWorldY, viewportSize.width, viewportSize.height, zoom]);

  // Project branch marker into viewport pixel coordinates
  const markerScreenPos = useMemo(() => {
    const world = latLngToWorldPixel(activeMarker.latitude, activeMarker.longitude, zoom);
    return {
      x: world.x - topLeftWorldX,
      y: world.y - topLeftWorldY,
    };
  }, [activeMarker.latitude, activeMarker.longitude, zoom, topLeftWorldX, topLeftWorldY]);

  // Project service areas into viewport pixel coordinates and pixel radii
  const projectedServiceAreas = useMemo(() => {
    return serviceAreas.map((area) => {
      const world = latLngToWorldPixel(area.centerLatitude, area.centerLongitude, zoom);
      const radiusPx = radiusKmToPixels(
        Number(area.maxRadiusKm),
        area.centerLatitude,
        zoom
      );
      return {
        area,
        cx: world.x - topLeftWorldX,
        cy: world.y - topLeftWorldY,
        radiusPx,
      };
    });
  }, [serviceAreas, zoom, topLeftWorldX, topLeftWorldY]);

  const convertClientPointToLatLng = useCallback(
    (clientX: number, clientY: number): { latitude: number; longitude: number } | null => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const offsetX = clientX - rect.left;
      const offsetY = clientY - rect.top;
      return worldPixelToLatLng(topLeftWorldX + offsetX, topLeftWorldY + offsetY, zoom);
    },
    [topLeftWorldX, topLeftWorldY, zoom]
  );

  // Map background pointer down/move/up for panning OR click-to-place marker
  const handleMapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-map-control="true"]')) {
      return;
    }
    if ((e.target as HTMLElement).closest('[data-map-marker="true"]')) {
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    panStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startWorldX: centerWorld.x,
      startWorldY: centerWorld.y,
      hasMoved: false,
    };
  };

  const handleMapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingMarkerRef.current) {
      const coords = convertClientPointToLatLng(e.clientX, e.clientY);
      if (coords) {
        setDraggingMarkerCoords(coords);
      }
      return;
    }

    const pan = panStartRef.current;
    if (!pan) return;

    const dx = e.clientX - pan.pointerX;
    const dy = e.clientY - pan.pointerY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      pan.hasMoved = true;
      setIsPanningMap(true);
      const nextCenter = worldPixelToLatLng(
        pan.startWorldX - dx,
        pan.startWorldY - dy,
        zoom
      );
      setViewCenter(nextCenter);
    }
  };

  const handleMapPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingMarkerRef.current) {
      isDraggingMarkerRef.current = false;
      const finalCoords =
        convertClientPointToLatLng(e.clientX, e.clientY) ?? draggingMarkerCoords;
      setDraggingMarkerCoords(null);
      if (finalCoords && onLocationChange) {
        onLocationChange(finalCoords.latitude, finalCoords.longitude, 'drag');
      }
      return;
    }

    const pan = panStartRef.current;
    panStartRef.current = null;
    setIsPanningMap(false);

    if (pan && !pan.hasMoved && interactive && onLocationChange) {
      const clickedCoords = convertClientPointToLatLng(e.clientX, e.clientY);
      if (clickedCoords) {
        onLocationChange(clickedCoords.latitude, clickedCoords.longitude, 'click');
      }
    }
  };

  const handleMarkerPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    e.stopPropagation();
    isDraggingMarkerRef.current = true;
    setDraggingMarkerCoords(safeMarker);
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(MAX_ZOOM, z + 1));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(MIN_ZOOM, z - 1));
  };

  const handleRecenterOnBranch = () => {
    setViewCenter(safeMarker);
  };

  const handleFitServiceAreas = () => {
    if (serviceAreas.length === 0) {
      setViewCenter(safeMarker);
      return;
    }
    const targetArea =
      serviceAreas.find((a) => a.id === selectedServiceAreaId) ?? serviceAreas[0];
    const maxRadius = Math.max(
      ...serviceAreas.map((sa) => Number(sa.maxRadiusKm) || 0)
    );
    setViewCenter({
      latitude: targetArea.centerLatitude,
      longitude: targetArea.centerLongitude,
    });
    setZoom(getRecommendedZoomForRadiusKm(maxRadius));
  };

  return (
    <div
      className="org-map-shell"
      data-testid="interactive-branch-map"
      data-interactive={interactive ? 'true' : 'false'}
    >
      <div
        ref={containerRef}
        className={`org-map-viewport ${
          interactive
            ? isDraggingMarkerRef.current || isPanningMap
              ? 'cursor-grabbing'
              : 'cursor-crosshair'
            : isPanningMap
              ? 'cursor-grabbing'
              : 'cursor-grab'
        }`}
        style={{ height: `${heightPx}px` }}
        onPointerDown={handleMapPointerDown}
        onPointerMove={handleMapPointerMove}
        onPointerUp={handleMapPointerUp}
        role="region"
        aria-label={
          interactive
            ? 'Interactive branch location picker map. Click on the map or drag the marker to choose branch coordinates.'
            : `Geographic map showing ${branchLabel || 'branch'} and configured service-area radii`
        }
      >
        {/* 1. OpenStreetMap Raster Tile Layer (with subtle coordinate grid underneath) */}
        <div className="org-map-grid-backdrop" aria-hidden="true">
          {tiles.map((tile) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={tile.key}
              src={tile.url}
              alt=""
              width={TILE_SIZE}
              height={TILE_SIZE}
              draggable={false}
              className="org-map-tile"
              style={{
                left: `${tile.left}px`,
                top: `${tile.top}px`,
              }}
              onError={() => setTileLoadErrorCount((c) => c + 1)}
            />
          ))}
        </div>

        {/* 2. SVG Circular Service-Area Coverage Layer (Member 03 ServiceAreaResponse[]) */}
        <svg
          className="org-map-svg-overlay"
          width={viewportSize.width}
          height={viewportSize.height}
          viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`}
          aria-label="Service-area radius overlay"
        >
          {projectedServiceAreas.map(({ area, cx, cy, radiusPx }) => {
            const isActive = area.status === 'ACTIVE';
            const isSelected = selectedServiceAreaId === area.id;
            const strokeColor = isActive
              ? isSelected
                ? '#1d4ed8'
                : '#059669'
              : '#64748b';
            const fillColor = isActive
              ? isSelected
                ? 'rgba(37, 99, 235, 0.18)'
                : 'rgba(16, 185, 129, 0.16)'
              : 'rgba(100, 116, 139, 0.12)';

            return (
              <g
                key={area.id}
                data-testid={`service-area-circle-${area.id}`}
                data-radius-km={area.maxRadiusKm}
                onClick={(e) => {
                  if (onSelectServiceArea) {
                    e.stopPropagation();
                    onSelectServiceArea(area);
                  }
                }}
                style={{ cursor: onSelectServiceArea ? 'pointer' : 'default' }}
              >
                {/* Coverage Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={Math.max(4, radiusPx)}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 2.8 : 2}
                  strokeDasharray={isActive ? undefined : '6 4'}
                />

                {/* Radius Guide Line from Center to Right Edge */}
                {radiusPx >= 28 && (
                  <>
                    <line
                      x1={cx}
                      y1={cy}
                      x2={cx + radiusPx}
                      y2={cy}
                      stroke={strokeColor}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                    />
                    <rect
                      x={cx + radiusPx / 2 - 34}
                      y={cy - 11}
                      width={68}
                      height={20}
                      rx={10}
                      fill="#ffffff"
                      stroke={strokeColor}
                      strokeWidth={1.2}
                    />
                    <text
                      x={cx + radiusPx / 2}
                      y={cy + 3}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill="#0f172a"
                    >
                      {area.maxRadiusKm} km
                    </text>
                  </>
                )}

                {/* Service Area Center Point Dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={4.5}
                  fill={strokeColor}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              </g>
            );
          })}
        </svg>

        {/* 3. Draggable / Interactive Branch Marker Pin */}
        <div
          className="org-map-marker-wrapper"
          style={{
            left: `${markerScreenPos.x}px`,
            top: `${markerScreenPos.y}px`,
          }}
        >
          <div className="org-map-marker-label">
            {branchCode && (
              <span className="org-map-marker-label__code">{branchCode}</span>
            )}
            <span className="org-map-marker-label__name">
              {branchLabel || 'Selected Branch Location'}
            </span>
            <span className="org-map-marker-label__coords">
              {activeMarker.latitude.toFixed(4)}°N, {activeMarker.longitude.toFixed(4)}°E
            </span>
          </div>

          <button
            type="button"
            data-map-marker="true"
            data-testid="branch-map-marker"
            onPointerDown={handleMarkerPointerDown}
            className={`org-map-marker-pin ${
              interactive ? 'org-map-marker-pin--draggable' : ''
            }`}
            title={
              interactive
                ? 'Drag marker to refine branch coordinates'
                : `${branchLabel || 'Branch'} (${activeMarker.latitude.toFixed(4)}, ${activeMarker.longitude.toFixed(4)})`
            }
            aria-label={
              interactive
                ? `Draggable branch marker at latitude ${activeMarker.latitude.toFixed(4)}, longitude ${activeMarker.longitude.toFixed(4)}`
                : `Branch marker at latitude ${activeMarker.latitude.toFixed(4)}, longitude ${activeMarker.longitude.toFixed(4)}`
            }
          >
            <MapPin size={22} className="fill-blue-600 text-white" aria-hidden="true" />
          </button>
          <span className="org-map-marker-pulse" aria-hidden="true" />
        </div>

        {/* 4. Top-Left Map Status Overlay */}
        <div className="org-map-overlay-top-left" data-map-control="true">
          <div className="org-map-coord-pill">
            <Compass size={13} className="text-blue-600 shrink-0" aria-hidden="true" />
            <span className="font-mono text-xs font-semibold text-slate-800">
              {activeMarker.latitude.toFixed(5)}, {activeMarker.longitude.toFixed(5)}
            </span>
          </div>

          {interactive && (
            <div className="org-map-hint-pill">
              <Move size={12} className="text-blue-600 shrink-0" aria-hidden="true" />
              <span>Click map or drag pin to set location</span>
            </div>
          )}

          {!interactive && serviceAreas.length > 0 && (
            <div className="org-map-hint-pill">
              <Radar size={12} className="text-emerald-600 shrink-0" aria-hidden="true" />
              <span>
                {serviceAreas.length}{' '}
                {serviceAreas.length === 1 ? 'service area' : 'service areas'} rendered
              </span>
            </div>
          )}
        </div>

        {/* 5. Top-Right Zoom & Recenter Controls */}
        <div className="org-map-controls" data-map-control="true">
          <button
            type="button"
            className="org-map-control-btn"
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            title="Zoom in"
            aria-label="Zoom in map"
          >
            <Plus size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="org-map-control-btn"
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            title="Zoom out"
            aria-label="Zoom out map"
          >
            <Minus size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="org-map-control-btn"
            onClick={handleRecenterOnBranch}
            title="Center on branch marker"
            aria-label="Center map on branch marker"
          >
            <Crosshair size={15} aria-hidden="true" />
          </button>
          {serviceAreas.length > 0 && (
            <button
              type="button"
              className="org-map-control-btn"
              onClick={handleFitServiceAreas}
              title="Fit service-area radius coverage"
              aria-label="Fit service-area radius coverage"
            >
              <Maximize2 size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* 6. Bottom-Right Attribution & Offline Grid Notice */}
        <div className="org-map-attribution" data-map-control="true">
          <span>
            © OpenStreetMap contributors · Zoom {zoom}x
            {tileLoadErrorCount > 0 ? ' · Vector Coordinate Grid Active' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(InteractiveBranchMap);

