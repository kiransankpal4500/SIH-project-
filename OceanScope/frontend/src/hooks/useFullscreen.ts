/**
 * Robust, cross-browser Fullscreen Hook for OceanScope
 * Supports independent fullscreen targets:
 * - Whole website (document.documentElement)
 * - Three.js 3D Ocean Globe container
 * - Three.js 3D Ocean Chunk container
 */

import { useState, useEffect, useCallback, RefObject } from 'react';

export interface UseFullscreenOptions {
  onEnter?: () => void;
  onExit?: () => void;
}

export interface UseFullscreenResult {
  isFullscreen: boolean;
  isSupported: boolean;
  toggleFullscreen: () => Promise<void>;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
}

/**
 * Checks if the Fullscreen API is available in the current browser environment
 */
export function isFullscreenEnabled(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
  );
}

/**
 * Gets the current active fullscreen element across vendor prefixes
 */
export function getFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  return (
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement ||
    null
  );
}

/**
 * Custom hook to manage fullscreen state for a specific element or the entire document
 * @param targetRef Optional React ref to the DOM element to fullscreen. If omitted, targets document.documentElement.
 */
export function useFullscreen(
  targetRef?: RefObject<HTMLElement | null>,
  options?: UseFullscreenOptions
): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  // Sync state whenever fullscreen element changes in the browser
  const handleFullscreenChange = useCallback(() => {
    if (typeof document === 'undefined') return;
    const current = getFullscreenElement();
    const target = targetRef ? targetRef.current : document.documentElement;

    if (!target) {
      setIsFullscreen(false);
      return;
    }

    // When targeting whole website (document.documentElement), consider either documentElement or body as full website
    const matchesTarget =
      !targetRef
        ? current === document.documentElement || current === document.body
        : current === target;

    setIsFullscreen(matchesTarget);

    if (matchesTarget) {
      options?.onEnter?.();
    } else if (current === null) {
      options?.onExit?.();
    }
  }, [targetRef, options]);

  useEffect(() => {
    setIsSupported(isFullscreenEnabled());
    handleFullscreenChange();

    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange',
    ];

    events.forEach((ev) => document.addEventListener(ev, handleFullscreenChange));

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, handleFullscreenChange));
    };
  }, [handleFullscreenChange]);

  const enterFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    const target = targetRef ? targetRef.current : document.documentElement;
    if (!target) return;

    try {
      const current = getFullscreenElement();
      if (current && current !== target) {
        // If switching between fullscreen targets (e.g., website -> chunk or globe)
        try {
          if (target.requestFullscreen) {
            await target.requestFullscreen();
            return;
          }
        } catch {
          // Fallback: exit previous fullscreen element first before requesting on new target
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          }
        }
      }

      if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else if ((target as any).webkitRequestFullscreen) {
        await (target as any).webkitRequestFullscreen();
      } else if ((target as any).mozRequestFullScreen) {
        await (target as any).mozRequestFullScreen();
      } else if ((target as any).msRequestFullscreen) {
        await (target as any).msRequestFullscreen();
      }
    } catch (err) {
      console.warn('[useFullscreen] Fullscreen request was denied or interrupted:', err);
    }
  }, [targetRef]);

  const exitFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    if (!getFullscreenElement()) return;

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (err) {
      console.warn('[useFullscreen] Exit fullscreen request failed:', err);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    isSupported,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
}
