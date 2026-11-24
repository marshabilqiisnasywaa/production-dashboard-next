export type ManualProcedure = {
  id: number;
  title: string;
  fileName: string;
  contentType: string;
  size: number;
  blob: Blob;
  updatedAt: string;
};

const DB_NAME = "dm-flowchart-manual-procedures";
const STORE_NAME = "procedures";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB tidak tersedia."));
  });
}

export async function listManualProcedures(): Promise<ManualProcedure[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const items = request.result as ManualProcedure[];
      resolve([...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    };
    request.onerror = () => reject(request.error ?? new Error("Dokumen tidak dapat dimuat."));
  });
}

export async function addManualProcedure(title: string, file: File): Promise<ManualProcedure> {
  const database = await openDatabase();
  const item: Omit<ManualProcedure, "id"> = {
    title,
    fileName: file.name,
    contentType: file.type || "application/pdf",
    size: file.size,
    blob: file,
    updatedAt: new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const request = transaction.objectStore(STORE_NAME).add(item);
    request.onsuccess = () => resolve({ ...item, id: Number(request.result) });
    request.onerror = () => reject(request.error ?? new Error("Dokumen gagal disimpan."));
  });
}

export async function removeManualProcedure(id: number): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Dokumen gagal dihapus."));
  });
}
