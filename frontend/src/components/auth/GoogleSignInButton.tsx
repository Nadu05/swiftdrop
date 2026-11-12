'use client';

import { useEffect, useRef, useState } from 'react';
import { useGoogleAuth, getApiErrorMessage } from '@/hooks/api/use-auth';

interface GoogleSignInButtonProps {
  mode: 'signin' | 'signup';
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleSignInButton({ mode, onError }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const googleMutation = useGoogleAuth();

  const mutateAsyncRef = useRef(googleMutation.mutateAsync);
  const onErrorRef = useRef(onError);
  const initializedClientIdRef = useRef<string | null>(null);

  // Keep the latest callbacks without reinitializing Google.
  mutateAsyncRef.current = googleMutation.mutateAsync;
  onErrorRef.current = onError;

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Poll or detect when window.google is ready
  useEffect(() => {
    if (!clientId) {
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
    }, 200);

    return () => clearInterval(interval);
  }, [clientId]);

  // Initialize GIS and render Google's official secure button
  useEffect(() => {
    if (!isGisLoaded || !clientId || !containerRef.current) {
      return;
    }

    try {
      // Initialize Google only once for this client ID.
      if (initializedClientIdRef.current !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,

          callback: async (response: { credential?: string }) => {
            if (!response?.credential) {
              onErrorRef.current?.(
                'Google did not return an authentication credential.'
              );
              return;
            }

            try {
              await mutateAsyncRef.current({
                idToken: response.credential,
              });
            } catch (err) {
              onErrorRef.current?.(getApiErrorMessage(err));
            }
          },

          auto_select: false,
          cancel_on_tap_outside: true,
        });

        initializedClientIdRef.current = clientId;
      }

      // Render the button separately from initialization.
      containerRef.current.innerHTML = '';

      window.google.accounts.id.renderButton(
        containerRef.current,
        {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: mode === 'signup' ? 'signup_with' : 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 380,
        }
      );

    } catch (err) {
      console.error('Failed to initialize Google Sign-In:', err);
    }
  }, [isGisLoaded, clientId, mode]);

  // Fallback click handler if user clicks the button before GIS iframe renders
  const handleFallbackClick = () => {
    if (!clientId) {
      onError?.('Google OAuth is not configured. Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
      return;
    }

    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.warn('Google One Tap prompt skipped or not displayed:', notification.getNotDisplayedReason?.());
          }
        });
      } catch (err) {
        onError?.('Could not open Google Sign-In prompt. Please check popup permissions.');
      }
    } else {
      onError?.('Google Sign-In is still loading. Please wait a moment.');
    }
  };

  if (!clientId) {
    return (
      <button
        type="button"
        disabled
        style={disabledButtonStyle}
        title="NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured"
      >
        <GoogleIcon />
        <span>Continue with Google (Config Required)</span>
      </button>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Container where GIS renders the official iframe button */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          display: isGisLoaded ? 'flex' : 'none',
          justifyContent: 'center',
          minHeight: '44px',
        }}
      />

      {/* Styled fallback button displayed while GIS script loads */}
      {!isGisLoaded && (
        <button
          type="button"
          onClick={handleFallbackClick}
          disabled={googleMutation.isPending}
          style={googleBtnStyle}
        >
          <GoogleIcon />
          <span>{mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</span>
        </button>
      )}

      {googleMutation.isPending && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#60a5fa' }}>
          Authenticating with Google...
        </p>
      )}
    </div>
  );
}

const googleBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.65rem',
  width: '100%',
  padding: '0.7rem',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(59,130,246,0.2)',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const disabledButtonStyle: React.CSSProperties = {
  ...googleBtnStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
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

