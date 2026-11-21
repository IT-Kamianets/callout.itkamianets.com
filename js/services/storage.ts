import { migrateData } from '../core/migration.ts';
import { type AppData, emptyData, type Dictionary } from '../core/model.ts';
import { validateData } from '../core/validation.ts';
export interface LocalStorageAdapter { load():Promise<AppData|null>; save(data:AppData):Promise<void>; clear():Promise<void>; readonly kind:string }
export class IndexedDBAdapter implements LocalStorageAdapter {
 readonly kind='IndexedDB';private database:Promise<IDBDatabase>;
 constructor(){this.database=new Promise((resolve,reject)=>{const request=indexedDB.open('callout-local',1);request.onupgradeneeded=()=>request.result.createObjectStore('state');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Close other Callout tabs to unlock storage.'));});}
 async load():Promise<AppData|null>{const db=await this.database;return new Promise((resolve,reject)=>{const tx=db.transaction('state','readonly');const req=tx.objectStore('state').get('snapshot');req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);});}
 async save(data:AppData){const db=await this.database;return new Promise<void>((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(data,'snapshot');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Save interrupted'));});}
 async clear(){const db=await this.database;return new Promise<void>((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').clear();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
}
export class BrowserStorageAdapter implements LocalStorageAdapter {
 readonly kind='localStorage fallback';key='callout.snapshot.v1';
 async load(){const raw=localStorage.getItem(this.key);return raw?JSON.parse(raw):null;}
 async save(data:AppData){localStorage.setItem(this.key,JSON.stringify(data));}
 async clear(){localStorage.removeItem(this.key);}
}
export class LocalRepository {
 adapter:LocalStorageAdapter; dictionary:Dictionary; constructor(adapter:LocalStorageAdapter,dictionary:Dictionary){this.adapter=adapter;this.dictionary=dictionary;}
 async load(){const data=await this.adapter.load();if(!data)return emptyData();const migrated=migrateData(data);const checked=validateData(migrated,this.dictionary);if(data!==migrated)await this.adapter.save(checked);return checked;}
 async save(data:AppData){validateData(data,this.dictionary);await this.adapter.save(data);}
 async import(text:string){if(text.length>5_000_000)throw new Error('Maximum import size is 5 MB');const value=validateData(migrateData(JSON.parse(text)),this.dictionary);await this.adapter.save(value);return value;}
}
export async function createStorage():Promise<LocalStorageAdapter> {
 try {const adapter=new IndexedDBAdapter();await adapter.load();return adapter;}
 catch {const fallback=new BrowserStorageAdapter();const probe='callout.storage-check';localStorage.setItem(probe,'1');localStorage.removeItem(probe);return fallback;}
}
