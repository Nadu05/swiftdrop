'use client';

import { useState } from 'react';
import { 
  Send, 
  Terminal, 
  Database, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Code2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const serviceOptions = [
  { id: 'identity', name: 'Identity Service', path: '/api/v1/identity/test-items', port: 8081 },
  { id: 'organization', name: 'Organization Service', path: '/api/v1/organization/test-items', port: 8082 },
  { id: 'orders', name: 'Order Service', path: '/api/v1/orders/test-items', port: 8083 },
  { id: 'dispatch', name: 'Dispatch Service', path: '/api/v1/dispatch/test-items', port: 8084 },
  { id: 'notifications', name: 'Notification Service', path: '/api/v1/notifications/test-items', port: 8085 },
];

export default function ApiTesterPage() {
  const [selectedService, setSelectedService] = useState(serviceOptions[0]);
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [itemId, setItemId] = useState<string>('');
  const [name, setName] = useState<string>('Sample Test Item');
  const [description, setDescription] = useState<string>('Testing microservices infrastructure and DB persistence');
  const [status, setStatus] = useState<string>('ACTIVE');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [responseData, setResponseData] = useState<any>(null);
  const [gatewayBaseUrl, setGatewayBaseUrl] = useState<string>('http://localhost:8080');

  const getFullUrl = () => {
    let url = `${gatewayBaseUrl}${selectedService.path}`;
    if ((method === 'GET' || method === 'PUT' || method === 'DELETE') && itemId.trim()) {
      url += `/${itemId.trim()}`;
    }
    return url;
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setResponseStatus(null);
    setResponseData(null);
    
    const url = getFullUrl();
    const options: RequestInit = {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };

    if (method === 'POST' || method === 'PUT') {
      options.body = JSON.stringify({
        name,
        description,
        status,
      });
    }

    try {
      const res = await fetch(url, options);
      setResponseStatus(res.status);

      if (res.status === 204) {
        setResponseData({ message: 'Resource successfully deleted (204 No Content)' });
      } else {
        const text = await res.text();
        try {
          setResponseData(JSON.parse(text));
        } catch {
          setResponseData({ raw: text });
        }
      }
    } catch (err: any) {
      setResponseStatus(500);
      setResponseData({ error: err.message || 'Network request failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>API Gateway & CRUD Tester</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          Test working CRUD endpoints across all 5 microservices through the centralized Spring Cloud Gateway (8080)
        </p>
      </div>

      {/* Control Console */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="grid-cols-2">
          {/* Target Service */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
              Target Microservice
            </label>
            <select
              value={selectedService.id}
              onChange={(e) => {
                const svc = serviceOptions.find((s) => s.id === e.target.value);
                if (svc) setSelectedService(svc);
              }}
              className="input-field"
              style={{ cursor: 'pointer' }}
            >
              {serviceOptions.map((svc) => (
                <option key={svc.id} value={svc.id} style={{ background: '#0f172a', color: '#ffffff' }}>
                  {svc.name} (Direct: {svc.port} / Route: {svc.path})
                </option>
              ))}
            </select>
          </div>

          {/* HTTP Method */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
              HTTP Method
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['GET', 'POST', 'PUT', 'DELETE'] as const).map((m) => {
                const isSelected = method === m;
                const colorMap = {
                  GET: '#3b82f6',
                  POST: '#10b981',
                  PUT: '#f59e0b',
                  DELETE: '#ef4444'
                };
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className="btn"
                    style={{
                      flex: 1,
                      background: isSelected ? colorMap[m] : 'rgba(30, 41, 59, 0.6)',
                      color: '#ffffff',
                      border: isSelected ? 'none' : '1px solid rgba(71, 85, 105, 0.4)',
                      padding: '0.5rem 0'
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* URL Bar */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
            Full Request URL
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              readOnly
              value={getFullUrl()}
              className="input-field"
              style={{ fontFamily: 'monospace', color: '#60a5fa', background: 'rgba(15, 23, 42, 0.95)' }}
            />
            <button
              onClick={handleExecute}
              disabled={isLoading}
              className="btn btn-primary"
              style={{ padding: '0 1.5rem', whiteSpace: 'nowrap' }}
            >
              <Send size={16} />
              {isLoading ? 'Executing...' : 'Send Request'}
            </button>
          </div>
        </div>

        {/* Parameters & Payload Form */}
        {(method === 'GET' || method === 'PUT' || method === 'DELETE') && (
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
              Resource ID (Optional for GET all, required for single/update/delete)
            </label>
            <input
              type="number"
              placeholder="e.g. 1 (Leave empty to GET all test items)"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="input-field"
              style={{ maxWidth: '300px' }}
            />
          </div>
        )}

        {(method === 'POST' || method === 'PUT') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(59, 130, 246, 0.15)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>Request Body (JSON)</div>
            <div className="grid-cols-3">
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="input-field"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="CREATED">CREATED</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="QUEUED">QUEUED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Response Viewer */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Code2 size={18} color="#60a5fa" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Response Inspector</h2>
          </div>

          {responseStatus !== null && (
            <span 
              className={`badge ${responseStatus >= 200 && responseStatus < 300 ? 'badge-success' : 'badge-danger'}`}
              style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}
            >
              Status: {responseStatus}
            </span>
          )}
        </div>

        <div style={{
          background: '#090d16',
          borderRadius: '8px',
          border: '1px solid rgba(59, 130, 246, 0.1)',
          padding: '1.25rem',
          minHeight: '220px',
          maxHeight: '400px',
          overflow: 'auto',
        }}>
          {isLoading ? (
            <div style={{ color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Waiting for response from Gateway...
            </div>
          ) : responseData !== null ? (
            <pre style={{ margin: 0, fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.6 }}>
              {JSON.stringify(responseData, null, 2)}
            </pre>
          ) : (
            <div style={{ color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Click "Send Request" above to test the endpoint. The response payload will be formatted and displayed here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
