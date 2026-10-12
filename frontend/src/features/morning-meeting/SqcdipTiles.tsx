import type { KategoriSQCDIP } from "@/features/morning-meeting/hostMeetingData";

export type TileInfo = {
  kategori: KategoriSQCDIP;
  nama: string;
  capai: number;
  total: number;
  terbuka: number;
  state: "good" | "warning" | "bad";
};

type SqcdipTilesProps = {
  tiles: TileInfo[];
  dipilih: KategoriSQCDIP;
  onPilih: (kategori: KategoriSQCDIP) => void;
};

export default function SqcdipTiles({ tiles, dipilih, onPilih }: SqcdipTilesProps) {
  return <div className="sq-tiles">{tiles.map((item) => <button type="button" key={item.kategori} className={`${item.state}${dipilih === item.kategori ? " active" : ""}`} onClick={() => onPilih(item.kategori)}><strong>{item.kategori}</strong><div><h2>{item.nama}</h2><p>{item.capai}/{item.total} capai target</p></div><span className={`sq-big-dot ${item.state}`} /><em>{item.terbuka} terbuka</em></button>)}</div>;
}
