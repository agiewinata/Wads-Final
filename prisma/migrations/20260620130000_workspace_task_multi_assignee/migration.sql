-- Drop old single-assignee FK and column
ALTER TABLE "WorkspaceTask" DROP CONSTRAINT IF EXISTS "WorkspaceTask_assignedTo_fkey";
ALTER TABLE "WorkspaceTask" DROP COLUMN IF EXISTS "assignedTo";

-- Create many-to-many join table
CREATE TABLE "WorkspaceTaskAssignee" (
  "taskId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "WorkspaceTaskAssignee_pkey" PRIMARY KEY ("taskId", "userId"),
  CONSTRAINT "WorkspaceTaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "WorkspaceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorkspaceTaskAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
