import { describe, expect, it } from 'bun:test';
import type { NotionPageResponse } from '../../clients/notion.js';
import { Priority, type Task } from '../../core/types.js';
import {
  buildNotionProperties,
  parseNotionPageToTask,
} from './NotionStorageProvider.js';

describe('NotionStorageProvider helpers (OSS)', () => {
  it('parses Notion page properties to Task', () => {
    const page: NotionPageResponse = {
      id: 'page-1',
      archived: false,
      properties: {
        'Task Name': {
          id: 'title-id',
          type: 'title',
          title: [{ type: 'text', text: { content: 'Buy groceries' } }],
        },
        Completed: {
          id: 'checkbox-id',
          type: 'checkbox',
          checkbox: false,
        },
        Date: {
          id: 'date-id',
          type: 'date',
          date: { start: '2026-08-25' },
        },
        Priority: {
          id: 'prio-id',
          type: 'select',
          select: { name: 'high' },
        },
        Tags: {
          id: 'tags-id',
          type: 'multi_select',
          multi_select: [{ name: 'shopping' }],
        },
      },
    };

    const task = parseNotionPageToTask(page);
    expect(task).toEqual({
      name: 'Buy groceries',
      completed: false,
      date: '2026-08-25',
      time: undefined,
      duration: undefined,
      priority: Priority.HIGH,
      tags: ['shopping'],
      description: undefined,
      link: undefined,
      calendarEventId: undefined,
      log: undefined,
      recurrenceRule: undefined,
    });
  });

  it('buildNotionProperties converts Task to Notion API properties', () => {
    const task: Task = {
      name: 'Call dentist',
      completed: true,
      date: '2026-08-30',
      time: '14:00',
      duration: '1h',
      priority: Priority.URGENT,
      tags: ['health'],
    };

    const props = buildNotionProperties(task);
    expect(props['Task Name']?.title[0].text.content).toBe('Call dentist');
    expect(props.Completed.checkbox).toBe(true);
    expect(props.Date.date?.start).toBe('2026-08-30');
    expect(props.Time.rich_text[0].text.content).toBe('14:00');
    expect(props.Priority.select?.name).toBe('urgent');
    expect(props.Tags.multi_select).toEqual([{ name: 'health' }]);
  });
});
