"use client";

import { useEffect, useState } from "react";
import type { ImgHTMLAttributes } from "react";
import { useUiText } from "@/locales/useUiText";
import { fiveWhyAnalysesApi } from "../api";

const cache = new Map<string, Promise<string>>();

function loadPhoto(photoId: string) {
  let pending = cache.get(photoId);
  if (!pending) {
    pending = fiveWhyAnalysesApi
      .photo(photoId)
      .then((blob) => URL.createObjectURL(blob));
    pending.catch(() => cache.delete(photoId));
    cache.set(photoId, pending);
  }
  return pending;
}

type AuthImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  photoId: string;
};

export default function AuthImage({ photoId, alt = "", ...rest }: AuthImageProps) {
  const { text: uiText } = useUiText();
  const [source, setSource] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setSource("");
    setFailed(false);
    loadPhoto(photoId)
      .then((url) => {
        if (active) setSource(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [photoId]);

  if (failed) return <span role="img" aria-label={uiText("Foto gagal dimuat")}>!</span>;
  if (!source) return <span aria-hidden="true" />;
  return <img {...rest} src={source} alt={alt} />;
}
