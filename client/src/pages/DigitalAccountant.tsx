import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Calculator, 
  FileText, 
  Receipt,
  CreditCard,
  BarChart3,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign
} from "lucide-react";
import { z } from "zod";
import { 
  insertAccountSchema,
  insertInvoiceSchema,
  insertPaymentSchema,
  insertJournalEntrySchema,
  insertJournalLineSchema,
  type Account, 
  type JournalEntry, 
  type JournalLine, 
  type Invoice, 
  type Payment
} from "@shared/schema";

type JournalEntryWithLines = JournalEntry & {
  lines?: JournalLine[];
};

type InvoiceWithJournal = Invoice & {
  journalEntry?: JournalEntry;
};

type PaymentWithJournal = Payment & {
  journalEntry?: JournalEntry;
  invoice?: Invoice;
};

const journalLineFormSchema = z.object({
  accountId: z.number(),
  amount: z.number().positive(),
  isDebit: z.boolean(),
  description: z.string().optional(),
});

const journalFormSchema = z.object({
  description: z.string().min(1, "Description is required"),
  lines: z.array(journalLineFormSchema).min(2, "At least 2 lines required"),
});

const formatCurrency = (amount: number, currency: string = "USD") => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

const getAccountTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'asset': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'liability': return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'equity': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'income': return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'expense': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-muted text-muted-foreground';
    case 'issued': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'paid': return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'partially_paid': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'overdue': return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

export default function DigitalAccountant() {
  const { toast } = useToast();
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>("");

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounting/accounts"],
  });

  const { data: journalEntries = [], isLoading: journalLoading } = useQuery<JournalEntryWithLines[]>({
    queryKey: ["/api/accounting/journal"],
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<InvoiceWithJournal[]>({
    queryKey: ["/api/accounting/invoices"],
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<PaymentWithJournal[]>({
    queryKey: ["/api/accounting/payments"],
  });

  const { data: trialBalance } = useQuery<any>({
    queryKey: ["/api/accounting/reports/trial-balance"],
  });

  const { data: profitLoss } = useQuery<any>({
    queryKey: ["/api/accounting/reports/profit-loss"],
  });

  const { data: balanceSheet } = useQuery<any>({
    queryKey: ["/api/accounting/reports/balance-sheet"],
  });

  const { data: accountLedger } = useQuery<any>({
    queryKey: selectedAccountCode ? [`/api/accounting/reports/ledger/${selectedAccountCode}`] : [],
    enabled: !!selectedAccountCode,
  });

  const accountForm = useForm({
    resolver: zodResolver(insertAccountSchema.extend({
      userId: z.string().optional(),
      isReconcilable: z.number().optional(),
      balance: z.number().optional(),
    })),
    defaultValues: {
      userId: "",
      code: "",
      name: "",
      accountType: "asset" as const,
      currency: "USD",
      isReconcilable: 0,
      balance: 0,
      description: "",
    },
  });

  const [journalLines, setJournalLines] = useState<Array<{ accountId: number; amount: number; isDebit: boolean; description?: string }>>([
    { accountId: 0, amount: 0, isDebit: true },
    { accountId: 0, amount: 0, isDebit: false },
  ]);

  const journalForm = useForm({
    resolver: zodResolver(journalFormSchema),
    defaultValues: {
      description: "",
      lines: journalLines,
    },
  });

  const invoiceForm = useForm({
    resolver: zodResolver(insertInvoiceSchema.extend({
      userId: z.string().optional(),
      total: z.number().positive("Total must be positive"),
    })),
    defaultValues: {
      userId: "",
      customer: "",
      total: 0,
      currency: "USD",
      invoiceNumber: "",
      issuedAt: new Date().toISOString().split('T')[0],
      dueAt: "",
      status: "draft",
    },
  });

  const paymentForm = useForm({
    resolver: zodResolver(insertPaymentSchema.extend({
      userId: z.string().optional(),
      invoiceId: z.number().positive("Invoice is required"),
      amount: z.number().positive("Amount must be positive"),
    })),
    defaultValues: {
      userId: "",
      invoiceId: 0,
      amount: 0,
      currency: "USD",
      method: "wire" as const,
      paidAt: new Date().toISOString().split('T')[0],
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertAccountSchema>) => {
      return await apiRequest("POST", "/api/accounting/accounts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/accounts"] });
      toast({ title: "Success", description: "Account created successfully" });
      setAccountDialogOpen(false);
      accountForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createJournalMutation = useMutation({
    mutationFn: async (data: { description: string; lines: Array<{ accountId: number; amount: number; isDebit: boolean }> }) => {
      const transformedData = {
        description: data.description,
        lines: data.lines.map(line => ({
          accountId: line.accountId,
          amount: line.amount,
          isDebit: line.isDebit ? 1 : 0,
        })),
      };
      return await apiRequest("POST", "/api/accounting/journal", transformedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/journal"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/accounts"] });
      toast({ title: "Success", description: "Journal entry created successfully" });
      setJournalDialogOpen(false);
      journalForm.reset();
      setJournalLines([
        { accountId: 0, amount: 0, isDebit: true },
        { accountId: 0, amount: 0, isDebit: false },
      ]);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertInvoiceSchema>) => {
      return await apiRequest("POST", "/api/accounting/invoices", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/invoices"] });
      toast({ title: "Success", description: "Invoice created successfully" });
      setInvoiceDialogOpen(false);
      invoiceForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertPaymentSchema>) => {
      return await apiRequest("POST", "/api/accounting/payments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/invoices"] });
      toast({ title: "Success", description: "Payment recorded successfully" });
      setPaymentDialogOpen(false);
      paymentForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleEntry = (id: number) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addJournalLine = () => {
    setJournalLines([...journalLines, { accountId: 0, amount: 0, isDebit: true }]);
  };

  const removeJournalLine = (index: number) => {
    if (journalLines.length > 2) {
      setJournalLines(journalLines.filter((_, i) => i !== index));
    }
  };

  const updateJournalLine = (index: number, field: string, value: any) => {
    const updated = [...journalLines];
    updated[index] = { ...updated[index], [field]: value };
    setJournalLines(updated);
  };

  const debitsTotal = journalLines.reduce((sum, line) => line.isDebit ? sum + (line.amount || 0) : sum, 0);
  const creditsTotal = journalLines.reduce((sum, line) => !line.isDebit ? sum + (line.amount || 0) : sum, 0);
  const isBalanced = Math.abs(debitsTotal - creditsTotal) < 0.01 && debitsTotal > 0;

  return (
    <div className="h-full overflow-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-8 w-8 text-primary" />
            Digital Accountant
          </h1>
          <p className="text-muted-foreground">Complete accounting and financial management</p>
        </div>
      </div>

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="accounts" data-testid="tab-accounts">
            <FileText className="h-4 w-4 mr-2" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="journal" data-testid="tab-journal">
            <FileText className="h-4 w-4 mr-2" />
            Journal
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <Receipt className="h-4 w-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            <CreditCard className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Chart of Accounts</h2>
            <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-account">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Account
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-create-account">
                <DialogHeader>
                  <DialogTitle>Create New Account</DialogTitle>
                  <DialogDescription>Add a new account to your chart of accounts</DialogDescription>
                </DialogHeader>
                <Form {...accountForm}>
                  <form onSubmit={accountForm.handleSubmit((data) => createAccountMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={accountForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 1000" data-testid="input-account-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Cash" data-testid="input-account-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="accountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-account-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="asset">Asset</SelectItem>
                              <SelectItem value="liability">Liability</SelectItem>
                              <SelectItem value="equity">Equity</SelectItem>
                              <SelectItem value="income">Income</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="USD" data-testid="input-account-currency" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Account description" data-testid="input-account-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setAccountDialogOpen(false)} data-testid="button-cancel-account">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createAccountMutation.isPending} data-testid="button-submit-account">
                        {createAccountMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Account
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {accountsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.id} data-testid={`row-account-${account.id}`}>
                        <TableCell className="font-mono" data-testid={`text-account-code-${account.id}`}>{account.code}</TableCell>
                        <TableCell data-testid={`text-account-name-${account.id}`}>{account.name}</TableCell>
                        <TableCell>
                          <Badge className={getAccountTypeBadgeColor(account.accountType)} data-testid={`badge-account-type-${account.id}`}>
                            {account.accountType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono" data-testid={`text-account-balance-${account.id}`}>
                          {formatCurrency(account.balance || 0, account.currency || 'USD')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Journal Entries</h2>
            <Dialog open={journalDialogOpen} onOpenChange={setJournalDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-journal">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-journal">
                <DialogHeader>
                  <DialogTitle>Create Journal Entry</DialogTitle>
                  <DialogDescription>Record a new journal entry with debits and credits</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="journal-description">Description</Label>
                    <Input
                      id="journal-description"
                      value={journalForm.watch('description')}
                      onChange={(e) => journalForm.setValue('description', e.target.value)}
                      placeholder="Entry description"
                      data-testid="input-journal-description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Line Items</Label>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {journalLines.map((line, index) => (
                          <TableRow key={index} data-testid={`row-journal-line-${index}`}>
                            <TableCell>
                              <Select
                                value={line.accountId?.toString()}
                                onValueChange={(value) => updateJournalLine(index, 'accountId', parseInt(value))}
                              >
                                <SelectTrigger data-testid={`select-line-account-${index}`}>
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts.map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id.toString()}>
                                      {acc.code} - {acc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={line.amount || ''}
                                onChange={(e) => updateJournalLine(index, 'amount', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                data-testid={`input-line-amount-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={line.isDebit ? "debit" : "credit"}
                                onValueChange={(value) => updateJournalLine(index, 'isDebit', value === 'debit')}
                              >
                                <SelectTrigger data-testid={`select-line-type-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="debit">Debit</SelectItem>
                                  <SelectItem value="credit">Credit</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeJournalLine(index)}
                                disabled={journalLines.length <= 2}
                                data-testid={`button-remove-line-${index}`}
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button type="button" variant="outline" onClick={addJournalLine} data-testid="button-add-line">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Line
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <div className="space-y-1">
                      <div className="flex gap-4">
                        <span className="text-sm">Debits: <span className="font-mono font-semibold" data-testid="text-debits-total">{formatCurrency(debitsTotal)}</span></span>
                        <span className="text-sm">Credits: <span className="font-mono font-semibold" data-testid="text-credits-total">{formatCurrency(creditsTotal)}</span></span>
                      </div>
                      {!isBalanced && debitsTotal > 0 && (
                        <p className="text-sm text-destructive" data-testid="text-not-balanced">Entry must balance (debits = credits)</p>
                      )}
                      {isBalanced && (
                        <p className="text-sm text-green-500" data-testid="text-balanced">Entry is balanced ✓</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setJournalDialogOpen(false)} data-testid="button-cancel-journal">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (isBalanced) {
                          createJournalMutation.mutate({
                            description: journalForm.getValues('description'),
                            lines: journalLines,
                          });
                        }
                      }}
                      disabled={!isBalanced || createJournalMutation.isPending}
                      data-testid="button-submit-journal"
                    >
                      {createJournalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Entry
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {journalLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              journalEntries.map((entry) => (
                <Card key={entry.id} data-testid={`card-journal-entry-${entry.id}`}>
                  <Collapsible open={expandedEntries.has(entry.id)} onOpenChange={() => toggleEntry(entry.id)}>
                    <CollapsibleTrigger asChild>
                      <div className="p-4 flex items-center justify-between cursor-pointer hover-elevate" data-testid={`button-toggle-journal-${entry.id}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold" data-testid={`text-journal-description-${entry.id}`}>{entry.description}</span>
                            <Badge variant="outline" data-testid={`badge-journal-status-${entry.id}`}>{entry.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground" data-testid={`text-journal-date-${entry.id}`}>
                            {format(new Date(entry.postedAt), 'PPP')}
                          </p>
                        </div>
                        {expandedEntries.has(entry.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Separator />
                      <div className="p-4">
                        {entry.lines && entry.lines.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Account</TableHead>
                                <TableHead className="text-right">Debit</TableHead>
                                <TableHead className="text-right">Credit</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {entry.lines.map((line) => {
                                const account = accounts.find(a => a.id === line.accountId);
                                return (
                                  <TableRow key={line.id} data-testid={`row-journal-line-${line.id}`}>
                                    <TableCell data-testid={`text-line-account-${line.id}`}>
                                      {account?.code} - {account?.name}
                                    </TableCell>
                                    <TableCell className="text-right font-mono" data-testid={`text-line-debit-${line.id}`}>
                                      {line.isDebit ? formatCurrency(line.amount) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-mono" data-testid={`text-line-credit-${line.id}`}>
                                      {!line.isDebit ? formatCurrency(line.amount) : '-'}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-muted-foreground">No lines available</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Invoices</h2>
            <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-invoice">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-create-invoice">
                <DialogHeader>
                  <DialogTitle>Create New Invoice</DialogTitle>
                  <DialogDescription>Create a new invoice for a customer</DialogDescription>
                </DialogHeader>
                <Form {...invoiceForm}>
                  <form onSubmit={invoiceForm.handleSubmit((data) => createInvoiceMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={invoiceForm.control}
                      name="customer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Customer name" data-testid="input-invoice-customer" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={invoiceForm.control}
                      name="total"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              data-testid="input-invoice-total"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={invoiceForm.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="USD" data-testid="input-invoice-currency" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={invoiceForm.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Number (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="INV-001" data-testid="input-invoice-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={invoiceForm.control}
                      name="issuedAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issue Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-invoice-issued-at" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={invoiceForm.control}
                      name="dueAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-invoice-due-at" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setInvoiceDialogOpen(false)} data-testid="button-cancel-invoice">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createInvoiceMutation.isPending} data-testid="button-submit-invoice">
                        {createInvoiceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Invoice
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {invoicesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Journal Entry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                        <TableCell className="font-mono" data-testid={`text-invoice-number-${invoice.id}`}>
                          {invoice.invoiceNumber || `INV-${invoice.id}`}
                        </TableCell>
                        <TableCell data-testid={`text-invoice-customer-${invoice.id}`}>{invoice.customer}</TableCell>
                        <TableCell className="text-right font-mono" data-testid={`text-invoice-total-${invoice.id}`}>
                          {formatCurrency(invoice.total, invoice.currency || 'USD')}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(invoice.status || 'draft')} data-testid={`badge-invoice-status-${invoice.id}`}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-invoice-date-${invoice.id}`}>
                          {format(new Date(invoice.issuedAt), 'PP')}
                        </TableCell>
                        <TableCell data-testid={`text-invoice-journal-${invoice.id}`}>
                          {invoice.journalEntryId ? (
                            <span className="text-xs text-muted-foreground">JE-{invoice.journalEntryId}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Payments</h2>
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-payment">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-create-payment">
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>Record a payment received for an invoice</DialogDescription>
                </DialogHeader>
                <Form {...paymentForm}>
                  <form onSubmit={paymentForm.handleSubmit((data) => createPaymentMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={paymentForm.control}
                      name="invoiceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payment-invoice">
                                <SelectValue placeholder="Select invoice" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {invoices.map((inv) => (
                                <SelectItem key={inv.id} value={inv.id.toString()}>
                                  {inv.invoiceNumber || `INV-${inv.id}`} - {inv.customer} ({formatCurrency(inv.total, inv.currency || 'USD')})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={paymentForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              data-testid="input-payment-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={paymentForm.control}
                      name="method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payment-method">
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="wire">Wire Transfer</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="check">Check</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={paymentForm.control}
                      name="paidAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-payment-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)} data-testid="button-cancel-payment">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createPaymentMutation.isPending} data-testid="button-submit-payment">
                        {createPaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Record Payment
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {paymentsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Journal Entry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const invoice = invoices.find(inv => inv.id === payment.invoiceId);
                      return (
                        <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                          <TableCell data-testid={`text-payment-invoice-${payment.id}`}>
                            {invoice ? (invoice.invoiceNumber || `INV-${invoice.id}`) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono" data-testid={`text-payment-amount-${payment.id}`}>
                            {formatCurrency(payment.amount, payment.currency || 'USD')}
                          </TableCell>
                          <TableCell data-testid={`text-payment-method-${payment.id}`}>
                            <Badge variant="outline" data-testid={`badge-payment-method-${payment.id}`}>{payment.method}</Badge>
                          </TableCell>
                          <TableCell data-testid={`text-payment-date-${payment.id}`}>
                            {format(new Date(payment.paidAt), 'PP')}
                          </TableCell>
                          <TableCell data-testid={`text-payment-journal-${payment.id}`}>
                            {payment.journalEntryId ? (
                              <span className="text-xs text-muted-foreground">JE-{payment.journalEntryId}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Tabs defaultValue="trial-balance">
            <TabsList>
              <TabsTrigger value="trial-balance" data-testid="tab-trial-balance">Trial Balance</TabsTrigger>
              <TabsTrigger value="profit-loss" data-testid="tab-profit-loss">Profit & Loss</TabsTrigger>
              <TabsTrigger value="balance-sheet" data-testid="tab-balance-sheet">Balance Sheet</TabsTrigger>
              <TabsTrigger value="ledger" data-testid="tab-ledger">Account Ledger</TabsTrigger>
            </TabsList>

            <TabsContent value="trial-balance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trial Balance</CardTitle>
                  <CardDescription>Summary of all account balances</CardDescription>
                </CardHeader>
                <CardContent>
                  {trialBalance ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Account Name</TableHead>
                          <TableHead className="text-right">Debits</TableHead>
                          <TableHead className="text-right">Credits</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trialBalance.accounts?.map((account: any) => (
                          <TableRow key={account.code} data-testid={`row-trial-balance-${account.code}`}>
                            <TableCell className="font-mono" data-testid={`text-tb-code-${account.code}`}>{account.code}</TableCell>
                            <TableCell data-testid={`text-tb-name-${account.code}`}>{account.name}</TableCell>
                            <TableCell className="text-right font-mono" data-testid={`text-tb-debits-${account.code}`}>
                              {formatCurrency(account.debits || 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono" data-testid={`text-tb-credits-${account.code}`}>
                              {formatCurrency(account.credits || 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold" data-testid={`text-tb-balance-${account.code}`}>
                              {formatCurrency(account.balance || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {trialBalance.totals && (
                          <TableRow className="font-bold border-t-2">
                            <TableCell colSpan={2}>TOTALS</TableCell>
                            <TableCell className="text-right font-mono" data-testid="text-tb-total-debits">
                              {formatCurrency(trialBalance.totals.debits || 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono" data-testid="text-tb-total-credits">
                              {formatCurrency(trialBalance.totals.credits || 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono" data-testid="text-tb-total-balance">
                              {formatCurrency(trialBalance.totals.balance || 0)}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profit-loss" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Profit & Loss Statement</CardTitle>
                  <CardDescription>Income and expenses summary</CardDescription>
                </CardHeader>
                <CardContent>
                  {profitLoss ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-4 bg-green-500/10 rounded-lg">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            <span className="font-semibold">Total Income</span>
                          </div>
                          <span className="font-mono font-bold text-lg" data-testid="text-total-income">
                            {formatCurrency(profitLoss.income || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-orange-500/10 rounded-lg">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="h-5 w-5 text-orange-500" />
                            <span className="font-semibold">Total Expenses</span>
                          </div>
                          <span className="font-mono font-bold text-lg" data-testid="text-total-expenses">
                            {formatCurrency(profitLoss.expenses || 0)}
                          </span>
                        </div>
                        <Separator />
                        <div className={`flex justify-between items-center p-4 rounded-lg ${
                          (profitLoss.netProfit || 0) >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                          <div className="flex items-center gap-2">
                            <DollarSign className={`h-6 w-6 ${(profitLoss.netProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                            <span className="font-bold text-xl">Net {(profitLoss.netProfit || 0) >= 0 ? 'Profit' : 'Loss'}</span>
                          </div>
                          <span className={`font-mono font-bold text-2xl ${(profitLoss.netProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="text-net-profit">
                            {formatCurrency(profitLoss.netProfit || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="balance-sheet" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Balance Sheet</CardTitle>
                  <CardDescription>Assets, Liabilities, and Equity</CardDescription>
                </CardHeader>
                <CardContent>
                  {balanceSheet ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-4 bg-blue-500/10 rounded-lg">
                          <span className="font-semibold">Total Assets</span>
                          <span className="font-mono font-bold text-lg" data-testid="text-total-assets">
                            {formatCurrency(balanceSheet.assets || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-red-500/10 rounded-lg">
                          <span className="font-semibold">Total Liabilities</span>
                          <span className="font-mono font-bold text-lg" data-testid="text-total-liabilities">
                            {formatCurrency(balanceSheet.liabilities || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-purple-500/10 rounded-lg">
                          <span className="font-semibold">Total Equity</span>
                          <span className="font-mono font-bold text-lg" data-testid="text-total-equity">
                            {formatCurrency(balanceSheet.equity || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ledger" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Account Ledger</CardTitle>
                  <CardDescription>View transactions for a specific account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Select Account</Label>
                    <Select value={selectedAccountCode} onValueChange={setSelectedAccountCode}>
                      <SelectTrigger data-testid="select-ledger-account">
                        <SelectValue placeholder="Select an account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.code}>
                            {acc.code} - {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedAccountCode && accountLedger && (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Account: {accountLedger.account?.name} ({accountLedger.account?.code})
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {accountLedger.entries?.length > 0 ? (
                            (() => {
                              let runningBalance = 0;
                              return accountLedger.entries.map((line: any, index: number) => {
                                const debit = line.isDebit ? line.amount : 0;
                                const credit = line.isDebit ? 0 : line.amount;
                                runningBalance += debit - credit;
                                
                                return (
                                  <TableRow key={line.id} data-testid={`row-ledger-${index}`}>
                                    <TableCell data-testid={`text-ledger-date-${index}`}>
                                      {format(new Date(line.entry?.date || line.createdAt), 'PP')}
                                    </TableCell>
                                    <TableCell data-testid={`text-ledger-description-${index}`}>
                                      {line.entry?.description || 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right font-mono" data-testid={`text-ledger-debit-${index}`}>
                                      {debit > 0 ? formatCurrency(debit) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-mono" data-testid={`text-ledger-credit-${index}`}>
                                      {credit > 0 ? formatCurrency(credit) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-semibold" data-testid={`text-ledger-balance-${index}`}>
                                      {formatCurrency(runningBalance)}
                                    </TableCell>
                                  </TableRow>
                                );
                              });
                            })()
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground">
                                No transactions found for this account
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
