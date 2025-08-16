export type NotionPropertyType =
  | 'title'
  | 'rich_text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'people'
  | 'files'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'formula'
  | 'relation'
  | 'rollup'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by'
  | 'status'
  | 'unique_id';

export interface PropertyConfig {
  id: string | null;
  name: string;
  displayName: string;
  notionName: string;
  type: NotionPropertyType | null;
}

export interface DatabaseConfig {
  id: string | null;
  name: string;
  displayName: string;
  notionName: string;
  properties: PropertyConfig[];
}

export interface OutputConfig {
  path: string;
  clientName?: string;
}

export interface NotionTypedConfig {
  databases: DatabaseConfig[];
  output: OutputConfig;
}
