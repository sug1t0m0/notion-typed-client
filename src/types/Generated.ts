export interface GeneratedProperty {
  name: string;
  type: string;
  required: boolean;
  enum?: string[];
  items?: {
    type: string;
    enum?: string[];
  };
}

export interface GeneratedSchema {
  $schema: string;
  type: 'object';
  title: string;
  properties: Record<string, any>;
  required: string[];
  additionalProperties: boolean;
}

export interface GeneratedDatabase {
  name: string;
  schema: GeneratedSchema;
  createSchema: GeneratedSchema;
  updateSchema: GeneratedSchema;
  typeName: string;
  createTypeName: string;
  updateTypeName: string;
}

export type PropertyTypeMapping = {
  title: string;
  rich_text: string;
  number: number | null;
  select: string | null;
  multi_select: string[];
  date: { start: string; end?: string | null } | null;
  people: string[];
  files: Array<{ name: string; url: string }>;
  checkbox: boolean;
  url: string | null;
  email: string | null;
  phone_number: string | null;
  formula: any;
  relation: string[];
  rollup: any;
  created_time: string;
  created_by: string;
  last_edited_time: string;
  last_edited_by: string;
  status: string | null;
};

export type CreatePropertyTypeMapping = {
  title: string;
  rich_text: string;
  number: number;
  select: string;
  multi_select: string[];
  date: { start: string; end?: string };
  people: string[];
  files: Array<{ name: string; url: string }>;
  checkbox: boolean;
  url: string;
  email: string;
  phone_number: string;
  relation: string[];
  status: string;
};
