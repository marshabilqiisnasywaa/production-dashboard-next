"use client";

import { IconCheckCircle } from "@/components/ui/icons";
import { useUiText } from "@/locales/useUiText";
import { dayHeader } from "../utils";
import type { HeatmapNgSummary } from "../utils";
import { ROLE_LABEL } from "../types";

type Props = {
  data: HeatmapNgSummary;
  loading: boolean;
  error: string | null;
};

function SummarySkeleton() {
  return (
    <div className="dmr-ng-summary__columns dmr-ng-summary__columns--loading" aria-hidden="true">
      <div className="dmr-ng-summary__skeleton">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="dmr-ng-summary__skeleton dmr-ng-summary__skeleton--stats">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

export function NgSummary({ data, loading, error }: Props) {
  const { text: uiText } = useUiText();
  const maxRoleCount = data.roles[0]?.papercards ?? 0;
  const topDayHeader = data.topDay ? dayHeader(data.topDay.date) : null;

  return (
    <section className="dmr-ng-summary" aria-labelledby="dmr-ng-summary-title">
      <h3 id="dmr-ng-summary-title">{uiText("Ringkasan NG")}</h3>
      {loading ? (
        <SummarySkeleton />
      ) : error ? (
        <p className="dmr-ng-summary__error" role="alert">{uiText(error)}</p>
      ) : data.papercards === 0 ? (
        <div className="dmr-ng-summary__empty">
          <IconCheckCircle size={18} />
          <span>{uiText("Tidak ada NG pada periode ini")}</span>
        </div>
      ) : (
        <div className="dmr-ng-summary__columns">
          <div className="dmr-ng-summary__roles">
            <h4>{uiText("NG per role")}</h4>
            <ul>
              {data.roles.map((role, index) => {
                const isTopRole = index === 0 && role.papercards > 0;
                const width = maxRoleCount
                  ? `${(role.papercards / maxRoleCount) * 100}%`
                  : "0%";
                return (
                  <li
                    className={`dmr-ng-summary__role${isTopRole ? " is-top" : ""}${role.papercards === 0 ? " is-empty" : ""}`}
                    key={role.role}
                    aria-label={`${uiText(role.label)}: ${role.papercards} ${uiText("papercard NG")}`}
                  >
                    <span className="dmr-ng-summary__role-name">{uiText(role.label)}</span>
                    <span className="dmr-ng-summary__bar" aria-hidden="true">
                      <span style={{ width }} />
                    </span>
                    <span className="dmr-ng-summary__role-count">
                      {role.papercards} {uiText("NG")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="dmr-ng-summary__highlights">
            <h4>{uiText("Sorotan")}</h4>
            <dl>
              <div>
                <dt>{uiText("Total NG")}</dt>
                <dd>
                  <span className="dmr-ng-summary__total">{data.papercards}</span>
                  <small>{uiText("dari")} {data.filledPapercards}</small>
                </dd>
              </div>
              <div>
                <dt>{uiText("Role terbanyak NG")}</dt>
                <dd>
                  <span>{data.topRoles.map((role) => uiText(ROLE_LABEL[role])).join(", ")}</span>
                  <small>{data.topRoleCount} {uiText("papercard NG")}</small>
                </dd>
              </div>
              <div>
                <dt>{uiText("Hari terbanyak NG")}</dt>
                <dd>
                  <span>{topDayHeader ? `${topDayHeader.weekday} ${topDayHeader.day}` : "–"}</span>
                  {data.topDay && (
                    <small>{data.topDay.papercards} {uiText("papercard NG")}</small>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </section>
  );
}
