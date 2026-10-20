import "./leaderPageHeader.css";

interface Props {
  userName: string;
  lineName: string;
  lineCode: string;
  workshopName: string;
  supervisorName: string;
}

/** Plain page heading (no card): who + which line + who approves. */
export function LeaderPageHeader({ userName, lineName, lineCode, workshopName, supervisorName }: Props) {
  return (
    <header className="dml-lh">
      <h1 className="dml-lh__title">
        Dashboard Leader <span>— {userName}</span>
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
