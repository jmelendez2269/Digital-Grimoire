import { useCallback, useEffect, useRef, useState } from 'react';

export interface WikiLinkEventDetail {
  title?: string | null;
  slug?: string | null;
}

type WikiLinkHandler = (detail: WikiLinkEventDetail) => void;

export interface WikiLinkActionHelpers {
  triggerNavigate: (detailOverride?: WikiLinkEventDetail) => void;
  triggerPreview: (detailOverride?: WikiLinkEventDetail) => void;
  triggerAIAction: (detailOverride?: WikiLinkEventDetail) => void;
}

interface UseWikiLinkActivationOptions {
  onActivate?: (detail: WikiLinkEventDetail, helpers: WikiLinkActionHelpers) => void;
  onNavigate?: WikiLinkHandler;
  onPreview?: WikiLinkHandler;
  onAIAction?: WikiLinkHandler;
  autoNavigate?: boolean;
  autoPreview?: boolean;
  autoAIAction?: boolean;
}

const defaultDetail: WikiLinkEventDetail = {};

/**
 * Subscribes to the `wikilink-activate` CustomEvent emitted by the TipTap WikiLink extension
 * and exposes helpers for navigation, preview tooltips, and AI workflows.
 */
export function useWikiLinkActivation(options: UseWikiLinkActivationOptions = {}) {
  const [activeLink, setActiveLink] = useState<WikiLinkEventDetail | null>(null);
  const [activationHistory, setActivationHistory] = useState<Array<{
    detail: WikiLinkEventDetail;
    timestamp: number;
  }>>([]);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const triggerNavigate = useCallback(
    (detailOverride?: WikiLinkEventDetail | null) => {
      const detail = detailOverride ?? activeLink ?? defaultDetail;
      optionsRef.current.onNavigate?.(detail);
    },
    [activeLink]
  );

  const triggerPreview = useCallback(
    (detailOverride?: WikiLinkEventDetail | null) => {
      const detail = detailOverride ?? activeLink ?? defaultDetail;
      optionsRef.current.onPreview?.(detail);
    },
    [activeLink]
  );

  const triggerAIAction = useCallback(
    (detailOverride?: WikiLinkEventDetail | null) => {
      const detail = detailOverride ?? activeLink ?? defaultDetail;
      optionsRef.current.onAIAction?.(detail);
    },
    [activeLink]
  );

  useEffect(() => {
    const activate = (detail: WikiLinkEventDetail) => {
      const normalizedDetail = detail ?? defaultDetail;
      setActiveLink(normalizedDetail);

      // Track activation in history
      setActivationHistory((prev) => {
        const newEntry = { detail: normalizedDetail, timestamp: Date.now() };
        const updated = [newEntry, ...prev].slice(0, 50); // Keep last 50
        
        // Optional: Store in localStorage for persistence
        try {
          localStorage.setItem('wikilink-history', JSON.stringify(updated));
        } catch (e) {
          // Ignore storage errors
        }
        
        return updated;
      });

      // Optional: Emit analytics event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'wikilink_activate', {
          event_category: 'journal',
          event_label: normalizedDetail.title || normalizedDetail.slug || 'unknown',
        });
      }

      const helpers: WikiLinkActionHelpers = {
        triggerNavigate: (detailOverride) => triggerNavigate(detailOverride ?? normalizedDetail),
        triggerPreview: (detailOverride) => triggerPreview(detailOverride ?? normalizedDetail),
        triggerAIAction: (detailOverride) => triggerAIAction(detailOverride ?? normalizedDetail),
      };

      const currentOptions = optionsRef.current;

      if (currentOptions.autoNavigate) {
        helpers.triggerNavigate(normalizedDetail);
      }
      if (currentOptions.autoPreview) {
        helpers.triggerPreview(normalizedDetail);
      }
      if (currentOptions.autoAIAction) {
        helpers.triggerAIAction(normalizedDetail);
      }

      currentOptions.onActivate?.(normalizedDetail, helpers);
    };

    const handleActivationEvent = (event: Event) => {
      const customEvent = event as CustomEvent<WikiLinkEventDetail>;
      activate(customEvent.detail ?? defaultDetail);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const element = target?.closest('[data-wikilink="true"]') as HTMLElement | null;
      if (!element) {
        return;
      }

      const detail: WikiLinkEventDetail = {
        title: element.dataset.wikilinkTitle || element.dataset.title || element.textContent?.trim() || null,
        slug: element.dataset.wikilinkSlug || element.dataset.slug || null,
      };

      activate(detail);
    };

    document.addEventListener('wikilink-activate', handleActivationEvent as EventListener);
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('wikilink-activate', handleActivationEvent as EventListener);
      document.removeEventListener('click', handleClick);
    };
  }, [triggerNavigate, triggerPreview, triggerAIAction]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('wikilink-history');
      if (stored) {
        const parsed = JSON.parse(stored);
        setActivationHistory(parsed);
      }
    } catch (e) {
      // Ignore errors
    }
  }, []);

  return {
    activeLink,
    activationHistory,
    clearActiveLink: () => setActiveLink(null),
    clearHistory: () => {
      setActivationHistory([]);
      try {
        localStorage.removeItem('wikilink-history');
      } catch (e) {
        // Ignore errors
      }
    },
    triggerNavigate,
    triggerPreview,
    triggerAIAction,
  };
}

export default useWikiLinkActivation;


