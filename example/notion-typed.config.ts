import { NotionTypedConfig } from '@sug1t0m0/notion-typed-client';

const config: NotionTypedConfig = {
    databases: [
        {
            id: '22add72d0571805fbf1cd6ac883716c0', // Your database ID
            name: 'PlansDatabase', // TypeScript type name
            displayName: 'プランデータベース', // Display name for logs
            notionName: 'Plans', // Actual name in Notion
            properties: [
                {
                    id: 'title',
                    name: 'name',
                    displayName: '名前',
                    notionName: '名前',
                    type: 'title',
                },
                {
                    id: 'pBou',
                    name: 'multiSelect',
                    displayName: 'マルチセレクト',
                    notionName: 'マルチセレクト',
                    type: 'multi_select',
                    // Options: あ, い, う will be fetched automatically
                },
                {
                    id: 'URgE',
                    name: 'id',
                    displayName: 'ID',
                    notionName: 'ID',
                    type: 'unique_id', // unique_idと判明
                },
                {
                    id: 'R%3Dms',
                    name: 'task',
                    displayName: '✅ Task',
                    notionName: '✅ Task',
                    type: 'relation', // relationと判明
                },
                {
                    id: '%3BnID',
                    name: 'startDate',
                    displayName: '開始日時',
                    notionName: '開始日時',
                    type: 'date',
                },
                {
                    id: '%3Ad%3F%5E',
                    name: 'endDate',
                    displayName: '終了日時',
                    notionName: '終了日時',
                    type: 'date',
                },
                {
                    id: null,
                    name: 'hogeStatus',
                    displayName: 'hogeステータス',
                    notionName: 'hogeステータス',
                    type: null,
                },
            ],
        },
        // Add more databases here
    ],
    output: {
        path: './notion-typed-codegen',
        clientName: 'client',
    },
};

export default config;