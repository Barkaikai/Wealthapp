import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users, UserPlus, Briefcase, TrendingUp, Building, Phone, Mail, Calendar, DollarSign } from "lucide-react";
import type { CrmContact, CrmLead, CrmDeal, CrmActivity, CrmOrganization } from "@shared/schema";

export default function CRMPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("contacts");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contacts = [], isLoading: contactsLoading } = useQuery<CrmContact[]>({
    queryKey: ['/api/crm/contacts', searchQuery],
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<CrmLead[]>({
    queryKey: ['/api/crm/leads'],
  });

  const { data: deals = [], isLoading: dealsLoading } = useQuery<CrmDeal[]>({
    queryKey: ['/api/crm/deals'],
  });

  const { data: organizations = [], isLoading: orgsLoading } = useQuery<CrmOrganization[]>({
    queryKey: ['/api/crm/organizations'],
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<CrmActivity[]>({
    queryKey: ['/api/crm/activities'],
  });

  return (
    <div className="h-full overflow-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CRM</h1>
          <p className="text-muted-foreground">Manage your relationships and pipeline</p>
        </div>
        <div className="flex gap-2">
          <CreateOrganizationDialog />
          <CreateContactDialog organizations={organizations} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contacts" data-testid="tab-contacts">
            <Users className="w-4 h-4 mr-2" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="leads" data-testid="tab-leads">
            <UserPlus className="w-4 h-4 mr-2" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="deals" data-testid="tab-deals">
            <Briefcase className="w-4 h-4 mr-2" />
            Deals
          </TabsTrigger>
          <TabsTrigger value="activities" data-testid="tab-activities">
            <Calendar className="w-4 h-4 mr-2" />
            Activities
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-contacts"
            />
          </div>

          {contactsLoading ? (
            <div className="text-muted-foreground">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No contacts found. Create your first contact to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contacts.map((contact) => (
                <ContactCard key={contact.id} contact={contact} organizations={organizations} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <div className="flex justify-end">
            <CreateLeadDialog contacts={contacts} organizations={organizations} />
          </div>

          {leadsLoading ? (
            <div className="text-muted-foreground">Loading leads...</div>
          ) : leads.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No leads found. Create your first lead to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {leads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} contacts={contacts} organizations={organizations} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deals" className="space-y-4">
          <div className="flex justify-end">
            <CreateDealDialog contacts={contacts} organizations={organizations} />
          </div>

          {dealsLoading ? (
            <div className="text-muted-foreground">Loading deals...</div>
          ) : deals.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No deals found. Create your first deal to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} contacts={contacts} organizations={organizations} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-end">
            <CreateActivityDialog contacts={contacts} deals={deals} />
          </div>

          {activitiesLoading ? (
            <div className="text-muted-foreground">Loading activities...</div>
          ) : activities.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No activities found. Log your first activity to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} contacts={contacts} deals={deals} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContactCard({ contact, organizations }: { contact: CrmContact; organizations: CrmOrganization[] }) {
  const org = organizations.find(o => o.id === contact.organizationId);
  
  return (
    <Card className="hover-elevate" data-testid={`card-contact-${contact.id}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{contact.firstName} {contact.lastName}</span>
          <Badge variant={contact.status === 'active' ? 'default' : 'secondary'}>
            {contact.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {org && (
          <div className="flex items-center gap-2 text-sm">
            <Building className="w-4 h-4 text-muted-foreground" />
            <span>{org.name}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span>{contact.email}</span>
        </div>
        {contact.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span>{contact.phone}</span>
          </div>
        )}
        {contact.jobTitle && (
          <div className="text-sm text-muted-foreground">{contact.jobTitle}</div>
        )}
      </CardContent>
    </Card>
  );
}

function LeadCard({ lead, contacts, organizations }: { lead: CrmLead; contacts: CrmContact[]; organizations: CrmOrganization[] }) {
  const contact = contacts.find(c => c.id === lead.contactId);
  const org = organizations.find(o => o.id === lead.organizationId);

  return (
    <Card className="hover-elevate" data-testid={`card-lead-${lead.id}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{lead.source}</span>
          <Badge variant={lead.status === 'qualified' ? 'default' : lead.status === 'new' ? 'secondary' : 'outline'}>
            {lead.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {contact && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{contact.firstName} {contact.lastName}</span>
          </div>
        )}
        {org && (
          <div className="flex items-center gap-2 text-sm">
            <Building className="w-4 h-4 text-muted-foreground" />
            <span>{org.name}</span>
          </div>
        )}
        {lead.estimatedValue && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span>${lead.estimatedValue.toLocaleString()}</span>
          </div>
        )}
        {lead.notes && (
          <p className="text-sm text-muted-foreground mt-2">{lead.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

function DealCard({ deal, contacts, organizations }: { deal: CrmDeal; contacts: CrmContact[]; organizations: CrmOrganization[] }) {
  const contact = contacts.find(c => c.id === deal.contactId);
  const org = organizations.find(o => o.id === deal.organizationId);

  const stageColors = {
    prospecting: 'secondary',
    qualification: 'outline',
    proposal: 'default',
    negotiation: 'default',
    'closed-won': 'default',
    'closed-lost': 'destructive',
  };

  return (
    <Card className="hover-elevate" data-testid={`card-deal-${deal.id}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{deal.title}</span>
          <Badge variant={stageColors[deal.stage as keyof typeof stageColors] || 'secondary'}>
            {deal.stage}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <span>${deal.amount.toLocaleString()}</span>
        </div>
        {contact && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{contact.firstName} {contact.lastName}</span>
          </div>
        )}
        {org && (
          <div className="flex items-center gap-2 text-sm">
            <Building className="w-4 h-4 text-muted-foreground" />
            <span>{org.name}</span>
          </div>
        )}
        {deal.closedAt && (
          <div className="text-sm text-muted-foreground">
            Closed: {new Date(deal.closedAt).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityCard({ activity, contacts, deals }: { activity: CrmActivity; contacts: CrmContact[]; deals: CrmDeal[] }) {
  const contact = contacts.find(c => c.id === activity.contactId);
  const deal = deals.find(d => d.id === activity.dealId);

  const typeColors = {
    call: 'default',
    email: 'secondary',
    meeting: 'outline',
    task: 'outline',
    note: 'secondary',
  };

  return (
    <Card className="hover-elevate" data-testid={`card-activity-${activity.id}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{activity.subject}</span>
          <Badge variant={typeColors[activity.type as keyof typeof typeColors] || 'secondary'}>
            {activity.type}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {contact && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{contact.firstName} {contact.lastName}</span>
          </div>
        )}
        {deal && (
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <span>{deal.title}</span>
          </div>
        )}
        <div className="text-sm text-muted-foreground">
          {new Date(activity.createdAt).toLocaleString()}
        </div>
        {activity.notes && (
          <p className="text-sm mt-2">{activity.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CreateOrganizationDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: { name: string; industry?: string; website?: string }) => {
      return await apiRequest('/api/crm/organizations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/organizations'] });
      toast({ title: "Organization created successfully" });
      setOpen(false);
      setName("");
      setIndustry("");
      setWebsite("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-create-organization">
          <Building className="w-4 h-4 mr-2" />
          New Organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              data-testid="input-org-name"
            />
          </div>
          <div>
            <Label htmlFor="org-industry">Industry</Label>
            <Input
              id="org-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Technology"
              data-testid="input-org-industry"
            />
          </div>
          <div>
            <Label htmlFor="org-website">Website</Label>
            <Input
              id="org-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://acme.com"
              data-testid="input-org-website"
            />
          </div>
          <Button
            onClick={() => mutation.mutate({ name, industry: industry || undefined, website: website || undefined })}
            disabled={!name || mutation.isPending}
            className="w-full"
            data-testid="button-submit-organization"
          >
            {mutation.isPending ? "Creating..." : "Create Organization"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateContactDialog({ organizations }: { organizations: CrmOrganization[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    organizationId: "",
    status: "active",
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/crm/contacts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/contacts'] });
      toast({ title: "Contact created successfully" });
      setOpen(false);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        jobTitle: "",
        organizationId: "",
        status: "active",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-contact">
          <UserPlus className="w-4 h-4 mr-2" />
          New Contact
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                data-testid="input-first-name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                data-testid="input-last-name"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              data-testid="input-email"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              data-testid="input-phone"
            />
          </div>
          <div>
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              data-testid="input-job-title"
            />
          </div>
          <div>
            <Label htmlFor="organization">Organization</Label>
            <Select value={formData.organizationId} onValueChange={(value) => setFormData({ ...formData, organizationId: value })}>
              <SelectTrigger data-testid="select-organization">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id.toString()}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => mutation.mutate({
              ...formData,
              organizationId: formData.organizationId ? parseInt(formData.organizationId) : null,
            })}
            disabled={!formData.firstName || !formData.lastName || !formData.email || mutation.isPending}
            className="w-full"
            data-testid="button-submit-contact"
          >
            {mutation.isPending ? "Creating..." : "Create Contact"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateLeadDialog({ contacts, organizations }: { contacts: CrmContact[]; organizations: CrmOrganization[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    source: "",
    status: "new",
    contactId: "",
    organizationId: "",
    estimatedValue: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/crm/leads', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      toast({ title: "Lead created successfully" });
      setOpen(false);
      setFormData({
        source: "",
        status: "new",
        contactId: "",
        organizationId: "",
        estimatedValue: "",
        notes: "",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-lead">
          <TrendingUp className="w-4 h-4 mr-2" />
          New Lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="Website, Referral, etc."
              data-testid="input-lead-source"
            />
          </div>
          <div>
            <Label htmlFor="lead-status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger data-testid="select-lead-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="unqualified">Unqualified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="lead-contact">Contact</Label>
            <Select value={formData.contactId} onValueChange={(value) => setFormData({ ...formData, contactId: value })}>
              <SelectTrigger data-testid="select-lead-contact">
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id.toString()}>
                    {contact.firstName} {contact.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="lead-organization">Organization</Label>
            <Select value={formData.organizationId} onValueChange={(value) => setFormData({ ...formData, organizationId: value })}>
              <SelectTrigger data-testid="select-lead-organization">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id.toString()}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="estimatedValue">Estimated Value</Label>
            <Input
              id="estimatedValue"
              type="number"
              value={formData.estimatedValue}
              onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
              placeholder="10000"
              data-testid="input-estimated-value"
            />
          </div>
          <div>
            <Label htmlFor="lead-notes">Notes</Label>
            <Textarea
              id="lead-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              data-testid="textarea-lead-notes"
            />
          </div>
          <Button
            onClick={() => mutation.mutate({
              ...formData,
              contactId: formData.contactId ? parseInt(formData.contactId) : null,
              organizationId: formData.organizationId ? parseInt(formData.organizationId) : null,
              estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : null,
            })}
            disabled={!formData.source || mutation.isPending}
            className="w-full"
            data-testid="button-submit-lead"
          >
            {mutation.isPending ? "Creating..." : "Create Lead"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateDealDialog({ contacts, organizations }: { contacts: CrmContact[]; organizations: CrmOrganization[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    stage: "prospecting",
    contactId: "",
    organizationId: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/crm/deals', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/deals'] });
      toast({ title: "Deal created successfully" });
      setOpen(false);
      setFormData({
        title: "",
        amount: "",
        stage: "prospecting",
        contactId: "",
        organizationId: "",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-deal">
          <Briefcase className="w-4 h-4 mr-2" />
          New Deal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Deal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="deal-title">Title</Label>
            <Input
              id="deal-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Q1 Enterprise Deal"
              data-testid="input-deal-title"
            />
          </div>
          <div>
            <Label htmlFor="deal-amount">Amount</Label>
            <Input
              id="deal-amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="50000"
              data-testid="input-deal-amount"
            />
          </div>
          <div>
            <Label htmlFor="deal-stage">Stage</Label>
            <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
              <SelectTrigger data-testid="select-deal-stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prospecting">Prospecting</SelectItem>
                <SelectItem value="qualification">Qualification</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="closed-won">Closed Won</SelectItem>
                <SelectItem value="closed-lost">Closed Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="deal-contact">Contact</Label>
            <Select value={formData.contactId} onValueChange={(value) => setFormData({ ...formData, contactId: value })}>
              <SelectTrigger data-testid="select-deal-contact">
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id.toString()}>
                    {contact.firstName} {contact.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="deal-organization">Organization</Label>
            <Select value={formData.organizationId} onValueChange={(value) => setFormData({ ...formData, organizationId: value })}>
              <SelectTrigger data-testid="select-deal-organization">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id.toString()}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => mutation.mutate({
              ...formData,
              amount: parseFloat(formData.amount),
              contactId: formData.contactId ? parseInt(formData.contactId) : null,
              organizationId: formData.organizationId ? parseInt(formData.organizationId) : null,
            })}
            disabled={!formData.title || !formData.amount || mutation.isPending}
            className="w-full"
            data-testid="button-submit-deal"
          >
            {mutation.isPending ? "Creating..." : "Create Deal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateActivityDialog({ contacts, deals }: { contacts: CrmContact[]; deals: CrmDeal[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "call",
    subject: "",
    contactId: "",
    dealId: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/crm/activities', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/activities'] });
      toast({ title: "Activity logged successfully" });
      setOpen(false);
      setFormData({
        type: "call",
        subject: "",
        contactId: "",
        dealId: "",
        notes: "",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-activity">
          <Calendar className="w-4 h-4 mr-2" />
          Log Activity
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="activity-type">Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger data-testid="select-activity-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="note">Note</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="activity-subject">Subject</Label>
            <Input
              id="activity-subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Follow-up call"
              data-testid="input-activity-subject"
            />
          </div>
          <div>
            <Label htmlFor="activity-contact">Contact</Label>
            <Select value={formData.contactId} onValueChange={(value) => setFormData({ ...formData, contactId: value })}>
              <SelectTrigger data-testid="select-activity-contact">
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id.toString()}>
                    {contact.firstName} {contact.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="activity-deal">Deal</Label>
            <Select value={formData.dealId} onValueChange={(value) => setFormData({ ...formData, dealId: value })}>
              <SelectTrigger data-testid="select-activity-deal">
                <SelectValue placeholder="Select deal (optional)" />
              </SelectTrigger>
              <SelectContent>
                {deals.map((deal) => (
                  <SelectItem key={deal.id} value={deal.id.toString()}>
                    {deal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="activity-notes">Notes</Label>
            <Textarea
              id="activity-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              data-testid="textarea-activity-notes"
            />
          </div>
          <Button
            onClick={() => mutation.mutate({
              ...formData,
              contactId: formData.contactId ? parseInt(formData.contactId) : null,
              dealId: formData.dealId ? parseInt(formData.dealId) : null,
            })}
            disabled={!formData.subject || mutation.isPending}
            className="w-full"
            data-testid="button-submit-activity"
          >
            {mutation.isPending ? "Logging..." : "Log Activity"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
