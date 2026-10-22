import { apiService } from '../services/ApiService';

/**
 * Apre in una nuova scheda un file protetto (es. PDF di una ricevuta) scaricandolo con l'header Authorization:
 * il token non finisce nell'URL (e quindi nei log del server).
 * La scheda si apre subito, dentro il click: Safari/iOS bloccano i popup aperti dopo un `await`.
 * Se il popup è bloccato comunque, il file viene scaricato.
 */
export async function openProtectedFile(apiPath: string, fileName: string): Promise<void> {
  const win = window.open('', '_blank');
  if (win) {
    try {
      win.document.title = 'Caricamento…';
      win.document.body.style.cssText = 'font: 16px system-ui, sans-serif; padding: 24px; color: #555;';
      win.document.body.textContent = 'Caricamento del documento…';
    } catch {
      // documento non accessibile: si imposta solo l'URL più avanti
    }
  }
  try {
    const blob = await apiService.getBlob(apiPath);
    const url = URL.createObjectURL(blob);
    if (win && !win.closed) {
      win.location.href = url;
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    // la scheda ha già caricato il file: l'URL temporaneo si può liberare più tardi
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    win?.close();
    // con responseType "blob" anche l'errore arriva come Blob: lo si rilegge come JSON per avere il messaggio del server
    const response = (error as { response?: { data?: unknown } })?.response;
    if (response?.data instanceof Blob && response.data.type.includes('json')) {
      try {
        response.data = JSON.parse(await response.data.text());
      } catch {
        // corpo non leggibile: resta il messaggio generico
      }
    }
    throw error;
  }
}
