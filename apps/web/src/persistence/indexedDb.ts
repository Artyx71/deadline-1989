import { ProfileStorageError, type ProfileStorage } from './protocol';

const DATABASE = 'deadline-1989-profile';
const STORE = 'sqlite-files';
const KEY = 'local-profile-v1';
let opened: Promise<IDBDatabase> | undefined;

function database(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new ProfileStorageError('STORAGE_UNAVAILABLE', 'Браузер не предоставляет локальное хранилище. Разрешите сохранение данных сайта.'));
  opened ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE); };
    request.onerror = () => { opened = undefined; reject(new ProfileStorageError('STORAGE_UNAVAILABLE', 'Локальное хранилище недоступно. Разрешите сохранение данных сайта в настройках браузера.')); };
    request.onblocked = () => { opened = undefined; reject(new ProfileStorageError('STORAGE_BLOCKED', 'Обновление локального профиля заблокировано. Закройте другие вкладки DEADLINE и повторите действие.')); };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); opened = undefined; };
      resolve(db);
    };
  });
  return opened;
}

export const indexedDbStorage: ProfileStorage = {
  async load() {
    const db = await database();
    return new Promise<Uint8Array | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get(KEY);
      let result: Uint8Array | undefined;
      let invalid = false;
      request.onsuccess = () => {
        const value: unknown = request.result;
        if (value === undefined) return;
        if (value instanceof Uint8Array) result = value;
        else if (value instanceof ArrayBuffer) result = new Uint8Array(value);
        else { invalid = true; transaction.abort(); }
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = transaction.onerror = () => reject(new ProfileStorageError(invalid ? 'PROFILE_CORRUPTED' : 'STORAGE_READ_FAILED', invalid ? 'Формат локального профиля повреждён. Данные не перезаписаны.' : 'Не удалось прочитать локальный профиль. Повторите подключение.'));
    });
  },
  async save(bytes) {
    const db = await database();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite', { durability: 'strict' });
      transaction.objectStore(STORE).put(bytes, KEY);
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(new ProfileStorageError('STORAGE_WRITE_FAILED', 'Не удалось записать локальный профиль. Проверьте свободное место и доступ к хранилищу.'));
    });
  },
};
