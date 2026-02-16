"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useReportWebVitals } from "next/web-vitals";

export function NavigationTimer() {
    const pathname = usePathname();
    const [loadingTime, setLoadingTime] = useState<number | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const startTime = useRef<number>(Date.now());

    useEffect(() => {
        // Reset timer on path change start (approximated by effect)
        startTime.current = Date.now();
        setIsVisible(false);

        // Simple "done" check - in Next.js app router, the effect runs after navigation completes
        const end = Date.now();
        const duration = end - startTime.current;

        // If it was instant (client-side cache), show it. 
        // For real network fetches, we might want to hook into other events, 
        // but this basic diff in useEffect gives a "perceived" transition time for the React render.
        // However, a better approach for "route change" is often just measuring the gap between old and new path.

        // Actually, a more robust way for "page to page" in App Router is tricky without router events.
        // Let's use a slightly different heuristic: 
        // We can't easily hook "routeChangeStart" in App Router. 
        // But we can approximate "render completion" here.

        // Let's rely on useReportWebVitals for standard metrics, but for "Navigation duration", 
        // we can use a global click listener or similar if we really wanted "click to paint".
        // For now, let's just show the Next.js metric if available, or a simple render timestamp diff.

        // Allow the badge to show up after a brief delay to indicate "new page loaded"
        const timer = setTimeout(() => {
            setLoadingTime(Date.now() - startTime.current);
            setIsVisible(true);
        }, 100);

        const hideTimer = setTimeout(() => {
            setIsVisible(false);
        }, 5000);

        return () => {
            clearTimeout(timer);
            clearTimeout(hideTimer);
        };
    }, [pathname]);

    useReportWebVitals((metric) => {
        if (metric.name === 'Next.js-route-change-to-render') {
            setLoadingTime(metric.value);
            setIsVisible(true);
            setTimeout(() => setIsVisible(false), 5000);
        }
    });

    if (!isVisible || loadingTime === null) return null;

    // Color coding based on duration
    const getColor = (ms: number) => {
        if (ms < 200) return "bg-green-500/90";
        if (ms < 500) return "bg-yellow-500/90";
        return "bg-red-500/90";
    };

    return (
        <div className={`fixed bottom-4 left-4 z-[9999] px-3 py-1.5 rounded-full text-xs font-mono text-white shadow-lg backdrop-blur-md transition-opacity duration-300 ${getColor(loadingTime)}`}>
            Nav: {loadingTime.toFixed(0)}ms
        </div>
    );
}
