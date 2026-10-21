"use client";

import { useEffect, useRef, useState } from "react";
import { meetingApi } from "../../../api";

/** Fetches each guest's photo once and keeps it in memory. Pass the NIKs joined with "|". */
export function useGuestPhotos(employeeNos: string): Record<string, string | null> {
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const asked = useRef(new Set<string>());

  useEffect(() => {
    for (const no of employeeNos ? employeeNos.split("|") : []) {
      if (asked.current.has(no)) continue;
      asked.current.add(no);
      meetingApi
        .employeePhoto(no)
        .then((result) => setPhotos((prev) => ({ ...prev, [no]: result.photoUrl })))
        .catch(() => asked.current.delete(no));
    }
  }, [employeeNos]);

  return photos;
}
