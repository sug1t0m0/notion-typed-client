export const mockDatabaseSchema = {
  id: 'mock-db-id-123',
  title: [
    {
      type: 'text',
      text: { content: 'Test Database' },
    },
  ],
  properties: {
    Title: {
      id: 'title-prop-id',
      name: 'Title',
      type: 'title',
      title: {},
    },
    Status: {
      id: 'status-prop-id',
      name: 'Status',
      type: 'status',
      status: {
        options: [
          { id: 'status-1', name: 'Not Started', color: 'gray' },
          { id: 'status-2', name: 'In Progress', color: 'blue' },
          { id: 'status-3', name: 'Done', color: 'green' },
        ],
        groups: [],
      },
    },
    Priority: {
      id: 'priority-prop-id',
      name: 'Priority',
      type: 'select',
      select: {
        options: [
          { id: 'priority-1', name: 'Low', color: 'gray' },
          { id: 'priority-2', name: 'Medium', color: 'yellow' },
          { id: 'priority-3', name: 'High', color: 'red' },
        ],
      },
    },
    Tags: {
      id: 'tags-prop-id',
      name: 'Tags',
      type: 'multi_select',
      multi_select: {
        options: [
          { id: 'tag-1', name: 'bug', color: 'red' },
          { id: 'tag-2', name: 'feature', color: 'blue' },
          { id: 'tag-3', name: 'improvement', color: 'green' },
        ],
      },
    },
    'Due Date': {
      id: 'date-prop-id',
      name: 'Due Date',
      type: 'date',
      date: {},
    },
    Assignee: {
      id: 'people-prop-id',
      name: 'Assignee',
      type: 'people',
      people: {},
    },
    Completed: {
      id: 'checkbox-prop-id',
      name: 'Completed',
      type: 'checkbox',
      checkbox: {},
    },
    Description: {
      id: 'text-prop-id',
      name: 'Description',
      type: 'rich_text',
      rich_text: {},
    },
    Estimate: {
      id: 'number-prop-id',
      name: 'Estimate',
      type: 'number',
      number: {
        format: 'number',
      },
    },
  },
};

export const mockPageResponse = {
  id: 'page-id-123',
  object: 'page',
  created_time: '2024-01-01T00:00:00.000Z',
  last_edited_time: '2024-01-02T00:00:00.000Z',
  created_by: {
    id: 'user-id-1',
    object: 'user',
  },
  last_edited_by: {
    id: 'user-id-1',
    object: 'user',
  },
  parent: {
    type: 'database_id',
    database_id: 'mock-db-id-123',
  },
  archived: false,
  properties: {
    Title: {
      type: 'title',
      title: [
        {
          type: 'text',
          text: { content: 'Test Task' },
        },
      ],
    },
    Status: {
      type: 'status',
      status: {
        id: 'status-2',
        name: 'In Progress',
        color: 'blue',
      },
    },
    Priority: {
      type: 'select',
      select: {
        id: 'priority-3',
        name: 'High',
        color: 'red',
      },
    },
    Tags: {
      type: 'multi_select',
      multi_select: [
        { id: 'tag-1', name: 'bug', color: 'red' },
        { id: 'tag-2', name: 'feature', color: 'blue' },
      ],
    },
    'Due Date': {
      type: 'date',
      date: {
        start: '2024-01-15',
        end: null,
      },
    },
    Assignee: {
      type: 'people',
      people: [{ id: 'user-id-1', object: 'user' }],
    },
    Completed: {
      type: 'checkbox',
      checkbox: false,
    },
    Description: {
      type: 'rich_text',
      rich_text: [
        {
          type: 'text',
          text: { content: 'This is a test task description' },
        },
      ],
    },
    Estimate: {
      type: 'number',
      number: 5,
    },
  },
};

export const mockQueryResponse = {
  object: 'list',
  results: [mockPageResponse],
  has_more: false,
  next_cursor: null,
  type: 'page',
  page: {},
};

export const mockDatabaseConfig = {
  id: null,
  name: 'TaskDatabase',
  displayName: 'タスクデータベース',
  notionName: 'Test Database',
  properties: [
    {
      id: null,
      name: 'title',
      displayName: 'タイトル',
      notionName: 'Title',
      type: 'title' as const,
    },
    {
      id: null,
      name: 'status',
      displayName: 'ステータス',
      notionName: 'Status',
      type: 'status' as const,
    },
    {
      id: null,
      name: 'priority',
      displayName: '優先度',
      notionName: 'Priority',
      type: 'select' as const,
    },
    {
      id: null,
      name: 'tags',
      displayName: 'タグ',
      notionName: 'Tags',
      type: 'multi_select' as const,
    },
    {
      id: null,
      name: 'dueDate',
      displayName: '期限',
      notionName: 'Due Date',
      type: 'date' as const,
    },
    {
      id: null,
      name: 'assignee',
      displayName: '担当者',
      notionName: 'Assignee',
      type: 'people' as const,
    },
    {
      id: null,
      name: 'completed',
      displayName: '完了',
      notionName: 'Completed',
      type: 'checkbox' as const,
    },
    {
      id: null,
      name: 'description',
      displayName: '説明',
      notionName: 'Description',
      type: 'rich_text' as const,
    },
    {
      id: null,
      name: 'estimate',
      displayName: '見積もり',
      notionName: 'Estimate',
      type: 'number' as const,
    },
  ],
};
