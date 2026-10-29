"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { publicApi } from "./api";

export default function LegacyWorkshopRedirect({ slug }: { slug: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    publicApi.boards().then((boards) => {
      if (cancelled) return;
      const board = boards.find((item) => item.slug === slug);
      if (board) router.replace(`/dm-dashboard/workshop/${board.workshopId}`);
      else setError("Link workshop lama tidak ditemukan. Pilih workshop dari daftar dashboard.");
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Data belum bisa dimuat.");
    });
    return () => { cancelled = true; };
  }, [router, slug]);

  return (
    <main>
      <p role={error ? "alert" : "status"}>{error ?? "Membuka TV workshop..."}</p>
      <Link href="/dm-dashboard">Daftar workshop</Link>
    </main>
  );
}
