import { slugifyDirectoryValue } from "./admin/directory-validation.ts";

export function knowledgeSlug(value: string) {
  return slugifyDirectoryValue(value, 230) || "material";
}

function value(formData: FormData, key: string, max: number) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

function values(formData: FormData, key: string, max: number) {
  return formData.getAll(key).flatMap((item) => typeof item === "string" ? item.split(",") : []).map((item) => item.trim()).filter(Boolean).slice(0, max);
}

export function knowledgeFormData(formData: FormData) {
  const title = value(formData, "title", 240);
  const excerpt = value(formData, "excerpt", 600);
  const content = value(formData, "content", 100000);
  if (!title || !excerpt || !content) return { error: "Tytuł, zajawka i treść są wymagane." } as const;
  const reading = Number(value(formData, "readingTime", 3));
  return {
    data: {
      title, excerpt, content,
      slug: knowledgeSlug(value(formData, "slug", 240) || title),
      intent: value(formData, "intent", 40) || "NEED_HELP",
      contentType: value(formData, "contentType", 40) || "GUIDE",
      tags: value(formData, "tags", 500).split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 20),
      categorySlugs: values(formData, "categorySlugs", 20),
      placeIds: value(formData, "placeIds", 1000).split(",").map((id) => id.trim()).filter(Boolean).slice(0, 10),
      status: value(formData, "status", 30) || "DRAFT",
      readingTime: Number.isInteger(reading) && reading > 0 && reading <= 999 ? reading : null,
      featured: formData.get("featured") === "on",
      partnerContent: formData.get("partnerContent") === "on",
      partnerName: value(formData, "partnerName", 240) || null,
      partnerDisclosure: value(formData, "partnerDisclosure", 500) || null,
      authorDisplayName: value(formData, "authorDisplayName", 160) || null,
      emergencyNote: value(formData, "emergencyNote", 500) || null,
      geographicScope: value(formData, "geographicScope", 160) || null,
      seoTitle: value(formData, "seoTitle", 240) || null,
      seoDescription: value(formData, "seoDescription", 320) || null,
      important: formData.get("important") === "on",
      notificationEligible: formData.get("notificationEligible") === "on",
      notificationCategory: value(formData, "notificationCategory", 120) || null,
      relatedArticleIds: values(formData, "relatedArticleIds", 10),
    },
  } as const;
}
