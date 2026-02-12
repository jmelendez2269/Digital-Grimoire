"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Sparkles,
  Zap,
  Crown,
  Check,
  Loader2,
  CreditCard,
  Calendar,
  AlertCircle,
  Info,
  BookOpen,
  GraduationCap,
  ArrowUp,
  ArrowDown
} from "lucide-react";

type SubscriptionTier = 'free' | 'student' | 'scholar' | 'adept';

interface SubscriptionStatus {
  tier: SubscriptionTier;
  queryCount: number;
  queryLimit: number;
  resetDate: Date | null;
}

interface TierInfo {
  name: string;
  price: number;
  priceId?: string;
  queries: string; // e.g., "25-50" or "50-100"
  features: string[];
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
}

export default function SubscriptionTab() {
  // Aggressive debugging - these should ALWAYS appear if component renders
  if (typeof window !== 'undefined') {
    console.log('🎯 SubscriptionTab component rendering');
    console.log('🎯 Window location:', window.location.href);
    console.log('🎯 Search params from window:', window.location.search);
  }

  const searchParams = useSearchParams();
  const { user, supabase } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  // Log immediately after hooks
  if (typeof window !== 'undefined') {
    console.log('🎯 SubscriptionTab after hooks:', {
      hasUser: !!user,
      userId: user?.id,
      searchParamsString: window.location.search,
      searchParamsSuccess: searchParams.get("success"),
      searchParamsCanceled: searchParams.get("canceled")
    });
  }

  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus();
    }
  }, [user]);

  // Auto-sync if user has Stripe customer but no subscription status
  // This catches cases where checkout completed but sync failed
  useEffect(() => {
    const autoSyncIfNeeded = async () => {
      if (!user || !subscription) return; // Wait for subscription to load

      // Check if user has Stripe customer but subscription is still free
      const { data: userData } = await supabase
        .from('users')
        .select('stripe_customer_id, subscription_status, stripe_subscription_id')
        .eq('id', user.id)
        .single();

      if (userData?.stripe_customer_id &&
        (!userData.subscription_status || userData.subscription_status === 'free') &&
        !userData.stripe_subscription_id &&
        subscription.tier === 'free') {

        console.log('🔄 Auto-syncing: User has Stripe customer but no subscription status');

        // Check if we've already tried syncing recently
        const syncKey = `subscription_sync_${user.id}`;
        const hasSynced = typeof window !== 'undefined' ? sessionStorage.getItem(syncKey) : null;
        const syncTimestamp = typeof window !== 'undefined' ? sessionStorage.getItem(`${syncKey}_timestamp`) : null;
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);

        // Only auto-sync if we haven't synced in the last 5 minutes
        if (!hasSynced || !syncTimestamp || parseInt(syncTimestamp) < fiveMinutesAgo) {
          try {
            const syncResponse = await fetch('/api/stripe/sync-subscription', {
              method: 'POST',
            });

            if (syncResponse.ok) {
              const syncData = await syncResponse.json();
              if (syncData.synced) {
                console.log('✅ Auto-sync successful:', syncData);
                await fetchSubscriptionStatus();
              }
            }
          } catch (error) {
            console.error('Auto-sync error:', error);
          }
        }
      }
    };

    // Run after a short delay to let subscription load
    const timeout = setTimeout(() => {
      autoSyncIfNeeded();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [user, subscription, supabase]);

  // Handle success/cancel from Stripe checkout
  useEffect(() => {
    console.log('🔍 SubscriptionTab useEffect RUNNING - this should always appear');

    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    console.log('🔍 SubscriptionTab useEffect triggered:', {
      success,
      canceled,
      hasUser: !!user,
      userId: user?.id,
      fullSearch: typeof window !== 'undefined' ? window.location.search : 'N/A'
    });

    // Use sessionStorage to track if we've synced (survives page reloads but not browser restarts)
    // This is more reliable than useRef which can persist across Fast Refresh
    // Use a simpler key that doesn't depend on URL params
    const syncKey = `subscription_sync_${user?.id || 'anonymous'}`;
    const hasSynced = typeof window !== 'undefined' ? sessionStorage.getItem(syncKey) : null;

    console.log('🔍 Sync check:', {
      syncKey,
      hasSynced,
      willSync: success === "true" && !hasSynced
    });

    // If we have success=true but sessionStorage says we synced, check if subscription actually exists
    // Use a timestamp-based approach: if sync was more than 2 minutes ago, allow retry
    if (success === "true" && hasSynced && user) {
      const syncTimestamp = typeof window !== 'undefined' ? sessionStorage.getItem(`${syncKey}_timestamp`) : null;
      const now = Date.now();
      const twoMinutesAgo = now - (2 * 60 * 1000);

      // If no timestamp or timestamp is old, or if subscription is still free, clear and retry
      if (!syncTimestamp || parseInt(syncTimestamp) < twoMinutesAgo) {
        console.log('⚠️ Sync timestamp expired or missing - clearing flag to retry');
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(syncKey);
          sessionStorage.removeItem(`${syncKey}_timestamp`);
        }
      } else if (subscription?.tier === 'free') {
        // If we have a recent timestamp but subscription is still free, something went wrong - retry
        console.log('⚠️ Recent sync but subscription still free - clearing flag to retry');
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(syncKey);
          sessionStorage.removeItem(`${syncKey}_timestamp`);
        }
      }
    }

    // Prevent multiple syncs - check sessionStorage (might have been cleared above)
    const currentHasSynced = typeof window !== 'undefined' ? sessionStorage.getItem(syncKey) : null;
    if (success === "true" && !currentHasSynced) {
      // Mark as syncing immediately to prevent duplicate calls
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(syncKey, 'true');
        sessionStorage.setItem(`${syncKey}_timestamp`, Date.now().toString());
      }

      // Sync subscription from Stripe first (in case webhook hasn't fired)
      const syncAndRefresh = async () => {
        let toastShown = false;
        const maxRetries = 3;
        let retryCount = 0;

        const attemptSync = async (): Promise<void> => {
          try {
            console.log(`🔄 Starting subscription sync (attempt ${retryCount + 1}/${maxRetries})...`);

            // Wait a bit for Stripe to process the subscription (especially on first attempt)
            if (retryCount > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }

            // Try to sync from Stripe (this handles cases where webhooks haven't fired)
            const syncResponse = await fetch('/api/stripe/sync-subscription', {
              method: 'POST',
            });

            if (syncResponse.ok) {
              const syncData = await syncResponse.json();
              console.log('📦 Sync response:', syncData);

              if (syncData.synced) {
                console.log('✅ Subscription synced from Stripe:', syncData);
                // Wait a moment for database to update
                await new Promise(resolve => setTimeout(resolve, 500));

                // Refresh subscription status from database
                if (user) {
                  await fetchSubscriptionStatus();

                  // Only show toast once
                  if (!toastShown) {
                    const tierName = syncData.tier === 'student' ? 'Student'
                      : syncData.tier === 'scholar' ? 'Scholar'
                        : syncData.tier === 'adept' ? 'Adept'
                          : 'Premium';
                    toast.success(`Subscription activated! You're now on the ${tierName} tier.`);
                    toastShown = true;
                  }
                }

                // Clean up URL params after successful sync
                const url = new URL(window.location.href);
                url.searchParams.delete('success');
                window.history.replaceState({}, '', url.toString());

                // Clear sessionStorage after successful sync so it can run again if needed
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem(syncKey);
                  sessionStorage.removeItem(`${syncKey}_timestamp`);
                }

                return; // Success, exit retry loop
              } else {
                // No subscription found yet, but might be available soon
                console.log(`ℹ️ No subscription found to sync (attempt ${retryCount + 1}):`, syncData.message);

                // If we've exhausted retries, refresh anyway and show a message
                if (retryCount >= maxRetries - 1) {
                  if (user) {
                    await fetchSubscriptionStatus();
                    if (!toastShown) {
                      toast.success("Subscription activated! Your subscription status will update shortly.");
                      toastShown = true;
                    }
                  }

                  // Clean up URL params even if sync didn't work
                  const url = new URL(window.location.href);
                  url.searchParams.delete('success');
                  window.history.replaceState({}, '', url.toString());

                  return;
                }

                // Retry
                retryCount++;
                return attemptSync();
              }
            } else {
              const errorData = await syncResponse.json().catch(() => ({}));
              console.error(`❌ Failed to sync subscription (attempt ${retryCount + 1}):`, errorData);

              // If we've exhausted retries, refresh anyway
              if (retryCount >= maxRetries - 1) {
                if (user) {
                  await fetchSubscriptionStatus();
                  if (!toastShown) {
                    toast.success("Subscription activated! Your subscription status will update shortly.");
                    toastShown = true;
                  }
                }

                // Clean up URL params even on error
                const url = new URL(window.location.href);
                url.searchParams.delete('success');
                window.history.replaceState({}, '', url.toString());

                return;
              }

              // Retry
              retryCount++;
              return attemptSync();
            }
          } catch (error) {
            console.error(`Error syncing subscription (attempt ${retryCount + 1}):`, error);

            // If we've exhausted retries, refresh anyway
            if (retryCount >= maxRetries - 1) {
              if (user) {
                await fetchSubscriptionStatus();
                if (!toastShown) {
                  toast.success("Subscription activated! Your subscription status will update shortly.");
                  toastShown = true;
                }
              }

              // Clean up URL params even on error
              const url = new URL(window.location.href);
              url.searchParams.delete('success');
              window.history.replaceState({}, '', url.toString());

              return;
            }

            // Retry
            retryCount++;
            return attemptSync();
          }
        };

        attemptSync();
      };

      syncAndRefresh();
    } else if (canceled === "true") {
      toast.info("Checkout canceled");
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete('canceled');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, user]);

  const fetchSubscriptionStatus = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch subscription status from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_status, role, stripe_customer_id, stripe_subscription_id')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.log('Project Parallax subscription object:', subscription);
        toast.error('Failed to load subscription status');
        setLoading(false);
        return;
      }

      console.log('📊 Current subscription data from database:', {
        subscription_status: userData?.subscription_status,
        role: userData?.role,
        hasStripeCustomer: !!userData?.stripe_customer_id,
        hasStripeSubscription: !!userData?.stripe_subscription_id,
      });

      // Determine tier
      let tier: SubscriptionTier = 'free';
      if (userData?.role === 'admin') {
        tier = 'adept';
      } else {
        const status = userData?.subscription_status;
        if (status === 'student') tier = 'student';
        else if (status === 'scholar') tier = 'scholar';
        else if (status === 'adept') tier = 'adept';
        else if (status === 'premium' || status === 'active') {
          // Legacy: treat as scholar for now
          tier = 'scholar';
        }
      }

      console.log('🎯 Determined tier:', tier);

      // Fetch rate limit info
      const rateLimitResponse = await fetch('/api/parallax/rate-limit');
      const rateLimitData = rateLimitResponse.ok
        ? await rateLimitResponse.json()
        : { remaining: 5, limit: 5, resetDate: new Date() };

      setSubscription({
        tier,
        queryCount: rateLimitData.limit - rateLimitData.remaining,
        queryLimit: rateLimitData.limit,
        resetDate: rateLimitData.resetDate ? new Date(rateLimitData.resetDate) : null,
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast.error('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: 'student' | 'scholar' | 'adept') => {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      toast.error('Stripe is not configured. Please contact support.');
      return;
    }

    setProcessing(tier);
    try {
      // Get the price ID for the selected tier
      const priceIdMap: Record<string, string | undefined> = {
        student: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT,
        scholar: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR,
        adept: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT,
      };

      const priceId = priceIdMap[tier];

      if (!priceId) {
        toast.error(`${tier} subscription pricing not configured. Please contact support.`);
        setProcessing(null);
        return;
      }

      // Log price ID for debugging (only partial for security)
      if (process.env.NODE_ENV === 'development') {
        console.log(`Attempting to create checkout for ${tier} tier with price ID: ${priceId.substring(0, 20)}...`);
      }

      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          mode: 'subscription',
        }),
      });

      let data: any = {};
      try {
        const responseText = await response.text();
        if (responseText) {
          data = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error(`Server returned invalid response (${response.status} ${response.statusText})`);
      }

      if (!response.ok) {
        const errorMessage = data.error || data.message || `Failed to create checkout session (${response.status})`;
        const fullErrorDetails = JSON.stringify(data, null, 2);
        console.error('❌ Checkout session error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error || 'No error field in response',
          message: data.message || 'No message field in response',
          details: data.details || 'No details field',
          fullResponse: fullErrorDetails,
        });
        // Log the full error details for debugging
        console.error('Full error response:', fullErrorDetails);
        throw new Error(errorMessage);
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      const errorDetails = {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        fullError: error,
      };
      console.error('❌ Error creating checkout session:', errorDetails);
      // Also log the error as a string for better visibility
      console.error('Error message:', error instanceof Error ? error.message : String(error));

      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Failed to start checkout. Please try again or contact support.';
      toast.error(errorMessage);
    } finally {
      setProcessing(null);
    }
  };

  const handleManualSync = async () => {
    setProcessing('sync');
    try {
      console.log('🔄 Manual sync triggered');
      const syncResponse = await fetch('/api/stripe/sync-subscription', {
        method: 'POST',
      });

      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        console.log('📦 Manual sync response:', syncData);

        if (syncData.synced) {
          toast.success(`Subscription synced! You're now on the ${syncData.tier} tier.`);
          await fetchSubscriptionStatus();
        } else {
          toast.info(syncData.message || 'No subscription found to sync');
          await fetchSubscriptionStatus(); // Refresh anyway
        }
      } else {
        const errorData = await syncResponse.json().catch(() => ({}));
        console.error('❌ Manual sync failed:', errorData);
        toast.error(errorData.error || errorData.message || 'Failed to sync subscription');
      }
    } catch (error) {
      console.error('Error in manual sync:', error);
      toast.error('Failed to sync subscription. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      toast.error('Stripe is not configured. Please contact support.');
      return;
    }

    setProcessing('manage');
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
      });

      let data: any = {};
      try {
        const responseText = await response.text();
        if (responseText) {
          data = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error('Failed to parse portal session response as JSON:', parseError);
        throw new Error(`Server returned invalid response (${response.status} ${response.statusText})`);
      }

      if (!response.ok) {
        const errorMessage = data.error || data.message || `Failed to create portal session (${response.status})`;
        console.error('Portal session error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error || 'No error field in response',
          message: data.message || 'No message field in response',
          fullData: Object.keys(data).length > 0 ? data : 'Response body was empty',
        });
        throw new Error(errorMessage);
      }

      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      console.error('Error creating portal session:', {
        error,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Failed to open subscription management. Please try again or contact support.';
      toast.error(errorMessage);
    } finally {
      setProcessing(null);
    }
  };

  const getTierInfo = (tier: SubscriptionTier): TierInfo | null => {
    switch (tier) {
      case 'free':
        return {
          name: 'The Reader',
          price: 0,
          queries: '5',
          features: [
            '5 AI queries per month',
            '25 journal pages',
            'Full library access',
            'Full graph access',
            'Basic search',
            'Unlimited annotations',
            'Unlimited collections',
          ],
          icon: <BookOpen className="w-5 h-5" />,
          color: 'text-zinc-400',
          borderColor: 'border-zinc-700',
          bgColor: 'bg-zinc-900/30',
        };
      case 'student':
        return {
          name: 'The Student',
          price: 5,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT,
          queries: '5',
          features: [
            '5 AI queries per month',
            'Unlimited journal pages',
            'Full library access',
            'Full graph access',
            'Unlimited annotations',
            'Unlimited collections',
          ],
          icon: <GraduationCap className="w-5 h-5" />,
          color: 'text-blue-400',
          borderColor: 'border-blue-600/30',
          bgColor: 'bg-blue-900/10',
        };
      case 'scholar':
        return {
          name: 'The Scholar',
          price: 9.99,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR,
          queries: '25-50',
          features: [
            '25-50 AI queries per month (beta - limits may adjust)',
            'Unlimited journal pages',
            'Full library access',
            'Full graph access',
            'Unlimited annotations',
            'Unlimited collections',
            'Advanced annotation search',
            'Priority support',
          ],
          icon: <Sparkles className="w-5 h-5" />,
          color: 'text-purple-400',
          borderColor: 'border-purple-600/30',
          bgColor: 'bg-purple-900/10',
        };
      case 'adept':
        return {
          name: 'The Adept',
          price: 15,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT,
          queries: '50-100',
          features: [
            '50-100 AI queries per month (beta - limits may adjust)',
            'Unlimited journal pages',
            'Full library access',
            'Full graph access',
            'Unlimited annotations',
            'Unlimited collections',
            'Advanced annotation search',
            'Priority support',
            'Early access to new features',
          ],
          icon: <Crown className="w-5 h-5" />,
          color: 'text-amber-400',
          borderColor: 'border-amber-600/30',
          bgColor: 'bg-amber-900/10',
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-900/20 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-400">Failed to load subscription information</p>
      </div>
    );
  }

  const currentTierInfo = getTierInfo(subscription.tier);
  const isPaid = subscription.tier !== 'free';

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-amber-100">Current Plan</h3>
          {currentTierInfo && (
            <div className={`flex items-center gap-2 px-3 py-1 ${currentTierInfo.bgColor} border ${currentTierInfo.borderColor} rounded-full`}>
              {currentTierInfo.icon}
              <span className={`text-sm font-semibold ${currentTierInfo.color}`}>
                {currentTierInfo.name}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Status Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-zinc-500 mb-1">Subscription Tier</p>
              <p className="text-lg font-semibold text-amber-100">
                {currentTierInfo?.name || 'Free'}
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 mb-1">Query Usage</p>
              <p className="text-lg font-semibold text-amber-100">
                {subscription.queryCount} / {subscription.queryLimit}
              </p>
            </div>
          </div>

          {/* Reset Date */}
          {subscription.resetDate && (
            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Calendar className="w-4 h-4" />
                <span>
                  Queries reset on {subscription.resetDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Manual Sync Button - Show if subscription is free but user might have Stripe customer */}
          {subscription.tier === 'free' && (
            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={handleManualSync}
                disabled={processing !== null}
                className="w-full py-2 px-4 border border-amber-700/50 bg-amber-900/20 hover:bg-amber-900/30 text-amber-300 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing === 'sync' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Sync Subscription Status
                  </>
                )}
              </button>
              <p className="text-xs text-zinc-500 text-center mt-2">
                If you recently subscribed, click to sync your subscription status
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Beta Messaging */}
      {(subscription.tier === 'scholar' || subscription.tier === 'adept') && (
        <div className="rounded-lg border border-amber-800/30 bg-amber-900/10 p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-100/80">
              <p className="font-semibold mb-1">Beta Query Limits</p>
              <p className="text-amber-100/60">
                We're currently in beta and actively monitoring query costs to find the optimal balance between value and sustainability.
                Query limits may be adjusted based on actual usage data to ensure we can continue providing this service.
                We'll notify subscribers of any changes with at least 30 days notice.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Tiers */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-amber-100">Available Plans</h3>

        {/* Student Tier */}
        <div className={`rounded-lg border ${subscription.tier === 'student' ? 'border-blue-600 ring-2 ring-blue-600/50' : 'border-blue-800/30'} bg-blue-900/10 p-6`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-900/30 rounded-lg">
                <GraduationCap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-amber-100">The Student</h4>
                <p className="text-sm text-zinc-400">Unlock unlimited journals</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-100">$5</div>
              <div className="text-sm text-zinc-400">/month</div>
            </div>
          </div>

          <div className="mb-4 space-y-2">
            {getTierInfo('student')?.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {subscription.tier === 'student' ? (
            <button
              disabled
              className="w-full py-2 bg-blue-600/50 text-blue-200 font-semibold rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Current Plan
            </button>
          ) : (
            <button
              onClick={() => handleUpgrade('student')}
              disabled={processing !== null || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing === 'student' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : subscription.tier === 'free' ? (
                <>
                  <CreditCard className="w-4 h-4" />
                  Subscribe to Student
                </>
              ) : (
                <>
                  <ArrowDown className="w-4 h-4" />
                  Downgrade to Student
                </>
              )}
            </button>
          )}
        </div>

        {/* Scholar Tier */}
        <div className={`rounded-lg border ${subscription.tier === 'scholar' ? 'border-purple-600 ring-2 ring-purple-600/50' : 'border-purple-800/30'} bg-purple-900/10 p-6`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-900/30 rounded-lg">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-amber-100">The Scholar</h4>
                <p className="text-sm text-zinc-400">Most popular for AI power users</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-100">$9.99</div>
              <div className="text-sm text-zinc-400">/month</div>
            </div>
          </div>

          <div className="mb-4 space-y-2">
            {getTierInfo('scholar')?.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {subscription.tier === 'scholar' ? (
            <button
              disabled
              className="w-full py-2 bg-purple-600/50 text-purple-200 font-semibold rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Current Plan
            </button>
          ) : (
            <button
              onClick={() => handleUpgrade('scholar')}
              disabled={processing !== null || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing === 'scholar' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : subscription.tier === 'free' ? (
                <>
                  <CreditCard className="w-4 h-4" />
                  Subscribe to Scholar
                </>
              ) : subscription.tier === 'student' ? (
                <>
                  <ArrowUp className="w-4 h-4" />
                  Upgrade to Scholar
                </>
              ) : (
                <>
                  <ArrowDown className="w-4 h-4" />
                  Downgrade to Scholar
                </>
              )}
            </button>
          )}
        </div>

        {/* Adept Tier */}
        <div className={`rounded-lg border ${subscription.tier === 'adept' ? 'border-amber-600 ring-2 ring-amber-600/50' : 'border-amber-800/30'} bg-amber-900/10 p-6`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-900/30 rounded-lg">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-amber-100">The Adept</h4>
                <p className="text-sm text-zinc-400">Maximum AI access</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-100">$15</div>
              <div className="text-sm text-zinc-400">/month</div>
            </div>
          </div>

          <div className="mb-4 space-y-2">
            {getTierInfo('adept')?.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {subscription.tier === 'adept' ? (
            <button
              disabled
              className="w-full py-2 bg-amber-600/50 text-amber-200 font-semibold rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Current Plan
            </button>
          ) : (
            <button
              onClick={() => handleUpgrade('adept')}
              disabled={processing !== null || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing === 'adept' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : subscription.tier === 'free' ? (
                <>
                  <CreditCard className="w-4 h-4" />
                  Subscribe to Adept
                </>
              ) : (
                <>
                  <ArrowUp className="w-4 h-4" />
                  Upgrade to Adept
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Management Section for Paid Users */}
      {isPaid && (
        <div className={`rounded-lg border ${currentTierInfo?.borderColor} ${currentTierInfo?.bgColor} p-6`}>
          <div className="flex items-start gap-4 mb-4">
            <div className={`p-3 ${currentTierInfo?.bgColor} rounded-lg`}>
              {currentTierInfo?.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-100 mb-2">
                Subscription Management
              </h3>
              <p className="text-zinc-400 text-sm mb-4">
                Manage your subscription, update payment methods, or view billing history.
              </p>
            </div>
          </div>

          {/* Management Options */}
          <div className="space-y-3">
            <button
              onClick={handleManageSubscription}
              disabled={processing !== null || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
              className="w-full py-2 px-4 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing === 'manage' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Manage Subscription
                </>
              )}
            </button>
            {!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
              <p className="text-xs text-zinc-500 text-center">
                Subscription management not configured
              </p>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg border border-amber-800/30 bg-amber-900/10 p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-100/80">
            <p className="font-semibold mb-1">About Subscriptions</p>
            <p className="text-amber-100/60">
              Subscriptions support the development and maintenance of Project Parallax.
              Your subscription helps us continue building amazing features for the esoteric community.
              All tiers include full access to the library and correspondence graph - we never gate knowledge.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
