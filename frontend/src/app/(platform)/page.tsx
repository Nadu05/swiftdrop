'use client';

import Link from 'next/link';
import { 
  Server, 
  Database, 
  MessageSquare, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  Play, 
  ExternalLink,
  Shield,
  Building,
  Package,
  Truck,
  Bell,
  Target,
  Users
} from 'lucide-react';

const services = [
  {
    name: 'Identity Service',
    description: 'User accounts, authentication, JWT tokens, RBAC roles & permissions',
    port: 8081,
    dbName: 'swiftdrop_identity',
    path: '/api/v1/identity',
    icon: Shield,
    color: '#3b82f6'
  },
  {
    name: 'Organization Service',
    description: 'Head Office, regional hubs, sub-offices, branch hierarchy & staff assignments',
    port: 8082,
    dbName: 'swiftdrop_organization',
    path: '/api/v1/organization',
    icon: Building,
    color: '#8b5cf6'
  },
  {
    name: 'Order Service',
    description: 'Parcel tracking, delivery order lifecycle, payment records, order status logs',
    port: 8083,
    dbName: 'swiftdrop_order',
    path: '/api/v1/orders',
    icon: Package,
    color: '#06b6d4'
  },
  {
    name: 'Dispatch Service',
    description: 'Courier assignment, automated dispatching algorithms, delivery runs',
    port: 8084,
    dbName: 'swiftdrop_dispatch',
    path: '/api/v1/dispatch',
    icon: Truck,
    color: '#f59e0b'
  },
  {
    name: 'Notification Service',
    description: 'SMS, push notifications, email alerts, customer delivery event updates',
    port: 8085,
    dbName: 'swiftdrop_notification',
    path: '/api/v1/notifications',
    icon: Bell,
    color: '#ec4899'
  }
];

export default function DashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero Welcome */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        borderRadius: '16px',
        padding: '2rem 2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-primary">University Project Architecture</span>
            <span className="badge badge-success">Local Docker Ready</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            SwiftDrop Delivery Platform
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '640px' }}>
            Microservices architecture featuring Spring Cloud Gateway, 5 isolated Spring Boot microservices, 5 dedicated PostgreSQL instances, and RabbitMQ event streaming.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/customer/dashboard" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
            Customer Portal →
          </Link>
          <Link href="/health" className="btn btn-secondary">
            <Play size={16} /> System Health
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Sign In / Switch Role
          </Link>
        </div>
      </div>

      {/* Role-Based Quick Access Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          background: 'rgba(15, 23, 42, 0.65)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
            Role Portals:
          </span>
          <Link
            href="/customers"
            className="badge badge-primary"
            style={{ textDecoration: 'none', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
          >
            Admin: Customers
          </Link>
          <Link
            href="/customer/dashboard"
            className="badge badge-info"
            style={{ textDecoration: 'none', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
          >
            Customer Portal
          </Link>
          <Link
            href="/dispatcher/dashboard"
            className="badge badge-warning"
            style={{ textDecoration: 'none', padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}
          >
            Branch Dispatcher
          </Link>
          <Link
            href="/book"
            className="badge badge-success"
            style={{ textDecoration: 'none', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
          >
            Book Delivery
          </Link>
          <Link
            href="/tracking"
            className="badge badge-info"
            style={{ textDecoration: 'none', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
          >
            Track Parcel
          </Link>
        </div>

        <Link
          href="/login"
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
        >
          Role-Based Login →
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid-cols-4">
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>API Gateway</span>
            <Server size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>Port 8080</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Spring Cloud Gateway (Reactive)</div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Microservices</span>
            <Layers size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>5 Services</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Isolated domain boundaries</div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Neon PostgreSQL</span>
            <Database size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>5 Databases</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Cloud Managed & TLS (5432)</div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Message Broker</span>
            <MessageSquare size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>RabbitMQ</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>AMQP (5672) & UI (15672)</div>
        </div>
      </div>

      {/* Customer Intelligence & Management Overview Banner */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          padding: '1.25rem 1.75rem',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.2) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            <Target size={22} color="#38bdf8" />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Customer Summary & Accounts Directory
              <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                1,428 Customers
              </span>
            </div>
            <div style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '2px' }}>
              1,284 active users (90% activity rate) · 5,940 total orders · LKR 8.62M customer volume
            </div>
          </div>
        </div>

        <Link
          href="/customers"
          className="btn btn-primary"
          style={{ fontSize: '0.85rem', padding: '0.55rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          Open Customer Section <ArrowRight size={15} />
        </Link>
      </div>

      {/* Services Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff' }}>Microservices Inventory</h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Each service runs independently with its own database, Flyway migrations, and OpenAPI documentation</p>
          </div>
        </div>

        <div className="grid-cols-3">
          {services.map((svc) => {
            const Icon = svc.icon;
            return (
              <div key={svc.name} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: `rgba(${svc.color === '#3b82f6' ? '59, 130, 246' : svc.color === '#8b5cf6' ? '139, 92, 246' : svc.color === '#06b6d4' ? '6, 182, 212' : svc.color === '#f59e0b' ? '245, 158, 11' : '236, 72, 153'}, 0.15)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${svc.color}44`
                  }}>
                    <Icon size={20} color={svc.color} />
                  </div>
                  <span className="badge badge-success">
                    <span className="pulse-dot online"></span>
                    Port {svc.port}
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.35rem' }}>{svc.name}</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', minHeight: '38px' }}>{svc.description}</p>
                </div>

                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.7)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  fontSize: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Gateway Route:</span>
                    <code style={{ color: '#60a5fa' }}>{svc.path}/**</code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Database:</span>
                    <span style={{ color: '#e2e8f0' }}>{svc.dbName}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <Link 
                    href={`/api-tester?service=${svc.name.toLowerCase().split(' ')[0]}`}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem' }}
                  >
                    Test CRUD
                  </Link>
                  <a 
                    href={`http://localhost:${svc.port}/swagger-ui.html`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.65rem', fontSize: '0.75rem' }}
                    title="Open Swagger UI"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
