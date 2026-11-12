
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  Database,
} from 'lucide-react';

type HealthStatus = 'UP' | 'DOWN' | 'CHECKING';

interface ServiceStatus {
  id: string;
  name: string;
  port: number;
  healthEndpoint: string;
  directPort: number;
  status: HealthStatus;
  latency?: number;
  lastChecked?: string;
  details?: Record<string, unknown>;
}

const initialServices: ServiceStatus[] = [
  {
    id: 'gateway',
    name: 'API Gateway',
    port: 8080,
    healthEndpoint: '/actuator/health',
    directPort: 8080,
    status: 'CHECKING',
  },
  {
    id: 'identity',
    name: 'Identity Service',
    port: 8081,
    healthEndpoint: '/services/identity/health',
    directPort: 8081,
    status: 'CHECKING',
  },
  {
    id: 'organization',
    name: 'Organization Service',
    port: 8082,
    healthEndpoint: '/services/organization/health',
    directPort: 8082,
    status: 'CHECKING',
  },
  {
    id: 'order',
    name: 'Order Service',
    port: 8083,
    healthEndpoint: '/services/orders/health',
    directPort: 8083,
    status: 'CHECKING',
  },
  {
    id: 'dispatch',
    name: 'Dispatch Service',
    port: 8084,
    healthEndpoint: '/services/dispatch/health',
    directPort: 8084,
    status: 'CHECKING',
  },
  {
    id: 'notification',
    name: 'Notification Service',
    port: 8085,
    healthEndpoint: '/services/notifications/health',
    directPort: 8085,
    status: 'CHECKING',
  },
];

const REQUEST_TIMEOUT_MS = 5000;

function getHealthStatus(
  httpOk: boolean,
  data: unknown
): HealthStatus {
  if (!httpOk) return 'DOWN';

  // Some health endpoints return plain text or empty bodies.
  // HTTP 2xx still confirms that the endpoint responded.
  if (data === null || typeof data !== 'object') {
    return 'UP';
  }

  const payload = data as Record<string, unknown>;

  // If the endpoint explicitly reports a health status,
  // use it instead of relying only on the HTTP status.
  if (typeof payload.status === 'string') {
    return payload.status.toUpperCase() === 'UP'
      ? 'UP'
      : 'DOWN';
  }

  return 'UP';
}

async function checkService(
  service: ServiceStatus,
  gatewayUrl: string
): Promise<ServiceStatus> {
  const startTime = Date.now();
  const directUrl = `${gatewayUrl.replace(/\/+$/, '')}${service.healthEndpoint}`;
  const url = service.id === 'gateway'
    ? `/api/gateway-health?url=${encodeURIComponent(directUrl)}`
    : directUrl;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const latency = Date.now() - startTime;

    let data: unknown = null;
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      const text = await response.text().catch(() => '');
      data = text ? { response: text } : null;
    }

    const status = getHealthStatus(response.ok, data);

    console.log(`[Health Monitor] ${service.name}`, {
      url,
      httpStatus: response.status,
      status,
      latency,
      response: data,
    });

    return {
      ...service,
      status,
      latency,
      lastChecked: new Date().toLocaleTimeString(),
      details:
        data !== null && typeof data === 'object'
          ? (data as Record<string, unknown>)
          : {
              response: data,
              httpStatus: response.status,
            },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.name === 'TimeoutError'
          ? 'Request timed out'
          : error.message
        : 'Unknown connection error';

    console.error(`[Health Monitor] ${service.name} failed`, {
      url,
      error,
    });

    return {
      ...service,
      status: 'DOWN',
      latency: Date.now() - startTime,
      lastChecked: new Date().toLocaleTimeString(),
      details: {
        error: message,
      },
    };
  }
}

export default function HealthPage() {
  const [services, setServices] =
    useState<ServiceStatus[]>(initialServices);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [gatewayUrl, setGatewayUrl] = useState(
    'http://localhost:8080'
  );

  const checkHealth = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    try {
      const results = await Promise.all(
        services.map((service) =>
          checkService(service, gatewayUrl)
        )
      );

      setServices(results);
    } finally {
      setIsRefreshing(false);
    }
  }, [gatewayUrl, isRefreshing, services]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function initialCheck() {
      setIsRefreshing(true);

      try {
        const results = await Promise.all(
          initialServices.map(async (service) => {
            if (controller.signal.aborted) {
              return service;
            }

            return checkService(service, gatewayUrl);
          })
        );

        if (!cancelled) {
          setServices(results);
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    }

    void initialCheck();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [gatewayUrl]);

  const upCount = services.filter(
    (service) => service.status === 'UP'
  ).length;

  const downCount = services.filter(
    (service) => service.status === 'DOWN'
  ).length;

  const checkingCount = services.filter(
    (service) => service.status === 'CHECKING'
  ).length;

  const allUp = upCount === services.length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        color: '#ffffff',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#ffffff',
            }}
          >
            System Health Monitor
          </h1>

          <p
            style={{
              color: '#94a3b8',
              fontSize: '0.875rem',
              marginTop: '0.35rem',
            }}
          >
            Live health checks through Spring Cloud Gateway
            for all five SwiftDrop microservices.
          </p>
        </div>

        <button
          onClick={() => void checkHealth()}
          disabled={isRefreshing}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            opacity: isRefreshing ? 0.7 : 1,
            cursor: isRefreshing ? 'wait' : 'pointer',
          }}
        >
          <RefreshCw
            size={16}
            className={isRefreshing ? 'spin' : ''}
          />
          {isRefreshing ? 'Checking...' : 'Refresh Health'}
        </button>
      </div>

      {/* Overview cards */}
      <div
        className="grid-cols-3"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="glass-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
            }}
          >
            <span
              style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                fontWeight: 600,
              }}
            >
              Active Services
            </span>
            <Activity size={18} color="#10b981" />
          </div>

          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
            }}
          >
            {upCount} / {services.length}
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: allUp ? '#10b981' : '#f59e0b',
              marginTop: '0.25rem',
            }}
          >
            {allUp
              ? 'All services responding'
              : `${downCount} offline · ${checkingCount} checking`}
          </div>
        </div>

        <div className="glass-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
            }}
          >
            <span
              style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                fontWeight: 600,
              }}
            >
              Target Gateway
            </span>
            <Server size={18} color="#3b82f6" />
          </div>

          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              overflowWrap: 'anywhere',
            }}
          >
            {gatewayUrl}
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: '#64748b',
              marginTop: '0.25rem',
            }}
          >
            Health endpoint: /actuator/health
          </div>
        </div>

        <div className="glass-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
            }}
          >
            <span
              style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                fontWeight: 600,
              }}
            >
              Architecture
            </span>
            <Database size={18} color="#8b5cf6" />
          </div>

          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
            }}
          >
            Microservices + Event Bus
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: '#64748b',
              marginTop: '0.25rem',
            }}
          >
            Independent services and databases
          </div>
        </div>
      </div>

      {/* Service list */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {services.map((service) => {
          const isUp = service.status === 'UP';
          const isChecking =
            service.status === 'CHECKING';

          const statusColor = isUp
            ? '#10b981'
            : isChecking
              ? '#f59e0b'
              : '#ef4444';

          const borderColor = statusColor;

          return (
            <div
              key={service.id}
              className="glass-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                padding: '1.25rem 1.5rem',
                borderLeft: `4px solid ${borderColor}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  minWidth: 0,
                  flex: '1 1 300px',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    flexShrink: 0,
                    borderRadius: '10px',
                    background: isUp
                      ? 'rgba(16,185,129,0.15)'
                      : isChecking
                        ? 'rgba(245,158,11,0.15)'
                        : 'rgba(239,68,68,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isUp ? (
                    <CheckCircle
                      size={22}
                      color="#10b981"
                    />
                  ) : isChecking ? (
                    <Clock
                      size={22}
                      color="#f59e0b"
                    />
                  ) : (
                    <XCircle
                      size={22}
                      color="#ef4444"
                    />
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.6rem',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: '#ffffff',
                      }}
                    >
                      {service.name}
                    </h3>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                      }}
                    >
                      Port {service.directPort}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: '0.35rem',
                      fontSize: '0.75rem',
                      color: '#64748b',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    Route:{' '}
                    <code style={{ color: '#60a5fa' }}>
                      {service.healthEndpoint}
                    </code>
                  </div>

                  {service.lastChecked && (
                    <div
                      style={{
                        marginTop: '0.25rem',
                        fontSize: '0.7rem',
                        color: '#64748b',
                      }}
                    >
                      Last checked: {service.lastChecked}
                    </div>
                  )}

                  {service.details?.error != null && (
                    <div
                      style={{
                        marginTop: '0.4rem',
                        fontSize: '0.75rem',
                        color: '#fca5a5',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      Error:{' '}
                      {String(service.details.error)}
                    </div>
                  )}

                  {typeof service.details?.status ===
                    'string' &&
                    service.details.status.toUpperCase() !==
                      'UP' && (
                      <div
                        style={{
                          marginTop: '0.4rem',
                          fontSize: '0.75rem',
                          color: '#fca5a5',
                        }}
                      >
                        Health response:{' '}
                        {service.details.status}
                      </div>
                    )}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '1.5rem',
                  flexWrap: 'wrap',
                }}
              >
                {service.latency !== undefined && (
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color:
                          service.latency < 200
                            ? '#10b981'
                            : service.latency < 1000
                              ? '#f59e0b'
                              : '#ef4444',
                      }}
                    >
                      {service.latency} ms
                    </div>

                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: '#64748b',
                      }}
                    >
                      Latency
                    </div>
                  </div>
                )}

                <span
                  className={
                    isUp
                      ? 'badge badge-success'
                      : isChecking
                        ? 'badge badge-warning'
                        : 'badge badge-danger'
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isUp ? (
                    <CheckCircle size={13} />
                  ) : isChecking ? (
                    <Clock size={13} />
                  ) : (
                    <XCircle size={13} />
                  )}

                  {isUp
                    ? 'ONLINE'
                    : isChecking
                      ? 'CHECKING'
                      : 'OFFLINE'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontSize: '0.75rem',
          color: '#64748b',
          paddingBottom: '1rem',
        }}
      >
        Health status is based on HTTP responses and the
        health payload returned by each endpoint. A successful
        HTTP response does not guarantee that every dependency
        of a service is healthy.
      </div>
    </div>
  );
}
