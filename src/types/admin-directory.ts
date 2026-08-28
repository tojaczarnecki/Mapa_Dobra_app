export type DirectoryActionState = {
  error?: string;
  fieldErrors?: Partial<Record<"nip" | "regon" | "krs", string>>;
  success?: string;
  entityId?: string;
  warning?: string;
};

export type OrganizationFormValue = {
  id?: string;
  name: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  nip: string;
  regon: string;
  krs: string;
};

export type CategoryFormValue = {
  id?: string;
  name: string;
  slug: string;
  sortOrder: number | null;
  active: boolean;
};
