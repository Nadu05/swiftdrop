import type { Metadata } from "next";
import { Suspense } from "react";
import BranchManagerDashboard from "@/components/organization/branch-dashboard/BranchManagerDashboard";

export const metadata: Metadata = {
    title: "Branch Manager Dashboard | SwiftDrop Branch Console",
    description:
        "Daily delivery operations, courier availability, branch performance, and service-area overview for your assigned SwiftDrop branch.",
};

function BranchManagerDashboardFallback() {
    return (
        <div className="org-page" aria-busy="true" aria-label="Loading Branch Manager Dashboard">
            <div className="org-skeleton-card" style={{ height: 112 }} />
            <div className="org-bm-ops-grid">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div key={idx} className="org-skeleton-card" />
                ))}
            </div>
        </div>
    );
}

export default function BranchConsoleDashboardPage() {
    return (
        <Suspense fallback={<BranchManagerDashboardFallback />}>
            <BranchManagerDashboard />
        </Suspense>
    );
}
