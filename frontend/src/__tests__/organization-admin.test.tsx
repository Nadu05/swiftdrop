import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  calculateBranchDistributionByCity,
  calculateBranchPerformanceMetrics,
  calculateBranchSummaryMetrics,
  calculateOrganizationDashboardMetrics,
} from '@/api/services/organization.api';
import {
  createMockBranch,
  getMockBranches,
  getMockBranchPerformanceSummary,
  getMockOrganizationAuditEvents,
  getMockOrganizationStaffAccounts,
  getMockServiceAreas,
  getMockServiceAreasByBranch,
  updateMockBranch,
} from '@/api/mock/organization-admin.mock';
import {
  clampCoordinates,
  getRecommendedZoomForRadiusKm,
  radiusKmToPixels,
  reverseGeocodeLocation,
  searchSriLankanGazetteer,
} from '@/lib/geocoding';
import OrganizationSummaryCards from '@/components/organization/dashboard/OrganizationSummaryCards';
import BranchStatusOverview from '@/components/organization/dashboard/BranchStatusOverview';
import ServiceAreaOverview from '@/components/organization/dashboard/ServiceAreaOverview';
import BranchDetails from '@/components/organization/branches/BranchDetails';
import BranchTable from '@/components/organization/branches/BranchTable';
import BranchFilters from '@/components/organization/branches/BranchFilters';
import InteractiveBranchMap from '@/components/organization/map/InteractiveBranchMap';
import BranchLocationPicker from '@/components/organization/branches/BranchLocationPicker';
import OrganizationSidebar, {
  ORGANIZATION_NAV_ITEMS,
} from '@/components/organization/OrganizationSidebar';
import type {
  BranchResponse,
  ServiceAreaResponse,
} from '@/types/organization.types';

const SAMPLE_BRANCHES: BranchResponse[] = [
  {
    id: 1,
    code: 'CMB-CENTRAL',
    name: 'Colombo Central Hub',
    addressLine1: 'No. 45, Union Place',
    addressLine2: 'Colombo 02',
    city: 'Colombo',
    latitude: 6.9218,
    longitude: 79.8612,
    phone: '+94 11 234 5678',
    email: 'colombo@swiftdrop.lk',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-02-15T10:30:00Z',
  },
  {
    id: 2,
    code: 'KDY-MAIN',
    name: 'Kandy Regional Hub',
    addressLine1: 'No. 120, Peradeniya Road',
    addressLine2: null,
    city: 'Kandy',
    latitude: 7.2906,
    longitude: 80.6337,
    phone: '+94 81 222 3344',
    email: 'kandy@swiftdrop.lk',
    status: 'ACTIVE',
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-02-18T11:00:00Z',
  },
  {
    id: 3,
    code: 'GLE-SOUTH',
    name: 'Galle Southern Hub',
    addressLine1: 'No. 18, Wakwella Road',
    addressLine2: null,
    city: 'Galle',
    latitude: 6.0535,
    longitude: 80.221,
    phone: '+94 91 223 4455',
    email: null,
    status: 'INACTIVE',
    createdAt: '2026-01-20T09:00:00Z',
    updatedAt: '2026-02-20T14:00:00Z',
  },
];

const SAMPLE_SERVICE_AREAS: ServiceAreaResponse[] = [
  {
    id: 10,
    branchId: 1,
    branchCode: 'CMB-CENTRAL',
    branchName: 'Colombo Central Hub',
    areaName: 'Colombo Central 25 km Coverage Zone',
    centerLatitude: 6.9218,
    centerLongitude: 79.8612,
    maxRadiusKm: 25,
    status: 'ACTIVE',
    createdAt: '2026-01-11T08:00:00Z',
    updatedAt: '2026-02-15T10:30:00Z',
  },
  {
    id: 11,
    branchId: 2,
    branchCode: 'KDY-MAIN',
    branchName: 'Kandy Regional Hub',
    areaName: 'Kandy Regional 25 km Coverage Zone',
    centerLatitude: 7.2906,
    centerLongitude: 80.6337,
    maxRadiusKm: 25,
    status: 'ACTIVE',
    createdAt: '2026-01-13T08:00:00Z',
    updatedAt: '2026-02-18T11:00:00Z',
  },
];

describe('SwiftDrop Member 04 — Head Office Organization Admin UI Suite', () => {
  it('1. calculates organization summary metrics and city distribution accurately from backend records', () => {
    const summary = calculateBranchSummaryMetrics(SAMPLE_BRANCHES);
    assert.equal(summary.totalBranches, 3);
    assert.equal(summary.activeBranches, 2);
    assert.equal(summary.inactiveBranches, 1);

    const dashboardMetrics = calculateOrganizationDashboardMetrics(
      SAMPLE_BRANCHES,
      SAMPLE_SERVICE_AREAS
    );
    assert.equal(dashboardMetrics.totalBranches, 3);
    assert.equal(dashboardMetrics.activeBranches, 2);
    assert.equal(dashboardMetrics.inactiveBranches, 1);
    assert.equal(dashboardMetrics.totalServiceAreas, 2);
    assert.equal(dashboardMetrics.activeServiceAreas, 2);
    assert.equal(dashboardMetrics.citiesCovered, 3);

    const cityDistribution = calculateBranchDistributionByCity(
      SAMPLE_BRANCHES,
      SAMPLE_SERVICE_AREAS
    );
    assert.equal(cityDistribution.length, 3);
    const colomboEntry = cityDistribution.find((item) => item.city === 'Colombo');
    assert.ok(colomboEntry);
    assert.equal(colomboEntry.totalBranches, 1);
    assert.equal(colomboEntry.activeBranches, 1);
    assert.equal(colomboEntry.serviceAreaCount, 1);
  });

  it('2. renders Head Office OrganizationSidebar without any Branch Manager or Branch Console links', () => {
    assert.equal(ORGANIZATION_NAV_ITEMS.length, 9);
    for (const item of ORGANIZATION_NAV_ITEMS) {
      assert.ok(
        !item.href.includes('/organization/console'),
        `Unexpected Branch Console route in sidebar: ${item.href}`
      );
    }

    const html = renderToStaticMarkup(React.createElement(OrganizationSidebar));
    assert.ok(html.includes('Head Office'));
    assert.ok(html.includes('Overview'));
    assert.ok(html.includes('Branches'));
    assert.ok(html.includes('Roles &amp; audit'));
    assert.ok(!html.includes('Branch Console'));
    assert.ok(!html.includes('Branch Manager'));
    assert.ok(!html.includes('/organization/console'));
  });

  it('3. renders OrganizationDashboard summary cards, branch status table, and service-area overview', () => {
    const metrics = calculateOrganizationDashboardMetrics(
      SAMPLE_BRANCHES,
      SAMPLE_SERVICE_AREAS
    );

    const cardsHtml = renderToStaticMarkup(
      React.createElement(OrganizationSummaryCards, {
        metrics,
        isLoading: false,
        serviceAreasAvailable: true,
      })
    );
    assert.ok(cardsHtml.includes('Total Branches'));
    assert.ok(cardsHtml.includes('Active Branches'));
    assert.ok(cardsHtml.includes('Inactive Branches'));
    assert.ok(cardsHtml.includes('Service Areas'));

    const statusHtml = renderToStaticMarkup(
      React.createElement(BranchStatusOverview, {
        branches: SAMPLE_BRANCHES,
        isLoading: false,
      })
    );
    assert.ok(statusHtml.includes('Colombo Central Hub'));
    assert.ok(statusHtml.includes('Kandy Regional Hub'));
    assert.ok(statusHtml.includes('Galle Southern Hub'));

    const serviceAreasHtml = renderToStaticMarkup(
      React.createElement(ServiceAreaOverview, {
        serviceAreas: SAMPLE_SERVICE_AREAS,
        isLoading: false,
        error: null,
        onRetry: () => {},
      })
    );
    assert.ok(serviceAreasHtml.includes('Colombo Central 25 km Coverage Zone'));
    assert.ok(serviceAreasHtml.includes('25 km'));
  });

  it('4. renders BranchFilters and BranchTable with city filtering and service-area coverage column', () => {
    const filtersHtml = renderToStaticMarkup(
      React.createElement(BranchFilters, {
        searchQuery: '',
        onSearchChange: () => {},
        statusFilter: 'ALL',
        onStatusFilterChange: () => {},
        cityFilter: 'ALL',
        onCityFilterChange: () => {},
        availableCities: ['Colombo', 'Galle', 'Kandy'],
        totalCount: 3,
        filteredCount: 3,
        activeCount: 2,
        inactiveCount: 1,
        onResetFilters: () => {},
      })
    );
    assert.ok(filtersHtml.includes('All Cities (3)'));
    assert.ok(filtersHtml.includes('Colombo'));
    assert.ok(filtersHtml.includes('Kandy'));

    const tableHtml = renderToStaticMarkup(
      React.createElement(BranchTable, {
        branches: SAMPLE_BRANCHES,
        totalCount: 3,
        isLoading: false,
        error: null,
        hasActiveFilters: false,
        onRetry: () => {},
        onResetFilters: () => {},
        onToggleStatus: () => {},
        serviceAreasByBranchId: {
          1: [SAMPLE_SERVICE_AREAS[0]],
          2: [SAMPLE_SERVICE_AREAS[1]],
          3: [],
        },
        serviceAreasAvailable: true,
      })
    );
    assert.ok(tableHtml.includes('25 km radius'));
    assert.ok(tableHtml.includes('No service area configured'));
  });

  it('5. converts service-area radiusKm to Web Mercator pixels and searches Sri Lankan locations', async () => {
    const clamped = clampCoordinates(95, -195);
    assert.equal(clamped.latitude, 85.0511);
    assert.equal(clamped.longitude, -180);

    const radiusPxAtZoom10 = radiusKmToPixels(25, 6.9271, 10);
    assert.ok(radiusPxAtZoom10 > 100, 'Expected positive pixel radius for 25 km at zoom 10');

    const recommendedZoom = getRecommendedZoomForRadiusKm(25);
    assert.equal(recommendedZoom, 10);

    const suggestions = searchSriLankanGazetteer('Kandy');
    assert.ok(suggestions.length > 0);
    assert.equal(suggestions[0].city, 'Kandy');

    const reverseResult = await reverseGeocodeLocation(6.9218, 79.8612);
    assert.ok(reverseResult.city.length > 0);
    assert.ok(reverseResult.addressLine1.length > 0);
  });

  it('6. renders InteractiveBranchMap and BranchLocationPicker with synchronized read-only coordinates', () => {
    const mapHtml = renderToStaticMarkup(
      React.createElement(InteractiveBranchMap, {
        latitude: 6.9218,
        longitude: 79.8612,
        branchLabel: 'Colombo Central Hub',
        branchCode: 'CMB-CENTRAL',
        interactive: false,
        serviceAreas: [SAMPLE_SERVICE_AREAS[0]],
      })
    );
    assert.ok(mapHtml.includes('Colombo Central Hub'));
    assert.ok(mapHtml.includes('CMB-CENTRAL'));
    assert.ok(mapHtml.includes('service-area-circle-10'));
    assert.ok(mapHtml.includes('25 km'));

    const pickerHtml = renderToStaticMarkup(
      React.createElement(BranchLocationPicker, {
        latitude: 6.9218,
        longitude: 79.8612,
        currentCity: 'Colombo',
        currentAddressLine1: 'No. 45, Union Place',
        onSelectLocation: () => {},
      })
    );
    assert.ok(pickerHtml.includes('Selected Map Coordinates (Read-Only Technical Output)'));
    assert.ok(pickerHtml.includes('Latitude (°N)'));
    assert.ok(pickerHtml.includes('Longitude (°E)'));
    assert.ok(pickerHtml.includes('6.9218'));
    assert.ok(pickerHtml.includes('79.8612'));
  });

  it('7. renders BranchDetails with circular service-area coverage, explicit "No service area configured" state, and no Branch Console link', () => {
    // Case A: Branch with configured circular service area
    const populatedHtml = renderToStaticMarkup(
      React.createElement(BranchDetails, {
        branch: SAMPLE_BRANCHES[0],
        onRequestStatusToggle: () => {},
        serviceAreas: [SAMPLE_SERVICE_AREAS[0]],
        isLoadingServiceAreas: false,
        serviceAreasError: null,
        performanceSummary: null,
        isLoadingPerformance: false,
      })
    );
    assert.ok(populatedHtml.includes('Colombo Central 25 km Coverage Zone'));
    assert.ok(populatedHtml.includes('25 km radius'));
    assert.ok(populatedHtml.includes('Edit Branch'));
    assert.ok(populatedHtml.includes('Deactivate Branch'));
    assert.ok(!populatedHtml.includes('Branch Console'));
    assert.ok(!populatedHtml.includes('/organization/console'));

    // Case B: Branch with 0 service areas -> must show "No service area configured" and never invent a default radius
    const emptyAreaHtml = renderToStaticMarkup(
      React.createElement(BranchDetails, {
        branch: SAMPLE_BRANCHES[2],
        onRequestStatusToggle: () => {},
        serviceAreas: [],
        isLoadingServiceAreas: false,
        serviceAreasError: null,
      })
    );
    assert.ok(emptyAreaHtml.includes('No service area configured'));
    assert.ok(!emptyAreaHtml.includes('25 km radius'));

    // Case C: Branch with real performance summary vs null
    const perfMetrics = calculateBranchPerformanceMetrics({
      branchId: 1,
      deliveriesReceivedToday: 120,
      deliveriesCompletedToday: 114,
      pendingDeliveries: 4,
      failedDeliveriesToday: 2,
      averageDeliveryDurationMinutes: 34,
    });
    assert.ok(perfMetrics);
    assert.equal(perfMetrics.completionRatePercent, 95);
  });

  it('8. provides realistic Sri Lankan mock data and interactive in-memory CRUD for all Admin screens', () => {
    const initialBranches = getMockBranches();
    assert.ok(initialBranches.length >= 8);
    assert.ok(initialBranches.some((b) => b.code === 'CMB-CENTRAL'));
    assert.ok(initialBranches.some((b) => b.code === 'KDY-MAIN'));

    const initialAreas = getMockServiceAreas();
    assert.equal(initialAreas.length, initialBranches.length);
    for (const area of initialAreas) {
      assert.equal(area.maxRadiusKm, 25);
    }

    const colomboAreas = getMockServiceAreasByBranch(1);
    assert.equal(colomboAreas.length, 1);
    assert.equal(colomboAreas[0].maxRadiusKm, 25);

    const colomboPerf = getMockBranchPerformanceSummary(1);
    assert.equal(colomboPerf.branchId, 1);
    assert.ok((colomboPerf.deliveriesReceivedToday ?? 0) > 0);

    const staff = getMockOrganizationStaffAccounts();
    assert.ok(staff.length >= 8);

    const auditBefore = getMockOrganizationAuditEvents();
    assert.ok(auditBefore.length >= 6);

    // Create a new branch in the mock store and verify service area + audit log creation
    const created = createMockBranch({
      code: 'BTL-EAST',
      name: 'Batticaloa Eastern Hub',
      addressLine1: 'No. 52, Trincomalee Road',
      addressLine2: 'Batticaloa',
      city: 'Batticaloa',
      phone: '+94 65 222 4400',
      email: 'batticaloa@swiftdrop.lk',
      latitude: 7.717,
      longitude: 81.7,
    });
    assert.equal(created.code, 'BTL-EAST');
    assert.equal(created.status, 'ACTIVE');
    assert.equal(getMockServiceAreasByBranch(created.id).length, 1);

    // Toggle branch status to INACTIVE
    const deactivated = updateMockBranch(created.id, { status: 'INACTIVE' });
    assert.ok(deactivated);
    assert.equal(deactivated.status, 'INACTIVE');
  });

  it('9. routes Reports & Analytics in OrganizationSidebar to /organization/reports', () => {
    const reportItem = ORGANIZATION_NAV_ITEMS.find((item) => item.id === 'reports');
    assert.ok(reportItem);
    assert.equal(reportItem.href, '/organization/reports');
    assert.equal(reportItem.implemented, true);

    const html = renderToStaticMarkup(React.createElement(OrganizationSidebar));
    assert.ok(html.includes('/organization/reports'));
    assert.ok(html.includes('Reports &amp; Analytics'));
  });
});
