'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import DeliverySummaryCards from '@/components/dispatcher/deliveries/DeliverySummaryCards';
import UnassignedDeliveryTable from '@/components/dispatcher/deliveries/UnassignedDeliveryTable';
import DeliveryDetailsModal from '@/components/dispatcher/deliveries/DeliveryDetailsModal';
import AssignCourierPlaceholderModal from '@/components/dispatcher/deliveries/AssignCourierPlaceholderModal';
import {
  getUnassignedDeliveries,
  getDeliverySummaryMetrics,
} from '@/components/dispatcher/deliveries/deliveriesApi';
import type {
  UnassignedDelivery,
  DeliverySummaryMetrics,
} from '@/components/dispatcher/deliveries/types';

export default function UnassignedDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<UnassignedDelivery[]>([]);
  const [metrics, setMetrics] = useState<DeliverySummaryMetrics>({
    totalUnassigned: 0,
    availableCouriers: 0,
    highPriorityDeliveries: 0,
    assignedToday: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Modals state
  const [selectedDetailsDelivery, setSelectedDetailsDelivery] = useState<UnassignedDelivery | null>(null);
  const [selectedAssignDelivery, setSelectedAssignDelivery] = useState<UnassignedDelivery | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [deliveriesData, metricsData] = await Promise.all([
        getUnassignedDeliveries(),
        getDeliverySummaryMetrics(),
      ]);
      setDeliveries(deliveriesData);
      setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to load unassigned deliveries:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleOpenDetails = (delivery: UnassignedDelivery) => {
    setSelectedDetailsDelivery(delivery);
  };

  const handleOpenAssignModal = (delivery: UnassignedDelivery) => {
    setSelectedAssignDelivery(delivery);
  };

  return (
    <div className="dispatcher-overview">
      {/* 1. Page Header with Title, Description & Refresh Button */}
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          <h1 className="dispatcher-overview__title">Unassigned Deliveries</h1>
          <p className="dispatcher-overview__subtitle">
            Manage pending deliveries and assign eligible couriers.
          </p>
        </div>

        <div className="dispatcher-overview__actions">
          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            aria-label="Refresh unassigned deliveries"
          >
            <RefreshCw
              size={15}
              className={`dispatcher-overview__refresh-icon ${
                isRefreshing ? 'dispatcher-overview__refresh-icon--spinning' : ''
              }`}
              aria-hidden="true"
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* 2. Four KPI Summary Cards */}
      <DeliverySummaryCards metrics={metrics} />

      {/* 3. Unassigned Deliveries Table with Filters, Search, Sort & Pagination */}
      <UnassignedDeliveryTable
        deliveries={deliveries}
        isLoading={isLoading}
        onViewDetails={handleOpenDetails}
        onAssignCourier={handleOpenAssignModal}
      />

      {/* 4. Delivery Details Modal */}
      <DeliveryDetailsModal
        isOpen={selectedDetailsDelivery !== null}
        onClose={() => setSelectedDetailsDelivery(null)}
        delivery={selectedDetailsDelivery}
        onAssignClick={(d) => {
          setSelectedDetailsDelivery(null);
          setSelectedAssignDelivery(d);
        }}
      />

      {/* 5. Courier Assignment Placeholder Modal (Prepares Stage 05) */}
      <AssignCourierPlaceholderModal
        isOpen={selectedAssignDelivery !== null}
        onClose={() => setSelectedAssignDelivery(null)}
        delivery={selectedAssignDelivery}
      />
    </div>
  );
}
