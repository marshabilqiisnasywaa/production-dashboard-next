"use client";

import "./category-badges.css";

type Props = {
  categories?: string[] | null;
  codes?: string[] | null;
};

export function CategoryCodeBadges({ categories, codes }: Props) {
  const labels = (categories ?? []).filter(Boolean);
  if (labels.length === 0) return <>-</>;

  return (
    <div className="dm-cat-badges">
      {labels.map((label, idx) => {
        const level = Math.min(idx + 1, 3);
        const codeTag = codes?.[idx] ? ` (${codes[idx]})` : "";
        return (
          <span
            key={`${label}-${idx}`}
            className={`dm-cat-badge is-code-${level}`}
            title={`Code ${level}${codeTag}: ${label}`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
