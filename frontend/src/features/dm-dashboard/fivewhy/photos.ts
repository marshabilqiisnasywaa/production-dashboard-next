const MAX_EDGE = 1600;
const KEEP_AS_IS_BYTES = 1.5 * 1024 * 1024;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Pilih file gambar (JPEG, PNG, atau WebP).");
  }
  if (file.size <= KEEP_AS_IS_BYTES && ACCEPTED_TYPES.includes(file.type)) {
    return file;
  }
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    if (file.size <= MAX_BYTES && ACCEPTED_TYPES.includes(file.type)) return file;
    throw new Error("Foto tidak bisa dibaca. Gunakan JPEG, PNG, atau WebP.");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Foto tidak bisa diproses di browser ini.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85)
  );
  if (!blob || blob.size > MAX_BYTES) {
    throw new Error("Foto terlalu besar. Maksimal 5 MB setelah dikecilkan.");
  }
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "foto"}.jpg`, {
    type: "image/jpeg",
  });
}
