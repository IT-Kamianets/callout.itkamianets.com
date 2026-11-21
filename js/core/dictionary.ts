import type { Dictionary, Language, Position, RoundScenario } from './model.ts';
import { radarPoint } from './map-geometry.ts';
// English community names are sourced; Ukrainian names are explicit editorial translations.
// Coordinates are pixels in the owner's supplied radar, projected into its visible crop.
const rows:[string,string,string,number,number,Position['zone']][] = [
 ['a-site','A Site','Плент A',837,909,'A'], ['b-site','B Site','Плент B',455,332,'B'],
 ['window','Window','Вікно',674,543,'Mid'], ['palace','Palace','Палац',1084,918,'A'],
 ['connector','Connector','Конектор',783,620,'Mid'], ['jungle','Jungle','Джунглі',709,731,'A'],
 ['stairs','Stairs','Сходи',804,690,'A'], ['tetris','Tetris','Тетріс',952,832,'A'],
 ['ramp','A Ramp','Рампа A',1054,783,'A'], ['mid','Mid','Мід',897,521,'Mid'],
 ['short','Short','Шорт',750,403,'B'], ['ladder','Ladder Room','Кімната з драбиною',705,458,'Mid'],
 ['underpass','Underpass','Підземний прохід',709,360,'Mid'], ['ticket','Ticket Booth','Квиткова будка',728,991,'A'],
 ['sandwich','Sandwich','Сендвіч',879,770,'A'], ['chair','Chair','Стілець',1065,470,'Mid'],
 ['top-mid','Top Mid','Верхній мід',1026,393,'Mid'], ['apartments','B Apartments','Апартаменти B',597,210,'B'],
 ['default','Default','Дефолт',860,951,'A'], ['bench','Bench','Лавка',368,192,'B'],
];
export const dictionary:Dictionary = {
 version:2,
 maps:['Mirage','Dust II','Inferno','Nuke','Ancient','Anubis','Overpass','Train'].map((name,i)=>({id:['mirage','dust2','inferno','nuke','ancient','anubis','overpass','train'][i],name,available:i===0,layers:i===3?[{id:'upper',name:'Upper'},{id:'lower',name:'Lower'}]:[{id:'main',name:'Main level'}]})),
 positions:rows.map(([id,,,x,y,zone])=>({id:`mirage.${id}`,mapId:'mirage',layerId:'main',zone,...radarPoint(x,y),verified:true,sourceIds:['total']})),
 translations:rows.flatMap(([id,en,uk])=>[{positionId:`mirage.${id}`,language:'en' as Language,name:en,sourceId:'total'},{positionId:`mirage.${id}`,language:'uk' as Language,name:uk,sourceId:'uk-editorial'}]),
 aliases:[
 {positionId:'mirage.window',language:'en',name:"Sniper's Nest",sourceId:'total',verified:true},
 {positionId:'mirage.ticket',language:'en',name:'Ticket',sourceId:'atlas',verified:true},
 {positionId:'mirage.mid',language:'en',name:'Middle',sourceId:'total',verified:true},
 ],
 sources:[
 {id:'total',title:'Total CS — Mirage callouts',url:'https://totalcsgo.com/callouts/mirage',checkedAt:'2026-11-15',notes:'English names and position relationships. Window means Mid / Sniper’s Nest; Short means B Short. The application uses the map supplied by the owner, not this source’s artwork.'},
 {id:'atlas',title:'CS2 Atlas by JZR — Mirage',url:'https://cs2.jzr.uz/maps/mirage',checkedAt:'2026-11-15',notes:'English Ticket alias cross-check. No non-Ukrainian translations from this source are included.'},
 {id:'uk-editorial',title:'Callout · Український переклад',url:'https://totalcsgo.com/callouts/mirage',checkedAt:'2026-11-15',notes:'Український редакційний переклад перевірених англійських назв на запит власника продукту. Не є твердженням про офіційний або єдиний стандарт українського ігрового сленгу. Непідтверджені українські альтернативи не додаються до тестів.'}
 ]
};
export const scenarios:RoundScenario[] = [
 {id:'mirage-a-hold',mapId:'mirage',name:'A-site hold',side:'CT',events:[
 {positionId:'mirage.ramp',en:'Enemy spotted at {name}!',uk:'Противник: {name}!'},
 {positionId:'mirage.palace',en:'One {name}!',uk:'Один: {name}!'},
 {positionId:'mirage.default',en:'Enemy near {name}!',uk:'Противник поруч: {name}!'},
 {positionId:'mirage.jungle',en:'Last one {name}!',uk:'Останній: {name}!'}]},
 {id:'mirage-mid-control',mapId:'mirage',name:'Mid control',side:'T',events:[
 {positionId:'mirage.top-mid',en:'Watch {name}!',uk:'Перевір: {name}!'},
 {positionId:'mirage.window',en:'One {name}!',uk:'Один: {name}!'},
 {positionId:'mirage.connector',en:'Two {name}!',uk:'Двоє: {name}!'},
 {positionId:'mirage.short',en:'Last one {name}!',uk:'Останній: {name}!'}]}
];
export class MapDataService {
 data:Dictionary; constructor(data:Dictionary = dictionary) { this.data=data; }
 positions(mapId='mirage') { return this.data.positions.filter(p=>p.mapId===mapId && p.verified); }
 get(id:string) { const p=this.data.positions.find(p=>p.id===id); if(!p) throw new Error('Unknown position: '+id); return p; }
}
export class PositionDictionaryService extends MapDataService {
 name(id:string,lang:Language) { return this.data.translations.find(t=>t.positionId===id && t.language===lang)?.name ?? id; }
 aliases(id:string,lang:Language) { return this.data.aliases.filter(a=>a.positionId===id && a.language===lang && a.verified); }
 matches(id:string,text:string,lang:Language) { const normalize=(s:string)=>s.trim().toLocaleLowerCase().replace(/[.!?]/g,'').replace(/\s+/g,' '); return [this.name(id,lang),...this.aliases(id,lang).map(a=>a.name)].some(n=>normalize(n)===normalize(text)); }
 search(query:string,zone='all',layer='main') { const q=query.toLocaleLowerCase().trim(); return this.positions().filter(p=>p.layerId===layer && (zone==='all'||p.zone===zone) && [this.name(p.id,'en'),this.name(p.id,'uk'),...this.data.aliases.filter(a=>a.positionId===p.id).map(a=>a.name)].some(n=>n.toLocaleLowerCase().includes(q))); }
}
