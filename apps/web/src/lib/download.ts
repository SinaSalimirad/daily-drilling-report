/** Saves a file the app received or built (PDF from the API, Excel built in the browser). */
export function saveFile(file: Blob, name: string) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  // The download has started; the object URL is not needed after this task.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
