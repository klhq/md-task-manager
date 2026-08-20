import {
  archivePage,
  createPage,
  fetchAllDatabasePages,
  type NotionDatabasePropertySchema,
  type NotionPageResponse,
  retrieveDatabase,
  updateDatabaseSchema,
  updatePageProperties,
} from '../../clients/notion.js';
import logger from '../../core/logger.js';
import type { Metadata, Priority, Task, TaskData } from '../../core/types.js';
import { validateTask } from '../../utils/validators.js';
import type { IStorageProvider } from './types.js';

export interface NotionProviderParams {
  databaseId: string;
  accessToken: string;
}

export const REQUIRED_NOTION_PROPERTIES: Record<
  string,
  NotionDatabasePropertySchema
> = {
  Completed: { type: 'checkbox', checkbox: {} },
  Date: { type: 'date', date: {} },
  Time: { type: 'rich_text', rich_text: {} },
  Duration: { type: 'rich_text', rich_text: {} },
  Priority: {
    type: 'select',
    select: {
      options: [
        { name: 'low', color: 'blue' },
        { name: 'medium', color: 'yellow' },
        { name: 'high', color: 'orange' },
        { name: 'urgent', color: 'red' },
      ],
    },
  },
  Tags: { type: 'multi_select', multi_select: {} },
  Description: { type: 'rich_text', rich_text: {} },
  Link: { type: 'url', url: {} },
  'Calendar Event ID': { type: 'rich_text', rich_text: {} },
  Log: { type: 'rich_text', rich_text: {} },
  'Recurrence Rule': { type: 'rich_text', rich_text: {} },
};

export const parseNotionPageToTask = (
  page: NotionPageResponse,
): Task | null => {
  const props = page.properties;

  let titleProp = props['Task Name'];
  if (!titleProp) {
    const found = Object.values(props).find((p) => p.type === 'title');
    if (found) titleProp = found;
  }

  const name =
    titleProp?.title
      ?.map((t) => t.plain_text || t.text?.content || '')
      .join('')
      .trim() || '';

  if (!name) {
    return null;
  }

  const completed = Boolean(props.Completed?.checkbox);

  const dateRaw = props.Date?.date?.start;
  const date = dateRaw ? dateRaw.split('T')[0] : undefined;

  const time =
    props.Time?.rich_text
      ?.map((t) => t.plain_text || t.text?.content || '')
      .join('')
      .trim() || undefined;

  const duration =
    props.Duration?.rich_text
      ?.map((t) => t.plain_text || t.text?.content || '')
      .join('')
      .trim() || undefined;

  const priority = (props.Priority?.select?.name as Priority) || undefined;

  const tags =
    props.Tags?.multi_select && props.Tags.multi_select.length > 0
      ? props.Tags.multi_select.map((opt) => opt.name)
      : [];

  const description =
    props.Description?.rich_text
      ?.map((t) => t.plain_text || t.text?.content || '')
      .join('')
      .trim() || undefined;

  const link = props.Link?.url || undefined;

  const calendarEventId =
    props['Calendar Event ID']?.rich_text
      ?.map((t) => t.plain_text || t.text?.content || '')
      .join('')
      .trim() || undefined;

  const log =
    props.Log?.rich_text
      ?.map((t) => t.plain_text || t.text?.content || '')
      .join('')
      .trim() || undefined;

  const recurrenceRule =
    props['Recurrence Rule']?.rich_text
      ?.map((t) => t.plain_text || t.text?.content || '')
      .join('')
      .trim() || undefined;

  return {
    name,
    completed,
    date,
    time,
    duration,
    priority,
    tags,
    description,
    link,
    calendarEventId,
    log,
    recurrenceRule,
  };
};

export interface NotionPagePropertyInput {
  [key: string]: unknown;
  'Task Name'?: { title: { text: { content: string } }[] };
  Completed: { checkbox: boolean };
  Date: { date: { start: string } | null };
  Time: { rich_text: { text: { content: string } }[] };
  Duration: { rich_text: { text: { content: string } }[] };
  Priority: { select: { name: string } | null };
  Tags: { multi_select: { name: string }[] };
  Description: { rich_text: { text: { content: string } }[] };
  Link: { url: string | null };
  'Calendar Event ID': { rich_text: { text: { content: string } }[] };
  Log: { rich_text: { text: { content: string } }[] };
  'Recurrence Rule': { rich_text: { text: { content: string } }[] };
}

export const buildNotionProperties = (
  task: Task,
  titleKey = 'Task Name',
): NotionPagePropertyInput => {
  return {
    [titleKey]: {
      title: [{ text: { content: task.name } }],
    },
    Completed: {
      checkbox: Boolean(task.completed),
    },
    Date: task.date ? { date: { start: task.date } } : { date: null },
    Time: {
      rich_text: task.time ? [{ text: { content: task.time } }] : [],
    },
    Duration: {
      rich_text: task.duration ? [{ text: { content: task.duration } }] : [],
    },
    Priority: task.priority
      ? { select: { name: task.priority } }
      : { select: null },
    Tags: {
      multi_select: (task.tags || [])
        .filter((t) => Boolean(t && t.trim()))
        .map((name) => ({ name: name.trim() })),
    },
    Description: {
      rich_text: task.description
        ? [{ text: { content: task.description } }]
        : [],
    },
    Link: {
      url: task.link || null,
    },
    'Calendar Event ID': {
      rich_text: task.calendarEventId
        ? [{ text: { content: task.calendarEventId } }]
        : [],
    },
    Log: {
      rich_text: task.log ? [{ text: { content: task.log } }] : [],
    },
    'Recurrence Rule': {
      rich_text: task.recurrenceRule
        ? [{ text: { content: task.recurrenceRule } }]
        : [],
    },
  };
};

export class NotionStorageProvider implements IStorageProvider {
  private databaseId: string;
  private accessToken: string;

  constructor(params: NotionProviderParams) {
    this.databaseId = params.databaseId;
    this.accessToken = params.accessToken;
  }

  async queryTasks(): Promise<{
    metadata: Metadata;
    taskData: TaskData;
  }> {
    try {
      const pages = await fetchAllDatabasePages(
        this.databaseId,
        this.accessToken,
      );

      const activePages = pages.filter((p) => !p.archived);
      const allTasks: Task[] = [];

      for (const page of activePages) {
        const task = parseNotionPageToTask(page);
        if (task) {
          allTasks.push(task);
        }
      }

      allTasks.forEach((task, index) => {
        const result = validateTask(task);
        if (!result.valid) {
          logger.warnWithContext({
            op: 'VALIDATE_TASKS_NOTION',
            message: `Task at index ${index} ("${task.name}") has validation warnings: ${result.errors.join(', ')}`,
          });
        }
      });

      const completed = allTasks.filter((t) => t.completed);
      const uncompleted = allTasks.filter((t) => !t.completed);

      const activeTags = new Set<string>();
      for (const task of uncompleted) {
        if (task.tags) {
          for (const tag of task.tags) {
            activeTags.add(tag);
          }
        }
      }

      const metadata: Metadata = {
        timezone: process.env.TIMEZONE || 'UTC',
        tags: Array.from(activeTags).sort(),
        last_synced: new Date().toISOString(),
      };

      return {
        metadata,
        taskData: {
          completed,
          uncompleted,
        },
      };
    } catch (error) {
      logger.errorWithContext({
        op: 'NOTION_QUERY_TASKS',
        error,
      });
      throw new Error(
        `Failed to retrieve tasks from Notion: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async saveTasks(tasks: TaskData, metadata: Metadata): Promise<boolean> {
    try {
      const invalidTasks = tasks.uncompleted
        .map((task, index) => ({ index, result: validateTask(task) }))
        .filter(({ result }) => !result.valid);

      if (invalidTasks.length > 0) {
        invalidTasks.forEach(({ index, result }) => {
          logger.errorWithContext({
            op: 'VALIDATE_TASKS_NOTION',
            message: `Task at index ${index} is invalid: ${result.errors.join(', ')}`,
          });
        });
        throw new Error(
          `Cannot save tasks: ${invalidTasks.length} tasks are invalid. Check logs for details.`,
        );
      }

      if (!metadata.timezone) {
        throw new Error('User timezone is not set in metadata.');
      }

      // 1. Fetch database schema to detect title property key and ensure schema exists
      const db = await retrieveDatabase(this.databaseId, this.accessToken);
      const existingProps = db.properties || {};

      const titleEntry = Object.entries(existingProps).find(
        ([, schema]) => schema.type === 'title',
      );
      const titleKey = titleEntry ? titleEntry[0] : 'Task Name';

      const missingProps: Record<string, NotionDatabasePropertySchema> = {};
      for (const [key, schema] of Object.entries(REQUIRED_NOTION_PROPERTIES)) {
        if (!existingProps[key]) {
          missingProps[key] = schema;
        }
      }

      if (Object.keys(missingProps).length > 0) {
        await updateDatabaseSchema(
          this.databaseId,
          missingProps,
          this.accessToken,
        );
        logger.infoWithContext({
          op: 'NOTION_SAVE_AUTO_SCHEMA',
          message: `Auto-provisioned ${Object.keys(missingProps).length} missing properties to Notion database`,
        });
      }

      // 2. Fetch remote active pages to sync minimal updates
      const remotePages = await fetchAllDatabasePages(
        this.databaseId,
        this.accessToken,
      );
      const remotePageMap = new Map<string, NotionPageResponse>();

      for (const page of remotePages) {
        if (page.archived) continue;
        const task = parseNotionPageToTask(page);
        if (task) {
          remotePageMap.set(task.name, page);
        }
      }

      const allTasks = [...tasks.uncompleted, ...tasks.completed];

      for (const task of allTasks) {
        const existingPage = remotePageMap.get(task.name);
        const properties = buildNotionProperties(task, titleKey);

        if (existingPage) {
          await updatePageProperties(
            existingPage.id,
            properties,
            this.accessToken,
          );
          remotePageMap.delete(task.name);
        } else {
          await createPage(
            {
              databaseId: this.databaseId,
              properties,
            },
            this.accessToken,
          );
        }
      }

      // Archive pages that are no longer in the task list
      for (const [_, removedPage] of remotePageMap) {
        await archivePage(removedPage.id, this.accessToken);
      }

      logger.infoWithContext({
        op: 'NOTION_SAVE_TASKS',
        message: `Saved ${allTasks.length} tasks to Notion`,
      });

      return true;
    } catch (error) {
      logger.errorWithContext({
        op: 'NOTION_SAVE_TASKS',
        error,
      });
      throw new Error(
        `Failed to save tasks to Notion: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async initTasks(): Promise<void> {
    try {
      const db = await retrieveDatabase(this.databaseId, this.accessToken);

      const existingProps = db.properties || {};
      const missingProps: Record<string, NotionDatabasePropertySchema> = {};

      for (const [key, schema] of Object.entries(REQUIRED_NOTION_PROPERTIES)) {
        if (!existingProps[key]) {
          missingProps[key] = schema;
        }
      }

      if (Object.keys(missingProps).length > 0) {
        await updateDatabaseSchema(
          this.databaseId,
          missingProps,
          this.accessToken,
        );
        logger.infoWithContext({
          op: 'NOTION_INIT_SCHEMA',
          message: `Added ${Object.keys(missingProps).length} missing properties to Notion database`,
        });
      }

      logger.infoWithContext({
        op: 'NOTION_INIT_TASKS',
        message: 'Initialized Notion database schema',
      });
    } catch (error) {
      logger.errorWithContext({
        op: 'NOTION_INIT_TASKS',
        error,
      });
      throw new Error(
        `Failed to initialize Notion storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
