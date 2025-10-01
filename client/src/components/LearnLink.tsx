import { Link } from "wouter";
import { slugify } from "@/lib/utils";

interface LearnLinkProps {
  text: string;
  topic?: string;
  children?: React.ReactNode;
  className?: string;
}

export function LearnLink({ text, topic, children, className = "" }: LearnLinkProps) {
  const displayText = children || text;
  const linkTopic = topic || text;
  const slug = slugify(linkTopic);

  return (
    <Link 
      href={`/learn/${slug}`}
      className={`cursor-pointer hover:text-primary transition-colors ${className}`}
      data-testid={`learn-link-${slug}`}
    >
      {displayText}
    </Link>
  );
}
