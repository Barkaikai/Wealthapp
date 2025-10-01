import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertNoteSchema, type Note, type Document, type DocumentInsight } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Download, Trash, Plus, Pin, Tag, Folder, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/gif'];

const noteFormSchema = insertNoteSchema.omit({ userId: true });

export default function Notepad() {
  const [activeTab, setActiveTab] = useState("notes");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [uploadProgress, setUploadProgress] = useState(false);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DocumentInsight | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: notes = [], isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
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

  const createNoteMutation = useMutation({
    mutationFn: async (data: z.infer<typeof noteFormSchema>) => {
      await apiRequest("POST", "/api/notes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({
        title: "Success",
        description: "Note saved successfully",
      });
      setNoteDialogOpen(false);
      noteForm.reset();
      setEditingNote(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save note",
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof noteFormSchema>> }) => {
      await apiRequest("PATCH", `/api/notes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({
        title: "Success",
        description: "Note updated successfully",
      });
      setNoteDialogOpen(false);
      noteForm.reset();
      setEditingNote(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update note",
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notes/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete note",
        variant: "destructive",
      });
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
      toast({
        title: "Analysis Complete",
        description: "Note has been analyzed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze note",
        variant: "destructive",
      });
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File size exceeds 25MB limit");
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        throw new Error("File type not supported. Allowed: PDF, DOC, DOCX, TXT, JPG, PNG, GIF");
      }

      // Warn about PDF/Word files
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
        
        // Handle 503 Service Unavailable specifically
        if (response.status === 503) {
          throw new Error(error.message || "Object Storage not available");
        }
        
        throw new Error(error.message || "Upload failed");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      setUploadProgress(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(false);
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
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
      toast({
        title: "Analysis Complete",
        description: "Document has been analyzed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze document",
        variant: "destructive",
      });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Notepad</h1>
          <p className="text-muted-foreground">Organize your notes and documents</p>
        </div>
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="notes" data-testid="tab-notes">
            <FileText className="h-4 w-4 mr-2" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">
            <Upload className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Button onClick={() => openNoteDialog()} data-testid="button-new-note">
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </div>

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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                      <Input placeholder="Enter note title" {...field} data-testid="input-note-title" />
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
                      <Textarea
                        placeholder="Write your note here..."
                        rows={12}
                        {...field}
                        data-testid="textarea-note-content"
                      />
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
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (comma-separated)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="finance, personal, ideas"
                          value={field.value?.join(", ") || ""}
                          onChange={(e) => field.onChange(e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                          data-testid="input-note-tags"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setNoteDialogOpen(false);
                    noteForm.reset();
                    setEditingNote(null);
                  }}
                  data-testid="button-cancel-note"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createNoteMutation.isPending || updateNoteMutation.isPending} data-testid="button-save-note">
                  {(createNoteMutation.isPending || updateNoteMutation.isPending) ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Document Analysis
            </DialogTitle>
          </DialogHeader>
          {analysisResult && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Summary</h3>
                <p className="text-sm" data-testid="analysis-summary">{analysisResult.summary}</p>
              </div>

              {analysisResult.keyPoints && analysisResult.keyPoints.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Key Points</h3>
                  <ul className="space-y-2">
                    {analysisResult.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm" data-testid={`key-point-${idx}`}>
                        <span className="text-primary mt-1">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisResult.actionItems && analysisResult.actionItems.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Action Items</h3>
                  <ul className="space-y-2">
                    {analysisResult.actionItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm" data-testid={`action-item-${idx}`}>
                        <span className="text-primary mt-1">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-4">
                {analysisResult.sentiment && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-1">Sentiment</h3>
                    <Badge 
                      variant={analysisResult.sentiment === 'positive' ? 'default' : analysisResult.sentiment === 'negative' ? 'destructive' : 'secondary'}
                      data-testid="analysis-sentiment"
                    >
                      {analysisResult.sentiment}
                    </Badge>
                  </div>
                )}

                {analysisResult.categories && analysisResult.categories.length > 0 && (
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-1">Categories</h3>
                    <div className="flex flex-wrap gap-1">
                      {analysisResult.categories.map((category, idx) => (
                        <Badge key={idx} variant="outline" data-testid={`category-${idx}`}>
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setAnalysisDialogOpen(false)}
                  data-testid="button-close-analysis"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
