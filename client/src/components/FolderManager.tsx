import { useState } from "react";
import { Folder, FolderPlus, Edit, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface FolderManagerProps {
  folders: string[];
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
  onFolderCreate?: (folderName: string) => void;
  onFolderRename?: (oldName: string, newName: string) => void;
  onFolderDelete?: (folderName: string) => void;
  counts?: Record<string, number>;
}

export function FolderManager({
  folders,
  selectedFolder,
  onFolderSelect,
  onFolderCreate,
  onFolderRename,
  onFolderDelete,
  counts = {},
}: FolderManagerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [editFolderName, setEditFolderName] = useState("");

  const handleCreateFolder = () => {
    if (newFolderName.trim() && onFolderCreate) {
      onFolderCreate(newFolderName.trim());
      setNewFolderName("");
      setCreateDialogOpen(false);
    }
  };

  const handleRenameFolder = (oldName: string) => {
    if (editFolderName.trim() && onFolderRename) {
      onFolderRename(oldName, editFolderName.trim());
      setEditingFolder(null);
      setEditFolderName("");
    }
  };

  const handleDeleteFolder = (folderName: string) => {
    if (onFolderDelete && confirm(`Delete folder "${folderName}"? Items will be moved to "default".`)) {
      onFolderDelete(folderName);
    }
  };

  const startEdit = (folderName: string) => {
    setEditingFolder(folderName);
    setEditFolderName(folderName);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Folder className="h-4 w-4" />
          Folders
        </h3>
        {onFolderCreate && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" data-testid="button-create-folder">
                <FolderPlus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                  Enter a name for your new folder
                </DialogDescription>
              </DialogHeader>
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                }}
                data-testid="input-folder-name"
              />
              <DialogFooter>
                <Button
                  onClick={() => setCreateDialogOpen(false)}
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder} data-testid="button-submit-folder">
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-1">
        {folders.map((folder) => (
          <div
            key={folder}
            className={`group flex items-center justify-between p-2 rounded-md hover-elevate cursor-pointer ${
              selectedFolder === folder ? "bg-primary/10" : ""
            }`}
          >
            {editingFolder === folder ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editFolderName}
                  onChange={(e) => setEditFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameFolder(folder);
                    if (e.key === "Escape") setEditingFolder(null);
                  }}
                  className="h-8"
                  autoFocus
                  data-testid={`input-rename-folder-${folder}`}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRenameFolder(folder)}
                  data-testid={`button-save-folder-${folder}`}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingFolder(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div
                  className="flex items-center gap-2 flex-1"
                  onClick={() => onFolderSelect(folder)}
                  data-testid={`folder-item-${folder}`}
                >
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{folder}</span>
                  {counts[folder] !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      {counts[folder]}
                    </Badge>
                  )}
                </div>
                {folder !== "default" && folder !== "all" && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onFolderRename && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(folder)}
                        data-testid={`button-edit-folder-${folder}`}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {onFolderDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteFolder(folder)}
                        data-testid={`button-delete-folder-${folder}`}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
