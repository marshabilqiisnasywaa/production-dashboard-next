import Icon from "@/components/shell/Icon";
import type { CommandItem } from "@/components/shell/commands";

type CommandPaletteProps = {
  groups: { label: string; items: CommandItem[] }[];
  commands: CommandItem[];
  query: string;
  index: number;
  onQueryChange: (query: string) => void;
  onIndexChange: (index: number) => void;
  onPick: (label: string) => void;
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
  return (
    <div className="command-overlay" role="presentation" onMouseDown={onClose}>
      <div className="command-dialog" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()}>
        <label className="command-input">
          <Icon name="search" size={18} />
          <input autoFocus value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Type a command or search..." />
          <kbd>ESC</kbd>
        </label>
        <div className="command-results">
          {groups.length ? groups.map((group) => (
            <div className="command-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const itemIndex = commands.findIndex((command) => command.label === item.label);
                return <button key={item.label} className={index === itemIndex ? "selected" : ""} onMouseEnter={() => onIndexChange(itemIndex)} onClick={() => onPick(item.label)}>
                  <Icon name={item.icon} size={17} /><span>{item.label}</span>{item.shortcut && <kbd>{item.shortcut}</kbd>}
                </button>;
              })}
            </div>
          )) : <div className="command-empty">No results found.</div>}
        </div>
        <div className="command-footer"><span><b>↑↓</b> navigate</span><span><b>↵</b> select</span><span><b>esc</b> close</span></div>
      </div>
    </div>
  );
}
