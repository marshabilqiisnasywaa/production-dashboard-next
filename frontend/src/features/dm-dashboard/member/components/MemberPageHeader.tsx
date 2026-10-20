import "../../leader/components/leaderPageHeader.css"; // same heading style as the Leader dashboard
import type { MemberProfile } from "../memberProfile";

/** Plain heading: who + which line + who approves. */
export function MemberPageHeader({ profile }: { profile: MemberProfile }) {
  return (
    <header className="dml-lh">
      <h1 className="dml-lh__title">
        Dashboard Member <span>— {profile.name}</span>
      </h1>
      <p className="dml-lh__meta">
        <span>
          {profile.lineName} ({profile.lineCode}) · {profile.workshop}
        </span>
        <span>
          Departemen <strong>{profile.roleLabel}</strong>
        </span>
        <span>
          SPV: <strong>{profile.supervisor}</strong>
        </span>
      </p>
    </header>
  );
}
