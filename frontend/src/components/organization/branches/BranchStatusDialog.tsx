'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Power,
} from 'lucide-react';
import { updateBranchStatus } from '@/api/services/organization.api';
import type { BranchResponse, BranchStatus } from '@/types/organization.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface BranchStatusDialogProps {
  branch: BranchResponse | null;
  isOpen: boolean;
  onClose: () => void;
  /** Invoked ONLY after the backend confirms HTTP 200 OK on PATCH /api/v1/organization/branches/{id}. */
  onStatusUpdated: (updatedBranch: BranchResponse) => void;
}

/**
 * Confirmation modal for activating or deactivating an Organization branch.
 * Built using shadcn/ui Dialog and Button primitives with Radix accessibility.
 */
export default function BranchStatusDialog({
  branch,
  isOpen,
  onClose,
  onStatusUpdated,
}: BranchStatusDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && branch) {
      setIsSubmitting(false);
      setApiError(null);
    }
  }, [isOpen, branch]);

  if (!branch) {
    return null;
  }

  const isCurrentlyActive = branch.status === 'ACTIVE';
  const targetStatus: BranchStatus = isCurrentlyActive ? 'INACTIVE' : 'ACTIVE';

  const handleConfirm = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const updated = await updateBranchStatus(branch.id, targetStatus);
      onStatusUpdated(updated);
    } catch (err: unknown) {
      setApiError(
        err instanceof Error
          ? err.message
          : `Unable to ${
              isCurrentlyActive ? 'deactivate' : 'activate'
            } branch "${branch.name}".`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md p-6 sm:rounded-xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                isCurrentlyActive
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-emerald-500/10 text-emerald-500'
              }`}
              aria-hidden="true"
            >
              {isCurrentlyActive ? (
                <AlertTriangle size={20} />
              ) : (
                <CheckCircle2 size={20} />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {isCurrentlyActive ? 'Deactivate Branch' : 'Activate Branch'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Confirm operational status change in Organization Service
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Target Branch Summary Box */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-slate-500" aria-hidden="true" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {branch.name}
                  </span>
                  <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {branch.code}
                  </code>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={13} aria-hidden="true" />
                  <span>
                    {branch.addressLine1}, {branch.city}
                  </span>
                </div>
              </div>

              {/* Status Transition Indicator */}
              <div className="flex items-center gap-1.5 shrink-0" aria-label="Status transition">
                <Badge
                  variant={isCurrentlyActive ? 'default' : 'secondary'}
                  className={
                    isCurrentlyActive
                      ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }
                >
                  {isCurrentlyActive ? 'Active' : 'Inactive'}
                </Badge>
                <ArrowRight size={13} className="text-slate-400" aria-hidden="true" />
                <Badge
                  variant={isCurrentlyActive ? 'secondary' : 'default'}
                  className={
                    isCurrentlyActive
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      : 'bg-emerald-600 hover:bg-emerald-600 text-white'
                  }
                >
                  {isCurrentlyActive ? 'Inactive' : 'Active'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Operational Impact Description */}
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {isCurrentlyActive ? (
              <>
                Are you sure you want to deactivate{' '}
                <strong className="text-slate-900 dark:text-slate-100">{branch.name}</strong> (
                <code className="font-mono text-xs">{branch.code}</code>)? Once deactivated,
                this branch will be marked as <strong className="text-red-500">INACTIVE</strong> in
                the Organization Service and will no longer be eligible for active branch operations
                until reactivated.
              </>
            ) : (
              <>
                Are you sure you want to activate{' '}
                <strong className="text-slate-900 dark:text-slate-100">{branch.name}</strong> (
                <code className="font-mono text-xs">{branch.code}</code>)? Once activated,
                this branch will be marked as <strong className="text-emerald-500">ACTIVE</strong> in
                the Organization Service and will become available for active branch operations.
              </>
            )}
          </p>

          {/* API Error Alert */}
          {apiError && (
            <div
              className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
              role="alert"
            >
              <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
              <div>
                <strong className="block font-semibold">Status Update Failed</strong>
                <p className="text-xs text-red-700 dark:text-red-300">{apiError}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isCurrentlyActive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={
              !isCurrentlyActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-initial'
                : 'flex-1 sm:flex-initial'
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="mr-2 animate-spin" aria-hidden="true" />
                <span>{isCurrentlyActive ? 'Deactivating...' : 'Activating...'}</span>
              </>
            ) : (
              <>
                <Power size={15} className="mr-2" aria-hidden="true" />
                <span>{isCurrentlyActive ? 'Deactivate Branch' : 'Activate Branch'}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
