export async function register() {
  // The former in-process node-cron scheduler lived here. It never ran
  // under the standalone server build, so automation now comes from an
  // external cron hitting /api/cron/sync (see docs/9_Redesign_Status.md).
}
