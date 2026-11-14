'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  User,
  UserCheck,
  UserX,
  UserPlus,
  Package,
  Truck,
  CheckCircle2,
  TrendingUp,
  Search,
  Eye,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Building,
  Activity,
  Compass,
} from 'lucide-react';

export interface AdminCustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  status: 'ACTIVE' | 'NEW' | 'INACTIVE';
  registeredDate: string;
  totalOrders: number;
  totalSpentLkr: number;
  activeOrdersCount: number;
  lastActive: string;
  recentOrders: {
    id: string;
    trackingNumber: string;
    date: string;
    route: string;
    feeLkr: number;
    status: 'Delivered' | 'In Transit' | 'Created' | 'Cancelled';
  }[];
}

export interface CustomerActivityEvent {
  id: string;
  customerId: string;
  customerName: string;
  action: string;
  target: string;
  timeAgo: string;
  type: 'order' | 'tracking' | 'profile' | 'payment';
}

const mockCustomers: AdminCustomerRecord[] = [
  {
    id: 'CUST-1001',
    name: 'Nuwan Pradeep',
    email: 'customer@swiftdrop.lk',
    phone: '+94 77 123 4567',
    address: 'No. 45, Galle Road, Colombo 03',
    city: 'Colombo',
    status: 'ACTIVE',
    registeredDate: '2026-10-15',
    totalOrders: 28,
    totalSpentLkr: 38500,
    activeOrdersCount: 1,
    lastActive: '6 mins ago',
    recentOrders: [
      { id: '10518', trackingNumber: 'SD-10518', date: '2026-11-10', route: 'Colombo 03 → Union Place', feeLkr: 1250, status: 'In Transit' },
      { id: '10492', trackingNumber: 'SD-10492', date: '2026-11-04', route: 'Colombo 03 → Kandy', feeLkr: 2400, status: 'Delivered' },
      { id: '10411', trackingNumber: 'SD-10411', date: '2026-10-28', route: 'Colombo 03 → Rajagiriya', feeLkr: 850, status: 'Delivered' },
    ],
  },
  {
    id: 'CUST-1002',
    name: 'Ayesha Perera',
    email: 'ayesha.perera@gmail.com',
    phone: '+94 71 884 9201',
    address: '12/4 Peradeniya Road, Kandy',
    city: 'Kandy',
    status: 'ACTIVE',
    registeredDate: '2026-10-02',
    totalOrders: 19,
    totalSpentLkr: 29400,
    activeOrdersCount: 2,
    lastActive: '22 mins ago',
    recentOrders: [
      { id: '10520', trackingNumber: 'SD-10520', date: '2026-11-11', route: 'Kandy → Colombo Central', feeLkr: 1950, status: 'Created' },
      { id: '10502', trackingNumber: 'SD-10502', date: '2026-11-06', route: 'Kandy → Negombo', feeLkr: 2100, status: 'Delivered' },
    ],
  },
  {
    id: 'CUST-1003',
    name: 'Sanduni Senaratne',
    email: 'sanduni.s@outlook.com',
    phone: '+94 76 331 4455',
    address: '88/2 Bauddhaloka Mawatha, Colombo 04',
    city: 'Colombo',
    status: 'NEW',
    registeredDate: '2026-11-09',
    totalOrders: 3,
    totalSpentLkr: 4200,
    activeOrdersCount: 1,
    lastActive: '45 mins ago',
    recentOrders: [
      { id: '10515', trackingNumber: 'SD-10515', date: '2026-11-09', route: 'Colombo 04 → Colombo Central', feeLkr: 1250, status: 'In Transit' },
    ],
  },
  {
    id: 'CUST-1004',
    name: 'Roshan Fernando',
    email: 'roshan.fernando@gmail.com',
    phone: '+94 72 901 3322',
    address: '24 Beach Road, Negombo',
    city: 'Negombo',
    status: 'ACTIVE',
    registeredDate: '2026-09-18',
    totalOrders: 42,
    totalSpentLkr: 61800,
    activeOrdersCount: 0,
    lastActive: '1 day ago',
    recentOrders: [
      { id: '10475', trackingNumber: 'SD-10475', date: '2026-11-02', route: 'Negombo → Colombo Central', feeLkr: 1100, status: 'Delivered' },
    ],
  },
  {
    id: 'CUST-1005',
    name: 'Nadeeka Bandara',
    email: 'nadeeka.b@yahoo.com',
    phone: '+94 70 219 5567',
    address: '56 Colombo Road, Gampaha',
    city: 'Gampaha',
    status: 'INACTIVE',
    registeredDate: '2026-08-11',
    totalOrders: 5,
    totalSpentLkr: 6900,
    activeOrdersCount: 0,
    lastActive: '38 days ago',
    recentOrders: [
      { id: '10210', trackingNumber: 'SD-10210', date: '2026-09-24', route: 'Gampaha → Kandy', feeLkr: 1450, status: 'Delivered' },
    ],
  },
  {
    id: 'CUST-1006',
    name: 'Kasun Rathnayake',
    email: 'kasun.rathnayake@gmail.com',
    phone: '+94 77 554 1120',
    address: '73 Rampart Street, Galle Fort',
    city: 'Galle',
    status: 'ACTIVE',
    registeredDate: '2026-10-10',
    totalOrders: 14,
    totalSpentLkr: 21300,
    activeOrdersCount: 1,
    lastActive: '3 hours ago',
    recentOrders: [
      { id: '10512', trackingNumber: 'SD-10512', date: '2026-11-08', route: 'Galle → Matara Hub', feeLkr: 1200, status: 'In Transit' },
    ],
  },
  {
    id: 'CUST-1007',
    name: 'Dinesh Jayasuriya',
    email: 'dinesh.j@finance.lk',
    phone: '+94 71 445 9988',
    address: '108 Horton Place, Colombo 07',
    city: 'Colombo',
    status: 'NEW',
    registeredDate: '2026-11-10',
    totalOrders: 1,
    totalSpentLkr: 1250,
    activeOrdersCount: 1,
    lastActive: '5 hours ago',
    recentOrders: [
      { id: '10521', trackingNumber: 'SD-10521', date: '2026-11-10', route: 'Colombo 07 → Colombo 03', feeLkr: 1250, status: 'Created' },
    ],
  },
];

const mockCustomerActivities: CustomerActivityEvent[] = [
  {
    id: 'ACT-1',
    customerId: 'CUST-1001',
    customerName: 'Nuwan Pradeep',
    action: 'Placed delivery booking',
    target: '#SD-10518 to Union Place',
    timeAgo: '6 mins ago',
    type: 'order',
  },
  {
    id: 'ACT-2',
    customerId: 'CUST-1002',
    customerName: 'Ayesha Perera',
    action: 'Created delivery request',
    target: '#SD-10520 to Colombo Central',
    timeAgo: '22 mins ago',
    type: 'order',
  },
  {
    id: 'ACT-3',
    customerId: 'CUST-1003',
    customerName: 'Sanduni Senaratne',
    action: 'Tracked live parcel',
    target: '#SD-10515 via Public Tracking',
    timeAgo: '45 mins ago',
    type: 'tracking',
  },
  {
    id: 'ACT-4',
    customerId: 'CUST-1007',
    customerName: 'Dinesh Jayasuriya',
    action: 'Registered verified account',
    target: 'Identity Service (Colombo 07)',
    timeAgo: '5 hours ago',
    type: 'profile',
  },
  {
    id: 'ACT-5',
    customerId: 'CUST-1004',
    customerName: 'Roshan Fernando',
    action: 'Downloaded VAT receipt',
    target: 'Order #SD-10475 (LKR 1,100)',
    timeAgo: '1 day ago',
    type: 'payment',
  },
];

/**
 * CustomerSummarySection
 * Styled to match the exact Customer Portal color theme:
 * - Canvas: #f4f7fb
 * - Cards: #ffffff with #e2e8f0 border
 * - Text: #0f172a headings, #64748b secondary
 * - Accents: #2563eb royal blue, #16a34a green, #d97706 amber, #7c3aed purple
 */
export default function CustomerSummarySection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'NEW' | 'INACTIVE'>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomerRecord | null>(null);

  // Aggregate metrics
  const totalCount = 1428;
  const activeCount = 1284;
  const inactiveCount = 144;
  const newCount = 68;

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return mockCustomers.filter((c) => {
      const matchesSearch =
        searchQuery === '' ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery);

      const matchesStatus =
        statusFilter === 'ALL' || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const getStatusBadge = (status: AdminCustomerRecord['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="sd-light-badge active">
            <span className="sd-badge-dot green"></span>
            Active
          </span>
        );
      case 'NEW':
        return (
          <span className="sd-light-badge new">
            <span className="sd-badge-dot blue"></span>
            New
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="sd-light-badge inactive">
            <span className="sd-badge-dot gray"></span>
            Inactive
          </span>
        );
    }
  };

  return (
    <div className="sd-cust-summary-wrapper">
      {/* ---------------- 1. CORE METRICS ROW (4 CARDS) ---------------- */}
      <div className="sd-metrics-grid">
        {/* Total Customers */}
        <div className="sd-white-card sd-metric-card">
          <div className="sd-metric-top">
            <span className="sd-metric-lbl">Total Customers</span>
            <div className="sd-icon-box blue">
              <Users size={18} color="#2563eb" />
            </div>
          </div>
          <div className="sd-metric-num">{totalCount.toLocaleString()}</div>
          <div className="sd-metric-sub green">
            <TrendingUp size={13} />
            <span>+12.4% vs last month</span>
          </div>
        </div>

        {/* Active Customers */}
        <div className="sd-white-card sd-metric-card">
          <div className="sd-metric-top">
            <span className="sd-metric-lbl">Active Customers</span>
            <div className="sd-icon-box green">
              <UserCheck size={18} color="#16a34a" />
            </div>
          </div>
          <div className="sd-metric-num" style={{ color: '#15803d' }}>
            {activeCount.toLocaleString()}
          </div>
          <div className="sd-metric-sub muted">
            89.9% 30-day activity rate
          </div>
        </div>

        {/* Inactive Customers */}
        <div className="sd-white-card sd-metric-card">
          <div className="sd-metric-top">
            <span className="sd-metric-lbl">Inactive Customers</span>
            <div className="sd-icon-box amber">
              <UserX size={18} color="#d97706" />
            </div>
          </div>
          <div className="sd-metric-num" style={{ color: '#b45309' }}>
            {inactiveCount}
          </div>
          <div className="sd-metric-sub muted">
            No orders in &gt; 60 days
          </div>
        </div>

        {/* New Customers */}
        <div className="sd-white-card sd-metric-card">
          <div className="sd-metric-top">
            <span className="sd-metric-lbl">New Signups</span>
            <div className="sd-icon-box purple">
              <UserPlus size={18} color="#7c3aed" />
            </div>
          </div>
          <div className="sd-metric-num" style={{ color: '#6d28d9' }}>
            {newCount}
          </div>
          <div className="sd-metric-sub muted">
            Registered past 7 days
          </div>
        </div>
      </div>

      {/* ---------------- 2. DELIVERY STATISTICS STRIP ---------------- */}
      <div className="sd-white-card sd-delivery-strip">
        <div className="sd-strip-col">
          <div className="sd-icon-box blue">
            <Package size={20} color="#2563eb" />
          </div>
          <div>
            <div className="sd-strip-lbl">Total Customer Orders</div>
            <div className="sd-strip-val">5,940</div>
            <div className="sd-strip-hint">Order Service Database</div>
          </div>
        </div>

        <div className="sd-strip-col">
          <div className="sd-icon-box amber">
            <Truck size={20} color="#d97706" />
          </div>
          <div>
            <div className="sd-strip-lbl">Active In-Transit</div>
            <div className="sd-strip-val" style={{ color: '#b45309' }}>142</div>
            <div className="sd-strip-hint">Branch delivery fleet</div>
          </div>
        </div>

        <div className="sd-strip-col">
          <div className="sd-icon-box green">
            <CheckCircle2 size={20} color="#16a34a" />
          </div>
          <div>
            <div className="sd-strip-lbl">Fulfilled Deliveries</div>
            <div className="sd-strip-val" style={{ color: '#15803d' }}>5,684</div>
            <div className="sd-strip-hint">95.7% completion success</div>
          </div>
        </div>

        <div className="sd-strip-col">
          <div className="sd-icon-box purple">
            <CreditCard size={20} color="#7c3aed" />
          </div>
          <div>
            <div className="sd-strip-lbl">Total Customer Volume</div>
            <div className="sd-strip-val">LKR 8.62M</div>
            <div className="sd-strip-hint">Avg. LKR 1,450 / booking</div>
          </div>
        </div>
      </div>

      {/* ---------------- 3. SPLIT SECTION: RECENT CUSTOMERS (LEFT) & RECENT ACTIVITY (RIGHT) ---------------- */}
      <div className="sd-split-grid">
        {/* LEFT COLUMN: RECENT CUSTOMERS TABLE */}
        <div className="sd-white-card sd-table-card">
          <div className="sd-card-header-row">
            <div>
              <h3 className="sd-card-heading">Recent Customers</h3>
              <p className="sd-card-subheading">
                Showing {filteredCustomers.length} registered customer accounts
              </p>
            </div>

            {/* Status Filter Tabs */}
            <div className="sd-status-tabs">
              {(['ALL', 'ACTIVE', 'NEW', 'INACTIVE'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`sd-tab-btn ${statusFilter === tab ? 'active' : ''}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="sd-search-bar-wrap">
            <Search size={16} color="#64748b" className="sd-search-ico" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, email, phone, or city..."
              className="sd-search-inp"
            />
          </div>

          {/* Customers Table */}
          <div className="sd-table-scroll">
            <table className="sd-light-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Orders</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="sd-empty-td">
                      No customers matching your search query.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => (
                    <tr key={cust.id}>
                      {/* Name & Email */}
                      <td>
                        <div className="sd-cust-profile-cell">
                          <div className="sd-cust-avatar">
                            {cust.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div className="sd-cust-name">{cust.name}</div>
                            <div className="sd-cust-email">{cust.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* City */}
                      <td className="sd-cust-city">{cust.city}</td>

                      {/* Status */}
                      <td>{getStatusBadge(cust.status)}</td>

                      {/* Total Orders */}
                      <td>
                        <div className="sd-orders-num">{cust.totalOrders}</div>
                        <div className="sd-orders-spend">LKR {cust.totalSpentLkr.toLocaleString()}</div>
                      </td>

                      {/* Action View */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(cust)}
                          className="sd-view-btn"
                        >
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT CUSTOMER ACTIVITY LOG */}
        <div className="sd-white-card sd-activity-card">
          <div className="sd-card-header-row">
            <div>
              <h3 className="sd-card-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} color="#2563eb" />
                Customer Activity
              </h3>
              <p className="sd-card-subheading">
                Real-time customer interaction events
              </p>
            </div>
            <span className="sd-light-badge active">Live</span>
          </div>

          <div className="sd-activity-list">
            {mockCustomerActivities.map((act) => (
              <div key={act.id} className="sd-activity-item">
                <div className={`sd-act-icon-box ${act.type}`}>
                  {act.type === 'order' && <Package size={15} color="#2563eb" />}
                  {act.type === 'tracking' && <Compass size={15} color="#0891b2" />}
                  {act.type === 'profile' && <User size={15} color="#7c3aed" />}
                  {act.type === 'payment' && <CreditCard size={15} color="#16a34a" />}
                </div>

                <div className="sd-act-details">
                  <div className="sd-act-customer">{act.customerName}</div>
                  <div className="sd-act-desc">
                    {act.action} <span className="sd-act-target">{act.target}</span>
                  </div>
                  <div className="sd-act-time">
                    <Clock size={11} /> {act.timeAgo}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------- 4. INTERACTIVE CUSTOMER DETAILS MODAL ---------------- */}
      {selectedCustomer && (
        <div className="sd-modal-backdrop" onClick={() => setSelectedCustomer(null)}>
          <div className="sd-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sd-modal-head">
              <div className="sd-modal-user-top">
                <div className="sd-modal-avatar">
                  {selectedCustomer.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div className="sd-modal-name-row">
                    <h3 className="sd-modal-name">{selectedCustomer.name}</h3>
                    {getStatusBadge(selectedCustomer.status)}
                  </div>
                  <div className="sd-modal-id">
                    Customer ID: <code>{selectedCustomer.id}</code> · Active: {selectedCustomer.lastActive}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="sd-modal-close-btn"
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Contact Grid */}
            <div className="sd-modal-contact-grid">
              <div className="sd-modal-contact-card">
                <div className="lbl"><Mail size={13} /> Email Address</div>
                <div className="val">{selectedCustomer.email}</div>
              </div>
              <div className="sd-modal-contact-card">
                <div className="lbl"><Phone size={13} /> Phone Number</div>
                <div className="val">{selectedCustomer.phone}</div>
              </div>
              <div className="sd-modal-contact-card">
                <div className="lbl"><MapPin size={13} /> Registered Address</div>
                <div className="val">{selectedCustomer.address}</div>
              </div>
              <div className="sd-modal-contact-card">
                <div className="lbl"><Calendar size={13} /> Member Since</div>
                <div className="val">{selectedCustomer.registeredDate}</div>
              </div>
            </div>

            {/* Metric Strip inside Modal */}
            <div className="sd-modal-metrics">
              <div className="sd-modal-metric-box">
                <span className="lbl">Total Orders</span>
                <span className="val">{selectedCustomer.totalOrders}</span>
              </div>
              <div className="sd-modal-metric-box">
                <span className="lbl">Total Spend</span>
                <span className="val green">LKR {selectedCustomer.totalSpentLkr.toLocaleString()}</span>
              </div>
              <div className="sd-modal-metric-box">
                <span className="lbl">Active Deliveries</span>
                <span className="val blue">{selectedCustomer.activeOrdersCount}</span>
              </div>
            </div>

            {/* Recent Orders inside Modal */}
            <div>
              <h4 className="sd-modal-section-title">Recent Delivery Requests</h4>
              <div className="sd-table-scroll">
                <table className="sd-light-table mini">
                  <thead>
                    <tr>
                      <th>Tracking #</th>
                      <th>Date</th>
                      <th>Route</th>
                      <th>Fee</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomer.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <span className="sd-tracking-link">
                            {order.trackingNumber}
                          </span>
                        </td>
                        <td className="muted">{order.date}</td>
                        <td>{order.route}</td>
                        <td className="bold">LKR {order.feeLkr.toLocaleString()}</td>
                        <td>
                          {order.status === 'Delivered' && (
                            <span className="sd-light-badge active">Delivered</span>
                          )}
                          {order.status === 'In Transit' && (
                            <span className="sd-light-badge new">In Transit</span>
                          )}
                          {order.status === 'Created' && (
                            <span className="sd-light-badge amber">Created</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="sd-modal-footer">
              <Link
                href={`/tracking?number=${selectedCustomer.recentOrders[0]?.trackingNumber || 'SD-10518'}`}
                className="sd-modal-action-btn primary"
              >
                Track Latest Parcel ({selectedCustomer.recentOrders[0]?.trackingNumber || 'SD-10518'}) →
              </Link>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="sd-modal-action-btn secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- STYLES (CUSTOMER PORTAL COLOR THEME) ---------------- */}
      <style jsx global>{`
        .sd-cust-summary-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }

        /* Pure White Card panels matching customer portal */
        .sd-white-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .sd-white-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.05);
        }

        /* Metrics Row */
        .sd-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
        }

        .sd-metric-card {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          padding: 1.35rem 1.45rem;
        }

        .sd-metric-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.35rem;
        }

        .sd-metric-lbl {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 600;
        }

        .sd-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-icon-box.blue {
          background: #e0ecfe;
        }

        .sd-icon-box.green {
          background: #dcfce7;
        }

        .sd-icon-box.amber {
          background: #fef3c7;
        }

        .sd-icon-box.purple {
          background: #f3e8ff;
        }

        .sd-metric-num {
          font-size: 1.85rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .sd-metric-sub {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 600;
          margin-top: 0.2rem;
        }

        .sd-metric-sub.green {
          color: #16a34a;
        }

        .sd-metric-sub.muted {
          color: #64748b;
          font-weight: 500;
        }

        /* Delivery Statistics Strip */
        .sd-delivery-strip {
          padding: 1.35rem 1.65rem;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }

        .sd-strip-col {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .sd-strip-lbl {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .sd-strip-val {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0f172a;
          margin-top: 1px;
        }

        .sd-strip-hint {
          font-size: 0.7rem;
          color: #94a3b8;
          margin-top: 1px;
        }

        /* Split Section */
        .sd-split-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
          gap: 1.5rem;
        }

        .sd-card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 1.15rem;
        }

        .sd-card-heading {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .sd-card-subheading {
          font-size: 0.775rem;
          color: #64748b;
          margin: 3px 0 0 0;
        }

        /* Status Tabs */
        .sd-status-tabs {
          display: flex;
          gap: 0.25rem;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 9px;
          border: 1px solid #e2e8f0;
        }

        .sd-tab-btn {
          background: transparent;
          color: #64748b;
          border: none;
          border-radius: 7px;
          padding: 0.35rem 0.75rem;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }

        .sd-tab-btn:hover {
          color: #0f172a;
        }

        .sd-tab-btn.active {
          background: #2563eb;
          color: #ffffff;
        }

        /* Search Bar */
        .sd-search-bar-wrap {
          position: relative;
          margin-bottom: 1rem;
        }

        .sd-search-ico {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }

        .sd-search-inp {
          width: 100%;
          padding: 0.65rem 0.85rem 0.65rem 2.35rem;
          border-radius: 10px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #0f172a;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          font-family: inherit;
        }

        .sd-search-inp::placeholder {
          color: #94a3b8;
        }

        .sd-search-inp:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        /* Table Styles */
        .sd-table-scroll {
          overflow-x: auto;
          width: 100%;
        }

        .sd-light-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .sd-light-table th {
          padding: 0.65rem 0.65rem;
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
        }

        .sd-light-table td {
          padding: 0.85rem 0.65rem;
          border-bottom: 1px solid #f1f5f9;
          color: #0f172a;
          vertical-align: middle;
        }

        .sd-light-table tr:hover td {
          background: #f8fafc;
        }

        .sd-empty-td {
          padding: 2.5rem !important;
          text-align: center;
          color: #64748b !important;
        }

        .sd-cust-profile-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .sd-cust-avatar {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: #e0ecfe;
          color: #2563eb;
          font-weight: 700;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-cust-name {
          font-weight: 700;
          color: #0f172a;
          line-height: 1.25;
        }

        .sd-cust-email {
          font-size: 0.72rem;
          color: #64748b;
          margin-top: 1px;
        }

        .sd-cust-city {
          color: #334155;
          font-weight: 500;
        }

        .sd-orders-num {
          font-weight: 700;
          color: #0f172a;
        }

        .sd-orders-spend {
          font-size: 0.7rem;
          color: #64748b;
        }

        .sd-view-btn {
          padding: 0.4rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 600;
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          transition: all 0.15s ease;
          font-family: inherit;
        }

        .sd-view-btn:hover {
          background: #e0ecfe;
          border-color: #93c5fd;
          color: #1d4ed8;
        }

        /* Light Badges */
        .sd-light-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .sd-light-badge.active {
          background: #dcfce7;
          color: #15803d;
        }

        .sd-light-badge.new {
          background: #e0ecfe;
          color: #1d4ed8;
        }

        .sd-light-badge.inactive {
          background: #f1f5f9;
          color: #64748b;
        }

        .sd-light-badge.amber {
          background: #fef3c7;
          color: #b45309;
        }

        .sd-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .sd-badge-dot.green {
          background: #16a34a;
        }

        .sd-badge-dot.blue {
          background: #2563eb;
        }

        .sd-badge-dot.gray {
          background: #94a3b8;
        }

        /* Activity Feed */
        .sd-activity-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sd-activity-item {
          padding: 0.85rem;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .sd-act-icon-box {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .sd-act-icon-box.order {
          background: #e0ecfe;
        }

        .sd-act-icon-box.tracking {
          background: #e0f2fe;
        }

        .sd-act-icon-box.profile {
          background: #f3e8ff;
        }

        .sd-act-icon-box.payment {
          background: #dcfce7;
        }

        .sd-act-details {
          flex: 1;
          min-width: 0;
        }

        .sd-act-customer {
          font-size: 0.825rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-act-desc {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 2px;
        }

        .sd-act-target {
          color: #2563eb;
          font-weight: 600;
        }

        .sd-act-time {
          font-size: 0.7rem;
          color: #94a3b8;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        /* Modal Styles */
        .sd-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1.5rem;
        }

        .sd-modal-card {
          width: 100%;
          max-width: 680px;
          max-height: 90vh;
          overflow-y: auto;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
        }

        .sd-modal-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .sd-modal-user-top {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .sd-modal-avatar {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: #2563eb;
          color: #ffffff;
          font-weight: 800;
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
        }

        .sd-modal-name-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .sd-modal-name {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .sd-modal-id {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 3px;
        }

        .sd-modal-id code {
          color: #2563eb;
          background: #f1f5f9;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
        }

        .sd-modal-close-btn {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #64748b;
          padding: 0.45rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.15s ease;
        }

        .sd-modal-close-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .sd-modal-contact-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.85rem;
        }

        .sd-modal-contact-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          padding: 0.85rem 1rem;
        }

        .sd-modal-contact-card .lbl {
          font-size: 0.72rem;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-weight: 600;
        }

        .sd-modal-contact-card .val {
          font-size: 0.875rem;
          color: #0f172a;
          font-weight: 700;
          margin-top: 3px;
        }

        .sd-modal-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.85rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem;
        }

        .sd-modal-metric-box {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .sd-modal-metric-box .lbl {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 600;
        }

        .sd-modal-metric-box .val {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
        }

        .sd-modal-metric-box .val.green {
          color: #15803d;
        }

        .sd-modal-metric-box .val.blue {
          color: #2563eb;
        }

        .sd-modal-section-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 0.75rem 0;
        }

        .sd-tracking-link {
          color: #2563eb;
          font-weight: 700;
        }

        .sd-light-table.mini td, .sd-light-table.mini th {
          padding: 0.55rem 0.5rem;
          font-size: 0.78rem;
        }

        .sd-light-table.mini td.muted {
          color: #64748b;
        }

        .sd-light-table.mini td.bold {
          font-weight: 700;
        }

        .sd-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding-top: 0.5rem;
          border-top: 1px solid #f1f5f9;
        }

        .sd-modal-action-btn {
          padding: 0.65rem 1.25rem;
          border-radius: 10px;
          font-size: 0.825rem;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.15s ease;
          font-family: inherit;
        }

        .sd-modal-action-btn.primary {
          background: #2563eb;
          color: #ffffff;
          border: none;
        }

        .sd-modal-action-btn.primary:hover {
          background: #1d4ed8;
        }

        .sd-modal-action-btn.secondary {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #e2e8f0;
        }

        .sd-modal-action-btn.secondary:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .sd-metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .sd-delivery-strip {
            grid-template-columns: repeat(2, 1fr);
          }

          .sd-split-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .sd-metrics-grid {
            grid-template-columns: 1fr;
          }

          .sd-delivery-strip {
            grid-template-columns: 1fr;
          }

          .sd-modal-contact-grid {
            grid-template-columns: 1fr;
          }

          .sd-modal-metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
