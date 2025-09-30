import { EmailList } from "../EmailList";
import { useState } from "react";

export default function EmailListExample() {
  const [selectedEmailId, setSelectedEmailId] = useState<string>();

  const emails = [
    {
      id: "1",
      from: "Charles Schwab",
      subject: "Monthly Statement Available",
      preview: "Your October statement is now available for review...",
      category: "finance" as const,
      isStarred: true,
      isRead: false,
      time: "10:30 AM",
    },
    {
      id: "2",
      from: "Coinbase",
      subject: "BTC Price Alert",
      preview: "Bitcoin has reached your target price of $45,000...",
      category: "investments" as const,
      isStarred: false,
      isRead: false,
      time: "9:15 AM",
    },
    {
      id: "3",
      from: "John Smith",
      subject: "Dinner plans this week?",
      preview: "Hey, wanted to see if you're free for dinner...",
      category: "personal" as const,
      isStarred: false,
      isRead: true,
      time: "Yesterday",
    },
  ];

  return (
    <div className="p-6 max-w-2xl">
      <EmailList
        emails={emails}
        onEmailClick={setSelectedEmailId}
        selectedEmailId={selectedEmailId}
      />
    </div>
  );
}
