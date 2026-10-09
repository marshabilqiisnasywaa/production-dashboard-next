export type DmLineStatus = "running" | "idle" | "stopped";

export type DmMember = {
  name: string | null;
  employeeId: string | null;
  dept?: string | null;
  position: string | null;
  supervisor?: string | null;
  workPhone?: string | null;
  photoUrl?: string | null;
};

export type DmBoard = {
  lineCode: string;
  model: string;
  status: DmLineStatus;
  lineName: string;
  slogan: string;
  lineLabel: string;
  lineLabelZh: string;
  workshopLabel: string;
  values: readonly string[];
  teamPhotoUrl: string | null;
  members: readonly DmMember[];
  mpv: DmMember | null;
};

export const defaultDmBoard: DmBoard = {
  lineCode: "TAC20601",
  model: "LATTE-M",
  status: "running",
  lineName: "EXCELLENCE",
  slogan: "SATU TIM SATU TUJUAN",
  lineLabel: "DM TRIANGLE LINE",
  lineLabelZh: "DM 三角线",
  workshopLabel: "DM TRIANGLE WORKSHOP 5",
  values: ["Benfen", "Orientasi Pengguna", "Mengejar Keunggulan", "Keterbukaan"],
  teamPhotoUrl: "/assets/dm/team-photo.png",
  members: [
    {
      name: "ALIF MAULANA",
      employeeId: "I000126",
      dept: "Produksi",
      position: "Leader",
      supervisor: "Mochamad Noor Arief",
      workPhone: "081905143940",
      photoUrl: "/assets/dm/alif-maulana.png",
    },
    {
      name: "MAULANA I. ARIF",
      employeeId: "LB231792",
      dept: "Product Engineering",
      position: "PE Technician",
      supervisor: "Dwijutera",
      workPhone: "-",
      photoUrl: "/assets/dm/maulana-arif.png",
    },
    {
      name: "ASHABUL KAHFI",
      employeeId: "10000971",
      dept: "Quality",
      position: "QA Technician",
      supervisor: "Deffandi Rh.",
      workPhone: "081297109142",
      photoUrl: "/assets/dm/ashabul-kahfi.png",
    },
    {
      name: "FIKRI AKBAR",
      employeeId: "10004132",
      dept: "ME",
      position: "ME Technician",
      supervisor: "Chardiawan Arijos",
      workPhone: "081280101045",
      photoUrl: "/assets/dm/fikri-akbar.png",
    },
  ],
  mpv: {
    name: "RISVI ZULVIYANTI",
    employeeId: "TYU34928",
    dept: "Produksi",
    position: "Pengecekan Top Cover",
    supervisor: null,
    workPhone: null,
    photoUrl: "/assets/dm/risvi-zulviyanti.png",
  },
};

export type DmWorkshopPreset = {
  id: string;
  name: string;
  board: DmBoard;
};

export const dmWorkshopPresets: readonly DmWorkshopPreset[] = [
  {
    id: "ws-5",
    name: "Workshop 5 (Line TAC20601)",
    board: defaultDmBoard,
  },
  {
    id: "ws-3",
    name: "Workshop 3 (Line TAC20302)",
    board: {
      ...defaultDmBoard,
      lineCode: "TAC20302",
      model: "ESPRESSO-Pro",
      lineName: "INNOVATION",
      slogan: "EFISIENSI & KUALITAS TINGGI",
      workshopLabel: "DM TRIANGLE WORKSHOP 3",
      members: [
        {
          name: "DIMAS WAHYU",
          employeeId: "I000215",
          dept: "Produksi",
          position: "Leader",
          supervisor: "Rian Saputra",
          workPhone: "081234567890",
          photoUrl: "/assets/dm/alif-maulana.png",
        },
        {
          name: "HENDRA WIJAYA",
          employeeId: "LB230911",
          dept: "Product Engineering",
          position: "PE Technician",
          supervisor: "Bambang S.",
          workPhone: "081398765432",
          photoUrl: "/assets/dm/maulana-arif.png",
        },
        {
          name: "SITI NURHALIZA",
          employeeId: "10002844",
          dept: "Quality",
          position: "QA Technician",
          supervisor: "Deffandi Rh.",
          workPhone: "081211223344",
          photoUrl: "/assets/dm/risvi-zulviyanti.png",
        },
        {
          name: "BAYU PERDANA",
          employeeId: "10005512",
          dept: "ME",
          position: "ME Technician",
          supervisor: "Chardiawan Arijos",
          workPhone: "081255667788",
          photoUrl: "/assets/dm/fikri-akbar.png",
        },
      ],
      mpv: {
        name: "DEWI ANGGRAENI",
        employeeId: "TYU31092",
        dept: "Produksi",
        position: "Inspeksi Final Assembly",
        supervisor: null,
        workPhone: null,
        photoUrl: "/assets/dm/risvi-zulviyanti.png",
      },
    },
  },
  {
    id: "ws-2",
    name: "Workshop 2 (Line TAC20201)",
    board: {
      ...defaultDmBoard,
      lineCode: "TAC20201",
      model: "CAPPUCCINO-Lite",
      lineName: "PRECISION",
      slogan: "DISIPLIN KERJA PRESTASI KITA",
      workshopLabel: "DM TRIANGLE WORKSHOP 2",
      members: [
        {
          name: "FAJAR NUGRAHA",
          employeeId: "I000301",
          dept: "Produksi",
          position: "Leader",
          supervisor: "Mohamad Noor Arief",
          workPhone: "081788990011",
          photoUrl: "/assets/dm/alif-maulana.png",
        },
        {
          name: "AGUS SETIAWAN",
          employeeId: "LB231102",
          dept: "Product Engineering",
          position: "PE Technician",
          supervisor: "Dwijutera",
          workPhone: "-",
          photoUrl: "/assets/dm/maulana-arif.png",
        },
        {
          name: "ILHAM RAMADHAN",
          employeeId: "10001923",
          dept: "Quality",
          position: "QA Technician",
          supervisor: "Deffandi Rh.",
          workPhone: "081922334455",
          photoUrl: "/assets/dm/ashabul-kahfi.png",
        },
        {
          name: "EKO PRASETYO",
          employeeId: "10004899",
          dept: "ME",
          position: "ME Technician",
          supervisor: "Chardiawan Arijos",
          workPhone: "081833445566",
          photoUrl: "/assets/dm/fikri-akbar.png",
        },
      ],
      mpv: {
        name: "NURUL HIDAYAH",
        employeeId: "TYU39012",
        dept: "Produksi",
        position: "Pemasangan Mainboard",
        supervisor: null,
        workPhone: null,
        photoUrl: "/assets/dm/risvi-zulviyanti.png",
      },
    },
  },
  {
    id: "ws-1",
    name: "Workshop 1 (Line TAC20101)",
    board: {
      ...defaultDmBoard,
      lineCode: "TAC20101",
      model: "MOCHA-Ultra",
      lineName: "SPEED & QUALITY",
      slogan: "TEPAT WAKTU TANPA CACAT",
      workshopLabel: "DM TRIANGLE WORKSHOP 1",
      members: defaultDmBoard.members,
      mpv: defaultDmBoard.mpv,
    },
  },
];

export const dmBoard = defaultDmBoard;

export const dmStatusLabels: Record<DmLineStatus, string> = {
  running: "RUNNING",
  idle: "STANDBY",
  stopped: "STOPPED",
};
