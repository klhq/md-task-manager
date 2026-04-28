import { fetchFileContent } from '../clients/github.js';
import type { Metadata, TaskData } from '../core/types.js';
import { initTasks } from './initTasks.js';
import { deserializeTaskMarkdown } from './markdownParser.js';

export const queryTasks = async (): Promise<{
  metadata: Metadata;
  taskData: TaskData;
}> => {
  let content: string;
  try {
    content = await fetchFileContent();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Tasks file not found')
    ) {
      content = await initTasks();
    } else {
      throw error;
    }
  }

  return deserializeTaskMarkdown(content);
};
