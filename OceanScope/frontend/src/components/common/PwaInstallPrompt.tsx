/**
 * OceanScope PWA Installation Prompt
 * Captures browser beforeinstallprompt event and presents an elegant, accessible
 * installation card in the bottom-right corner of the landing page.
 */

import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if user already dismissed the prompt in this session
    const sessionDismissed = sessionStorage.getItem('oceanscope_pwa_dismissed');
    if (sessionDismissed === 'true') {
      return;
    }

    // 2. Check if already running in standalone/installed mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // 3. Detect iOS Safari (which doesn't support beforeinstallprompt)
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);

    if (isIosDevice && isSafari) {
      setIsIos(true);
      // Show iOS helper prompt with a slight delay
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 4. Capture native beforeinstallprompt event on Chromium/Edge/Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Reveal prompt with gentle delay to not disrupt initial page rendering
      setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      sessionStorage.setItem('oceanscope_pwa_dismissed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
        sessionStorage.setItem('oceanscope_pwa_dismissed', 'true');
      } else {
        // User clicked cancel in native prompt
        handleDismiss();
      }
    } catch (err) {
      console.warn('[PWA] Installation prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('oceanscope_pwa_dismissed', 'true');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <aside
      role="region"
      aria-label="Install OceanScope Application"
      className="fixed bottom-5 right-5 z-40 w-full max-w-sm px-4 sm:px-0 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-[0_12px_40px_rgba(15,23,42,0.12)] p-4 sm:p-4.5 transition-all">
        <div className="flex items-start justify-between gap-3">
          {/* Logo / App Icon */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0B84C6] to-[#0369A1] p-1 flex items-center justify-center shadow-sm flex-shrink-0">
              <img
                src="/assets/oceanscope-icon.png"
                alt="OceanScope"
                className="w-9 h-9 object-contain rounded-lg"
              />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">Install OceanScope</h2>
              <p className="text-xs text-slate-500 leading-snug mt-0.5">
                Quick access to ocean research, right from your device.
              </p>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss installation prompt"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors -mr-1 -mt-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button or iOS Safari Instructions */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          {isIos ? (
            <div className="w-full flex items-center justify-between text-xs text-slate-600 bg-sky-50/70 p-2.5 rounded-xl border border-sky-100">
              <div className="flex items-center gap-1.5 font-medium text-[#0369A1]">
                <Share className="w-3.5 h-3.5" />
                <span>Tap Share then 'Add to Home Screen'</span>
              </div>
              <button
                onClick={handleDismiss}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 ml-2"
              >
                Got it
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Not Now
              </button>
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#0B84C6] hover:bg-[#0973AD] rounded-xl transition-all shadow-sm shadow-sky-500/25"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
