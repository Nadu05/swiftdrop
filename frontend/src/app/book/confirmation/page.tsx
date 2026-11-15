'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Copy, Check } from 'lucide-react';

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  // The tracking number of the booking that was just made
  const trackingNumber = searchParams.get('trackingNumber') || 'TRK-PENDING';

  const handleCopy = () => {
    if (trackingNumber && trackingNumber !== 'TRK-PENDING') {
      navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="sd-fullpage-root">
      {/* ---------------- TOP HEADER BAR (same as the booking pages) ---------------- */}
      <header className="sd-fullpage-header">
        <div className="sd-header-inner">
          <button
            type="button"
            onClick={() => router.push('/customer/dashboard')}
            className="sd-back-btn"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="sd-header-title">Booking confirmed</h1>
            <div className="sd-header-sub">New delivery · All done</div>
          </div>
        </div>
      </header>

      <main className="sd-fullpage-body">
        <div className="sd-conf-page">
          {/* Light blue glass card */}
          <div className="glass-card sd-conf-hero">
            <div className="sd-conf-check">
              <CheckCircle2 size={36} color="#ffffff" />
            </div>

            <div className="sd-conf-pills">
              <span className="sd-conf-pill green">Booking confirmed</span>
              <span className="sd-conf-pill blue">Courier coming soon</span>
            </div>

            <h2 className="sd-conf-title">Your delivery is booked!</h2>
            <p className="sd-conf-text">
              Thank you! We have received your booking. A courier will be assigned shortly and will collect your
              parcel from your pickup address.
            </p>
          </div>

          {/* Tracking number card */}
          <div
            className="glass-card"
            style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(11, 17, 33, 0.95) 100%)',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              Your Tracking Number
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1rem',
                background: 'rgba(30, 41, 59, 0.6)',
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                border: '1px dashed rgba(96, 165, 250, 0.5)',
              }}
            >
              <code style={{ fontSize: '1.75rem', fontWeight: 800, color: '#60a5fa', letterSpacing: '0.05em' }}>
                {trackingNumber}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                title="Copy tracking number"
                className="btn btn-secondary"
                style={{
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {copied ? (
                  <>
                    <Check size={14} color="#10b981" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy
                  </>
                )}
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Keep this number safe. You can use it any time to see where your parcel is.
            </p>
          </div>
        </div>
      </main>

      <style jsx global>{`
        /* Page frame and top bar: identical to the booking pages */
        .sd-fullpage-root {
          width: 100%;
          min-height: 100vh;
          background: #f4f7fb;
          display: flex;
          flex-direction: column;
        }
        .sd-fullpage-header {
          background: #0f1f38;
          color: #ffffff;
          padding: 1.25rem 2.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          width: 100%;
        }
        .sd-header-inner {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .sd-back-btn {
          background: transparent;
          border: none;
          color: #ffffff;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: opacity 0.15s;
        }
        .sd-back-btn:hover {
          opacity: 0.8;
        }
        .sd-header-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.01em;
          margin: 0;
          line-height: 1.2;
        }
        .sd-header-sub {
          font-size: 0.78rem;
          color: #8fa3bf;
          margin-top: 3px;
          font-weight: 500;
        }
        .sd-fullpage-body {
          flex: 1;
          padding: 2rem 2.5rem 4rem 2.5rem;
          background: #f4f7fb;
          width: 100%;
        }

        /* Content */
        .sd-conf-page {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          width: 100%;
          max-width: 850px;
          margin: 0 auto;
        }

        /* Light blue glass card */
        .sd-conf-hero {
          background: linear-gradient(135deg, rgba(224, 236, 254, 0.95) 0%, rgba(255, 255, 255, 0.7) 100%);
          border: 1px solid rgba(37, 99, 235, 0.22);
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.9);
          padding: 2.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: none;
        }

        .sd-conf-hero:hover {
          transform: none;
          border-color: rgba(37, 99, 235, 0.3);
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .sd-conf-check {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.15);
        }

        .sd-conf-pills {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .sd-conf-pill {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.85);
          border-radius: 999px;
          padding: 0.3rem 0.85rem;
        }

        .sd-conf-pill.green {
          color: #16a34a;
          border: 1px solid rgba(22, 163, 74, 0.3);
        }

        .sd-conf-pill.blue {
          color: #2563eb;
          border: 1px solid rgba(37, 99, 235, 0.3);
        }

        .sd-conf-title {
          font-size: 2rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0 0 0.5rem;
        }

        .sd-conf-text {
          color: #475569;
          font-size: 0.95rem;
          line-height: 1.55;
          max-width: 560px;
          margin: 0;
        }

        @media (max-width: 992px) {
          .sd-fullpage-header {
            padding: 1.25rem 1.5rem;
          }

          .sd-fullpage-body {
            padding: 1.5rem 1.5rem 3rem 1.5rem;
          }
        }

        @media (max-width: 640px) {
          .sd-fullpage-header {
            padding: 1rem 1.25rem;
          }

          .sd-fullpage-body {
            padding: 1.25rem 1rem 3rem 1rem;
          }

          .sd-conf-hero {
            padding: 2rem 1.25rem;
          }

          .sd-conf-title {
            font-size: 1.6rem;
          }
        }
      `}</style>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
          Loading your booking...
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
