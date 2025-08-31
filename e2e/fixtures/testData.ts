/**
 * Test data for E2E tests
 * Total: 15 records (3 for CRUD, 12 for filters/pagination)
 */

export interface TestRecord {
  title: string;
  description?: string;
  priority?: '低' | '中' | '高';
  tags?: string[];
  assignee?: string[]; // Array of user IDs
  progress?: number;
  dueDate?: string;
  completed: boolean;
}

/**
 * Records used for CRUD operations tests
 */
export const CRUD_TEST_RECORDS: {
  create: TestRecord;
  update: TestRecord;
  delete: TestRecord;
} = {
  create: {
    title: 'New Task Created',
    description: 'This task will be created during testing',
    priority: '高',
    tags: ['重要', 'バグ'],
    progress: 0,
    dueDate: '2024-12-31T00:00:00.000Z',
    completed: false,
  },
  update: {
    title: 'Task for Update',
    description: 'This task will be updated during testing',
    priority: '中',
    tags: ['確認待ち'],
    progress: 50,
    dueDate: '2024-06-30T00:00:00.000Z',
    completed: false,
  },
  delete: {
    title: 'Task for Delete',
    description: 'This task will be archived during testing',
    priority: '低',
    tags: ['改善'],
    progress: 100,
    dueDate: '2024-01-01T00:00:00.000Z',
    completed: true,
  },
};

/**
 * Shared records for filter and pagination tests
 * These records are designed to test various filter combinations
 */
export const SHARED_TEST_RECORDS: TestRecord[] = [
  // High priority completed tasks
  {
    title: 'タスク01',
    description: '高優先度・完了済み・進捗100%',
    priority: '高',
    tags: ['重要'],
    progress: 100,
    dueDate: '2024-01-01T00:00:00.000Z',
    completed: true,
  },
  {
    title: 'タスク02',
    description: '高優先度・完了済み・進捗75%',
    priority: '高',
    tags: ['重要', '確認待ち'],
    progress: 75,
    dueDate: '2024-01-15',
    completed: true,
  },
  // High priority incomplete task
  {
    title: 'タスク03',
    description: '高優先度・未完了・進捗50%',
    priority: '高',
    tags: ['バグ'],
    progress: 50,
    dueDate: '2024-02-01',
    completed: false,
  },
  // Medium priority with various states
  {
    title: 'タスク04',
    description: '中優先度・完了済み・進捗90%',
    priority: '中',
    tags: ['改善'],
    progress: 90,
    dueDate: '2024-02-15',
    completed: true,
  },
  {
    title: 'タスク05',
    description: '中優先度・未完了・進捗60%',
    priority: '中',
    tags: ['確認待ち', '改善'],
    progress: 60,
    dueDate: '2024-03-01',
    completed: false,
  },
  {
    title: 'タスク06',
    description: '中優先度・未完了・進捗30%',
    priority: '中',
    tags: [],
    progress: 30,
    dueDate: '2024-03-15',
    completed: false,
  },
  {
    title: 'タスク07',
    description: '中優先度・未完了・進捗0%・期限なし',
    priority: '中',
    tags: ['改善'],
    progress: 0,
    completed: false,
    // No dueDate
  },
  // Low priority tasks
  {
    title: 'タスク08',
    description: '低優先度・完了済み・進捗100%',
    priority: '低',
    tags: [],
    progress: 100,
    dueDate: '2024-04-01',
    completed: true,
  },
  {
    title: 'タスク09',
    description: '低優先度・未完了・進捗40%',
    priority: '低',
    tags: ['確認待ち'],
    progress: 40,
    dueDate: '2024-04-15',
    completed: false,
  },
  {
    title: 'タスク10',
    description: '低優先度・未完了・進捗20%',
    priority: '低',
    tags: ['改善', 'バグ'],
    progress: 20,
    dueDate: '2024-05-01',
    completed: false,
  },
  // Tasks with null values for testing edge cases
  {
    title: 'タスク11',
    description: '優先度なし・未完了・進捗10%',
    progress: 10,
    dueDate: '2024-05-15',
    completed: false,
    // No priority, no tags
  },
  {
    title: 'タスク12',
    description: '最小データ・未完了',
    completed: false,
    // No priority, status, tags, progress, or dueDate
  },
];

/**
 * Get all test records
 */
export function getAllTestRecords(): TestRecord[] {
  return [
    CRUD_TEST_RECORDS.update,
    CRUD_TEST_RECORDS.delete,
    ...SHARED_TEST_RECORDS,
  ];
}

/**
 * Expected filter results for validation
 */
export const EXPECTED_FILTER_RESULTS = {
  highPriority: 3, // タスク01, 02, 03
  completed: 5, // タスク01, 02, 04, 08, delete record
  incompleteWithDueDate: 7, // タスク03, 05, 06, 09, 10, 11, update record
  progressAbove50: 6, // タスク01, 02, 04, 05, 08, delete record
  nullPriority: 2, // タスク11, 12
};