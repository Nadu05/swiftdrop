import { Suspense } from 'react';
import RolesPermissionsAuditView from '@/components/organization/roles/RolesPermissionsAuditView';

export default function OrganizationRolesAuditPage() {
  return (
    <Suspense
      fallback={
        <div className="org-page org-console-page" aria-busy="true">
          <div className="org-skeleton org-skeleton--lg" />
        </div>
      }
    >
      <RolesPermissionsAuditView />
    </Suspense>
  );
}

