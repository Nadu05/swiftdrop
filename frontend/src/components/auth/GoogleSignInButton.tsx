'use client';

import { useEffect, useRef, useState } from 'react';
import { useGoogleAuth, getApiErrorMessage } from '@/hooks/api/use-auth';
import { Info, Sparkles, CheckCircle2 } from 'lucide-react';

interface GoogleSignInButtonProps {
  mode: 'signin' | 'signup';
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

// Module-level singleton trackers to prevent duplicate initialize() calls across re-renders/mounts
let gsiInitializedClientId: string | null = null;
let activeGsiCallback: ((response: { credential?: string }) => void) | null = null;

export default function GoogleSignInButton({ mode, onError }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const googleMutation = useGoogleAuth();

  const mutateAsyncRef = useRef(googleMutation.mutateAsync);
  const onErrorRef = useRef(onError);

  mutateAsyncRef.current = googleMutation.mutateAsync;
  onErrorRef.current = onError;

  // Read environment variable; fallback to 'demo-client-id' for local dev
  const rawClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const isRealGoogleConfigured = !!rawClientId && rawClientId.includes('.apps.googleusercontent.com');
  const isDemoMode = !isRealGoogleConfigured;
  const effectiveClientId = isRealGoogleConfigured ? rawClientId : 'demo-client-id';

  // Poll or detect when window.google is ready (only needed when real Google OAuth is configured)
  useEffect(() => {
    if (!isRealGoogleConfigured) {
      return;
    }

    const checkGis = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        setIsGisLoaded(true);
        return true;
      }
      return false;
    };

    if (checkGis()) return;

    const interval = setInterval(() => {
      if (checkGis()) {
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isRealGoogleConfigured]);

  // Initialize GIS and render Google's official secure button when real credentials exist
  useEffect(() => {
    if (!isRealGoogleConfigured || !isGisLoaded || !containerRef.current) {
      return;
    }

    try {
      activeGsiCallback = async (response: { credential?: string }) => {
        if (!response?.credential) {
          onErrorRef.current?.('Google did not return an authentication credential.');
          return;
        }

        try {
          await mutateAsyncRef.current({
            idToken: response.credential,
          });
        } catch (err) {
          onErrorRef.current?.(getApiErrorMessage(err));
        }
      };

      if (gsiInitializedClientId !== effectiveClientId) {
        window.google.accounts.id.initialize({
          client_id: effectiveClientId,
          callback: (response: { credential?: string }) => {
            activeGsiCallback?.(response);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        gsiInitializedClientId = effectiveClientId;
      }

      containerRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: mode === 'signup' ? 'signup_with' : 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 380,
      });
    } catch (err) {
      console.error('Failed to initialize Google Sign-In:', err);
    }
  }, [isRealGoogleConfigured, isGisLoaded, effectiveClientId, mode]);

  // Handle instant demo mode authentication
  const handleDemoSignIn = async () => {
    try {
      await googleMutation.mutateAsync({
        idToken: 'demo-google-token',
      });
    } catch (err) {
      onError?.(getApiErrorMessage(err));
    }
  };

  const handleActionClick = () => {
    if (isDemoMode) {
      handleDemoSignIn();
    } else if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch (err) {
        onError?.('Could not open Google prompt. Please allow popups.');
      }
    } else {
      onError?.('Google Sign-In is initializing. Please try again in a few seconds.');
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Real Google GIS Official Button */}
      {isRealGoogleConfigured && (
        <div
          ref={containerRef}
          style={{
            width: '100%',
            display: isGisLoaded ? 'flex' : 'none',
            justifyContent: 'center',
            minHeight: '44px',
          }}
        />
      )}

      {/* Button for Demo Mode OR fallback while GIS is loading */}
      {(!isRealGoogleConfigured || !isGisLoaded) && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={handleActionClick}
            disabled={googleMutation.isPending}
            style={googleBtnStyle}
            title={isDemoMode ? 'Click to sign in instantly with Demo Google Customer account' : 'Continue with Google'}
          >
            <GoogleIcon />
            <span style={{ flex: 1, textAlign: 'center' }}>
              {googleMutation.isPending
                ? 'Authenticating with Google...'
                : mode === 'signup'
                ? 'Sign up with Google'
                : 'Continue with Google'}
            </span>
            {isDemoMode && (
              <span style={demoBadgeStyle}>
                Demo
              </span>
            )}
          </button>

          {/* Configuration Hint & Helper */}
          {isDemoMode && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.25rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Instant Dev Mode: signs in as <b>google.user@swiftdrop.lk</b>
              </span>
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                style={setupLinkStyle}
              >
                Production Setup
              </button>
            </div>
          )}
        </div>
      )}

      {/* Optional Setup Guide Modal */}
      {showConfigModal && (
        <div style={modalBackdropStyle} onClick={() => setShowConfigModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Sparkles size={20} color="#38bdf8" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                Google OAuth Setup Guide
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1rem' }}>
              For live production Google Sign-In with real Google accounts, configure your credentials:
            </p>
            <ol style={{ fontSize: '0.75rem', color: '#cbd5e1', paddingLeft: '1.25rem', lineHeight: 1.7, margin: 0 }}>
              <li>Go to <b>Google Cloud Console</b> &rarr; <i>APIs &amp; Services</i> &rarr; <i>Credentials</i>.</li>
              <li>Create an <b>OAuth 2.0 Client ID</b> (Application Type: <i>Web application</i>).</li>
              <li>Add <code>http://localhost:3000</code> to <b>Authorized JavaScript origins</b>.</li>
              <li>Add <code>http://localhost:3000/api/auth/callback/google</code> to <b>Authorized redirect URIs</b>.</li>
              <li>Add to <code>frontend/.env.local</code>:
                <pre style={codeBlockStyle}>NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com</pre>
              </li>
              <li>Add to <code>services/identity-service/.../application.yml</code>:
                <pre style={codeBlockStyle}>GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com</pre>
              </li>
            </ol>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                style={closeBtnStyle}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const googleBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  width: '100%',
  padding: '0.65rem 1rem',
  background: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  color: '#0f172a',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease-in-out',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const demoBadgeStyle: React.CSSProperties = {
  background: '#e0f2fe',
  color: '#0284c7',
  fontSize: '0.65rem',
  fontWeight: 700,
  padding: '0.15rem 0.45rem',
  borderRadius: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const setupLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  fontSize: '0.7rem',
  color: '#38bdf8',
  cursor: 'pointer',
  textDecoration: 'underline',
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '1rem',
};

const modalContentStyle: React.CSSProperties = {
  background: '#0b1528',
  border: '1px solid rgba(59,130,246,0.3)',
  borderRadius: '12px',
  padding: '1.5rem',
  maxWidth: '520px',
  width: '100%',
  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
};

const codeBlockStyle: React.CSSProperties = {
  background: '#060a14',
  border: '1px solid #1e293b',
  borderRadius: '4px',
  padding: '0.35rem 0.5rem',
  margin: '0.3rem 0',
  color: '#38bdf8',
  fontFamily: 'monospace',
  fontSize: '0.7rem',
};

const closeBtnStyle: React.CSSProperties = {
  background: '#2563eb',
  border: 'none',
  color: '#fff',
  padding: '0.45rem 1rem',
  borderRadius: '6px',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.638-.057-1.252-.163-1.841H9v3.481h4.844c-.21 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
