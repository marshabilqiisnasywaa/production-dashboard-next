import type { DmPapercardSubmission } from "../api";

export const PAPERCARD_CHANGED_EVENT = "dm-papercard:changed";

export function revisionSubmissionsFor(
  submissions: DmPapercardSubmission[],
  dept: string | null | undefined,
  role: string | null | undefined,
): DmPapercardSubmission[] {
  if (role !== "leader" && role !== "member") return [];
  const targetDept = dept?.trim().toUpperCase();
  if (!targetDept) return [];

  return submissions.filter(
    (submission) =>
      submission.approvalStatus === "rejected" &&
      submission.department.trim().toUpperCase() === targetDept,
  );
}
