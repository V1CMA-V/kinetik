import { File, Paths } from 'expo-file-system';

/**
 * expo-sharing is loaded on demand: in a binary built before it was added, importing
 * it throws, and a top-level import would take the whole Movimientos screen down.
 */
async function loadSharing() {
  try {
    return await import('expo-sharing');
  } catch {
    throw new Error('Actualiza la app a la versión más reciente para exportar tus movimientos.');
  }
}

/** Writes `csv` to a cache file and opens the share sheet (save to Files, Drive, email…). */
export async function shareCsv(fileName: string, csv: string) {
  const Sharing = await loadSharing();
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartir archivos no está disponible en este dispositivo.');
  }
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(csv);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Exportar movimientos',
  });
}
