import { Clock, Handshake, Image as ImageIcon, Layers, ListChecks, Target, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BoardIconKey } from "./mechanismBoard";

export const BOARD_ICONS: Record<BoardIconKey, LucideIcon> = {
  layers: Layers,
  handshake: Handshake,
  clock: Clock,
  users: Users,
  target: Target,
  list: ListChecks,
  image: ImageIcon,
};

export const BOARD_ICON_LABELS: Record<BoardIconKey, string> = {
  layers: "Level",
  handshake: "Koordinasi",
  clock: "Jam",
  users: "Peserta",
  target: "Target",
  list: "Daftar",
  image: "Foto",
};
