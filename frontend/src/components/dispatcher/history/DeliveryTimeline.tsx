'use client';

import { History, UserCheck, Truck, RotateCcw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { HistoryTimelineEntry } from './types';

interface DeliveryTimelineProps {
  timeline: HistoryTimelineEntry[];
}

export default function DeliveryTimeline({ timeline }: DeliveryTimelineProps) {
  const formatTime = (isoStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  const getStageIcon = (stage: string) => {
    const s = stage.toLowerCase();
    if (s.includes('assignment') || s.includes('reassign')) {
      return <UserCheck size={12} className="text-blue-600" />;
    }
    if (s.includes('transit') || s.includes('pickup') || s.includes('acceptance')) {
      return <Truck size={12} className="text-indigo-600" />;
    }
    if (s.includes('attempt')) {
      return <RotateCcw size={12} className="text-amber-600" />;
    }
    if (s.includes('successful') || s.includes('delivered')) {
      return <CheckCircle2 size={12} className="text-emerald-600" />;
    }
    if (s.includes('failed') || s.includes('cancelled') || s.includes('returned')) {
      return <XCircle size={12} className="text-rose-600" />;
    }
    return <Clock size={12} className="text-slate-500" />;
  };

  return (
    <div className="dispatcher-modal-section">
      <div className="dispatcher-modal-section-title">
        <History size={15} aria-hidden="true" />
        <span>Full Lifecycle Audit Timeline ({timeline.length} Events)</span>
      </div>

      <div className="dispatcher-assignment-history">
        {timeline.map((entry) => (
          <div key={entry.id} className="dispatcher-assignment-history-item">
            <div className="dispatcher-assignment-history-dot" />
            <div className="dispatcher-assignment-history-content">
              <div className="dispatcher-assignment-history-header">
                <span className="dispatcher-assignment-history-courier flex items-center gap-1.5">
                  {getStageIcon(entry.stage)}
                  <span>{entry.stage}</span>
                </span>
                <span className="dispatcher-assignment-history-time">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
              <span className="dispatcher-assignment-history-reason">
                {entry.description}
              </span>
              <span className="dispatcher-assignment-history-by">
                Logged by: {entry.performedBy}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

