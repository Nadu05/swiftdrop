'use client';

import Link from 'next/link';
import CustomerSummarySection from '@/components/admin/CustomerSummarySection';
import { Target, ArrowLeft, RefreshCw } from 'lucide-react';

/**
 * Administrator Customer Section
 * Route: /customers
 *
 * Implements the Customer Summary & Management section styled with the exact
 * same clean color theme used across the Customer Portal:
 * - Pinned Navy Header: #0f1f38
 * - Clean Light Canvas: #f4f7fb
 * - White Cards: #ffffff with #e2e8f0 borders
 * - Typography: #0f172a headings, #64748b secondary
 */
export default function AdminCustomersPage() {
  return (
    <div className="sd-fullpage-root">
      {/* ---------------- EDGE-TO-EDGE TOP HEADER BAR ---------------- */}
      <header className="sd-fullpage-header">
        <div className="sd-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.95rem' }}>
            <div className="sd-header-icon-box">
              <Target size={20} color="#38bdf8" />
            </div>
            <div>
              <h1 className="sd-header-title">Customer Summary &amp; Management</h1>
              <div className="sd-header-sub">
                Administrator Oversight · Demographic Intelligence &amp; Accounts Directory
              </div>
            </div>
          </div>

          <div className="sd-header-actions">
            <Link
              href="/"
              className="sd-header-action-btn secondary"
            >
              <ArrowLeft size={14} /> Back to Overview
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- MAIN CANVAS (LIGHT THEME) ---------------- */}
      <main className="sd-fullpage-body">
        <div className="sd-content-wrapper">
          <CustomerSummarySection />
        </div>
      </main>

      {/* ---------------- FULLPAGE CONTAINER STYLES ---------------- */}
      <style jsx global>{`
        .sd-fullpage-root {
          width: 100%;
          min-height: 100vh;
          background: #f4f7fb;
          display: flex;
          flex-direction: column;
        }

        /* Top Header Bar */
        .sd-fullpage-header {
          background: #0f1f38;
          color: #ffffff;
          padding: 1.25rem 2.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          width: 100%;
        }

        .sd-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.25rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .sd-header-icon-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-header-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.01em;
          margin: 0;
          line-height: 1.2;
        }

        .sd-header-sub {
          font-size: 0.78rem;
          color: #8fa3bf;
          margin-top: 3px;
          font-weight: 500;
        }

        .sd-header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .sd-header-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s ease;
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .sd-header-action-btn:hover {
          background: rgba(255, 255, 255, 0.18);
        }

        .sd-header-action-btn.secondary {
          background: transparent;
          border-color: rgba(255, 255, 255, 0.1);
          color: #8fa3bf;
        }

        .sd-header-action-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        /* Body Canvas */
        .sd-fullpage-body {
          flex: 1;
          padding: 2rem 2.5rem 4rem 2.5rem;
          background: #f4f7fb;
          width: 100%;
        }

        .sd-content-wrapper {
          max-width: 1400px;
          margin: 0 auto;
        }

        @media (max-width: 768px) {
          .sd-fullpage-header {
            padding: 1rem 1.25rem;
          }

          .sd-fullpage-body {
            padding: 1.25rem 1rem 3rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}
