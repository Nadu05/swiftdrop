'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink,
  Eye,
  Info,
  RefreshCw,
  ServerOff,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  WifiOff,
} from 'lucide-react';
import type { PreviewScenarioState } from '@/api/mock/branch-dashboard.mock';

export interface BranchDashboardPreviewBannerProps {
  scenario: PreviewScenarioState;
  onScenarioChange: (scenario: PreviewScenarioState) => void;
  onTogglePreview: (active: boolean) => void;
  onSimulateRefresh: () => void;
  isRefreshing?: boolean;
}

export default function BranchDashboardPreviewBanner({
  scenario,
  onScenarioChange,
  onTogglePreview,
  onSimulateRefresh,
  isRefreshing = false,
}: BranchDashboardPreviewBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="org-preview-banner"
      role="region"
      aria-label="Development Preview controls"
      data-testid="branch-dashboard-preview-banner"
    >
      <div className="org-preview-banner__main">
        <div className="org-preview-banner__identity">
          <div className="org-preview-banner__badge">
            <Sparkles size={14} className="text-amber-500 animate-pulse" aria-hidden="true" />
            <span className="font-bold tracking-wide uppercase text-[11px]">
              Development Preview Active
            </span>
          </div>

          <div className="org-preview-banner__text">
            <span className="font-bold text-slate-900 text-sm">
              Colombo Central Branch (CMB-001) · Demonstration Data
            </span>
            <span className="text-xs text-slate-600 block sm:inline sm:ml-2">
              Realistic Sri Lankan delivery operations preview while backend services are in development.
            </span>
          </div>
        </div>

        <div className="org-preview-banner__actions">
          <button
            type="button"
            className="org-preview-pill-btn org-preview-pill-btn--refresh"
            onClick={onSimulateRefresh}
            disabled={isRefreshing}
            title="Simulate dashboard data refresh"
          >
            <RefreshCw
              size={13}
              className={isRefreshing ? 'org-icon--spinning text-blue-600' : 'text-slate-600'}
              aria-hidden="true"
            />
            <span className="text-xs font-semibold">
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>

          <button
            type="button"
            className="org-preview-pill-btn org-preview-pill-btn--toggle"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            title="Configure preview scenarios"
          >
            <span className="text-xs font-semibold">
              Scenario: <strong>{scenario}</strong>
            </span>
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          <button
            type="button"
            className="org-preview-pill-btn org-preview-pill-btn--danger"
            onClick={() => onTogglePreview(false)}
            title="Disable preview mode and return to real API Gateway calls"
          >
            <ToggleRight size={14} className="text-emerald-600" aria-hidden="true" />
            <span className="text-xs font-semibold">Exit Preview</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="org-preview-banner__drawer">
          <div className="org-preview-banner__scenario-grid">
            <button
              type="button"
              className={`org-preview-scenario-card ${
                scenario === 'NORMAL' ? 'org-preview-scenario-card--active' : ''
              }`}
              onClick={() => onScenarioChange('NORMAL')}
            >
              <div className="flex items-center gap-2">
                <Database size={15} className="text-blue-600" />
                <strong className="text-xs font-bold text-slate-800">
                  Normal Operations
                </strong>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                42 incoming, 8 unassigned, 21 assigned, 8 couriers, complete performance KPIs.
              </p>
            </button>

            <button
              type="button"
              className={`org-preview-scenario-card ${
                scenario === 'EMPTY' ? 'org-preview-scenario-card--active' : ''
              }`}
              onClick={() => onScenarioChange('EMPTY')}
            >
              <div className="flex items-center gap-2">
                <Info size={15} className="text-amber-600" />
                <strong className="text-xs font-bold text-slate-800">
                  Empty State
                </strong>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                0 queue requests, 0 registered couriers, no active dispatch jobs.
              </p>
            </button>

            <button
              type="button"
              className={`org-preview-scenario-card ${
                scenario === 'LOADING' ? 'org-preview-scenario-card--active' : ''
              }`}
              onClick={() => onScenarioChange('LOADING')}
            >
              <div className="flex items-center gap-2">
                <RefreshCw size={15} className="text-indigo-600" />
                <strong className="text-xs font-bold text-slate-800">
                  Loading Skeleton
                </strong>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Simulates asynchronous query loading states and pulse skeletons.
              </p>
            </button>

            <button
              type="button"
              className={`org-preview-scenario-card ${
                scenario === 'PARTIAL_DATA' ? 'org-preview-scenario-card--active' : ''
              }`}
              onClick={() => onScenarioChange('PARTIAL_DATA')}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                <strong className="text-xs font-bold text-slate-800">
                  Partial Data
                </strong>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Branch identity loaded, but queue &amp; analytics APIs are pending.
              </p>
            </button>

            <button
              type="button"
              className={`org-preview-scenario-card ${
                scenario === 'API_ERROR' ? 'org-preview-scenario-card--active' : ''
              }`}
              onClick={() => onScenarioChange('API_ERROR')}
            >
              <div className="flex items-center gap-2">
                <ServerOff size={15} className="text-red-600" />
                <strong className="text-xs font-bold text-slate-800">
                  API Unavailable
                </strong>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Simulates API Gateway failure with retry actions.
              </p>
            </button>
          </div>

          <div className="org-preview-banner__notice">
            <Info size={14} className="text-blue-600 shrink-0" aria-hidden="true" />
            <span className="text-xs text-slate-600">
              <strong>Preview Boundary:</strong> UI interactions update displayed mock data locally. No real database records or backend assignments are altered. Disabling preview mode restores live API Gateway calls (<code className="org-inline-code">NEXT_PUBLIC_API_BASE_URL</code>).
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

