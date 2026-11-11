'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus, Clock, MapPin, Layers, Calculator, History } from 'lucide-react';
import ZoneSummaryCards from '@/components/dispatcher/zones/ZoneSummaryCards';
import ZoneFilters from '@/components/dispatcher/zones/ZoneFilters';
import ZoneTable from '@/components/dispatcher/zones/ZoneTable';
import ZoneFormModal from '@/components/dispatcher/zones/ZoneFormModal';
import PricingRulesTable from '@/components/dispatcher/zones/PricingRulesTable';
import PricingRuleFormModal from '@/components/dispatcher/zones/PricingRuleFormModal';
import PublicationControls from '@/components/dispatcher/zones/PublicationControls';
import PricingVersionHistory from '@/components/dispatcher/zones/PricingVersionHistory';
import PricingCalculator from '@/components/dispatcher/zones/PricingCalculator';
import {
  getZones,
  createZone,
  updateZone,
  toggleZoneStatus,
  getPricingRules,
  createPricingRule,
  updatePricingRule,
  publishPricingRule,
  rollbackPricingRule,
  getPricingVersionHistory,
  getZoneSummaryMetrics,
  getBranchOptions,
} from '@/components/dispatcher/zones/zonesPricingApi';
import type {
  DeliveryZone,
  PricingRule,
  PricingVersionRecord,
  ZoneSummaryMetrics,
  ZoneFilterState,
} from '@/components/dispatcher/zones/types';

export default function DeliveryZonesPricingPage() {
  const [activeTab, setActiveTab] = useState<'zones' | 'pricing' | 'calculator'>('zones');
  const [metrics, setMetrics] = useState<ZoneSummaryMetrics>({
    activeZones: 0,
    totalZones: 0,
    totalPricingRules: 0,
    publishedRules: 0,
    pendingChanges: 0,
  });

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [history, setHistory] = useState<PricingVersionRecord[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);

  const [zoneFilters, setZoneFilters] = useState<ZoneFilterState>({
    searchTerm: '',
    branchId: 'ALL',
    status: 'ALL',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  // Modals state
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishingRule, setPublishingRule] = useState<PricingRule | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const formatTimestamp = () => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date());
  };

  // Load initial branches
  useEffect(() => {
    let isMounted = true;
    async function loadBranches() {
      try {
        const branchOpts = await getBranchOptions();
        if (isMounted) setBranches(branchOpts);
      } catch (err) {
        console.warn('Could not load branch options:', err);
      }
    }
    loadBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch all zones, rules, history and metrics
  const loadData = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      else setIsLoading(true);

      const [loadedZones, loadedRules, loadedHistory, loadedMetrics] = await Promise.all([
        getZones(zoneFilters),
        getPricingRules(),
        getPricingVersionHistory(),
        getZoneSummaryMetrics(),
      ]);

      setZones(loadedZones);
      setRules(loadedRules);
      setHistory(loadedHistory);
      setMetrics(loadedMetrics);
      setLastUpdated(formatTimestamp());
    } catch (err) {
      console.error('Failed to load zones and pricing data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [zoneFilters]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Zone handlers
  const handleSaveZone = async (zoneData: Omit<DeliveryZone, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingZone) {
      await updateZone(editingZone.id, zoneData);
    } else {
      await createZone(zoneData);
    }
    await loadData(false);
  };

  const handleToggleZoneStatus = async (zoneId: string) => {
    await toggleZoneStatus(zoneId);
    await loadData(false);
  };

  const handleEditZone = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setIsZoneModalOpen(true);
  };

  const handleViewZoneDetails = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setIsZoneModalOpen(true);
  };

  // Pricing rule handlers
  const handleSaveRule = async (
    ruleData: Omit<PricingRule, 'id' | 'ruleCode' | 'version' | 'status' | 'publishedAt'>
  ) => {
    if (editingRule) {
      await updatePricingRule(editingRule.id, ruleData);
    } else {
      await createPricingRule(ruleData);
    }
    await loadData(false);
  };

  const handlePublishClick = (rule: PricingRule) => {
    setPublishingRule(rule);
    setIsPublishModalOpen(true);
  };

  const handleConfirmPublish = async (ruleId: string) => {
    await publishPricingRule(ruleId);
    await loadData(false);
  };

  const handleDeactivateRule = async (ruleId: string) => {
    await updatePricingRule(ruleId, { status: 'ARCHIVED' });
    await loadData(false);
  };

  const handleRollback = async (ruleId: string, version: number) => {
    await rollbackPricingRule(ruleId, version);
    await loadData(false);
  };

  return (
    <div className="dispatcher-reports-page">
      {/* 1. Header */}
      <header className="dispatcher-overview__header">
        <div>
          <h1 className="dispatcher-page-title">Delivery Zones &amp; Pricing</h1>
          <p className="dispatcher-page-subtitle">
            Manage delivery service areas and configure pricing rules for parcel deliveries.
          </p>
        </div>

        <div className="dispatcher-overview__actions">
          {lastUpdated && (
            <div className="dispatcher-overview__date-badge">
              <Clock size={14} className="dispatcher-overview__date-icon" />
              <span>Last updated: {lastUpdated}</span>
            </div>
          )}

          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={() => loadData(true)}
            disabled={isLoading || isRefreshing}
            aria-label="Refresh zones and pricing"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? 'dispatcher-overview__refresh-icon--spinning' : ''}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={() => setIsHistoryModalOpen(true)}
            title="View Pricing Version Audit History"
          >
            <History size={14} />
            <span>Version Audit Log</span>
          </button>

          {activeTab === 'zones' ? (
            <button
              type="button"
              className="dispatcher-btn-primary"
              onClick={() => {
                setEditingZone(null);
                setIsZoneModalOpen(true);
              }}
            >
              <Plus size={14} />
              <span>Add New Zone</span>
            </button>
          ) : (
            <button
              type="button"
              className="dispatcher-btn-primary"
              onClick={() => {
                setEditingRule(null);
                setIsRuleModalOpen(true);
              }}
            >
              <Plus size={14} />
              <span>Add Pricing Rule</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Summary Cards */}
      <ZoneSummaryCards metrics={metrics} isLoading={isLoading && !isRefreshing} />

      {/* 3. Section Tabs */}
      <div className="dispatcher-zone-tabs-bar">
        <button
          type="button"
          className={`dispatcher-zone-tab-btn ${activeTab === 'zones' ? 'dispatcher-zone-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('zones')}
        >
          <MapPin size={15} />
          <span>Delivery Zones ({zones.length})</span>
        </button>

        <button
          type="button"
          className={`dispatcher-zone-tab-btn ${activeTab === 'pricing' ? 'dispatcher-zone-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('pricing')}
        >
          <Layers size={15} />
          <span>Pricing Rules ({rules.length})</span>
        </button>

        <button
          type="button"
          className={`dispatcher-zone-tab-btn ${activeTab === 'calculator' ? 'dispatcher-zone-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('calculator')}
        >
          <Calculator size={15} />
          <span>Tariff Calculator</span>
        </button>
      </div>

      {/* 4. Tab Contents */}
      {activeTab === 'zones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <ZoneFilters
            filters={zoneFilters}
            branches={branches}
            onChange={(f) => setZoneFilters(f)}
            onReset={() => setZoneFilters({ searchTerm: '', branchId: 'ALL', status: 'ALL' })}
            isLoading={isLoading || isRefreshing}
          />
          <ZoneTable
            zones={zones}
            isLoading={isLoading && !isRefreshing}
            onEdit={handleEditZone}
            onToggleStatus={handleToggleZoneStatus}
            onViewDetails={handleViewZoneDetails}
          />
        </div>
      )}

      {activeTab === 'pricing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <PricingRulesTable
            rules={rules}
            isLoading={isLoading && !isRefreshing}
            onEdit={(r) => {
              setEditingRule(r);
              setIsRuleModalOpen(true);
            }}
            onPublishClick={handlePublishClick}
            onViewDetails={(r) => {
              setEditingRule(r);
              setIsRuleModalOpen(true);
            }}
            onDeactivate={handleDeactivateRule}
          />
        </div>
      )}

      {activeTab === 'calculator' && (
        <div>
          <PricingCalculator zones={zones} />
        </div>
      )}

      {/* Modals */}
      <ZoneFormModal
        isOpen={isZoneModalOpen}
        onClose={() => setIsZoneModalOpen(false)}
        onSave={handleSaveZone}
        initialZone={editingZone}
        branches={branches}
      />

      <PricingRuleFormModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        onSave={handleSaveRule}
        initialRule={editingRule}
        zones={zones}
      />

      <PublicationControls
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        rule={publishingRule}
        onConfirmPublish={handleConfirmPublish}
      />

      <PricingVersionHistory
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={history}
        onRollback={handleRollback}
        isLoading={isLoading}
      />
    </div>
  );
}

