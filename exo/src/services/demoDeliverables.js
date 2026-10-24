import { validateDeliverable } from './deliverableService.js';

export function canUploadDemoWork(project, role) {
  return role === 'developer' && project?.developerId === 'me' && project.status === 'funded';
}

export function canApproveDemoWork(project, role, reviewedFileId) {
  return role === 'client' && project?.clientId === 'me' && project.status === 'delivered'
    && Boolean(reviewedFileId && project.deliverable?.id === reviewedFileId);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('exodus_demo_files', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('File storage is unavailable in this browser.'));
  });
}

export async function saveDemoFile(project, role, file) {
  if (!canUploadDemoWork(project, role)) throw new Error('Only the assigned developer can submit work for a funded project.');
  const validation = validateDeliverable(file);
  if (validation) throw new Error(validation);
  const metadata = {
    id: crypto.randomUUID(), projectId: project.id, name: file.name,
    type: file.type || '', size: file.size, submittedAt: Date.now(),
  };
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('files', 'readwrite');
      transaction.objectStore('files').add({ ...metadata, blob: file });
      transaction.oncomplete = resolve;
      transaction.onerror = transaction.onabort = () => reject(new Error('Could not save the file. Your project has not been submitted.'));
    });
    return metadata;
  } finally { db.close(); }
}

export async function readDemoFile(id, projectId) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('files', 'readonly').objectStore('files').get(id);
      request.onsuccess = () => {
        const record = request.result;
        if (!record?.blob || record.projectId !== projectId) reject(new Error('This file is not available in this browser. Ask the developer to submit it here.'));
        else resolve(record);
      };
      request.onerror = () => reject(new Error('Could not read the submitted file.'));
    });
  } finally { db.close(); }
}
