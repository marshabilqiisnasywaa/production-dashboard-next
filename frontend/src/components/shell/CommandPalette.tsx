"use client";
import { useUiText } from "@/locales/useUiText";
import Icon from "@/components/shell/Icon";
import type { CommandItem } from "@/components/shell/commands";

type CommandPaletteProps = {
  groups: { label: string; items: CommandItem[] }[];
  commands: CommandItem[];
  query: string;
  index: number;
  onQueryChange: (query: string) => void;
  onIndexChange: (index: number) => void;
  onPick: (item: CommandItem) => void;
  onClose: () => void;
};

export default function CommandPalette({
  groups,
  commands,
  query,
  index,
  onQueryChange,
  onIndexChange,
  onPick,
  onClose,
}: CommandPaletteProps) {
  const { text: uiText } = useUiText();
  return (
    <div className="command-overlay" role="presentation" onMouseDown={onClose}>
      <div className="command-dialog" role="dialog" aria-modal="true" aria-label={uiText("Command palette")} onMouseDown={(event) => event.stopPropagation()}>
        <label className="command-input">
          <Icon name="search" size={18} />
          <input autoFocus value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={uiText("Type a command or search...")} />
          <kbd>{uiText("ESC")}</kbd>
        </label>
        <div className="command-results">
          {groups.length ? groups.map((group) => (
            <div className="command-group" key={group.label}>
              <p>{uiText(group.label)}</p>
              {group.items.map((item) => {
                const itemIndex = commands.findIndex((command) => command.label === item.label);
                return <button key={item.label} className={index === itemIndex ? "selected" : ""} onMouseEnter={() => onIndexChange(itemIndex)} onClick={() => onPick(item)}>
                  <Icon name={item.icon} size={17} /><span>{uiText(item.label)}</span>{item.shortcut && <kbd>{item.shortcut}</kbd>}
                </button>;
              })}
            </div>
          )) : <div className="command-empty">{uiText("No results found.")}</div>}
        </div>
        <div className="command-footer"><span><b>↑↓</b>{uiText(" navigate")}</span><span><b>↵</b>{uiText(" select")}</span><span><b>{uiText("esc")}</b>{uiText(" close")}</span></div>
      </div>
    </div>
  );
}
