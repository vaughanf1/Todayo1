'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

const DotScreenShader = dynamic(
  () => import('@/components/ui/dot-shader-background').then(mod => ({ default: mod.DotScreenShader })),
  { ssr: false }
);

export default function SignInPage() {
  const supabase = createClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      } else {
        setIsLoading(false);
      }
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session) {
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Shader Background */}
      <div className="fixed inset-0 z-0">
        <DotScreenShader />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="animate-fade-in">
          {/* Logo / Brand */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-foreground/10 backdrop-blur-sm border border-border/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-foreground mb-2">
              Todayo
            </h1>
            <p className="text-muted-foreground text-sm">
              AI-powered daily planning
            </p>
          </div>

          {/* Auth Card */}
          <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#ffffff',
                      brandAccent: '#e5e5e5',
                      inputBackground: 'rgba(255, 255, 255, 0.05)',
                      inputText: '#ffffff',
                      inputPlaceholder: '#6b7280',
                      inputBorder: 'rgba(255, 255, 255, 0.1)',
                      inputBorderFocus: 'rgba(255, 255, 255, 0.3)',
                      inputBorderHover: 'rgba(255, 255, 255, 0.2)',
                    },
                    borderWidths: {
                      buttonBorderWidth: '0px',
                      inputBorderWidth: '1px',
                    },
                    radii: {
                      borderRadiusButton: '12px',
                      buttonBorderRadius: '12px',
                      inputBorderRadius: '12px',
                    },
                    fontSizes: {
                      baseButtonSize: '14px',
                      baseInputSize: '14px',
                    },
                    fonts: {
                      bodyFontFamily: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`,
                      buttonFontFamily: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`,
                      inputFontFamily: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`,
                    },
                  },
                },
                className: {
                  button: 'font-medium !py-3',
                  input: '!py-3',
                  label: 'text-sm text-muted-foreground',
                  anchor: 'text-sm text-muted-foreground hover:text-foreground',
                  divider: 'bg-border/30',
                  message: 'text-sm',
                },
              }}
              providers={['google']}
              redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
              onlyThirdPartyProviders
              localization={{
                variables: {
                  sign_in: {
                    social_provider_text: 'Continue with {{provider}}',
                  },
                },
              }}
            />
          </div>

          {/* Demo Mode */}
          <div className="mt-6 text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => router.push('/')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Try Demo Mode →
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/60 mt-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            By signing in, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}
