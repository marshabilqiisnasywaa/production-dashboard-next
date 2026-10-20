
import "../../leader/components/leaderPageHeader.css";
import type { MemberProfile } from "../memberProfile";

/** Plain heading: line information + department + supervisor. */
export function MemberPageHeader({ profile }: { profile: MemberProfile }) {
  return (
    <header className="dml-lh">
      <h1 className="dml-lh__title">
        Dashboard Member
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
