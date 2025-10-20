import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InsertAsset } from "@shared/schema";

interface QuickAssetEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: string;
}

export function QuickAssetEntry({ open, onOpenChange, defaultType }: QuickAssetEntryProps) {
  const { toast } = useToast();
  const [assetType, setAssetType] = useState(defaultType || "stocks");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [value, setValue] = useState("");
  const [quantity, setQuantity] = useState("1");

  const createAsset = useMutation({
    mutationFn: async (assetData: Partial<InsertAsset>) => {
      return apiRequest("POST", "/api/assets", assetData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/briefing/latest"] });
      toast({
        title: "Success",
        description: "Asset added successfully",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add asset",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !value || parseFloat(value) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please provide asset name and a positive value",
        variant: "destructive",
      });
      return;
    }

    const assetData: Partial<InsertAsset> = {
      name,
      symbol: symbol || name.substring(0, 4).toUpperCase(),
      assetType,
      value: parseFloat(value),
      quantity: parseFloat(quantity) || 1,
      source: "manual",
      lastSynced: new Date(),
    };

    createAsset.mutate(assetData);
  };

  const handleClose = () => {
    setName("");
    setSymbol("");
    setValue("");
    setQuantity("1");
    setAssetType(defaultType || "stocks");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-quick-asset-entry">
        <DialogHeader>
          <DialogTitle>Add Asset</DialogTitle>
          <DialogDescription>
            Quickly add an asset to your portfolio
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset-type">Asset Type</Label>
            <Select value={assetType} onValueChange={setAssetType}>
              <SelectTrigger id="asset-type" data-testid="select-asset-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stocks">Stocks</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="bonds">Bonds</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="real_estate">Real Estate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Asset Name *</Label>
            <Input
              id="name"
              data-testid="input-asset-name"
              placeholder="e.g., Apple Inc, Bitcoin, Savings Account"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol (optional)</Label>
            <Input
              id="symbol"
              data-testid="input-asset-symbol"
              placeholder="e.g., AAPL, BTC, BOND1"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                data-testid="input-asset-quantity"
                type="number"
                step="0.0001"
                min="0"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Total Value (USD) *</Label>
              <Input
                id="value"
                data-testid="input-asset-value"
                type="number"
                step="0.01"
                min="0"
                placeholder="10000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createAsset.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createAsset.isPending}
              data-testid="button-add-asset"
            >
              {createAsset.isPending ? "Adding..." : "Add Asset"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
