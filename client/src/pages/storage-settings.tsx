import { StorageSettings } from "@/components/StorageSettings";

export default function StorageSettingsPage() {
  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="heading-storage-settings">Storage Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          Manage your device storage and optimize app performance
        </p>
      </div>
      <StorageSettings />
    </div>
  );
}
