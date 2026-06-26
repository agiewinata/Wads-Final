// Strict-majority completion logic for shared workspace tasks.
// A task is "done" once more than half of its assignees have marked it done.
// With no assignees, a single check completes it.

export function majorityThreshold(assigneeCount: number): number {
  // floor(n/2)+1 == strict majority ("more than half"):
  //   1 -> 1, 2 -> 2, 3 -> 2, 4 -> 3, 5 -> 3 ...  (0 -> 1)
  return Math.floor(assigneeCount / 2) + 1;
}

export function isTaskDone(effectiveVotes: number, assigneeCount: number): boolean {
  return effectiveVotes >= majorityThreshold(assigneeCount);
}

// Count only votes that come from people actually assigned to the task.
// If a task has no assignees, every vote counts.
export function effectiveVoteCount(
  completionUserIds: string[],
  assigneeUserIds: string[],
): number {
  if (assigneeUserIds.length === 0) return completionUserIds.length;
  const set = new Set(assigneeUserIds);
  return completionUserIds.filter((id) => set.has(id)).length;
}