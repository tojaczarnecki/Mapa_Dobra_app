import Link from "next/link";

type PrimaryActionCardProps = {
  href: string;
  title: string;
  description: string;
  variant: "help" | "activate" | "now" | "unknown";
};

const journeys = { help: "search", activate: "help", now: "now", unknown: "guide" } as const;

export function PrimaryActionCard({ href, title, description, variant }: PrimaryActionCardProps) {
  const isGuide = title === "Nie wiem, czego potrzebuję";

  return (
    <Link href={href} data-journey={journeys[variant]} className={`home-primary-card home-primary-card-${variant}`}>
      <span className="home-primary-copy">
        <span className="home-primary-title-row">
          {isGuide ? (
            <>
              <span className="home-primary-title home-primary-title-mobile">Nie wiem,<br />czego potrzebuję</span>
              <span className="home-primary-title home-primary-title-desktop">Nie wiem, czego potrzebuję</span>
            </>
          ) : <span className="home-primary-title">{title}</span>}
          <span className="home-primary-arrow" aria-hidden="true">→</span>
        </span>
        {description ? <span className="home-primary-description">{description}</span> : null}
      </span>
    </Link>
  );
}
