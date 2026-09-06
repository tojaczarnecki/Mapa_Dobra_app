import Image from "next/image";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";

export function HomeGuideModule() {
  return (
    <Link
      href="/jak-pomagac"
      data-journey="knowledge"
      className="home-primary-card home-primary-card-wide home-guide-card"
      aria-labelledby="home-guide-module-title"
    >
      <span className="home-primary-icon" aria-hidden="true">
        <BookOpen size={24} strokeWidth={2.1} />
      </span>
      <span className="home-primary-copy">
        <span className="home-guide-module-eyebrow">PORADNIKI</span>
        <span id="home-guide-module-title" className="home-primary-title">Jak pomagać</span>
        <span className="home-primary-description">Krótkie poradniki, jak reagować i wspierać mądrze.</span>
        <span className="home-guide-secondary-label">Zobacz poradniki</span>
      </span>
      <Image
        src="/brand/help-guides/guide-conversation.png"
        alt=""
        width={320}
        height={240}
        className="home-primary-illustration"
        aria-hidden="true"
      />
      <ChevronRight className="home-primary-arrow" aria-hidden="true" size={24} strokeWidth={2} />
    </Link>
  );
}
