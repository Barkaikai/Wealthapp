import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReceiptSchema, type Receipt } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Receipt as ReceiptIcon, Upload, Trash, Edit, Filter, DollarSign, Calendar, Store } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp'];

const receiptFormSchema = insertReceiptSchema.omit({ userId: true, rawText: true, aiAnalysis: true });

export default function ReceiptManager() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [uploadProgress, setUploadProgress] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: receipts = [], isLoading } = useQuery<Receipt[]>({
    queryKey: ["/api/receipts"],
  });

  const receiptForm = useForm({
    resolver: zodResolver(receiptFormSchema),
    defaultValues: {
      merchant: "",
      amount: 0,
      currency: "USD",
      receiptDate: new Date().toISOString().split('T')[0],
      category: "other",
      items: [] as string[],
      status: "pending",
      imageUrl: "",
    },
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("receipt", file);

      const response = await fetch("/api/receipts/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload receipt");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      toast({
        title: "Success",
        description: "Receipt uploaded and analyzed successfully",
      });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload receipt",
        variant: "destructive",
      });
      setUploadProgress(false);
    },
  });

  const updateReceiptMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof receiptFormSchema>> }) => {
      await apiRequest("PATCH", `/api/receipts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      toast({
        title: "Success",
        description: "Receipt updated successfully",
      });
      setEditDialogOpen(false);
      receiptForm.reset();
      setEditingReceipt(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update receipt",
        variant: "destructive",
      });
    },
  });

  const deleteReceiptMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/receipts/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      toast({
        title: "Success",
        description: "Receipt deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete receipt",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a valid image file (JPEG, PNG, HEIC, WebP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    setUploadProgress(true);
    uploadReceiptMutation.mutate(selectedFile);
  };

  const handleEdit = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    receiptForm.reset({
      merchant: receipt.merchant || "",
      amount: receipt.amount ?? 0,
      currency: receipt.currency || "USD",
      receiptDate: receipt.receiptDate ? new Date(receipt.receiptDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      category: receipt.category || "other",
      items: receipt.items || [],
      status: receipt.status,
      imageUrl: receipt.imageUrl || "",
    });
    setEditDialogOpen(true);
  };

  const onEditSubmit = (data: z.infer<typeof receiptFormSchema>) => {
    if (!editingReceipt) return;
    updateReceiptMutation.mutate({ id: editingReceipt.id, data });
  };

  const filteredReceipts = receipts.filter(receipt => {
    const categoryMatch = selectedCategory === "all" || receipt.category === selectedCategory;
    const statusMatch = selectedStatus === "all" || receipt.status === selectedStatus;
    return categoryMatch && statusMatch;
  });

  const totalAmount = filteredReceipts.reduce((sum, receipt) => sum + (receipt.amount ?? 0), 0);
  const categories = ["all", "groceries", "dining", "travel", "shopping", "entertainment", "utilities", "healthcare", "transportation", "other"];
  const statuses = ["all", "pending", "processed", "archived"];

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2" data-testid="heading-receipt-manager">
              <ReceiptIcon className="w-8 h-8 text-primary" />
              Receipt Manager
            </h1>
            <p className="text-muted-foreground mt-1">Upload and manage your receipts with AI-powered OCR</p>
          </div>
          <Button 
            onClick={() => setUploadDialogOpen(true)} 
            data-testid="button-upload-receipt"
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Receipt
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-receipts">{filteredReceipts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-amount">
                ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-month-count">
                {filteredReceipts.filter(r => {
                  const receiptDate = new Date(r.receiptDate);
                  const now = new Date();
                  return receiptDate.getMonth() === now.getMonth() && receiptDate.getFullYear() === now.getFullYear();
                }).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48" data-testid="select-category">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48" data-testid="select-status">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status === "all" ? "All Statuses" : status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading receipts...</div>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ReceiptIcon className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No receipts found</p>
              <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-upload-first">
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Receipt
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReceipts.map((receipt) => (
              <Card key={receipt.id} className="hover-elevate" data-testid={`card-receipt-${receipt.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate" data-testid={`text-merchant-${receipt.id}`}>
                        {receipt.merchant}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {format(new Date(receipt.receiptDate), "MMM d, yyyy")}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" data-testid={`badge-category-${receipt.id}`}>
                      {receipt.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {receipt.imageUrl && (
                    <div className="w-full h-40 rounded-md overflow-hidden border border-border">
                      <img 
                        src={receipt.imageUrl} 
                        alt={receipt.merchant} 
                        className="w-full h-full object-cover"
                        data-testid={`img-receipt-${receipt.id}`}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold" data-testid={`text-amount-${receipt.id}`}>
                        {receipt.currency} {receipt.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    {receipt.items && receipt.items.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        <div className="font-medium mb-1">Items:</div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {receipt.items.slice(0, 3).map((item, idx) => (
                            <li key={idx} className="truncate">{item}</li>
                          ))}
                          {receipt.items.length > 3 && (
                            <li className="text-xs">+{receipt.items.length - 3} more</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {receipt.aiAnalysis && (
                      <div className="text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">
                        <div className="font-medium mb-1">AI Analysis:</div>
                        <p className="text-xs">{receipt.aiAnalysis}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(receipt)}
                      data-testid={`button-edit-${receipt.id}`}
                      className="flex-1"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteReceiptMutation.mutate(receipt.id)}
                      data-testid={`button-delete-${receipt.id}`}
                      className="flex-1"
                    >
                      <Trash className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-upload-receipt">
          <DialogHeader>
            <DialogTitle>Upload Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_FILE_TYPES.join(',')}
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-receipt-file"
              />
              {previewUrl ? (
                <div className="space-y-3">
                  <img src={previewUrl} alt="Receipt preview" className="w-full h-48 object-contain rounded-md" />
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-change-file"
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG, HEIC, WebP (max 10MB)
                    </p>
                  </div>
                  <Button onClick={() => fileInputRef.current?.click()} data-testid="button-select-file">
                    Select File
                  </Button>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={uploadProgress}
                  className="flex-1"
                  data-testid="button-upload-confirm"
                >
                  {uploadProgress ? "Analyzing..." : "Upload & Analyze"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  data-testid="button-cancel-upload"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-edit-receipt">
          <DialogHeader>
            <DialogTitle>Edit Receipt</DialogTitle>
          </DialogHeader>
          <Form {...receiptForm}>
            <form onSubmit={receiptForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={receiptForm.control}
                name="merchant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Merchant</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-merchant" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={receiptForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field} 
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-edit-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={receiptForm.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-currency" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={receiptForm.control}
                name="receiptDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-edit-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={receiptForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.filter(c => c !== "all").map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={receiptForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.filter(s => s !== "all").map(status => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" data-testid="button-save-edit">
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    receiptForm.reset();
                    setEditingReceipt(null);
                  }}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
