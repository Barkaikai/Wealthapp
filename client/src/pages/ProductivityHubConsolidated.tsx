import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertNoteSchema, insertReceiptSchema, insertRoutineSchema, type Note, type Document, type DocumentInsight, type Receipt, type Routine, type Email, type EmailTemplate } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Download, Trash, Plus, Pin, Tag, Folder, Sparkles, Receipt as ReceiptIcon, Edit, Filter, DollarSign, Calendar, Store, Send, RefreshCw, Trash2, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { EmailList } from "@/components/EmailList";
import { RoutineTimeBlock } from "@/components/RoutineTimeBlock";
import { SkeletonEmailCard } from "@/components/Skeleton";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_RECEIPT_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_DOC_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/gif'];
const ALLOWED_RECEIPT_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp'];

const noteFormSchema = insertNoteSchema.omit({ userId: true });
const receiptFormSchema = insertReceiptSchema.omit({ userId: true, rawText: true, aiAnalysis: true });

type CalendarEvent = {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  color?: string;
};

type Task = {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  category?: string;
  aiSuggestions?: string;
};

export default function ProductivityHubConsolidated() {
  const { toast } = useToast();
  
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [uploadProgress, setUploadProgress] = useState(false);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DocumentInsight | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [receiptUploadDialogOpen, setReceiptUploadDialogOpen] = useState(false);
  const [receiptEditDialogOpen, setReceiptEditDialogOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [receiptUploadProgress, setReceiptUploadProgress] = useState(false);
  const [selectedReceiptFile, setSelectedReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const receiptFileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedEmailId, setSelectedEmailId] = useState<string>();
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    id: '',
    name: '',
    subject: '',
    body: '',
    category: 'investments' as 'finance' | 'investments' | 'personal',
  });
  
  const [routineDialogOpen, setRoutineDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [aiReportDialogOpen, setAiReportDialogOpen] = useState(false);
  const [aiReportResult, setAiReportResult] = useState<{
    report: string;
    recommendations: string[];
    focus_areas: string[];
  } | null>(null);
  
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const { data: notes = [], isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: receipts = [], isLoading: receiptsLoading } = useQuery<Receipt[]>({
    queryKey: ["/api/receipts"],
  });

  const { data: emails = [], isLoading: emailsLoading } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
  });

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const { data: routines = [] } = useQuery<Routine[]>({
    queryKey: ["/api/routines"],
  });

  const { data: recommendations } = useQuery<{ recommendations: string[] }>({
    queryKey: ["/api/routines/recommendations"],
    enabled: routines.length > 0,
  });

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar/events'],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  const noteForm = useForm({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      title: "",
      content: "",
      tags: [] as string[],
      folder: "default",
      isPinned: "false",
    },
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

  const routineForm = useForm({
    resolver: zodResolver(insertRoutineSchema.omit({ userId: true })),
    defaultValues: {
      time: "",
      title: "",
      description: "",
      category: "productivity" as const,
      duration: "",
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data: z.infer<typeof noteFormSchema>) => {
      await apiRequest("POST", "/api/notes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({ title: "Success", description: "Note saved successfully" });
      setNoteDialogOpen(false);
      noteForm.reset();
      setEditingNote(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to save note", variant: "destructive" });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof noteFormSchema>> }) => {
      await apiRequest("PATCH", `/api/notes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({ title: "Success", description: "Note updated successfully" });
      setNoteDialogOpen(false);
      noteForm.reset();
      setEditingNote(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update note", variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notes/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({ title: "Success", description: "Note deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete note", variant: "destructive" });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: number; isPinned: string }) => {
      await apiRequest("PATCH", `/api/notes/${id}`, { isPinned });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
  });

  const analyzeNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/notes/${id}/analyze`, {});
      return await response.json() as DocumentInsight;
    },
    onSuccess: (result) => {
      setAnalysisResult(result);
      setAnalysisDialogOpen(true);
      toast({ title: "Analysis Complete", description: "Note has been analyzed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Analysis Failed", description: error.message || "Failed to analyze note", variant: "destructive" });
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File size exceeds 25MB limit");
      }
      if (!ALLOWED_DOC_FILE_TYPES.includes(file.type)) {
        throw new Error("File type not supported. Allowed: PDF, DOC, DOCX, TXT, JPG, PNG, GIF");
      }

      if (file.type === 'application/pdf' || 
          file.type === 'application/msword' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        toast({
          title: "Limited Support",
          description: "PDF and Word files can be uploaded but AI analysis is not yet supported for these formats. Text files and images work best.",
        });
      }

      const formData = new FormData();
      formData.append("file", file);

      setUploadProgress(true);
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        
        if (response.status === 503) {
          throw new Error(error.message || "Object Storage not available");
        }
        
        throw new Error(error.message || "Upload failed");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Success", description: "Document uploaded successfully" });
      setUploadProgress(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
      setUploadProgress(false);
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Success", description: "Document deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete document", variant: "destructive" });
    },
  });

  const analyzeDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/documents/${id}/analyze`, {});
      return await response.json() as DocumentInsight;
    },
    onSuccess: (result) => {
      setAnalysisResult(result);
      setAnalysisDialogOpen(true);
      toast({ title: "Analysis Complete", description: "Document has been analyzed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Analysis Failed", description: error.message || "Failed to analyze document", variant: "destructive" });
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
      toast({ title: "Success", description: "Receipt uploaded and analyzed successfully" });
      setReceiptUploadDialogOpen(false);
      setSelectedReceiptFile(null);
      setReceiptPreviewUrl(null);
      setReceiptUploadProgress(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to upload receipt", variant: "destructive" });
      setReceiptUploadProgress(false);
    },
  });

  const updateReceiptMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof receiptFormSchema>> }) => {
      await apiRequest("PATCH", `/api/receipts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      toast({ title: "Success", description: "Receipt updated successfully" });
      setReceiptEditDialogOpen(false);
      receiptForm.reset();
      setEditingReceipt(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update receipt", variant: "destructive" });
    },
  });

  const deleteReceiptMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/receipts/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      toast({ title: "Success", description: "Receipt deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete receipt", variant: "destructive" });
    },
  });

  const syncEmails = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/emails/sync", {});
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      const { synced, personal, finance, investments } = data;
      toast({
        title: "Sync Complete",
        description: `${synced} emails synced: ${personal} Personal, ${finance} Finance, ${investments} Investments`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to sync emails";
      const action = error.action;
      
      let title = "Gmail Sync Error";
      let description = errorMessage;
      
      if (action === 'reconnect_gmail') {
        title = "Email Sync Unavailable";
        description = "Gmail email sync requires full inbox read permissions (gmail.readonly scope) which the current Gmail integration doesn't provide. This is a limitation of the Replit Gmail connector.";
      } else if (action === 'connect_gmail') {
        title = "Gmail Not Connected";
        description = "Please connect your Gmail account in the Tools panel to enable email features.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  const regenerateDraft = useMutation({
    mutationFn: async (emailId: string) => {
      const result = await apiRequest("POST", `/api/emails/${emailId}/draft`, {});
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({ title: "Success", description: "Draft regenerated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to regenerate draft", variant: "destructive" });
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: typeof newTemplate) => {
      return await apiRequest("POST", "/api/email-templates", template);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Success", description: "Template created successfully" });
      setTemplateDialogOpen(false);
      setNewTemplate({ id: '', name: '', subject: '', body: '', category: 'investments' });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create template", variant: "destructive" });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      return await apiRequest("DELETE", `/api/email-templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Success", description: "Template deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete template", variant: "destructive" });
    },
  });

  const createRoutine = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/routines", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/routines/recommendations"] });
      toast({ title: "Success", description: "Routine added successfully" });
      routineForm.reset();
      setRoutineDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to add routine", variant: "destructive" });
    },
  });

  const generateAIReport = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) {
        throw new Error("Please select a template first");
      }
      const response = await apiRequest("POST", "/api/routines/ai-report", {
        templateName: selectedTemplate,
        routines: routines,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setAiReportResult(data);
      setAiReportDialogOpen(true);
      toast({ 
        title: "AI Report Generated", 
        description: "Your personalized routine report is ready" 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to generate AI report", 
        variant: "destructive" 
      });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/calendar/events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({ title: "Event created successfully" });
      setEventDialogOpen(false);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: "Task created successfully" });
      setTaskDialogOpen(false);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => await apiRequest('PATCH', `/api/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: "Task updated successfully" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocumentMutation.mutate(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadDocumentMutation.mutate(file);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 503) {
          const error = await response.json();
          throw new Error(error.message || "Object Storage not available");
        }
        throw new Error("Download failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const openNoteDialog = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      noteForm.reset({
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        folder: note.folder || "default",
        isPinned: note.isPinned,
      });
    } else {
      setEditingNote(null);
      noteForm.reset({
        title: "",
        content: "",
        tags: [],
        folder: "default",
        isPinned: "false",
      });
    }
    setNoteDialogOpen(true);
  };

  const handleSaveNote = (data: z.infer<typeof noteFormSchema>) => {
    if (editingNote) {
      updateNoteMutation.mutate({ id: editingNote.id, data });
    } else {
      createNoteMutation.mutate(data);
    }
  };

  const handleReceiptFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_RECEIPT_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a valid image file (JPEG, PNG, HEIC, WebP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_RECEIPT_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedReceiptFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleReceiptUpload = () => {
    if (!selectedReceiptFile) return;
    setReceiptUploadProgress(true);
    uploadReceiptMutation.mutate(selectedReceiptFile);
  };

  const handleReceiptEdit = (receipt: Receipt) => {
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
    setReceiptEditDialogOpen(true);
  };

  const onReceiptEditSubmit = (data: z.infer<typeof receiptFormSchema>) => {
    if (!editingReceipt) return;
    updateReceiptMutation.mutate({ id: editingReceipt.id, data });
  };

  const exportCalendar = () => {
    window.location.href = '/api/routines/export/ics';
  };

  const folders = Array.from(new Set([...notes.map(n => n.folder), ...documents.map(d => d.folder)].filter(Boolean)));
  const filteredNotes = selectedFolder === "all" ? notes : notes.filter(n => n.folder === selectedFolder);
  const filteredDocuments = selectedFolder === "all" ? documents : documents.filter(d => d.folder === selectedFolder);
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned === "true" && b.isPinned !== "true") return -1;
    if (a.isPinned !== "true" && b.isPinned === "true") return 1;
    return new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime();
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const filteredReceipts = receipts.filter(receipt => {
    const categoryMatch = selectedCategory === "all" || receipt.category === selectedCategory;
    const statusMatch = selectedStatus === "all" || receipt.status === selectedStatus;
    return categoryMatch && statusMatch;
  });

  const totalAmount = filteredReceipts.reduce((sum, receipt) => sum + (receipt.amount ?? 0), 0);
  const categories = ["all", "groceries", "dining", "travel", "shopping", "entertainment", "utilities", "healthcare", "transportation", "other"];
  const statuses = ["all", "pending", "processed", "archived"];

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  const displayEmails = emails.map(email => ({
    ...email,
    preview: email.preview || '',
    time: new Date(email.receivedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    isStarred: email.isStarred === 'true',
    isRead: email.isRead === 'true',
  }));

  const financeEmails = displayEmails.filter(e => e.category === 'finance');
  const investmentEmails = displayEmails.filter(e => e.category === 'investments');
  const personalEmails = displayEmails.filter(e => e.category === 'personal');

  const routineTemplates = [
    { name: "Jeff Bezos Morning", activities: 5, focus: "Deep work before meetings" },
    { name: "Elon Musk Schedule", activities: 8, focus: "Time-blocked efficiency" },
    { name: "Tim Cook Routine", activities: 6, focus: "Early rise, fitness first" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Productivity Hub</h1>
        <p className="text-muted-foreground">All your productivity tools in one place</p>
      </div>

      <Tabs defaultValue="notes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="notes" data-testid="tab-notes">
            <FileText className="mr-2 h-4 w-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="receipts" data-testid="tab-receipts">
            <ReceiptIcon className="mr-2 h-4 w-4" />
            Receipts
          </TabsTrigger>
          <TabsTrigger value="email" data-testid="tab-email">
            <Send className="mr-2 h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="routine" data-testid="tab-routine">
            <Calendar className="mr-2 h-4 w-4" />
            Routine
          </TabsTrigger>
          <TabsTrigger value="calendar" data-testid="tab-calendar">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            <CheckSquare className="mr-2 h-4 w-4" />
            Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger className="w-[180px]" data-testid="select-folder">
                  <Folder className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Folders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="folder-all">All Folders</SelectItem>
                  <SelectItem value="default" data-testid="folder-default">Default</SelectItem>
                  {folders.filter(f => f !== "default").map(folder => (
                    <SelectItem key={folder} value={folder!} data-testid={`folder-${folder}`}>{folder}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => openNoteDialog()} data-testid="button-new-note">
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </div>

          <Tabs defaultValue="notes-list">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="notes-list" data-testid="tab-notes-list">
                <FileText className="h-4 w-4 mr-2" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents">
                <Upload className="h-4 w-4 mr-2" />
                Documents
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes-list" className="space-y-4 mt-6">
              {notesLoading ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading notes...</p>
                </div>
              ) : sortedNotes.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No notes yet. Create your first note to get started.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sortedNotes.map((note) => (
                    <Card key={note.id} className="hover-elevate cursor-pointer" data-testid={`note-card-${note.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg line-clamp-1" data-testid={`note-title-${note.id}`}>{note.title}</CardTitle>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinMutation.mutate({ id: note.id, isPinned: note.isPinned === "true" ? "false" : "true" });
                            }}
                            data-testid={`button-pin-${note.id}`}
                          >
                            <Pin className={`h-4 w-4 ${note.isPinned === "true" ? "fill-primary text-primary" : ""}`} />
                          </Button>
                        </div>
                        <CardDescription className="text-xs" data-testid={`note-date-${note.id}`}>
                          {format(new Date(note.updatedAt!), "MMM d, yyyy h:mm a")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent onClick={() => openNoteDialog(note)}>
                        <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`note-preview-${note.id}`}>
                          {note.content}
                        </p>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {note.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs" data-testid={`note-tag-${note.id}-${idx}`}>
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="pt-3 flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            analyzeNoteMutation.mutate(note.id);
                          }}
                          disabled={analyzeNoteMutation.isPending}
                          data-testid={`button-analyze-note-${note.id}`}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          {analyzeNoteMutation.isPending ? "Analyzing..." : "Analyze"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNoteMutation.mutate(note.id);
                          }}
                          data-testid={`button-delete-note-${note.id}`}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-6">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover-elevate cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                data-testid="dropzone-upload"
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Drop files here or click to upload</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Supported: PDF, DOC, DOCX, TXT, JPG, PNG, GIF
                </p>
                <p className="text-xs text-muted-foreground">Maximum file size: 25MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                  data-testid="input-file-upload"
                />
              </div>

              {uploadProgress && (
                <Card>
                  <CardContent className="py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm">Uploading document...</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {documentsLoading ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading documents...</p>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No documents uploaded yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredDocuments.map((doc) => (
                    <Card key={doc.id} className="hover-elevate" data-testid={`document-card-${doc.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate" data-testid={`document-name-${doc.id}`}>
                              {doc.originalName}
                            </CardTitle>
                            <CardDescription className="text-xs flex items-center gap-2 mt-1">
                              <span data-testid={`document-size-${doc.id}`}>{formatFileSize(doc.fileSize)}</span>
                              <span>•</span>
                              <span data-testid={`document-type-${doc.id}`}>{doc.mimeType.split('/')[1].toUpperCase()}</span>
                              <span>•</span>
                              <span data-testid={`document-date-${doc.id}`}>{format(new Date(doc.createdAt!), "MMM d, yyyy")}</span>
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(doc)}
                              data-testid={`button-download-${doc.id}`}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => analyzeDocumentMutation.mutate(doc.id)}
                              disabled={analyzeDocumentMutation.isPending}
                              data-testid={`button-analyze-${doc.id}`}
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              {analyzeDocumentMutation.isPending ? "Analyzing..." : "Analyze"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteDocumentMutation.mutate(doc.id)}
                              data-testid={`button-delete-document-${doc.id}`}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {doc.tags && doc.tags.length > 0 && (
                        <CardContent className="pt-0">
                          <div className="flex flex-wrap gap-1">
                            {doc.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs" data-testid={`document-tag-${doc.id}-${idx}`}>
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingNote ? "Edit Note" : "New Note"}</DialogTitle>
              </DialogHeader>
              <Form {...noteForm}>
                <form onSubmit={noteForm.handleSubmit(handleSaveNote)} className="space-y-4">
                  <FormField
                    control={noteForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Note title" {...field} data-testid="input-note-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={noteForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Write your note here..." className="min-h-32" {...field} data-testid="input-note-content" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={noteForm.control}
                      name="folder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Folder</FormLabel>
                          <FormControl>
                            <Input placeholder="default" {...field} data-testid="input-note-folder" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={noteForm.control}
                      name="isPinned"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pin Note</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-note-pinned">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="false">No</SelectItem>
                              <SelectItem value="true">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" disabled={createNoteMutation.isPending || updateNoteMutation.isPending} className="w-full" data-testid="button-save-note">
                    {(createNoteMutation.isPending || updateNoteMutation.isPending) ? "Saving..." : editingNote ? "Update Note" : "Create Note"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>AI Analysis Results</DialogTitle>
              </DialogHeader>
              {analysisResult && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-1">Summary</h3>
                    <p className="text-sm">{analysisResult.summary}</p>
                  </div>
                  {analysisResult.topics && analysisResult.topics.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">Topics</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.topics.map((topic, idx) => (
                          <Badge key={idx} variant="secondary">{topic}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {analysisResult.sentiment && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-1">Sentiment</h3>
                      <Badge variant={
                        analysisResult.sentiment === 'positive' ? 'default' :
                        analysisResult.sentiment === 'negative' ? 'destructive' : 'secondary'
                      }>
                        {analysisResult.sentiment}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-receipt-manager">
                <ReceiptIcon className="w-6 h-6 text-primary" />
                Receipt Manager
              </h2>
              <p className="text-muted-foreground mt-1">Upload and manage your receipts with AI-powered OCR</p>
            </div>
            <Button 
              onClick={() => setReceiptUploadDialogOpen(true)} 
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

          {receiptsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading receipts...</div>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ReceiptIcon className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No receipts found</p>
                <Button onClick={() => setReceiptUploadDialogOpen(true)} data-testid="button-upload-first">
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
                        onClick={() => handleReceiptEdit(receipt)}
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

          <Dialog open={receiptUploadDialogOpen} onOpenChange={setReceiptUploadDialogOpen}>
            <DialogContent className="max-w-md" data-testid="dialog-upload-receipt">
              <DialogHeader>
                <DialogTitle>Upload Receipt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <input
                    ref={receiptFileInputRef}
                    type="file"
                    accept={ALLOWED_RECEIPT_FILE_TYPES.join(',')}
                    onChange={handleReceiptFileSelect}
                    className="hidden"
                    data-testid="input-receipt-file"
                  />
                  {receiptPreviewUrl ? (
                    <div className="space-y-3">
                      <img src={receiptPreviewUrl} alt="Receipt preview" className="w-full h-48 object-contain rounded-md" />
                      <Button 
                        variant="outline" 
                        onClick={() => receiptFileInputRef.current?.click()}
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
                      <Button onClick={() => receiptFileInputRef.current?.click()} data-testid="button-select-file">
                        Select File
                      </Button>
                    </div>
                  )}
                </div>

                {selectedReceiptFile && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleReceiptUpload}
                      disabled={receiptUploadProgress}
                      className="flex-1"
                      data-testid="button-upload-confirm"
                    >
                      {receiptUploadProgress ? "Analyzing..." : "Upload & Analyze"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedReceiptFile(null);
                        setReceiptPreviewUrl(null);
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

          <Dialog open={receiptEditDialogOpen} onOpenChange={setReceiptEditDialogOpen}>
            <DialogContent className="max-w-md" data-testid="dialog-edit-receipt">
              <DialogHeader>
                <DialogTitle>Edit Receipt</DialogTitle>
              </DialogHeader>
              <Form {...receiptForm}>
                <form onSubmit={receiptForm.handleSubmit(onReceiptEditSubmit)} className="space-y-4">
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

                  <Button type="submit" className="w-full" data-testid="button-update-receipt">
                    Update Receipt
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2" data-testid="text-page-title">Email Manager</h2>
              <p className="text-muted-foreground">AI-powered email categorization and drafting</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-manage-templates">
                    <FileText className="h-4 w-4 mr-2" />
                    Templates ({templates.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Email Templates</DialogTitle>
                    <DialogDescription>
                      Create templates with placeholders like {`{subject}`}, {`{name}`}, {`{topic}`}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Create New Template</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="template-id">Template ID</Label>
                          <Input
                            id="template-id"
                            value={newTemplate.id}
                            onChange={(e) => setNewTemplate({ ...newTemplate, id: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                            placeholder="INVESTMENTS_REPLY"
                            data-testid="input-template-id"
                          />
                        </div>
                        <div>
                          <Label htmlFor="template-name">Template Name</Label>
                          <Input
                            id="template-name"
                            value={newTemplate.name}
                            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                            placeholder="Investments Reply"
                            data-testid="input-template-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="template-category">Category</Label>
                          <Select
                            value={newTemplate.category}
                            onValueChange={(value: any) => setNewTemplate({ ...newTemplate, category: value })}
                          >
                            <SelectTrigger id="template-category" data-testid="select-template-category">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="finance">Finance</SelectItem>
                              <SelectItem value="investments">Investments</SelectItem>
                              <SelectItem value="personal">Personal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="template-subject">Subject</Label>
                          <Input
                            id="template-subject"
                            value={newTemplate.subject}
                            onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                            placeholder="Re: {subject}"
                            data-testid="input-template-subject"
                          />
                        </div>
                        <div>
                          <Label htmlFor="template-body">Body</Label>
                          <Textarea
                            id="template-body"
                            value={newTemplate.body}
                            onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                            placeholder="Hello {name},&#10;&#10;I've reviewed your message regarding {topic}..."
                            className="min-h-32"
                            data-testid="input-template-body"
                          />
                        </div>
                        <Button 
                          onClick={() => createTemplate.mutate(newTemplate)}
                          disabled={!newTemplate.id || !newTemplate.name || createTemplate.isPending}
                          data-testid="button-create-template"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {createTemplate.isPending ? 'Creating...' : 'Create Template'}
                        </Button>
                      </div>
                    </div>

                    {templates.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="font-semibold">Existing Templates</h3>
                        <div className="space-y-2">
                          {templates.map((template) => (
                            <Card key={template.id} className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold">{template.name}</h4>
                                    <Badge variant="outline">{template.category}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">ID: {template.id}</p>
                                  <p className="text-sm mb-1"><strong>Subject:</strong> {template.subject}</p>
                                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{template.body}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteTemplate.mutate(template.id)}
                                  data-testid={`button-delete-template-${template.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                onClick={() => syncEmails.mutate()} 
                disabled={syncEmails.isPending}
                data-testid="button-sync-emails"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncEmails.isPending ? 'animate-spin' : ''}`} />
                {syncEmails.isPending ? 'Syncing...' : 'Sync Gmail'}
              </Button>
            </div>
          </div>

          {emailsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <SkeletonEmailCard key={i} />
                ))}
              </div>
              <div className="border rounded-lg p-6">
                <div className="space-y-4">
                  <SkeletonEmailCard />
                  <div className="space-y-2 mt-6">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-4 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No emails synced yet</p>
              <Button onClick={() => syncEmails.mutate()} disabled={syncEmails.isPending}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Your Gmail
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all" data-testid="tab-all-emails">All</TabsTrigger>
                <TabsTrigger value="finance" data-testid="tab-finance">Finance</TabsTrigger>
                <TabsTrigger value="investments" data-testid="tab-investments">Investments</TabsTrigger>
                <TabsTrigger value="personal" data-testid="tab-personal">Personal</TabsTrigger>
              </TabsList>

              {['all', 'finance', 'investments', 'personal'].map(tab => {
                const tabEmails = tab === 'all' ? displayEmails :
                                tab === 'finance' ? financeEmails :
                                tab === 'investments' ? investmentEmails :
                                personalEmails;

                return (
                  <TabsContent key={tab} value={tab} className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      <div className="lg:col-span-2">
                        <EmailList
                          emails={tabEmails as any}
                          onEmailClick={setSelectedEmailId}
                          selectedEmailId={selectedEmailId}
                        />
                      </div>

                      <div className="lg:col-span-3">
                        {selectedEmail && (
                          <div className="space-y-4">
                            <Card className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h2 className="text-xl font-semibold mb-2">{selectedEmail.subject}</h2>
                                  <p className="text-sm text-muted-foreground">{selectedEmail.from}</p>
                                </div>
                                <Badge variant="secondary">{selectedEmail.category}</Badge>
                              </div>
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p className="whitespace-pre-wrap text-sm">{selectedEmail.body || selectedEmail.preview}</p>
                              </div>
                            </Card>

                            {(selectedEmail.category === 'finance' || selectedEmail.category === 'investments') && (
                              <Card className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                  <Sparkles className="h-5 w-5 text-primary" />
                                  <h3 className="font-semibold">AI-Generated Reply</h3>
                                </div>
                                {selectedEmail.draftReply ? (
                                  <>
                                    <Textarea
                                      value={selectedEmail.draftReply}
                                      readOnly
                                      className="min-h-32 mb-4 bg-muted/50"
                                      data-testid="textarea-ai-draft"
                                    />
                                    <div className="flex gap-2">
                                      <Button data-testid="button-send-reply">
                                        <Send className="h-4 w-4 mr-2" />
                                        Send Reply
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        onClick={() => regenerateDraft.mutate(selectedEmail.id)}
                                        disabled={regenerateDraft.isPending}
                                        data-testid="button-regenerate"
                                      >
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        {regenerateDraft.isPending ? 'Regenerating...' : 'Regenerate'}
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-center py-8">
                                    <p className="text-sm text-muted-foreground mb-4">
                                      No draft generated yet. Sync emails to auto-generate drafts.
                                    </p>
                                    <Button 
                                      variant="outline" 
                                      onClick={() => regenerateDraft.mutate(selectedEmail.id)}
                                      disabled={regenerateDraft.isPending}
                                      data-testid="button-generate-draft"
                                    >
                                      <Sparkles className="h-4 w-4 mr-2" />
                                      {regenerateDraft.isPending ? 'Generating...' : 'Generate Draft'}
                                    </Button>
                                  </div>
                                )}
                              </Card>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </TabsContent>

        <TabsContent value="routine" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2" data-testid="text-page-title">Routine Builder</h2>
              <p className="text-muted-foreground">Design your optimal daily schedule</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportCalendar} data-testid="button-export-routine">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Dialog open={routineDialogOpen} onOpenChange={setRoutineDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-block">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Block
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Time Block</DialogTitle>
                  </DialogHeader>
                  <Form {...routineForm}>
                    <form onSubmit={routineForm.handleSubmit((data) => createRoutine.mutate(data))} className="space-y-4">
                      <FormField
                        control={routineForm.control}
                        name="time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time</FormLabel>
                            <FormControl>
                              <Input placeholder="05:00" {...field} data-testid="input-routine-time" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={routineForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Morning Workout" {...field} data-testid="input-routine-title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={routineForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (optional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="HIIT training and strength conditioning" {...field} data-testid="input-routine-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={routineForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-routine-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="health">Health</SelectItem>
                                <SelectItem value="wealth">Wealth</SelectItem>
                                <SelectItem value="productivity">Productivity</SelectItem>
                                <SelectItem value="personal">Personal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={routineForm.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration</FormLabel>
                            <FormControl>
                              <Input placeholder="60 min" {...field} data-testid="input-routine-duration" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createRoutine.isPending} className="w-full" data-testid="button-submit-routine">
                        {createRoutine.isPending ? "Adding..." : "Add Time Block"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {routines.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No routine blocks yet</p>
                  <Button onClick={() => setRoutineDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Block
                  </Button>
                </div>
              ) : (
                routines.map((block) => (
                  <RoutineTimeBlock 
                    key={block.id} 
                    {...block}
                    category={block.category as "health" | "wealth" | "productivity" | "personal"}
                  />
                ))
              )}
            </div>

            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Templates from Successful Leaders</h3>
                <div className="space-y-3">
                  {routineTemplates.map((template, index) => (
                    <Card 
                      key={index} 
                      className={`p-4 hover-elevate cursor-pointer transition-all ${
                        selectedTemplate === template.name 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : ''
                      }`}
                      onClick={() => setSelectedTemplate(template.name)}
                      data-testid={`button-select-template-${index}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{template.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{template.activities} activities</p>
                          <p className="text-xs text-muted-foreground">{template.focus}</p>
                        </div>
                        {selectedTemplate === template.name && (
                          <Badge variant="default" className="ml-2">Selected</Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
                
                {(selectedTemplate || routines.length > 0) && (
                  <Button 
                    onClick={() => generateAIReport.mutate()}
                    disabled={generateAIReport.isPending || !selectedTemplate}
                    className="w-full mt-4"
                    data-testid="button-generate-ai-report"
                  >
                    <Sparkles className={`h-4 w-4 mr-2 ${generateAIReport.isPending ? 'animate-spin' : ''}`} />
                    {generateAIReport.isPending ? 'Generating Report...' : 'Generate AI Daily Report'}
                  </Button>
                )}
              </Card>

              {recommendations && recommendations.recommendations.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">AI Recommendations</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Based on your routine:
                  </p>
                  <ul className="space-y-2 text-sm">
                    {recommendations.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Calendar Events</h2>
            <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-event">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Event</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createEventMutation.mutate({
                    title: formData.get('title'),
                    description: formData.get('description'),
                    startTime: new Date(formData.get('startTime') as string).toISOString(),
                    endTime: new Date(formData.get('endTime') as string).toISOString(),
                    location: formData.get('location'),
                    isAllDay: 'false',
                    source: 'manual',
                  });
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" required data-testid="input-event-title" />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" data-testid="input-event-description" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input id="startTime" name="startTime" type="datetime-local" required data-testid="input-event-start" />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Input id="endTime" name="endTime" type="datetime-local" required data-testid="input-event-end" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" name="location" data-testid="input-event-location" />
                  </div>
                  <Button type="submit" className="w-full" data-testid="button-save-event">Create Event</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {events.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No events scheduled. Create your first event!</p>
                </CardContent>
              </Card>
            ) : (
              events.map((event) => (
                <Card key={event.id} data-testid={`event-${event.id}`}>
                  <CardHeader>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription>
                      {format(new Date(event.startTime), 'PPP p')} - {format(new Date(event.endTime), 'p')}
                    </CardDescription>
                  </CardHeader>
                  {event.description && (
                    <CardContent>
                      <p className="text-sm">{event.description}</p>
                      {event.location && <p className="text-sm text-muted-foreground mt-2">📍 {event.location}</p>}
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Tasks & To-Do</h2>
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-task">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createTaskMutation.mutate({
                    title: formData.get('title'),
                    description: formData.get('description'),
                    priority: formData.get('priority'),
                    category: formData.get('category'),
                    dueDate: formData.get('dueDate') ? new Date(formData.get('dueDate') as string).toISOString() : null,
                    status: 'pending',
                  });
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="task-title">Title</Label>
                    <Input id="task-title" name="title" required data-testid="input-task-title" />
                  </div>
                  <div>
                    <Label htmlFor="task-description">Description</Label>
                    <Textarea id="task-description" name="description" data-testid="input-task-description" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select name="priority" defaultValue="medium">
                        <SelectTrigger data-testid="select-task-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select name="category" defaultValue="personal">
                        <SelectTrigger data-testid="select-task-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input id="dueDate" name="dueDate" type="datetime-local" data-testid="input-task-due-date" />
                  </div>
                  <Button type="submit" className="w-full" data-testid="button-save-task">Create Task</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {tasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No tasks yet. Create your first task!</p>
                </CardContent>
              </Card>
            ) : (
              tasks.map((task) => (
                <Card key={task.id} data-testid={`task-${task.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={task.status === 'completed'}
                            onChange={() => updateTaskMutation.mutate({
                              id: task.id,
                              status: task.status === 'completed' ? 'pending' : 'completed',
                              completedAt: task.status === 'completed' ? null : new Date().toISOString(),
                            })}
                            className="h-4 w-4"
                            data-testid={`checkbox-task-${task.id}`}
                          />
                          <CardTitle className={task.status === 'completed' ? 'line-through' : ''}>{task.title}</CardTitle>
                        </div>
                        {task.description && <CardDescription className="mt-2">{task.description}</CardDescription>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-1 rounded ${
                          task.priority === 'urgent' ? 'bg-red-500 text-white' :
                          task.priority === 'high' ? 'bg-orange-500 text-white' :
                          task.priority === 'medium' ? 'bg-yellow-500 text-white' :
                          'bg-green-500 text-white'
                        }`}>{task.priority}</span>
                        {task.category && <span className="text-xs text-muted-foreground">{task.category}</span>}
                      </div>
                    </div>
                  </CardHeader>
                  {task.dueDate && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Due: {format(new Date(task.dueDate), 'PPP')}</p>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={aiReportDialogOpen} onOpenChange={setAiReportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Routine Analysis Report
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate && `Based on ${selectedTemplate} principles`}
            </DialogDescription>
          </DialogHeader>

          {aiReportResult && (
            <div className="space-y-6 mt-4">
              <Card className="p-6 bg-primary/5 border-primary/20">
                <h3 className="font-semibold text-lg mb-3">Analysis & Insights</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiReportResult.report}</p>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  Recommended Actions
                </h3>
                <div className="space-y-3">
                  {aiReportResult.recommendations.map((rec, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      data-testid={`recommendation-${index}`}
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <span className="text-xs font-semibold text-primary">{index + 1}</span>
                      </div>
                      <p className="text-sm flex-1">{rec}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">Key Focus Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {aiReportResult.focus_areas.map((area, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="px-3 py-1"
                      data-testid={`focus-area-${index}`}
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              </Card>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setAiReportDialogOpen(false)}
                  data-testid="button-close-report"
                >
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setAiReportDialogOpen(false);
                    setRoutineDialogOpen(true);
                  }}
                  data-testid="button-add-routine-from-report"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Block
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
