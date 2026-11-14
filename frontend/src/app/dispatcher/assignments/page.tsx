'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import AssignmentSummaryCards from '@/components/dispatcher/assignments/AssignmentSummaryCards';
import AssignmentFilters from '@/components/dispatcher/assignments/AssignmentFilters';
import AssignmentTable from '@/components/dispatcher/assignments/AssignmentTable';
import AssignmentDetailsModal from '@/components/dispatcher/assignments/AssignmentDetailsModal';
import ReassignCourierDialog from '@/components/dispatcher/assignments/ReassignCourierDialog';
import {
  getAssignments,
  getAssignmentSummaryMetrics,
} from '@/components/dispatcher/assignments/assignmentsApi';
import type {
  AssignmentRecord,
  AssignmentSummaryMetrics,
} from '@/components/dispatcher/assignments/types';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [metrics, setMetrics] = useState<AssignmentSummaryMetrics>({
    totalAssignments: 0,
    activeAssignments: 0,
    completedAssignments: 0,
    reassignedDeliveries: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modals State
  const [selectedDetailsAssignment, setSelectedDetailsAssignment] = useState<AssignmentRecord | null>(null);
  const [selectedReassignAssignment, setSelectedReassignAssignment] = useState<AssignmentRecord | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [list, summary] = await Promise.all([
        getAssignments(),
        getAssignmentSummaryMetrics(),
      ]);
      setAssignments(list);
      setMetrics(summary);
    } catch (err: any) {
      console.error('Failed to load assignments:', err);
      setError('Unable to reach the Dispatch Service. Please ensure the backend is running on http://localhost:8084.');
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

  // Filter & Sort Pipeline
  const filteredAssignments = useMemo(() => {
    let result = [...assignments];

    // Search by Order ID, Courier Name, or Recipient
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.orderId.toLowerCase().includes(q) ||
          a.assignmentId.toLowerCase().includes(q) ||
          a.courier.name.toLowerCase().includes(q) ||
          a.courier.code.toLowerCase().includes(q) ||
          a.recipient.name.toLowerCase().includes(q)
      );
    }

    // Status Filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE') {
        result = result.filter(
          (a) =>
            a.deliveryStatus === 'ASSIGNED' ||
            a.deliveryStatus === 'ACCEPTED' ||
            a.deliveryStatus === 'IN_TRANSIT'
        );
      } else {
        result = result.filter((a) => a.deliveryStatus === statusFilter);
      }
    }

    // Priority Filter
    if (priorityFilter !== 'ALL') {
      result = result.filter((a) => a.priority === priorityFilter);
    }

    // Date Filter
    if (dateFilter !== 'ALL') {
      const today = new Date('2026-11-10').toDateString();
      const yesterday = new Date('2026-11-09').toDateString();

      result = result.filter((a) => {
        const itemDate = new Date(a.assignedDate).toDateString();
        if (dateFilter === 'TODAY') return itemDate === today;
        if (dateFilter === 'YESTERDAY') return itemDate === yesterday;
        if (dateFilter === 'OLDER') return itemDate !== today && itemDate !== yesterday;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      const timeA = new Date(a.assignedDate).getTime();
      const timeB = new Date(b.assignedDate).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [assignments, searchTerm, statusFilter, priorityFilter, dateFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / pageSize));
  const paginatedAssignments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAssignments.slice(startIndex, startIndex + pageSize);
  }, [filteredAssignments, currentPage, pageSize]);

  const handleReassignmentSuccess = (updated: AssignmentRecord) => {
    setToastMessage(
      `Order ${updated.orderId} successfully reassigned to courier ${updated.courier.name} (${updated.courier.code}).`
    );
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
    loadData();
  };

  return (
    <div className="dispatcher-overview">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="dispatcher-toast-success" role="alert">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header */}
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          <h1 className="dispatcher-overview__title">Delivery Assignments</h1>
          <p className="dispatcher-overview__subtitle">
            Monitor, manage and reassign courier delivery assignments.
          </p>
        </div>

        <div className="dispatcher-overview__actions">
          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            aria-label="Refresh assignments"
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

      {/* 2. Summary Cards */}
      <AssignmentSummaryCards metrics={metrics} />

      {/* 3. Filters Toolbar */}
      <AssignmentFilters
        searchTerm={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v);
          setCurrentPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => {
          setStatusFilter(v);
          setCurrentPage(1);
        }}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={(v) => {
          setPriorityFilter(v);
          setCurrentPage(1);
        }}
        dateFilter={dateFilter}
        onDateFilterChange={(v) => {
          setDateFilter(v);
          setCurrentPage(1);
        }}
        sortOrder={sortOrder}
        onSortOrderToggle={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
      />

      {/* 4. Assignments Table */}
      <AssignmentTable
        assignments={paginatedAssignments}
        isLoading={isLoading}
        error={error}
        onViewDetails={(a) => setSelectedDetailsAssignment(a)}
        onReassignCourier={(a) => setSelectedReassignAssignment(a)}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => setCurrentPage(p)}
        totalFilteredCount={filteredAssignments.length}
        pageSize={pageSize}
      />

      {/* 5. Details Modal */}
      <AssignmentDetailsModal
        isOpen={selectedDetailsAssignment !== null}
        onClose={() => setSelectedDetailsAssignment(null)}
        assignment={selectedDetailsAssignment}
        onReassignClick={(a) => {
          setSelectedDetailsAssignment(null);
          setSelectedReassignAssignment(a);
        }}
      />

      {/* 6. Reassignment Workflow Dialog */}
      <ReassignCourierDialog
        isOpen={selectedReassignAssignment !== null}
        onClose={() => setSelectedReassignAssignment(null)}
        assignment={selectedReassignAssignment}
        onSuccess={handleReassignmentSuccess}
      />
    </div>
  );
}
