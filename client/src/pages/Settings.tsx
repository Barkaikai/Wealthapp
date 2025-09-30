import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Settings</h1>
        <p className="text-muted-foreground">Manage your preferences and integrations</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-6">General Settings</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue="John Doe" data-testid="input-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="john@example.com" data-testid="input-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" defaultValue="America/New_York" data-testid="input-timezone" />
              </div>
              <Button data-testid="button-save-general">Save Changes</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold mb-1">Gmail</h4>
                  <p className="text-sm text-muted-foreground">Email automation and categorization</p>
                </div>
                <Switch defaultChecked data-testid="switch-gmail" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold mb-1">OpenAI</h4>
                  <p className="text-sm text-muted-foreground">AI-powered insights and drafting</p>
                </div>
                <Switch defaultChecked data-testid="switch-openai" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold mb-1">Financial APIs</h4>
                  <p className="text-sm text-muted-foreground">Connect brokerages and banks</p>
                </div>
                <Button variant="outline" data-testid="button-configure-apis">Configure</Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-6">Security Settings</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Switch data-testid="switch-2fa" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Biometric Lock</h4>
                  <p className="text-sm text-muted-foreground">Use fingerprint or Face ID</p>
                </div>
                <Switch data-testid="switch-biometric" />
              </div>
              <div className="pt-4 border-t">
                <Button variant="outline" data-testid="button-change-password">Change Password</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-6">Notification Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Daily Briefing</h4>
                  <p className="text-sm text-muted-foreground">Morning wealth summary</p>
                </div>
                <Switch defaultChecked data-testid="switch-briefing" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Price Alerts</h4>
                  <p className="text-sm text-muted-foreground">Asset price notifications</p>
                </div>
                <Switch defaultChecked data-testid="switch-price-alerts" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Email Summaries</h4>
                  <p className="text-sm text-muted-foreground">Important email highlights</p>
                </div>
                <Switch defaultChecked data-testid="switch-email-summaries" />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
