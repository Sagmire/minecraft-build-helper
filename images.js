'use strict';

// 🖼️ Photos are too big for the main save, so they live in the browser's IndexedDB (lots of
// room). They are also kept in memory so pages can show them straight away.

const IMAGE_DB_NAME = 'minecraftBuildHelperImages';
const imageCache = new Map();
let imageDb = null;

function openImageDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IMAGE_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('images');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadImages() {
  try {
    imageDb = await openImageDb();
    const store = imageDb.transaction('images').objectStore('images');
    await new Promise(resolve => {
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return resolve();
        imageCache.set(cursor.key, cursor.value);
        cursor.continue();
      };
      req.onerror = () => resolve();
    });
  } catch (e) {
    console.warn('Photo storage unavailable; photos will only last until the app closes', e);
  }
}

// Writes finish in the background; imagesSaved() resolves once they all have.
let pendingImageWrites = 0;
let imageWritesDone = [];
function trackImageWrite(tx) {
  if (!tx) return;
  pendingImageWrites++;
  tx.oncomplete = tx.onerror = tx.onabort = () => {
    if (--pendingImageWrites === 0) imageWritesDone.splice(0).forEach(done => done());
  };
}

function imagesSaved() {
  return pendingImageWrites ? new Promise(done => imageWritesDone.push(done)) : Promise.resolve();
}

function storeImage(id, data) {
  imageCache.set(id, data);
  const tx = imageDb?.transaction('images', 'readwrite');
  tx?.objectStore('images').put(data, id);
  trackImageWrite(tx);
}

function addImage(data) {
  const id = 'img_' + uid();
  storeImage(id, data);
  return id;
}

function getImage(id) {
  return imageCache.get(id) || '';
}

function deleteImages(ids) {
  for (const id of ids) {
    imageCache.delete(id);
    const tx = imageDb?.transaction('images', 'readwrite');
    tx?.objectStore('images').delete(id);
    trackImageWrite(tx);
  }
}

function clearImages() {
  imageCache.clear();
  const tx = imageDb?.transaction('images', 'readwrite');
  tx?.objectStore('images').clear();
  trackImageWrite(tx);
}

// Shrinks a picture file to at most `max` pixels on its longest side, as a JPEG data URL.
function pictureFromFile(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Not a picture'));
    };
    img.src = url;
  });
}
