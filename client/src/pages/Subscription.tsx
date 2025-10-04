import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Check, Crown, Zap, Building2, CreditCard, 
  ArrowRight, Sparkles, Shield, Clock
} from "lucide-react";
import type { SubscriptionPlan, UserSubscription } from "@shared/schema";

interface CurrentSubscription {
  subscription: UserSubscription | null;
  plan: SubscriptionPlan | null;
  tier: 'free' | 'premium' | 'enterprise';
}

export default function Subscription() {
  const { toast } = useToast();

  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription/plans'],
  });

  const { data: current, isLoading: currentLoading } = useQuery<CurrentSubscription>({
    queryKey: ['/api/subscription/current'],
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ planId, billingInterval }: { planId: number; billingInterval: string }) => {
      const response = await apiRequest('POST', '/api/subscription/checkout', { planId, billingInterval });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/subscription/portal', {});
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Portal Access Failed",
        description: error.message || "Failed to access billing portal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isLoading = plansLoading || currentLoading;

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'free':
        return <Sparkles className="h-5 w-5" />;
      case 'premium':
        return <Crown className="h-5 w-5" />;
      case 'enterprise':
        return <Building2 className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
      case 'premium':
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case 'enterprise':
        return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "Free";
    return `$${price}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: string }> = {
      active: { label: "Active", variant: "bg-green-500/10 text-green-500" },
      trialing: { label: "Trial", variant: "bg-blue-500/10 text-blue-500" },
      past_due: { label: "Past Due", variant: "bg-yellow-500/10 text-yellow-500" },
      canceled: { label: "Canceled", variant: "bg-red-500/10 text-red-500" },
      incomplete: { label: "Incomplete", variant: "bg-gray-500/10 text-gray-500" },
    };
    
    const config = variants[status] || variants.active;
    return (
      <Badge className={config.variant}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  const activePlans = plans.filter(p => p.isActive);
  const currentTier = current?.tier || 'free';
  const currentPlan = current?.plan;
  const currentSubscription = current?.subscription;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing</p>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getTierIcon(currentTier)}
                Current Plan: {currentPlan?.name || 'Free'}
              </CardTitle>
              <CardDescription>{currentPlan?.description || 'Basic features at no cost'}</CardDescription>
            </div>
            {currentSubscription && (
              <div className="text-right">
                {getStatusBadge(currentSubscription.status)}
                <p className="text-sm text-muted-foreground mt-1">
                  {currentSubscription.billingInterval === 'monthly' ? 'Monthly' : 'Annual'}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold" data-testid="text-current-price">
                {currentSubscription?.billingInterval === 'annual' 
                  ? formatPrice(currentPlan?.annualPrice)
                  : formatPrice(currentPlan?.monthlyPrice)
                }
                {currentPlan && (currentPlan.monthlyPrice || currentPlan.annualPrice) && (
                  <span className="text-base text-muted-foreground">
                    /{currentSubscription?.billingInterval === 'annual' ? 'year' : 'month'}
                  </span>
                )}
              </p>
              {currentSubscription?.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground mt-1">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Renews {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            {currentSubscription && (
              <Button 
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                variant="outline"
                data-testid="button-manage-billing"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {portalMutation.isPending ? 'Loading...' : 'Manage Billing'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Available Plans</h2>
        
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
            <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly Billing</TabsTrigger>
            <TabsTrigger value="annual" data-testid="tab-annual">
              Annual Billing
              <Badge className="ml-2 bg-green-500/10 text-green-500">Save 20%</Badge>
            </TabsTrigger>
          </TabsList>

          {['monthly', 'annual'].map(interval => (
            <TabsContent key={interval} value={interval} className="mt-0">
              <div className="grid gap-6 md:grid-cols-3">
                {activePlans.map(plan => {
                  const price = interval === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
                  
                  // Check if price is available for this interval (null means not configured in Stripe)
                  const priceAvailable = price !== null && price !== undefined;
                  
                  // Check if this is the EXACT current plan (same tier AND same billing interval)
                  const isCurrentPlan = currentPlan?.id === plan.id && 
                                       currentSubscription?.billingInterval === interval;
                  
                  // Can upgrade if plan tier is higher than current tier
                  const tierOrder = { 'free': 0, 'premium': 1, 'enterprise': 2 };
                  const canUpgrade = tierOrder[plan.tier as keyof typeof tierOrder] > tierOrder[currentTier as keyof typeof tierOrder];
                  
                  // Can downgrade if plan tier is lower than current tier
                  const canDowngrade = tierOrder[plan.tier as keyof typeof tierOrder] < tierOrder[currentTier as keyof typeof tierOrder];
                  
                  // Can change interval if same tier but different billing interval
                  const canChangeInterval = currentPlan?.id === plan.id && 
                                           currentSubscription?.billingInterval !== interval;
                  
                  // Parse features array (handle both array and JSON string)
                  let features: string[] = [];
                  if (Array.isArray(plan.features)) {
                    features = plan.features;
                  } else if (typeof plan.features === 'string') {
                    try {
                      features = JSON.parse(plan.features);
                    } catch {
                      features = [];
                    }
                  }

                  return (
                    <Card 
                      key={plan.id} 
                      className={`relative ${plan.tier === 'premium' ? 'border-primary shadow-lg' : ''}`}
                      data-testid={`card-plan-${plan.tier}`}
                    >
                      {plan.tier === 'premium' && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground">
                            <Zap className="h-3 w-3 mr-1" />
                            Popular
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                          {getTierIcon(plan.tier)}
                          <Badge className={getTierColor(plan.tier)}>
                            {plan.name}
                          </Badge>
                        </div>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-4xl font-bold" data-testid={`text-price-${plan.tier}`}>
                            {formatPrice(price)}
                            {price && (
                              <span className="text-base text-muted-foreground">
                                /{interval === 'monthly' ? 'mo' : 'yr'}
                              </span>
                            )}
                          </p>
                          {interval === 'annual' && price && plan.monthlyPrice && (
                            <p className="text-sm text-muted-foreground mt-1">
                              ${Math.round(price / 12)}/month billed annually
                            </p>
                          )}
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          {features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>

                      <CardFooter>
                        {!priceAvailable ? (
                          <Button 
                            variant="outline" 
                            className="w-full" 
                            disabled
                            data-testid={`button-no-price-${plan.tier}`}
                          >
                            {interval === 'monthly' ? 'Monthly' : 'Annual'} pricing not available
                          </Button>
                        ) : isCurrentPlan ? (
                          <Button 
                            variant="outline" 
                            className="w-full" 
                            disabled
                            data-testid={`button-current-${plan.tier}`}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Current Plan
                          </Button>
                        ) : canChangeInterval ? (
                          <Button
                            className="w-full"
                            onClick={() => checkoutMutation.mutate({ 
                              planId: plan.id, 
                              billingInterval: interval 
                            })}
                            disabled={checkoutMutation.isPending}
                            data-testid={`button-change-interval-${plan.tier}`}
                          >
                            {checkoutMutation.isPending ? 'Processing...' : `Switch to ${interval === 'monthly' ? 'Monthly' : 'Annual'}`}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        ) : canUpgrade ? (
                          <Button
                            className="w-full"
                            onClick={() => checkoutMutation.mutate({ 
                              planId: plan.id, 
                              billingInterval: interval 
                            })}
                            disabled={checkoutMutation.isPending}
                            data-testid={`button-upgrade-${plan.tier}`}
                          >
                            {checkoutMutation.isPending ? 'Processing...' : 'Upgrade Now'}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        ) : canDowngrade ? (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => portalMutation.mutate()}
                            disabled={portalMutation.isPending}
                            data-testid={`button-downgrade-${plan.tier}`}
                          >
                            {portalMutation.isPending ? 'Loading...' : 'Change Plan'}
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            className="w-full" 
                            disabled
                            data-testid={`button-unavailable-${plan.tier}`}
                          >
                            Not Available
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Security Notice */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5" />
            Secure Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          All payments are securely processed by Stripe. Your payment information is encrypted and never stored on our servers.
          You can manage your billing details, payment methods, and download invoices through the billing portal.
        </CardContent>
      </Card>
    </div>
  );
}
