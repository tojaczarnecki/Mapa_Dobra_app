import { Globe, Mail, Phone } from "lucide-react";
import type { ContactDetails } from "@/data/demo-place-details";
import { telephoneHref } from "@/lib/places/actions";

type PlaceContactProps = {
  contact: ContactDetails;
};

export function PlaceContact({ contact }: PlaceContactProps) {
  const callHref = telephoneHref(contact.phone);
  return (
    <div className="grid min-w-0 gap-2 text-sm font-semibold">
      {callHref ? (
        <a
          className="touch-target inline-flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-foreground transition hover:bg-brand-soft"
          href={callHref}
        >
          <Phone aria-hidden="true" size={18} className="shrink-0 text-brand-strong" />
          <span className="min-w-0">{contact.phone}</span>
        </a>
      ) : null}
      {contact.email ? (
        <a
          className="touch-target inline-flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-foreground transition hover:bg-brand-soft"
          href={`mailto:${contact.email}`}
        >
          <Mail aria-hidden="true" size={18} className="shrink-0 text-brand-strong" />
          <span className="min-w-0 break-words">{contact.email}</span>
        </a>
      ) : null}
      {contact.website ? (
        <a
          className="touch-target inline-flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-foreground transition hover:bg-brand-soft"
          href={contact.website}
        >
          <Globe aria-hidden="true" size={18} className="shrink-0 text-brand-strong" />
          <span className="min-w-0 break-words">{contact.website}</span>
        </a>
      ) : null}
      {contact.social ? (
        <p className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-foreground">
          {contact.social}
        </p>
      ) : null}
    </div>
  );
}
