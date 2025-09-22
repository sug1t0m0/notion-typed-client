import type { DatabaseConfig } from '../../src/types';

/**
 * E2E test database schema configuration
 * Uses minimal property set for comprehensive testing
 */
export const E2E_TEST_SCHEMA: DatabaseConfig = {
  id: null, // Will be resolved during setup
  name: 'E2ETestDatabase',
  displayName: 'E2E Test Database',
  notionName: 'E2E Test Database',
  properties: [
    {
      id: null,
      name: 'title',
      displayName: 'Title',
      notionName: 'タイトル',
      type: 'title',
    },
    {
      id: null,
      name: 'description',
      displayName: 'Description',
      notionName: '説明',
      type: 'rich_text',
    },
    {
      id: null,
      name: 'priority',
      displayName: 'Priority',
      notionName: '優先度',
      type: 'select',
      // Options will be: 低, 中, 高
    },
    {
      id: null,
      name: 'tags',
      displayName: 'Tags',
      notionName: 'タグ',
      type: 'multi_select',
      // Options will be: 重要, 確認待ち, バグ, 改善
    },
    {
      id: null,
      name: 'assignee',
      displayName: 'Assignee',
      notionName: '担当者',
      type: 'people',
    },
    {
      id: null,
      name: 'progress',
      displayName: 'Progress',
      notionName: '進捗率',
      type: 'number',
      // Format: percent
    },
    {
      id: null,
      name: 'dueDate',
      displayName: 'Due Date',
      notionName: '期限',
      type: 'date',
    },
    {
      id: null,
      name: 'completed',
      displayName: 'Completed',
      notionName: '完了',
      type: 'checkbox',
    },
    {
      id: null,
      name: 'category',
      displayName: 'Category',
      notionName: 'カテゴリー',
      type: 'relation',
      // Relation to Categories database
    },
    {
      id: null,
      name: 'status',
      displayName: 'Status',
      notionName: 'ステータス',
      type: 'status',
      // Status groups and options must be configured manually
    },
  ],
};

/**
 * Related database schema for testing relations
 */
export const E2E_CATEGORY_SCHEMA: DatabaseConfig = {
  id: null,
  name: 'E2ECategoryDatabase',
  displayName: 'E2E Category Database',
  notionName: 'E2E Categories',
  properties: [
    {
      id: null,
      name: 'name',
      displayName: 'Name',
      notionName: '名前',
      type: 'title',
    },
    {
      id: null,
      name: 'color',
      displayName: 'Color',
      notionName: '色',
      type: 'select',
      // Options: 赤, 青, 緑, 黄
    },
    {
      id: null,
      name: 'tasks',
      displayName: 'Tasks',
      notionName: 'Related to E2E Test Database (カテゴリー)',
      type: 'relation',
      // Reverse relation to E2E Test Database
    },
  ],
};

/**
 * Expected select options for priority field
 */
export const PRIORITY_OPTIONS = ['低', '中', '高'];

/**
 * Expected multi-select options for tags
 */
export const TAG_OPTIONS = ['重要', '確認待ち', 'バグ', '改善'];

/**
 * Expected select options for color field
 */
export const COLOR_OPTIONS = ['赤', '青', '緑', '黄'];

/**
 * Expected status options (must be configured manually in Notion)
 */
export const STATUS_OPTIONS = {
  'To Do': ['未着手'],
  'In Progress': ['進行中', 'レビュー待ち'],
  Complete: ['完了'],
};
