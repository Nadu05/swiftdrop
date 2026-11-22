'use client';

import React from 'react';
import Link from 'next/link';
import { Webhook, Info, ArrowLeft, Radio } from 'lucide-react';

export default function MerchantWebhooksPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/merchant/dashboard"
          className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Webhook Subscriptions</h1>
          <p className="text-sm text-slate-400">
            Real-time HTTP callbacks for shipment status updates and delivery milestones
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/25 p-6 flex items-start gap-4">
        <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
          <Radio className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Webhook Events — Coming Soon</h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Configure webhook endpoints to receive instantaneous event notifications when parcels are picked up,
            reach sorting hubs, go out for delivery, or are successfully delivered to your customers.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-[#0c1829] border border-white/10 p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Supported Event Triggers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
          {[
            'order.created — Order successfully created',
            'order.pickup_assigned — Courier assigned for pickup',
            'order.picked_up — Parcel collected by courier',
            'order.in_transit — Parcel entered sorting facility',
            'order.out_for_delivery — Courier out for delivery',
            'order.delivered — Parcel successfully delivered with POD',
            'order.failed — Delivery attempt unsuccessful',
            'payment.cod_collected — Cash-on-delivery collected',
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
