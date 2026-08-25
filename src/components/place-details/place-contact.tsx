import { Globe, Mail, Phone } from "lucide-react";
import type { ContactDetails } from "@/data/demo-place-details";
import { telephoneHref } from "@/lib/places/actions";
import { PlaceCorrectionTrigger } from "./place-correction-trigger";

type PlaceContactProps = {
  contact: ContactDetails;
  placeId?: string;
};

export function PlaceContact({ contact, placeId }: PlaceContactProps) {
  const callHref = telephoneHref(contact.phone);
  return (
    <div className="place-detail-contact-list">
      {callHref ? (
        <div className="place-detail-contact-row">
          <a className="inline-flex min-w-0 flex-1 items-center gap-3" href={callHref}>
            <Phone aria-hidden="true" size={18} />
            <span className="min-w-0">{contact.phone}</span>
          </a>
          {placeId ? <PlaceCorrectionTrigger placeId={placeId} field="phone" currentValue={contact.phone ?? ""} /> : null}
        </div>
      ) : null}
      {contact.email ? (
        <div className="place-detail-contact-row">
          <a className="inline-flex min-w-0 flex-1 items-center gap-3" href={`mailto:${contact.email}`}>
            <Mail aria-hidden="true" size={18} />
            <span className="min-w-0 break-words">{contact.email}</span>
          </a>
          {placeId ? <PlaceCorrectionTrigger placeId={placeId} field="email" currentValue={contact.email ?? ""} /> : null}
        </div>
      ) : null}
      {contact.website ? (
        <div className="place-detail-contact-row">
          <a className="inline-flex min-w-0 flex-1 items-center gap-3" href={contact.website}>
            <Globe aria-hidden="true" size={18} />
            <span className="min-w-0 break-words">{contact.website}</span>
          </a>
          {placeId ? <PlaceCorrectionTrigger placeId={placeId} field="website" currentValue={contact.website ?? ""} /> : null}
        </div>
      ) : null}
      {contact.social ? (
        <p className="place-detail-contact-row">
          {contact.social}
        </p>
      ) : null}
    </div>
  );
}
