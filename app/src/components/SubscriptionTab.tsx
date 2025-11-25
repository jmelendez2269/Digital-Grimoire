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
  GraduationCap
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
  const searchParams = useSearchParams();
  const { user, supabase } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus();
    }
  }, [user]);

  // Handle success/cancel from Stripe checkout
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      toast.success("Subscription activated! Welcome!");
      if (user) {
        fetchSubscriptionStatus();
      }
    } else if (canceled === "true") {
      toast.info("Checkout canceled");
    }
  }, [searchParams, user]);

  const fetchSubscriptionStatus = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch subscription status from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_status, role')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching subscription status:', userError);
        toast.error('Failed to load subscription status');
        setLoading(false);
        return;
      }

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

      // Fetch rate limit info
      const rateLimitResponse = await fetch('/api/convergence/rate-limit');
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }

      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to open subscription management');
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
      {!isPaid && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-amber-100">Available Plans</h3>
          
          {/* Student Tier */}
          <div className="rounded-lg border border-blue-800/30 bg-blue-900/10 p-6">
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
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Subscribe to Student
                </>
              )}
            </button>
          </div>

          {/* Scholar Tier */}
          <div className="rounded-lg border border-purple-800/30 bg-purple-900/10 p-6">
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
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Subscribe to Scholar
                </>
              )}
            </button>
          </div>

          {/* Adept Tier */}
          <div className="rounded-lg border border-amber-800/30 bg-amber-900/10 p-6">
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
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Subscribe to Adept
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Paid User Section */}
      {isPaid && (
        <div className={`rounded-lg border ${currentTierInfo?.borderColor} ${currentTierInfo?.bgColor} p-6`}>
          <div className="flex items-start gap-4 mb-4">
            <div className={`p-3 ${currentTierInfo?.bgColor} rounded-lg`}>
              {currentTierInfo?.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-100 mb-2">
                You're on {currentTierInfo?.name}!
              </h3>
              <p className="text-zinc-400 text-sm mb-4">
                Thank you for supporting Convergence Library. You have access to all {currentTierInfo?.name.toLowerCase()} features.
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
                'Manage Subscription'
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
              Subscriptions support the development and maintenance of Convergence Library. 
              Your subscription helps us continue building amazing features for the esoteric community.
              All tiers include full access to the library and correspondence graph - we never gate knowledge.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
