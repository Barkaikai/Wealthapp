import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Video, FileText, MessageSquare } from "lucide-react";

export default function Guide() {
  const sections = [
    {
      icon: BookOpen,
      title: "Getting Started",
      description: "Learn the basics of the platform",
      items: [
        "Setting up your first daily briefing",
        "Connecting financial accounts",
        "Configuring AI email automation",
        "Building your ideal routine"
      ]
    },
    {
      icon: Video,
      title: "Video Tutorials",
      description: "Step-by-step video guides",
      items: [
        "Platform walkthrough (5 min)",
        "Asset tracking setup (3 min)",
        "Email categorization demo (4 min)",
        "Routine templates overview (6 min)"
      ]
    },
    {
      icon: FileText,
      title: "Documentation",
      description: "Detailed feature documentation",
      items: [
        "API integration guide",
        "Security & privacy settings",
        "Advanced automation rules",
        "Troubleshooting common issues"
      ]
    },
    {
      icon: MessageSquare,
      title: "Support",
      description: "Get help when you need it",
      items: [
        "FAQ section",
        "Contact support team",
        "Community forum",
        "Feature requests"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">User Guide</h1>
        <p className="text-muted-foreground">Everything you need to master the platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, index) => (
          <Card key={index} className="p-6" data-testid={`guide-section-${index}`}>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <section.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">{section.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
                <ul className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-sm flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="flex-1">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-3">Need Personalized Help?</h3>
          <p className="text-muted-foreground mb-6">
            Our support team is available 24/7 to assist you with any questions
          </p>
          <Button size="lg" data-testid="button-contact-support">
            Contact Support
          </Button>
        </div>
      </Card>
    </div>
  );
}
