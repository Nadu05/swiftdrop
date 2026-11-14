'use client';

import React from 'react';
import { SystemAdminGuard } from './RoleGuard';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  return <SystemAdminGuard>{children}</SystemAdminGuard>;
}
