import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Coins, Trophy, ShoppingCart, History, Flame, Star, Zap, TrendingUp, Gift, Target } from "lucide-react";
import Confetti from "react-confetti";
import { motion, AnimatePresence } from "framer-motion";

export default function WealthForge() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [dragScore, setDragScore] = useState(0);
  const [nickname, setNickname] = useState("");
  const [solanaWallet, setSolanaWallet] = useState("");

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['/api/wealth-forge/progress'],
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['/api/wealth-forge/leaderboard'],
    enabled: !!progress,
  });

  const { data: vaultItems } = useQuery({
    queryKey: ['/api/wealth-forge/vault'],
    enabled: !!progress,
  });

  const { data: transactions } = useQuery({
    queryKey: ['/api/wealth-forge/transactions'],
    enabled: !!progress,
  });

  const mineMutation = useMutation({
    mutationFn: async (data: { type: string; gameScore?: number; gameData?: any }) => {
      return await apiRequest('/api/wealth-forge/mine', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/wealth-forge/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wealth-forge/leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wealth-forge/transactions'] });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      toast({
        title: "Tokens Mined Successfully",
        description: `You earned ${data.tokensEarned} WFG and ${data.xpGained} XP`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Mining Failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { nickname?: string; solanaWallet?: string }) => {
      return await apiRequest('/api/wealth-forge/progress', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wealth-forge/progress'] });
      toast({
        title: "Profile Updated",
        description: "Your Wealth Forge profile has been updated successfully!",
      });
    },
  });

  const buyMutation = useMutation({
    mutationFn: async (data: { amount: number; packName: string }) => {
      return await apiRequest('/api/wealth-forge/buy', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/wealth-forge/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wealth-forge/transactions'] });
      toast({
        title: "Purchase Successful",
        description: `You bought ${data.amount} WFG tokens`,
      });
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async (vaultItemId: number) => {
      return await apiRequest('/api/wealth-forge/redeem', {
        method: 'POST',
        body: JSON.stringify({ vaultItemId }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/wealth-forge/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wealth-forge/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wealth-forge/redemptions'] });
      toast({
        title: "Item Redeemed",
        description: "Your item has been delivered",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Redemption Failed",
        description: error.message || "Insufficient tokens",
        variant: "destructive",
      });
    },
  });

  const handleMine = async (type: string, gameScore?: number, gameData?: any) => {
    await mineMutation.mutateAsync({ type, gameScore, gameData });
  };

  const handleMiniGameComplete = (score: number) => {
    setShowMiniGame(false);
    handleMine('mini_game', score, { gameType: 'drag_drop', score });
  };

  const handleDailyBonus = () => {
    handleMine('daily_bonus');
  };

  const handleQuickTask = () => {
    handleMine('task', undefined, { taskType: 'quick_action' });
  };

  const handleUpdateProfile = () => {
    if (nickname.trim() || solanaWallet.trim()) {
      updateProgressMutation.mutate({ nickname, solanaWallet });
    }
  };

  const buyPack = (amount: number, packName: string) => {
    buyMutation.mutate({ amount, packName });
  };

  const redeemItem = (itemId: number) => {
    redeemMutation.mutate(itemId);
    setShopOpen(false);
  };

  useEffect(() => {
    if (progress) {
      setNickname(progress.nickname || '');
      setSolanaWallet(progress.solanaWallet || '');
    }
  }, [progress]);

  if (progressLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Wealth Forge...</p>
        </div>
      </div>
    );
  }

  const tokens = progress?.tokens || 0;
  const xp = progress?.xp || 0;
  const level = progress?.level || 1;
  const streak = progress?.currentStreak || 0;
  const longestStreak = progress?.longestStreak || 0;
  const totalMined = progress?.totalMined || 0;

  const xpForNextLevel = 100;
  const xpProgress = (xp % 100);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent" data-testid="heading-wealthforge">
            Wealth Forge
          </h1>
          <p className="text-muted-foreground text-lg" data-testid="text-subtitle">
            Build habits, earn tokens, and unlock assets
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover-elevate" data-testid="card-tokens">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-500" />
                Tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="text-token-balance">{tokens}</div>
              <p className="text-xs text-muted-foreground mt-1">WFG Balance</p>
            </CardContent>
          </Card>

          <Card className="hover-elevate" data-testid="card-level">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-500" />
                Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="text-level">{level}</div>
              <div className="mt-2">
                <Progress value={(xpProgress / xpForNextLevel) * 100} className="h-2" data-testid="progress-xp" />
                <p className="text-xs text-muted-foreground mt-1">{xpProgress}/{xpForNextLevel} XP</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate" data-testid="card-streak">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="text-streak">{streak}</div>
              <p className="text-xs text-muted-foreground mt-1">Longest: {longestStreak} days</p>
            </CardContent>
          </Card>

          <Card className="hover-elevate" data-testid="card-total-mined">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Total Mined
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="text-total-mined">{totalMined}</div>
              <p className="text-xs text-muted-foreground mt-1">All-time earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="mine" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-main">
            <TabsTrigger value="mine" data-testid="tab-mine">
              <Coins className="w-4 h-4 mr-2" />
              Mine
            </TabsTrigger>
            <TabsTrigger value="shop" data-testid="tab-shop">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Shop
            </TabsTrigger>
            <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile">
              <Target className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="hover-elevate" data-testid="card-daily-bonus">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-yellow-500" />
                    Daily Bonus
                  </CardTitle>
                  <CardDescription>Claim your daily reward</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleDailyBonus}
                    disabled={mineMutation.isPending}
                    data-testid="button-daily-bonus"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Claim 10 WFG
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-mini-game">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    Mini Game
                  </CardTitle>
                  <CardDescription>Play to earn tokens</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    size="lg"
                    variant="secondary"
                    onClick={() => setShowMiniGame(true)}
                    data-testid="button-play-game"
                  >
                    Play Game
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="hover-elevate" data-testid="card-buy-packs">
              <CardHeader>
                <CardTitle>Buy Token Packs</CardTitle>
                <CardDescription>Purchase WFG tokens instantly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover-elevate">
                    <div>
                      <div className="font-medium">Starter Pack</div>
                      <div className="text-sm text-muted-foreground">10 WFG</div>
                    </div>
                    <Button 
                      onClick={() => buyPack(10, 'Starter Pack')}
                      disabled={buyMutation.isPending}
                      data-testid="button-buy-starter"
                    >
                      Buy
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover-elevate">
                    <div>
                      <div className="font-medium">Pro Pack</div>
                      <div className="text-sm text-muted-foreground">25 WFG</div>
                    </div>
                    <Button 
                      onClick={() => buyPack(25, 'Pro Pack')}
                      disabled={buyMutation.isPending}
                      data-testid="button-buy-pro"
                    >
                      Buy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shop" className="space-y-6">
            <Card data-testid="card-vault">
              <CardHeader>
                <CardTitle>Vault - Redeem Your Tokens</CardTitle>
                <CardDescription>Exchange WFG for valuable items</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {vaultItems && vaultItems.length > 0 ? (
                  vaultItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover-elevate" data-testid={`vault-item-${item.id}`}>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                        <Badge variant="outline" className="mt-2">
                          <Coins className="w-3 h-3 mr-1" />
                          {item.cost} WFG
                        </Badge>
                      </div>
                      <Button 
                        onClick={() => redeemItem(item.id)}
                        disabled={tokens < item.cost || redeemMutation.isPending}
                        data-testid={`button-redeem-${item.id}`}
                      >
                        Redeem
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-items">
                    No vault items available. Check back later!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-6">
            <Card data-testid="card-leaderboard">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Top Miners
                </CardTitle>
                <CardDescription>Global leaderboard rankings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard && leaderboard.length > 0 ? (
                    leaderboard.slice(0, 10).map((player: any, index: number) => (
                      <div key={player.userId} className="flex items-center justify-between p-3 border rounded-lg hover-elevate" data-testid={`leaderboard-${index + 1}`}>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">
                              {player.nickname || (player.solanaWallet?.slice(0, 6) + '...' + player.solanaWallet?.slice(-4)) || `Player ${player.userId.slice(0, 6)}`}
                            </div>
                            <div className="text-sm text-muted-foreground">Level {player.level}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{player.tokens}</div>
                          <div className="text-sm text-muted-foreground">WFG</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground" data-testid="text-no-leaderboard">
                      No players yet. Be the first to mine!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card data-testid="card-profile">
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Update your Wealth Forge profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nickname">Nickname</Label>
                  <Input
                    id="nickname"
                    placeholder="Enter your nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    data-testid="input-nickname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wallet">Solana Wallet Address (Optional)</Label>
                  <Input
                    id="wallet"
                    placeholder="Your Phantom wallet address"
                    value={solanaWallet}
                    onChange={(e) => setSolanaWallet(e.target.value)}
                    data-testid="input-wallet"
                  />
                </div>
                <Button 
                  onClick={handleUpdateProfile}
                  disabled={updateProgressMutation.isPending}
                  data-testid="button-update-profile"
                >
                  Update Profile
                </Button>
              </CardContent>
            </Card>

            <Card data-testid="card-transaction-history">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactions && transactions.length > 0 ? (
                    transactions.slice(0, 10).map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`transaction-${tx.id}`}>
                        <div>
                          <div className="font-medium">{tx.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className={`font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount >= 0 ? '+' : ''}{tx.amount}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground" data-testid="text-no-transactions">
                      No transactions yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mini Game Dialog */}
      <Dialog open={showMiniGame} onOpenChange={setShowMiniGame}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-minigame">
          <DialogHeader>
            <DialogTitle>Drag & Drop Challenge</DialogTitle>
            <DialogDescription>
              Drag the coin to the target zone! Score 80+ for bonus rewards.
            </DialogDescription>
          </DialogHeader>
          <MiniGame onComplete={handleMiniGameComplete} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple Mini Game Component
function MiniGame({ onComplete }: { onComplete: (score: number) => void }) {
  const [score, setScore] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = () => setIsDragging(true);
  
  const handleDrop = () => {
    setIsDragging(false);
    const randomScore = Math.floor(Math.random() * 40) + 60; // 60-100
    setScore(randomScore);
    setTimeout(() => onComplete(randomScore), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center min-h-32 flex items-center justify-center" data-testid="drop-zone">
        {isDragging ? (
          <div className="text-lg font-medium text-primary">Drop here!</div>
        ) : score > 0 ? (
          <div className="space-y-2">
            <div className="text-3xl font-bold text-primary">Score: {score}</div>
            <div className="text-sm text-muted-foreground">
              {score >= 80 ? 'Bonus unlocked!' : 'Good job!'}
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">Drop target zone</div>
        )}
      </div>
      <div 
        draggable 
        onDragStart={handleDragStart}
        onDragEnd={handleDrop}
        className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full mx-auto cursor-move flex items-center justify-center text-white text-2xl font-bold shadow-lg hover-elevate"
        data-testid="draggable-coin"
      >
        <Coins className="w-10 h-10" />
      </div>
    </div>
  );
}
