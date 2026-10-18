import { IconCheckCircle } from "@/components/ui/icons";

interface MemberHeroBannerProps {
  name: string;
  deptLabel: string;
  dept: string;
  lineName: string;
  lineCode: string;
  workshopName: string;
  supervisorName: string;
}

export function MemberHeroBanner({
  name,
  deptLabel,
  dept,
  lineName,
  lineCode,
  workshopName,
  supervisorName,
}: MemberHeroBannerProps) {
  return (
    <section className="member-hero">
      <div>
        <div
          className="member-hero__badges"
          style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}
        >
          <span
            className="member-hero__badge"
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#0f766e",
              background: "#f0fdfa",
              padding: "2px 8px",
              borderRadius: "6px",
              border: "1px solid #ccfbf1",
            }}
          >
            {deptLabel} ({dept})
          </span>
          <span className="member-hero__location" style={{ fontSize: "12.5px", color: "#64748b" }}>
            📍 <strong>{lineName}</strong> ({lineCode}) · {workshopName}
          </span>
          <span
            className="member-hero__spv"
            style={{
              fontSize: "11.5px",
              background: "#eef2ff",
              color: "#4338ca",
              padding: "2px 8px",
              borderRadius: "6px",
              border: "1px solid #e0e7ff",
            }}
          >
            Supervisor: <strong>{supervisorName}</strong>
          </span>
        </div>

        <h1 className="member-hero__title" style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
          Hallo, {name}
        </h1>
      </div>

      {/* Right Info: Presensi Status */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          className="member-hero__presensi"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "8px",
            fontSize: "12.5px",
            color: "#047857",
            fontWeight: 600,
          }}
        >
          <IconCheckCircle size={15} />
          <span>Presensi DM: Hadir (Shift 1)</span>
        </div>
      </div>
    </section>
  );
}
