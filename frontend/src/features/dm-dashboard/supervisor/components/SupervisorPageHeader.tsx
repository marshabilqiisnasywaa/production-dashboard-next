
import "../../leader/components/leaderPageHeader.css";

interface SupervisorPageHeaderProps {
  title: string;
  userName: string;
  meta: string;
}

export function SupervisorPageHeader({ title, userName, meta }: SupervisorPageHeaderProps) {
  return (
    <header className="dml-lh">
      <h1 className="dml-lh__title">
        {title}
      </h1>
      <p className="dml-lh__meta">
        <span>{meta}</span>
      </p>
    </header>
  );
}

export default SupervisorPageHeader;
