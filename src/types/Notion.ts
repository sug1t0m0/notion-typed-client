import { Client } from '@notionhq/client';
import { DatabaseConfig } from './Config';

export interface SelectOption {
  id: string;
  name: string;
  color?: string;
}

export interface StatusOption {
  id: string;
  name: string;
  color?: string;
}

export interface PropertySchema {
  id: string;
  name: string;
  type: string;
  select?: {
    options: SelectOption[];
  };
  multi_select?: {
    options: SelectOption[];
  };
  status?: {
    options: StatusOption[];
    groups: Array<{
      id: string;
      name: string;
      color: string;
      option_ids: string[];
    }>;
  };
}

export interface DatabaseSchema {
  id: string;
  title: Array<{
    type: 'text';
    text: {
      content: string;
    };
  }>;
  properties: Record<string, PropertySchema>;
}

export interface ResolvedPropertyConfig {
  id: string;
  name: string;
  displayName: string;
  notionName: string;
  type: string;
  options?: SelectOption[] | StatusOption[];
}

export interface ResolvedDatabaseConfig {
  id: string;
  name: string;
  displayName: string;
  notionName: string;
  properties: ResolvedPropertyConfig[];
}

export interface FetchResult {
  databases: ResolvedDatabaseConfig[];
  schemas: Record<string, DatabaseSchema>;
  configUpdates: {
    database: DatabaseConfig;
    updates: {
      id?: string;
      notionName?: string;
      properties?: Array<{
        name: string;
        id?: string;
        notionName?: string;
      }>;
    };
  }[];
}
