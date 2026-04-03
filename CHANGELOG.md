# Changelog

## 1.7.1 (2026-04-03)


### Bug Fixes

* replace broken @hono/node-server/vercel adapter with manual bridge ([fa90638](https://github.com/lazyskyline7/md-task-manager/commit/fa90638))


### Performance Improvements

* lazy import heavy dependencies to reduce cold start ([680be6d](https://github.com/lazyskyline7/md-task-manager/commit/680be6d))


## 1.7.0 (2026-04-02)


### Features

* make AI provider agnostic with Vercel AI SDK ([7002836](https://github.com/lazyskyline7/md-task-manager/commit/7002836))
* prompt for task description when /add has no argument ([7bd8b79](https://github.com/lazyskyline7/md-task-manager/commit/7bd8b79))
* add inline keyboard timezone picker ([a975a47](https://github.com/lazyskyline7/md-task-manager/commit/a975a47))
* add inline keyboard task picker for complete, remove, and edit ([7c55f10](https://github.com/lazyskyline7/md-task-manager/commit/7c55f10))


### Refactors

* migrate from pnpm + Node.js to Bun ([8f85f46](https://github.com/lazyskyline7/md-task-manager/commit/8f85f46))
* migrate from telegraf to grammy ([8975c67](https://github.com/lazyskyline7/md-task-manager/commit/8975c67))
* migrate Express to Hono ([4dfcaec](https://github.com/lazyskyline7/md-task-manager/commit/4dfcaec))
* extract shared utilities and clean up dead code ([2fee2ba](https://github.com/lazyskyline7/md-task-manager/commit/2fee2ba))
