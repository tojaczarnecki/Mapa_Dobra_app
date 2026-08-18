export type DirectoryActionState = {
  error?: string;
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
};

export type CategoryFormValue = {
  id?: string;
  name: string;
  slug: string;
  sortOrder: number | null;
  active: boolean;
};
