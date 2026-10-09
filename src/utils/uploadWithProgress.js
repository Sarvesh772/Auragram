import { useUploadStore } from '../store/useUploadStore';

export function uploadWithProgress(file, url, contentType = file.type) {
  useUploadStore.startUpload(file);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    useUploadStore.setXHR(xhr);
    xhr.open('PUT', url);
    if (contentType) xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) useUploadStore.setProgress(event.loaded, event.total); };
    xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) { useUploadStore.setProgress(file.size, file.size); useUploadStore.resetUpload(); resolve(xhr); } else { useUploadStore.failUpload(`Upload failed (${xhr.status})`); reject(new Error(`Upload failed (${xhr.status})`)); } };
    xhr.onerror = () => { useUploadStore.failUpload('Upload failed'); reject(new Error('Upload failed')); };
    xhr.onabort = () => { useUploadStore.resetUpload(); reject(new Error('Upload cancelled')); };
    xhr.send(file);
  });
}
