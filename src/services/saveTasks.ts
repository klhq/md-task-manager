import { saveFileContent } from '../clients/github.js';
import logger from '../core/logger.js';
import type { Metadata, TaskData } from '../core/types.js';
import { validateTask } from '../utils/validators.js';
import { serializeTaskMarkdown } from './markdownParser.js';

export const saveTasks = async (
  tasks: TaskData,
  metadata: Metadata,
): Promise<boolean> => {
  // Validate all tasks before saving
  const invalidTasks = tasks.uncompleted
    .map((task, index) => ({ index, result: validateTask(task) }))
    .filter(({ result }) => !result.valid);

  if (invalidTasks.length > 0) {
    invalidTasks.forEach(({ index, result }) => {
      logger.errorWithContext({
        message: `Task at index ${index} is invalid: ${result.errors.join(', ')}`,
      });
    });
    throw new Error(
      `Cannot save tasks: ${invalidTasks.length} tasks are invalid. Check logs for details.`,
    );
  }

  // Ensure timezone is set
  if (!metadata.timezone) {
    throw new Error('User timezone is not set in metadata.');
  }

  // Update metadata tags from tasks
  const activeTags = new Set<string>([]);
  for (const task of tasks.uncompleted) {
    if (task.tags) {
      for (const tag of task.tags) {
        activeTags.add(tag);
      }
    }
  }
  metadata.tags = Array.from(activeTags).sort();

  // Update last_synced timestamp
  const now = new Date();
  metadata.last_synced = now.toISOString();
  // Serialize tasks to markdown
  const content = serializeTaskMarkdown(tasks, metadata);

  // Save to GitHub
  const commitMessage = `[bot] update - ${now.toISOString()}`;
  const success = await saveFileContent(content, commitMessage);
  return success;
};
