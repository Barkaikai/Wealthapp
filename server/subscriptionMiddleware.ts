/**
 * Subscription Middleware for Feature Gating
 * Enforces tier-based access controls across the platform
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import type { SubscriptionPlan, UserSubscription } from '@shared/schema';

// Extend Express Request to include subscription data
declare global {
  namespace Express {
    interface Request {
      subscription?: {
        tier: string;
        status: string;
        plan?: SubscriptionPlan;
        userSubscription?: UserSubscription;
      };
    }
  }
}

/**
 * Middleware to attach subscription data to request
 * Should be used after authentication middleware
 */
export async function attachSubscription(req: any, res: Response, next: NextFunction) {
  try {
    if (!req.user?.claims?.sub) {
      // No authenticated user, default to free tier
      req.subscription = {
        tier: 'free',
        status: 'active',
      };
      return next();
    }

    const userId = req.user.claims.sub;
    
    // Check if user is admin with unlimited access
    const user = await storage.getUser(userId);
    if (user?.isAdmin === 'true' || user?.hasUnlimitedAccess === 'true') {
      // Admin gets enterprise tier with unlimited everything
      req.subscription = {
        tier: 'enterprise',
        status: 'active',
        isAdmin: true,
        hasUnlimitedAccess: true,
        plan: {
          tier: 'enterprise',
          name: 'Admin Unlimited',
          maxAssets: -1,
          maxEmails: -1,
          aiCredits: -1,
        },
      };
      return next();
    }

    const userSubscription = await storage.getUserSubscription(userId);

    if (!userSubscription) {
      // No subscription found, default to free tier
      req.subscription = {
        tier: 'free',
        status: 'active',
      };
      return next();
    }

    // Get the plan details using planId from userSubscription
    // NOTE: userSubscription has planId, not tier
    let plan: any = null;
    let tier = 'free';
    
    if (userSubscription.planId) {
      // Get plan by ID first to extract tier
      const planById = await storage.getSubscriptionPlanById(userSubscription.planId);
      if (planById) {
        plan = planById;
        tier = planById.tier;
      }
    }
    
    // Fallback to free if no plan found
    if (!plan) {
      plan = await storage.getActivePlan('free');
      tier = 'free';
    }

    req.subscription = {
      tier,
      status: userSubscription.status,
      plan,
      userSubscription,
    };

    next();
  } catch (error) {
    console.error('[Subscription Middleware] Error:', error);
    // On error, default to free tier
    req.subscription = {
      tier: 'free',
      status: 'active',
    };
    next();
  }
}

/**
 * Middleware to require a minimum subscription tier
 */
export function requireTier(minTier: 'free' | 'premium' | 'enterprise') {
  const tierHierarchy = {
    'free': 0,
    'premium': 1,
    'enterprise': 2,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const currentTier = req.subscription?.tier || 'free';
    const currentLevel = tierHierarchy[currentTier as keyof typeof tierHierarchy] || 0;
    const requiredLevel = tierHierarchy[minTier];

    if (currentLevel < requiredLevel) {
      return res.status(403).json({
        message: `This feature requires ${minTier} subscription`,
        currentTier,
        requiredTier: minTier,
        upgradeUrl: '/subscription',
      });
    }

    next();
  };
}

/**
 * Middleware to require an active subscription (not expired or canceled)
 */
export function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  const status = req.subscription?.status || 'active';
  const tier = req.subscription?.tier || 'free';

  // Free tier is always considered active
  if (tier === 'free') {
    return next();
  }

  // Check if subscription is active
  if (status !== 'active') {
    return res.status(403).json({
      message: `Your subscription is ${status}. Please update your payment method.`,
      status,
      manageUrl: '/subscription',
    });
  }

  next();
}

/**
 * Check if user has access to a specific feature
 */
export async function hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
  try {
    // Check if user is admin with unlimited access - bypass all restrictions
    const user = await storage.getUser(userId);
    if (user?.isAdmin === 'true' || user?.hasUnlimitedAccess === 'true') {
      return true; // Admins have access to everything
    }

    const userSubscription = await storage.getUserSubscription(userId);
    
    // Get tier from plan, not from userSubscription (which doesn't have tier field)
    let tier = 'free';
    if (userSubscription?.planId) {
      const planById = await storage.getSubscriptionPlanById(userSubscription.planId);
      if (planById) {
        tier = planById.tier;
      }
    }
    
    const plan = await storage.getActivePlan(tier);

    if (!plan || !plan.features) {
      return false;
    }

    const features = plan.features as any;
    return features[feature] === true || features[feature] === 'unlimited';
  } catch (error) {
    console.error('[Feature Access] Error checking feature access:', error);
    return false;
  }
}

/**
 * Middleware to require a specific feature
 */
export function requireFeature(feature: string) {
  return async (req: any, res: Response, next: NextFunction) => {
    const userId = req.user?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const hasAccess = await hasFeatureAccess(userId, feature);

    if (!hasAccess) {
      return res.status(403).json({
        message: `This feature is not available in your current plan`,
        feature,
        upgradeUrl: '/subscription',
      });
    }

    next();
  };
}

/**
 * Check usage limits for a user
 */
export async function checkUsageLimit(
  userId: string,
  limitType: 'maxAssets' | 'maxEmails' | 'aiCredits'
): Promise<{ allowed: boolean; current: number; limit: number }> {
  try {
    // Check if user is admin with unlimited access - bypass all limits
    const user = await storage.getUser(userId);
    if (user?.isAdmin === 'true' || user?.hasUnlimitedAccess === 'true') {
      return { allowed: true, current: 0, limit: -1 }; // Admins have unlimited access
    }

    const userSubscription = await storage.getUserSubscription(userId);
    
    // Get tier from plan, not from userSubscription (which doesn't have tier field)
    let tier = 'free';
    if (userSubscription?.planId) {
      const planById = await storage.getSubscriptionPlanById(userSubscription.planId);
      if (planById) {
        tier = planById.tier;
      }
    }
    
    const plan = await storage.getActivePlan(tier);

    if (!plan) {
      return { allowed: false, current: 0, limit: 0 };
    }

    const limit = plan[limitType] as number;
    
    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, current: 0, limit: -1 };
    }

    // Get current usage based on limit type
    let current = 0;
    switch (limitType) {
      case 'maxAssets':
        const assets = await storage.getAssets(userId);
        current = assets.length;
        break;
      case 'maxEmails':
        const emails = await storage.getEmails(userId);
        current = emails.length;
        break;
      case 'aiCredits':
        // TODO: Implement AI credit tracking
        current = 0;
        break;
    }

    return {
      allowed: current < limit,
      current,
      limit,
    };
  } catch (error) {
    console.error('[Usage Limit] Error checking usage limit:', error);
    return { allowed: false, current: 0, limit: 0 };
  }
}

/**
 * Middleware to enforce usage limits
 */
export function enforceLimit(limitType: 'maxAssets' | 'maxEmails' | 'aiCredits') {
  return async (req: any, res: Response, next: NextFunction) => {
    const userId = req.user?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { allowed, current, limit } = await checkUsageLimit(userId, limitType);

    if (!allowed) {
      return res.status(403).json({
        message: `You have reached your ${limitType} limit`,
        current,
        limit,
        upgradeUrl: '/subscription',
      });
    }

    next();
  };
}
