
import "./leaderPageHeader.css";

interface Props {
  lineName: string;
  lineCode: string;
  workshopName: string;
  supervisorName: string;
}

/** Plain page heading: line information + supervisor. */
export function LeaderPageHeader({
  lineName,
  lineCode,
  workshopName,
  supervisorName,
}: Props) {
  return (
    <header className="dml-lh">
      <h1 className="dml-lh__title">
        Dashboard Leader
      </h1>
      <p className="dml-lh__meta">
        <span>
          {lineName} ({lineCode}) · {workshopName}
        </span>
        <span>
          SPV: <strong>{supervisorName}</strong>
        </span>
      </p>
    </header>
  );
}
