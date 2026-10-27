"use client";

import { useEffect, useMemo, useState } from "react";
import { meetingApi, papercardApi, type DmMeetingSession, type DmPapercardSubmission, type DmPapercardTemplate } from "../../api";
import { localDate } from "../../leader/meeting/utils";
import { useMember } from "../MemberProvider";

/** Today's data for the logged-in member: THEIR papercard and today's meeting sessions. Nobody else's. */
export function useMemberToday() {
  const { me, profile, loading: meLoading } = useMember();
  const [submissions, setSubmissions] = useState<DmPapercardSubmission[]>([]);
  const [sessions, setSessions] = useState<DmMeetingSession[]>([]);
  const [templates, setTemplates] = useState<DmPapercardTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => localDate(new Date()), []);

  useEffect(() => {
    if (meLoading) return;
    let alive = true;
    const lineId = me?.line?.id || 1;

    Promise.all([
      papercardApi.listSubmissions({ lineId, date: today }).catch(() => []),
      meetingApi.listSessions(lineId, today).catch(() => []),
      me?.dept
        ? papercardApi.listTemplates({ lineId, department: me.dept.toUpperCase() }).catch(() => [])
        : Promise.resolve([]),
    ]).then(([subs, sess, templates]) => {
      if (!alive) return;
      setSubmissions(subs);
      setSessions(sess);
      setTemplates(templates);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [meLoading, me, today]);

  /**
   * The member's own papercard. Matched by name when the submission has one,
   * otherwise by department (PRD Q-04: one line may have several PEs, so name is preferred).
   * TODO: match by user id once the API returns it.
   */
  const mySubmission = useMemo(
    () =>
      submissions.find((s) =>
        s.employeeName
          ? s.employeeName.toLowerCase() === profile.name.toLowerCase()
          : String(s.department).toUpperCase() === profile.dept,
      ) ?? null,
    [submissions, profile],
  );

  return {
  today,
  myTemplate: templates.find((template) => template.id === mySubmission?.templateId) ?? templates[0] ?? null,
  mySubmission,
  sessions,
  loading: meLoading || loading,
  lineId: me?.line?.id ?? null,
  department: me?.dept?.toUpperCase() ?? null,
};
}
