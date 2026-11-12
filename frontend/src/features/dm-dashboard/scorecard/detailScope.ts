import type { ScorecardLine } from "./useScorecardData";

export function dmDetailLines(details: ScorecardLine[], entries: ScorecardLine[]): ScorecardLine[] {
  const ownerDm = new Map(entries.map((entry) => [entry.key, entry.info.dmName]));
  const dmOf = (entry: ScorecardLine) =>
    (entry.archiveKey ? ownerDm.get(entry.archiveKey) : undefined) ?? entry.info.dmName;
  const dmsWithLeaderRows = new Set(
    details
      .filter((entry) => entry.scope !== "dm" && (entry.papercard.length > 0 || entry.standup.length > 0))
      .map(dmOf)
  );
  return details.filter((entry) => !(entry.scope === "dm" && dmsWithLeaderRows.has(dmOf(entry))));
}
