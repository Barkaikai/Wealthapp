import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Gift, CheckCircle } from "lucide-react";

export default function RedeemPass() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [redeemed, setRedeemed] = useState(false);

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/passes/redeem', { code });
      return await response.json();
    },
    onSuccess: () => {
      setRedeemed(true);
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/current'] });
      toast({
        title: "Success",
        description: "Pass redeemed successfully! Your account has been upgraded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to redeem pass",
        variant: "destructive",
      });
    },
  });

  if (redeemed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-500">
            <CheckCircle className="h-6 w-6" />
            Pass Redeemed!
          </CardTitle>
          <CardDescription>Your promotional pass has been successfully activated</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              setRedeemed(false);
              setCode("");
            }}
            variant="outline"
            className="w-full"
            data-testid="button-redeem-another"
          >
            Redeem Another Pass
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Redeem Free Pass
        </CardTitle>
        <CardDescription>
          Enter your promotional pass code to unlock free access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="passCode">Pass Code</Label>
          <Input
            id="passCode"
            placeholder="Enter your pass code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            data-testid="input-pass-code"
          />
        </div>
        <Button
          onClick={() => redeemMutation.mutate()}
          disabled={!code || redeemMutation.isPending}
          className="w-full"
          data-testid="button-redeem-pass"
        >
          {redeemMutation.isPending ? 'Redeeming...' : 'Redeem Pass'}
        </Button>
      </CardContent>
    </Card>
  );
}
