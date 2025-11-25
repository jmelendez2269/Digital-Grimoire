"use client";

import { useEffect, useState } from "react";
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
  Info
} from "lucide-react";

interface SubscriptionStatus {
  status: 'free' | 'premium' | 'active' | null;
  isPremium: boolean;
  queryCount: number;
  queryLimit: number;
  resetDate: Date | null;
}

export default function SubscriptionTab() {
  const { user, supabase } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus();
    }
  }, [user]);

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

      // Check if user is premium (admin or subscription)
      const isPremium = userData?.role === 'admin' || 
                       userData?.subscription_status === 'premium' || 
                       userData?.subscription_status === 'active';

      // Fetch rate limit info
      const rateLimitResponse = await fetch('/api/convergence/rate-limit');
      const rateLimitData = rateLimitResponse.ok 
        ? await rateLimitResponse.json()
        : { remaining: 5, limit: 5, resetDate: new Date() };

      setSubscription({
        status: userData?.subscription_status || 'free',
        isPremium,
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

  const handleUpgrade = () => {
    // TODO: Implement Stripe checkout when payment is set up
    toast.info('Payment integration coming soon! For now, contact support to upgrade.');
  };

  const handleManageSubscription = () => {
    // TODO: Implement Stripe customer portal when payment is set up
    toast.info('Subscription management coming soon!');
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

  const isPremium = subscription.isPremium;
  const statusDisplay = subscription.status === 'premium' || subscription.status === 'active' 
    ? 'Premium' 
    : 'Free';

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-amber-100">Current Plan</h3>
          {isPremium ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-purple-900/30 border border-purple-600/30 rounded-full">
              <Crown className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-purple-300">Premium</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full">
              <span className="text-sm font-semibold text-zinc-400">Free</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Status Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-zinc-500 mb-1">Subscription Status</p>
              <p className="text-lg font-semibold text-amber-100">{statusDisplay}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 mb-1">Query Limit</p>
              <p className="text-lg font-semibold text-amber-100">
                {isPremium ? (
                  <span className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-purple-400" />
                    Unlimited
                  </span>
                ) : (
                  `${subscription.queryCount} / ${subscription.queryLimit}`
                )}
              </p>
            </div>
          </div>

          {/* Reset Date */}
          {!isPremium && subscription.resetDate && (
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

      {/* Premium Features */}
      {!isPremium && (
        <>
          {/* Upgrade Section */}
          <div className="rounded-lg border border-purple-800 bg-gradient-to-br from-purple-900/20 to-zinc-900/50 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-purple-900/30 rounded-lg">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-amber-100 mb-2">
                  Upgrade to Premium
                </h3>
                <p className="text-zinc-400 mb-4">
                  Unlock unlimited AI queries and access to all premium features
                </p>
              </div>
            </div>

            {/* Pricing */}
            <div className="mb-6 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-amber-100">$15</span>
                <span className="text-zinc-400">/month</span>
              </div>
              <p className="text-sm text-zinc-500">
                or <span className="text-amber-100 font-semibold">$150/year</span> (save $30)
              </p>
            </div>

            {/* Features List */}
            <div className="mb-6 space-y-3">
              <h4 className="text-sm font-semibold text-amber-200 mb-3">Premium Features:</h4>
              {[
                'Unlimited AI queries (Multi-Lens System)',
                'Unlimited grimoire pages',
                'Advanced semantic search',
                'Interactive correspondence graph',
                'Ritual inventory system',
                'Export to PDF + Notion',
                'Priority support',
                'Early access to new features',
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">{feature}</span>
                </div>
              ))}
            </div>

            {/* Upgrade Button */}
            <button
              onClick={handleUpgrade}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Upgrade to Premium
            </button>

            <p className="text-xs text-zinc-500 mt-4 text-center">
              Payment processing coming soon. Contact support for early access.
            </p>
          </div>
        </>
      )}

      {/* Premium User Section */}
      {isPremium && (
        <div className="rounded-lg border border-purple-800 bg-purple-900/10 p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-purple-900/30 rounded-lg">
              <Crown className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-100 mb-2">
                You're on Premium!
              </h3>
              <p className="text-zinc-400 text-sm mb-4">
                Thank you for supporting Convergence Library. You have access to all premium features.
              </p>
            </div>
          </div>

          {/* Management Options */}
          <div className="space-y-3">
            <button
              onClick={handleManageSubscription}
              className="w-full py-2 px-4 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm font-medium"
            >
              Manage Subscription
            </button>
            <p className="text-xs text-zinc-500 text-center">
              Subscription management coming soon
            </p>
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
              Premium subscriptions support the development and maintenance of Convergence Library. 
              Your subscription helps us continue building amazing features for the esoteric community.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

