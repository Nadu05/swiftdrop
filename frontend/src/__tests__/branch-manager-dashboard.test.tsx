import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
    calculateBranchDeliveryOperationsMetrics,
    calculateBranchCourierOperationsMetrics,
    calculateBranchPerformanceMetrics,
    OrganizationApiError,
} from "@/api/services/organization.api";
import {
    resolveAuthorizedBranchContext,
    useBranchConsoleStore,
} from "@/store/branch-console.store";
import BranchManagerDashboard from "@/components/organization/branch-dashboard/BranchManagerDashboard";
import BranchManagerWelcome from "@/components/organization/branch-dashboard/BranchManagerWelcome";
import BranchDeliverySummaryCards from "@/components/organization/branch-dashboard/BranchDeliverySummaryCards";
import BranchCourierOperationsOverview from "@/components/organization/branch-dashboard/BranchCourierOperationsOverview";
import BranchRecentDeliveryActivity from "@/components/organization/branch-dashboard/BranchRecentDeliveryActivity";
import BranchPerformanceOverview from "@/components/organization/branch-dashboard/BranchPerformanceOverview";
import BranchInfoServiceAreaSection from "@/components/organization/branch-dashboard/BranchInfoServiceAreaSection";
import BranchQuickActions from "@/components/organization/branch-dashboard/BranchQuickActions";
import OrganizationSidebar, {
    BRANCH_CONSOLE_NAV_ITEMS,
    ORGANIZATION_NAV_ITEMS,
} from "@/components/organization/OrganizationSidebar";
import {
    MOCK_BRANCH_INFO,
    MOCK_COURIER_ROSTER,
    MOCK_DELIVERY_QUEUE,
    MOCK_DELIVERY_SUMMARY_METRICS,
    MOCK_PERFORMANCE_BY_PERIOD,
    MOCK_PERFORMANCE_SUMMARY,
    MOCK_SERVICE_AREAS,
    isBranchDashboardPreviewActive,
} from "@/api/mock/branch-dashboard.mock";
import type {
    BranchCourierRosterItem,
    BranchDeliveryRequestItem,
    BranchPerformanceSummaryResponse,
    BranchResponse,
    ServiceAreaResponse,
} from "@/types/organization.types";

function renderWithQueryClient(ui: React.ReactElement): string {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                enabled: false,
            },
        },
    });
    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
}

const sampleBranch: BranchResponse = {
    id: 101,
    name: "Colombo North Hub",
    code: "CMB-N01",
    addressLine1: "42 Baseline Road",
    addressLine2: "Dematagoda",
    city: "Colombo",
    phone: "+94 11 234 5678",
    email: "cmbnorth@swiftdrop.lk",
    latitude: 6.9421,
    longitude: 79.8772,
    status: "ACTIVE",
    createdAt: "2026-01-10T08:00:00Z",
    updatedAt: "2026-01-12T10:30:00Z",
};

const secondBranch: BranchResponse = {
    ...sampleBranch,
    id: 202,
    name: "Kandy City Hub",
    code: "KDY-C01",
    city: "Kandy",
};

const sampleQueue: BranchDeliveryRequestItem[] = [
    {
        id: "req-1",
        orderCode: "ORD-8801",
        pickupLocation: "Pettah Market",
        dropoffLocation: "Borella Junction",
        requestTime: "10 mins ago",
        assignmentStatus: "UNASSIGNED",
        branchId: 101,
    },
    {
        id: "req-2",
        orderCode: "ORD-8802",
        pickupLocation: "Fort Station",
        dropoffLocation: "Wellawatte",
        requestTime: "18 mins ago",
        assignmentStatus: "READY_FOR_PICKUP",
        branchId: 101,
    },
    {
        id: "req-3",
        orderCode: "ORD-8803",
        pickupLocation: "Maradana",
        dropoffLocation: "Rajagiriya",
        requestTime: "25 mins ago",
        assignmentStatus: "ASSIGNED",
        branchId: 101,
    },
];

const sampleCouriers: BranchCourierRosterItem[] = [
    {
        id: "c-1",
        name: "A. Perera",
        vehicleType: "Motorbike",
        activeJobs: 0,
        distanceKm: 1.4,
        availability: "AVAILABLE",
    },
    {
        id: "c-2",
        name: "B. Fernando",
        vehicleType: "Three-wheeler",
        activeJobs: 2,
        distanceKm: 3.1,
        availability: "BUSY",
    },
    {
        id: "c-3",
        name: "C. Jayasinghe",
        vehicleType: "Van",
        activeJobs: 3,
        distanceKm: 4.8,
        availability: "BUSY",
    },
    {
        id: "c-4",
        name: "D. Silva",
        vehicleType: "Motorbike",
        activeJobs: 0,
        availability: "OFFLINE",
    },
];

const sampleServiceAreas: ServiceAreaResponse[] = [
    {
        id: 501,
        branchId: 101,
        branchCode: "CMB-N01",
        branchName: "Colombo North Hub",
        areaName: "Colombo North Zone A",
        centerLatitude: 6.9421,
        centerLongitude: 79.8772,
        maxRadiusKm: 7.5,
        status: "ACTIVE",
        createdAt: "2026-01-10T08:00:00Z",
        updatedAt: "2026-01-12T10:30:00Z",
    },
];

describe("Branch Manager Dashboard — Unit & Component Verification Suite", () => {
    beforeEach(() => {
        useBranchConsoleStore.getState().resetBranchManagerSession();
        (globalThis as Record<string, unknown>).__TEST_PATHNAME__ =
            "/organization/console";
    });

    it("1. Full Dashboard Rendering & Branch Identity Display: renders all 7 operational sections with assigned branch identity", () => {
        const html = renderWithQueryClient(
            <BranchManagerDashboard
                assignedBranchId={101}
                managerDisplayName="S. Jayawardena"
                testOverrides={{
                    branches: [sampleBranch],
                    isLoadingBranches: false,
                    isLoadingQueue: false,
                    isLoadingRoster: false,
                    isLoadingServiceAreas: false,
                    isLoadingPerformance: false,
                    deliveryQueue: sampleQueue,
                    courierRoster: sampleCouriers,
                    serviceAreas: sampleServiceAreas,
                    performanceSummary: {
                        branchId: 101,
                        periodLabel: "Today",
                        deliveriesReceivedToday: 20,
                        deliveriesCompletedToday: 15,
                        pendingDeliveries: 5,
                        failedDeliveriesToday: 1,
                        averageDeliveryDurationMinutes: 32,
                    },
                    lastUpdatedLabel: "09:45:00 AM",
                }}
            />
        );

        assert.match(html, /Welcome, S\. Jayawardena/);
        assert.match(html, /Colombo North Hub — Branch Manager Dashboard/);
        assert.match(html, /CMB-N01/);
        assert.match(html, /42 Baseline Road, Dematagoda/);
        assert.match(html, /Synced 09:45:00 AM/);
        assert.match(html, /Delivery Operations Summary/);
        assert.match(html, /Quick Actions/);
        assert.match(html, /Recent Delivery Activity/);
        assert.match(html, /Courier Operations Overview/);
        assert.match(html, /Branch Performance Overview/);
        assert.match(html, /Branch Information &amp; Service Area Coverage/);
    });

    it("2. Branch Isolation at UI Boundary: blocks unauthorized ?branchId= query overrides when assignedBranchId is locked", () => {
        const result = resolveAuthorizedBranchContext({
            availableBranches: [sampleBranch, secondBranch],
            storeAssignedBranchId: 101,
            urlBranchIdParam: "202",
        });

        assert.equal(result.resolvedBranch?.id, 101);
        assert.equal(result.isUrlOverrideBlocked, true);
        assert.equal(result.blockedUrlBranchId, "202");

        const html = renderWithQueryClient(
            <BranchManagerDashboard
                assignedBranchId={101}
                urlBranchIdOverride="202"
                testOverrides={{
                    branches: [sampleBranch, secondBranch],
                    deliveryQueue: sampleQueue,
                    courierRoster: sampleCouriers,
                    serviceAreas: sampleServiceAreas,
                }}
            />
        );

        assert.match(
            html,
            /Branch Isolation Enforced — URL Branch Parameter Ignored/
        );
        assert.match(html, /\?branchId=202/);
        assert.match(html, /Colombo North Hub/);
    });

    it("3. Role-Aware Navigation: Branch Console sidebar displays the 5 Branch Manager items and hides Head Office switch by default", () => {
        assert.equal(BRANCH_CONSOLE_NAV_ITEMS.length, 5);
        assert.deepEqual(
            BRANCH_CONSOLE_NAV_ITEMS.map((item) => item.id),
            [
                "overview",
                "delivery-requests",
                "courier-roster",
                "branch-performance",
                "branch-information",
            ]
        );
        assert.ok(ORGANIZATION_NAV_ITEMS.some((item) => item.id === "branches"));

        const branchManagerSidebarHtml = renderToStaticMarkup(
            <OrganizationSidebar
                id="test-sidebar"
                isOpen={false}
                onClose={() => {}}
                onNavigate={() => {}}
                canAccessHeadOffice={false}
            />
        );

        assert.match(branchManagerSidebarHtml, /BRANCH CONSOLE/);
        assert.match(branchManagerSidebarHtml, /Delivery Requests/);
        assert.match(branchManagerSidebarHtml, /Courier Roster/);
        assert.match(branchManagerSidebarHtml, /Branch Performance/);
        assert.match(branchManagerSidebarHtml, /Branch Information/);
        assert.match(branchManagerSidebarHtml, /Scope: Assigned Branch Only/);
        assert.doesNotMatch(
            branchManagerSidebarHtml,
            /Switch to Head Office Admin/
        );
    });

    it("4. Delivery Metric Rendering: computes accurate counts and displays — when backend analytics are unavailable", () => {
        const metricsWithoutAnalytics = calculateBranchDeliveryOperationsMetrics(
            sampleQueue,
            null,
            true
        );

        assert.equal(metricsWithoutAnalytics.incomingCount, 3);
        assert.equal(metricsWithoutAnalytics.unassignedCount, 1);
        assert.equal(metricsWithoutAnalytics.readyForPickupCount, 1);
        assert.equal(metricsWithoutAnalytics.assignedCount, 1);
        assert.equal(metricsWithoutAnalytics.completedTodayCount, null);
        assert.equal(metricsWithoutAnalytics.failedCount, null);

        const cardsHtml = renderToStaticMarkup(
            <BranchDeliverySummaryCards
                metrics={metricsWithoutAnalytics}
                isLoading={false}
            />
        );

        assert.match(cardsHtml, /Incoming Deliveries/);
        assert.match(cardsHtml, /Unassigned Deliveries/);
        assert.match(cardsHtml, /Ready for Pickup/);
        assert.match(cardsHtml, /Completed Today/);
        assert.match(cardsHtml, /Failed \/ Exceptions/);
        assert.match(cardsHtml, /Requires Order\/Analytics summary contract/);
    });

    it("5. Courier Summary Rendering: computes available, busy, offline, and active jobs without fabricating eligibility", () => {
        const courierMetrics = calculateBranchCourierOperationsMetrics(
            sampleCouriers,
            true
        );

        assert.equal(courierMetrics.totalCouriers, 4);
        assert.equal(courierMetrics.availableCouriers, 1);
        assert.equal(courierMetrics.busyCouriers, 2);
        assert.equal(courierMetrics.offlineCouriers, 1);
        assert.equal(courierMetrics.totalActiveJobs, 5);

        const courierHtml = renderToStaticMarkup(
            <BranchCourierOperationsOverview
                branchId={101}
                branchName="Colombo North Hub"
                couriers={sampleCouriers}
                metrics={courierMetrics}
                isLoading={false}
                error={null}
                onRetry={() => {}}
            />
        );

        assert.match(courierHtml, /Courier Operations Overview/);
        assert.match(courierHtml, /A\. Perera/);
        assert.match(courierHtml, /B\. Fernando/);
        assert.match(courierHtml, /Open Courier Roster/);
        assert.match(courierHtml, /Dispatch Service Contract/);
    });

    it("6. Performance KPI Integrity Rule: calculates completion rate ONLY when both numerator and denominator exist for the period", () => {
        const incompleteAnalytics: BranchPerformanceSummaryResponse = {
            branchId: 101,
            periodLabel: "Today",
            deliveriesReceivedToday: null,
            deliveriesCompletedToday: 12,
            pendingDeliveries: 3,
            averageDeliveryDurationMinutes: null,
        };

        const metricsFromIncomplete =
            calculateBranchPerformanceMetrics(incompleteAnalytics);
        // Must NOT compute completionRatePercent when denominator (deliveriesReceivedToday) is null
        assert.equal(metricsFromIncomplete.completionRatePercent, null);

        const completeAnalytics: BranchPerformanceSummaryResponse = {
            branchId: 101,
            periodLabel: "Today",
            deliveriesReceivedToday: 20,
            deliveriesCompletedToday: 15,
            pendingDeliveries: 5,
            averageDeliveryDurationMinutes: 34,
        };

        const metricsFromComplete =
            calculateBranchPerformanceMetrics(completeAnalytics);
        assert.equal(metricsFromComplete.completionRatePercent, 75);
        assert.equal(metricsFromComplete.averageDeliveryDurationMinutes, 34);

        const perfHtml = renderToStaticMarkup(
            <BranchPerformanceOverview
                branchId={101}
                branchName="Colombo North Hub"
                performance={metricsFromComplete}
                couriers={sampleCouriers}
                isPerformanceAvailable={true}
                isCourierRosterAvailable={true}
                isLoading={false}
                error={null}
                onRetry={() => {}}
            />
        );

        assert.match(perfHtml, /75%/);
        assert.match(perfHtml, /34 min/);
        assert.match(perfHtml, /Courier Workload Distribution/);
    });

    it("7. Empty States: renders clear empty states when no deliveries, couriers, service areas, or assigned branch exist", () => {
        const emptyActivityHtml = renderToStaticMarkup(
            <BranchRecentDeliveryActivity
                branchId={101}
                branchName="Colombo North Hub"
                requests={[]}
                isLoading={false}
                error={null}
                onRetry={() => {}}
            />
        );
        assert.match(emptyActivityHtml, /No Recent Delivery Requests/);

        const emptyCourierHtml = renderToStaticMarkup(
            <BranchCourierOperationsOverview
                branchId={101}
                branchName="Colombo North Hub"
                couriers={[]}
                metrics={calculateBranchCourierOperationsMetrics([])}
                isLoading={false}
                error={null}
                onRetry={() => {}}
            />
        );
        assert.match(
            emptyCourierHtml,
            /No Registered Couriers for Colombo North Hub/
        );

        const emptyServiceAreaHtml = renderToStaticMarkup(
            <BranchInfoServiceAreaSection
                branch={sampleBranch}
                serviceAreas={[]}
                isLoadingServiceAreas={false}
                serviceAreasError={null}
                onRetryServiceAreas={() => {}}
            />
        );
        assert.match(
            emptyServiceAreaHtml,
            /No Service Areas Registered for Colombo North Hub/
        );
        assert.match(emptyServiceAreaHtml, /Read-Only for Branch Manager/);

        const noBranchDashboardHtml = renderWithQueryClient(
            <BranchManagerDashboard
                assignedBranchId={null}
                allowAuthorizedListFallback={false}
                testOverrides={{
                    branches: [sampleBranch],
                    isLoadingBranches: false,
                }}
            />
        );
        assert.match(
            noBranchDashboardHtml,
            /No Assigned Branch Context Available/
        );
    });

    it("8. API Error & Partial Data States: displays honest backend unavailable messages with retry actions instead of fabricated data", () => {
        const errorActivityHtml = renderToStaticMarkup(
            <BranchRecentDeliveryActivity
                branchId={101}
                branchName="Colombo North Hub"
                requests={[]}
                isLoading={false}
                error="Network timeout connecting to branch delivery queue"
                onRetry={() => {}}
            />
        );
        assert.match(
            errorActivityHtml,
            /Branch Delivery Queue Endpoint Pending/
        );
        assert.match(
            errorActivityHtml,
            /No fake delivery records are fabricated/
        );

        const partialDashboardHtml = renderWithQueryClient(
            <BranchManagerDashboard
                assignedBranchId={101}
                testOverrides={{
                    branches: [sampleBranch],
                    isLoadingBranches: false,
                    isLoadingQueue: false,
                    isLoadingRoster: false,
                    isLoadingPerformance: false,
                    isLoadingServiceAreas: false,
                    queueError: new Error("Queue endpoint pending"),
                    rosterError: new Error("Roster endpoint pending"),
                    performanceError: new Error("Analytics endpoint pending"),
                }}
            />
        );
        assert.match(
            partialDashboardHtml,
            /Partial Operational Data Available/
        );
        assert.match(
            partialDashboardHtml,
            /Delivery Request Queue, Courier Roster, Branch Performance Analytics/
        );

        const refreshingDashboardHtml = renderWithQueryClient(
            <BranchManagerDashboard
                assignedBranchId={101}
                testOverrides={{
                    branches: [sampleBranch],
                    isLoadingBranches: false,
                    isRefreshing: true,
                }}
            />
        );
        assert.match(
            refreshingDashboardHtml,
            /Refreshing branch operational data with the API Gateway/
        );
    });

    it("9. Unauthorized (403), Session Expired (401), and Role-Scoped Quick Actions", () => {
        const unauthorizedHtml = renderWithQueryClient(
            <BranchManagerDashboard
                assignedBranchId={101}
                testOverrides={{
                    branchesError: new OrganizationApiError(
                        "Access denied to branch #101",
                        { status: 403 }
                    ),
                }}
            />
        );
        assert.match(
            unauthorizedHtml,
            /Unauthorized Branch Access \(HTTP 403\)/
        );

        const sessionExpiredHtml = renderWithQueryClient(
            <BranchManagerDashboard
                assignedBranchId={101}
                testOverrides={{
                    branchesError: new OrganizationApiError(
                        "JWT token expired",
                        { status: 401 }
                    ),
                }}
            />
        );
        assert.match(sessionExpiredHtml, /Session Expired \(HTTP 401\)/);

        const quickActionsHtml = renderToStaticMarkup(
            <BranchQuickActions
                branchId={101}
                firstUnassignedDelivery={sampleQueue[0]}
                canAccessHeadOffice={false}
                isLoading={false}
                isRefreshing={false}
                onRefresh={() => {}}
            />
        );
        assert.match(quickActionsHtml, /Open Delivery Request Queue/);
        assert.match(quickActionsHtml, /Open Courier Roster/);
        assert.match(quickActionsHtml, /Next in queue: ORD-8801/);
        assert.match(quickActionsHtml, /Open Branch Details/);
        assert.doesNotMatch(quickActionsHtml, /Create Branch/);
        assert.doesNotMatch(quickActionsHtml, /Deactivate Branch/);
    });

    it("10. Development Preview Mode: renders complete realistic Sri Lankan operations for Colombo Central Branch (CMB-001)", () => {
        const previewHtml = renderWithQueryClient(
            <BranchManagerDashboard previewMode={true} />
        );

        // Ensure no preview banner cards or toggle buttons are rendered
        assert.doesNotMatch(previewHtml, /Development Preview Active/);
        assert.doesNotMatch(previewHtml, /Exit Preview/);
        assert.doesNotMatch(previewHtml, /Enable Preview Mode/);

        // Branch Identity & Location Verification
        assert.match(previewHtml, /Colombo Central Branch — Branch Manager Dashboard/);
        assert.match(previewHtml, /CMB-001/);
        assert.match(previewHtml, /48 Janadhipathi Mawatha/);
        assert.match(previewHtml, /Colombo 02/);
        assert.match(previewHtml, /\+94 11 234 5678/);

        // Summary Counts Verification (42, 8, 21, 6, 27, 2)
        assert.match(previewHtml, />42</);
        assert.match(previewHtml, />8</);
        assert.match(previewHtml, />21</);
        assert.match(previewHtml, />6</);
        assert.match(previewHtml, />27</);
        assert.match(previewHtml, />2</);

        // Couriers overview verification
        assert.match(previewHtml, /Kasun Dias/);
        assert.match(previewHtml, /Ruwan Perera/);
        assert.match(previewHtml, /Nimal Fernando/);
        assert.match(previewHtml, /WP BHK-4471/);

        // Sri Lankan delivery activity verification
        assert.match(previewHtml, /SD-CMB-8401/);
        assert.match(previewHtml, /SD-CMB-8402/);
        assert.match(previewHtml, /Janadhipathi Mawatha/);
        assert.match(previewHtml, /Galle Road, Colombo 03/);
        assert.match(previewHtml, /Borella/);
        assert.match(previewHtml, /Rajagiriya/);

        // Performance KPIs & Daily Trends chart verification
        assert.match(previewHtml, /Daily Delivery Volume Trends/);
        assert.match(previewHtml, /64\.3%/);
        assert.match(previewHtml, /28 min/);
        assert.match(previewHtml, /Courier Workload Distribution/);

        // Service Area Coverage verification
        assert.match(previewHtml, /Zone 1 — Fort &amp; Pettah Commercial Hub/);
        assert.match(previewHtml, /3\.5 km/);
    });

    it("11. Interactive Delivery Status Filters & Search: filters displayed delivery requests accurately", () => {
        // Render Recent Activity directly with mock requests
        const initialHtml = renderToStaticMarkup(
            <BranchRecentDeliveryActivity
                branchId={1}
                branchName="Colombo Central Branch"
                requests={MOCK_DELIVERY_QUEUE}
                isLoading={false}
                error={null}
                onRetry={() => {}}
                isPreviewMode={true}
            />
        );

        assert.match(initialHtml, /SD-CMB-8401/);
        assert.match(initialHtml, /SD-CMB-8402/);
        assert.match(initialHtml, /Search by delivery ID/);

        // Filter only UNASSIGNED requests
        const unassignedRequests = MOCK_DELIVERY_QUEUE.filter(
            (r) => r.assignmentStatus === "UNASSIGNED"
        );
        const unassignedHtml = renderToStaticMarkup(
            <BranchRecentDeliveryActivity
                branchId={1}
                branchName="Colombo Central Branch"
                requests={unassignedRequests}
                isLoading={false}
                error={null}
                onRetry={() => {}}
                isPreviewMode={true}
            />
        );

        assert.match(unassignedHtml, /SD-CMB-8401/);
        assert.match(unassignedHtml, /SD-CMB-8402/);
        assert.doesNotMatch(unassignedHtml, /SD-CMB-8405/); // SD-CMB-8405 is ASSIGNED
    });

    it("12. Interactive Courier Availability Filters: filters courier snapshot accurately", () => {
        // Available couriers only
        const availableCouriers = MOCK_COURIER_ROSTER.filter(
            (c) => c.availability === "AVAILABLE"
        );
        const availableHtml = renderToStaticMarkup(
            <BranchCourierOperationsOverview
                branchId={1}
                branchName="Colombo Central Branch"
                couriers={availableCouriers}
                metrics={calculateBranchCourierOperationsMetrics(MOCK_COURIER_ROSTER)}
                isLoading={false}
                error={null}
                onRetry={() => {}}
                isPreviewMode={true}
            />
        );

        assert.match(availableHtml, /Kasun Dias/);
        assert.match(availableHtml, /Dilshan Wickramasinghe/);
        assert.doesNotMatch(availableHtml, /Ruwan Perera/); // Ruwan Perera is BUSY
    });

    it("13. Interactive Date-Range Selection: updates performance period data accurately", () => {
        assert.equal(MOCK_PERFORMANCE_BY_PERIOD["today"].deliveriesReceivedToday, 42);
        assert.equal(MOCK_PERFORMANCE_BY_PERIOD["today"].deliveriesCompletedToday, 27);
        assert.equal(MOCK_PERFORMANCE_BY_PERIOD["today"].completionRatePercent, 64.3);

        assert.equal(MOCK_PERFORMANCE_BY_PERIOD["last7days"].deliveriesReceivedToday, 312);
        assert.equal(MOCK_PERFORMANCE_BY_PERIOD["last7days"].deliveriesCompletedToday, 282);
        assert.equal(MOCK_PERFORMANCE_BY_PERIOD["last7days"].completionRatePercent, 90.4);

        const perfHtml = renderToStaticMarkup(
            <BranchPerformanceOverview
                branchId={1}
                branchName="Colombo Central Branch"
                performance={MOCK_PERFORMANCE_BY_PERIOD["today"]}
                couriers={MOCK_COURIER_ROSTER}
                isPerformanceAvailable={true}
                isCourierRosterAvailable={true}
                isLoading={false}
                error={null}
                onRetry={() => {}}
                isPreviewMode={true}
            />
        );

        assert.match(perfHtml, /Daily Delivery Volume Trends/);
        assert.match(perfHtml, /Today/);
        assert.match(perfHtml, /Yesterday/);
        assert.match(perfHtml, /Last 7 Days/);
        assert.match(perfHtml, /Last 30 Days/);
        assert.match(perfHtml, /64\.3%/);
    });

    it("14. Disabling Preview Mode: returns application to normal API integration behavior", () => {
        // When previewMode is explicitly false, it does not fabricate mock data
        // and displays the real API error state when Organization Service is unreachable
        const normalApiHtml = renderWithQueryClient(
            <BranchManagerDashboard
                previewMode={false}
                allowAuthorizedListFallback={false}
                testOverrides={{
                    branches: [],
                    isLoadingBranches: false,
                    branchesError: new Error("Network timeout: API Gateway unreachable"),
                }}
            />
        );

        assert.doesNotMatch(previewHtmlMatcher(normalApiHtml), /Colombo Central Branch/);
        assert.match(normalApiHtml, /Branch Operations API Unavailable/);
        assert.match(normalApiHtml, /Network timeout: API Gateway unreachable/);
        assert.doesNotMatch(normalApiHtml, /Enable Preview Mode/);
    });
});

function previewHtmlMatcher(html: string) {
    return html;
}

