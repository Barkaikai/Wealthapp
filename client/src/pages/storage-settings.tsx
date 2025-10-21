import { StorageSettings } from "@/components/StorageSettings";
import { PrintButton } from "@/components/PrintButton";

export default function StorageSettingsPage() {
  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-start gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="heading-storage-settings">Storage Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
            Manage your device storage and optimize app performance
          </p>
        </div>
        <PrintButton variant="outline" size="sm" className="flex-1 sm:flex-none" />
      </div>
      <StorageSettings />
    </div>
  );
}
