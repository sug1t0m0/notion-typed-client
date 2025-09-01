import type { DatabaseConfig, PropertyConfig } from '../../src/types';

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
 * Property configuration for creating category database
 */
export const CATEGORY_DATABASE_PROPERTIES: any = {
  名前: {
    title: {},
  },
  色: {
    select: {
      options: [
        { name: '赤', color: 'red' },
        { name: '青', color: 'blue' },
        { name: '緑', color: 'green' },
        { name: '黄', color: 'yellow' },
      ],
    },
  },
};

/**
 * Property configuration for creating test database
 * Note: Relation property will be added after category database is created
 */
export const TEST_DATABASE_PROPERTIES_BASE: any = {
  タイトル: {
    title: {},
  },
  説明: {
    rich_text: {},
  },
  優先度: {
    select: {
      options: [
        { name: '低', color: 'gray' },
        { name: '中', color: 'yellow' },
        { name: '高', color: 'red' },
      ],
    },
  },
  タグ: {
    multi_select: {
      options: [
        { name: '重要', color: 'red' },
        { name: '確認待ち', color: 'yellow' },
        { name: 'バグ', color: 'orange' },
        { name: '改善', color: 'blue' },
      ],
    },
  },
  担当者: {
    people: {},
  },
  進捗率: {
    number: {
      format: 'percent',
    },
  },
  期限: {
    date: {},
  },
  完了: {
    checkbox: {},
  },
};