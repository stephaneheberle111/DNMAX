// SPDX-License-Identifier: CECILL-2.1
/* Interface historique de DNMAX, reprise telle quelle depuis la maquette d'origine.
   Seules différences : le stockage et l'enregistrement de fichiers passent par
   `window.dnmaxPont`, fourni par l'application avant le chargement de ce script. */
const STOCKAGE = window.dnmaxPont.stockage;
/* Règles de la saisie des résultats : écrites et testées dans src/domaine/saisie-resultats.ts. */
const SAISIE = window.dnmaxPont.saisie;
/* Règles de la composition d'une évaluation : écrites et testées dans src/domaine/evaluation.ts. */
const EVAL = window.dnmaxPont.evaluation;
const JAUGE = window.dnmaxPont.jauge;
const SEMS = ["S1","S2","S3","S4","S5","S6"];
const anneeOf = sem => Math.floor(Math.max(0,SEMS.indexOf(sem))/2)+1;
/* une seule échelle pour tous, celle des niveaux de maîtrise (voir src/domaine/evaluation.ts) */
const PRESETS = {maitrise:{nom:EVAL.ECHELLE.nom,niveaux:[...EVAL.ECHELLE.niveaux]}};
const DEF_PRESET_GET=()=>"maitrise";
/* modules (Paramètres > Modules) : catalogue et règles dans src/domaine/modules.ts */
const MODULES = window.dnmaxPont.modules.MODULES;
const SUPPORTS_DEF = ["Carnet de projet","Catalogue d'expérimentation","Planches de projet",
  "Maquettes de recherches","Frise chronologique","Fiche de lecture","Devoir réflexif",
  "Carnet d'exposition","Diaporama","Oral de présentation de projet"];
const modDefaults = () => window.dnmaxPont.modules.modulesParDefaut();
const LS = {
  get(k,d){try{const v=STOCKAGE.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},
  set(k,v){try{STOCKAGE.setItem(k,JSON.stringify(v))}catch(e){}}
};
let MOD = Object.assign(modDefaults(), LS.get("dnmade.modules",{}));
// un module qui en requiert un autre ne reste pas actif sans lui (Niveaux d'acquisition → Étudiants)
function modDeps(){window.dnmaxPont.modules.appliquerDependances(MOD)}
modDeps();
MOD.base=true;
function buildData(ref,livr){
  const T=x=>String(x==null?"":x).replace(/([A-ZÀ-Ý])-([A-ZÀ-Ý])/g,"$1$2").trim();
  const ues=[],ecs=[],comps=[];
  (ref.ues||[]).forEach((u,i)=>ues.push({id:"u"+i,nom:T(u.nom),couleur:u.couleur||"#9aa2ae"}));
  const nomFam=f=>String(f||"").replace(/^EC /,"").trim();
  const map=new Map();
  (ref.familles||[]).forEach(f=>{
    let ue=ues.find(u=>u.nom===T(f.ue));
    if(!ue){ue={id:"u"+ues.length,nom:T(f.ue)||"UE",couleur:"#9aa2ae"};ues.push(ue)}
    const nom=nomFam(f.nom);
    if(map.has(nom))return;
    const x={id:"e"+map.size,nom,couleur:f.couleur||"#9aa2ae",ueId:ue.id,sems:[],ects:"",codes:{}};
    map.set(nom,x);ecs.push(x);
  });
  (ref.competences||[]).forEach(c=>(c.ecs||[]).forEach(e=>{
    const nom=nomFam(e.famille);
    let x=map.get(nom);
    if(!x){x={id:"e"+map.size,nom,couleur:"#9aa2ae",ueId:(ues[0]||{}).id||"",sems:[],ects:"",codes:{}};map.set(nom,x);ecs.push(x)}
    if(!x.sems.includes(e.sem))x.sems.push(e.sem);
    const a=anneeOf(e.sem);
    if(!x.codes[a])x.codes[a]=e.ec;
  }));
  ecs.forEach(e=>e.sems.sort((a,b)=>SEMS.indexOf(a)-SEMS.indexOf(b)));
  (ref.competences||[]).forEach((c,i)=>{
    const liens=new Map();
    (c.ecs||[]).forEach(e=>{const x=map.get(nomFam(e.famille));if(!x)return;
      const l=liens.get(x.id)||{id:x.id,sems:[]};
      if(!l.sems.includes(e.sem))l.sems.push(e.sem);
      liens.set(x.id,l)});
    liens.forEach(l=>l.sems.sort((a,b)=>SEMS.indexOf(a)-SEMS.indexOf(b)));
    comps.push({id:"c"+i,code:c.code,bloc:String(c.bloc||""),libelle:c.libelle||"",ecs:[...liens.values()]});
  });
  return {diplome:(ref.meta||{}).diplome||"",
    blocTint:(ref.meta||{}).blocTint||"#D1F1DA",niveaux:(ref.meta||{}).niveaux||[],
    blocs:(ref.blocs||[]).map(b=>({num:String(b.num),nom:b.nom||""})),
    ues,ecs,competences:comps,livrables:(livr||[]).slice()};
}
/* code et libellé d'un diplôme : règles écrites et testées dans src/domaine/diplomes.ts */
function autoDipCode(dp){return window.dnmaxPont.diplomes.codeAutomatique(dp)}
/* Diplômes montrés à l'enseignant : le cadre vierge d'une installation neuve reste caché.
   Le premier référentiel reçu, ou le premier diplôme créé à la main, le réutilise. */
function estCadreVierge(id){return window.dnmaxPont.estCadreVierge(DATA,id,promos)}
function dipVisibles(){return DATA.diplomes.filter(dp=>!estCadreVierge(dp.id))}
function dipCode(dp){return window.dnmaxPont.diplomes.codeDiplome(dp)}
/* identifiant d'une année : celui du diplôme suivi du numéro d'année, sauf si on l'a réécrit */
function anneeCode(a,d,dp){
  d=d||DATA;
  const n=((d||{}).niveaux||[]).find(x=>+x.annee===+a);
  const c=String((n||{}).code||"").trim();
  if(c)return c;
  const p=dp||((d||{}).diplomes||[]).find(x=>x.id===d.activeDiplome)||{};
  return dipCode(p)+a;
}
function dipLabel(dp){return window.dnmaxPont.diplomes.libelleDiplome(dp)}
/* Dictionnaire : les éléments eux-mêmes (nom, code, couleur, intitulé), communs à tous les diplômes.
   Référentiel : pour chaque diplôme-mention, les éléments retenus et leurs associations
   (semestres et ECTS des UE, UE et semestres de chaque EC, bloc et EC de chaque compétence).
   DATA.ues, DATA.ecs… sont la vue fusionnée du référentiel actif, reconstruite à chaque changement. */
const KINDS=["ues","ecs","blocs","competences"];
const DICO_F={ues:["nom","code","couleur"],ecs:["nom","couleur"],blocs:["num","nom"],competences:["code","libelle"]};
const REF_F={ues:["sems"],ecs:["ueId","sems","ects","codes"],blocs:[],competences:["bloc","ecs"]};
function emptyRef(){return {ues:[],ecs:[],blocs:[],competences:[]}}
function refOf(d,id){d.refs=d.refs||{};return d.refs[id]||(d.refs[id]=emptyRef())}
const cloneV=v=>Array.isArray(v)?v.map(x=>x&&typeof x==="object"?Object.assign({},x,Array.isArray(x.sems)?{sems:x.sems.slice()}:{}):x)
  :(v&&typeof v==="object"?Object.assign({},v):v);
const ANNEES=[1,2,3];
function ecCodeAt(e,sem){const a=anneeOf(sem);return String(((e||{}).codes||{})[a]||"")}
/* codes et rang d'un EC : règles écrites et testées dans src/domaine/constituer.ts */
function ecCodesList(e){return window.dnmaxPont.constituer.codesEc(e||{})}
function ecCodeLbl(e){const l=ecCodesList(e);return l.length?l.join(" · "):"—"}
/* dans une colonne étroite : « EC 2.3 · 10.3 · 18.3 » */
function ecCodeShort(e){const l=ecCodesList(e);if(!l.length)return "—";
  return l.map((c,i)=>i?String(c).replace(/^EC\s*/i,""):c).join(" · ")}
function classerDico(d){
  const dico=emptyRef(), refs={}, canon={};
  const dips=d.diplomes.map(x=>x.id), A=d.activeDiplome;
  dips.forEach(id=>refs[id]=emptyRef());
  const owner=x=>dips.includes(x.diplomeId)?x.diplomeId:A;
  const norm=t=>String(t==null?"":t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  const pick=(k,o,key)=>{
    let x=dico[k].find(y=>y._k===key);
    if(!x){x={id:o.id||newId(k[0]),_k:key};DICO_F[k].forEach(f=>x[f]=o[f]==null?"":o[f]);dico[k].push(x)}
    if(o.id)canon[k+":"+o.id]=x.id;return x.id};
  const ueOwner=id=>{const u=d.ues.find(x=>x.id===id);return u?owner(u):A};
  const matOwner=id=>{const m=(d.matieres||[]).find(x=>x.id===id);return m?ueOwner(m.ueId):A};
  const matOf=id=>(d.matieres||[]).find(x=>x.id===id)||null;
  d.ues.forEach(u=>refs[owner(u)].ues.push({id:pick("ues",u,norm(u.nom)+"|"+norm(u.code)),
    sems:Array.isArray(u.sems)?u.sems.slice():SEMS.slice()}));
  const semsAnc={};
  d.ecs.forEach(e=>{
    const m=e.matiereId?(matOf(e.matiereId)||{}):{};
    const ueSrc=e.matiereId?m.ueId:e.ueId;
    const nom=String(e.nom||"").trim()||m.nom||String(e.code||"").trim();
    const o={nom,couleur:e.couleur||m.couleur||"#9aa2ae",id:e.id};
    const dp=e.matiereId?matOwner(e.matiereId):ueOwner(ueSrc);
    const id=pick("ecs",o,norm(nom)+"|"+norm(ueSrc||""));
    semsAnc[e.id]=(e.sems||[]).slice();
    const R=refs[dp];
    let r=R.ecs.find(x=>x.id===id);
    if(!r){r={id,ueId:canon["ues:"+(ueSrc||"")]||"",sems:[],ects:e.ects||"",codes:{}};R.ecs.push(r)}
    if(!r.ueId)r.ueId=canon["ues:"+(ueSrc||"")]||"";
    if(!r.ects)r.ects=e.ects||"";
    (e.sems||[]).forEach(sm=>{
      if(!r.sems.includes(sm))r.sems.push(sm);
      const a=anneeOf(sm), code=e.code||((e.codes||{})[a]||"");
      if(!r.codes[a]&&code)r.codes[a]=code;
    });
    r.sems.sort((x,y)=>SEMS.indexOf(x)-SEMS.indexOf(y));
  });
  d.blocs.forEach(b=>refs[owner(b)].blocs.push({id:pick("blocs",b,norm(b.num)+"|"+norm(b.nom))}));
  d.competences.forEach(c=>{
    const liens=new Map();
    const src=Array.isArray(c.ecs)?c.ecs:(c.ecIds||[]).map(x=>({id:x,sems:null}));
    src.forEach(l=>{
      const nid=canon["ecs:"+l.id];if(!nid)return;
      const sems=(l.sems&&l.sems.length)?l.sems:(semsAnc[l.id]||[]);
      const x=liens.get(nid)||{id:nid,sems:[]};
      sems.forEach(sm=>{if(!x.sems.includes(sm))x.sems.push(sm)});
      liens.set(nid,x);
    });
    liens.forEach(l=>l.sems.sort((a,b)=>SEMS.indexOf(a)-SEMS.indexOf(b)));
    refs[owner(c)].competences.push({id:pick("competences",c,norm(c.code)+"|"+norm(c.libelle)),
      bloc:String(c.bloc||""),ecs:[...liens.values()]});
  });
  Object.values(refs).forEach(R=>KINDS.forEach(k=>{const seen=new Set();R[k]=R[k].filter(r=>!seen.has(r.id)&&seen.add(r.id))}));
  KINDS.forEach(k=>dico[k].forEach(x=>delete x._k));
  d.dico=dico;d.refs=refs;
}
function materialize(d){
  const A=d.activeDiplome, R=refOf(d,A);
  KINDS.forEach(k=>{
    d[k]=R[k].map(r=>{
      const x=d.dico[k].find(y=>y.id===r.id);if(!x)return null;
      const o={id:x.id};DICO_F[k].forEach(f=>o[f]=x[f]==null?"":x[f]);REF_F[k].forEach(f=>o[f]=cloneV(r[f]));
      if(k==="ues"||k==="blocs"||k==="competences")o.diplomeId=A;
      return o}).filter(Boolean);
  });
  d.ues.forEach(u=>{if(!Array.isArray(u.sems))u.sems=SEMS.slice();delete u.ects});
  d.ecs.forEach(e=>{if(!Array.isArray(e.sems))e.sems=[];if(e.ects==null)e.ects="";
    if(e.ueId==null)e.ueId="";if(!String(e.couleur||"").trim())e.couleur="#9aa2ae";
    if(!e.codes||typeof e.codes!=="object")e.codes={}});
  d.competences.forEach(c=>{
    if(!Array.isArray(c.ecs))c.ecs=[];
    c.ecs=c.ecs.filter(x=>x&&x.id).map(x=>({id:x.id,sems:Array.isArray(x.sems)?x.sems.slice():[]}));
    c.ecIds=c.ecs.map(x=>x.id);
    if(c.bloc==null)c.bloc=""});
  d._viewOf=A;
}
function absorb(d){
  const A=d._viewOf;if(!A||!d.diplomes.some(x=>x.id===A))return;
  const R=refOf(d,A);
  KINDS.forEach(k=>{
    R[k]=(d[k]||[]).map(o=>{
      if(!o.id)o.id=newId(k[0]);
      let x=d.dico[k].find(y=>y.id===o.id);
      if(!x){x={id:o.id};d.dico[k].push(x)}
      DICO_F[k].forEach(f=>x[f]=o[f]==null?"":o[f]);
      const r={id:o.id};REF_F[k].forEach(f=>r[f]=cloneV(o[f]));
      if(k==="competences"&&!Array.isArray(r.ecs))r.ecs=(o.ecIds||[]).map(id=>({id,sems:[]}));
      return r});
  });
}
function persistData(){
  const o=Object.assign({},DATA);KINDS.forEach(k=>delete o[k]);delete o._viewOf;
  LS.set("dnmade.data",o);
}
/* associations proposées quand un élément du dictionnaire entre dans un référentiel :
   celles qu'il a déjà dans une autre mention, ajustées à ce que contient le référentiel cible */
function assocFor(dpId,kind,id){
  const R=refOf(DATA,dpId);
  let src=null;
  Object.entries(DATA.refs).some(([k,X])=>k!==dpId&&(src=X[kind].find(r=>r.id===id)));
  const r=Object.assign({id},src?JSON.parse(JSON.stringify(src)):{});
  const has=(k,x)=>R[k].some(y=>y.id===x);
  if(kind==="ues"){if(!Array.isArray(r.sems))r.sems=SEMS.slice();delete r.ects}
  if(kind==="ecs"){if(!has("ues",r.ueId))r.ueId=(R.ues[0]||{}).id||"";if(!Array.isArray(r.sems))r.sems=[];
    if(r.ects==null)r.ects="";if(!r.codes||typeof r.codes!=="object")r.codes={}}
  if(kind==="competences"){r.ecs=(r.ecs||[]).filter(x=>x&&has("ecs",x.id));if(r.bloc==null)r.bloc=""}
  return r;
}
/* retirer un élément du référentiel d'une mention : règle écrite et testée dans src/domaine/constituer.ts */
function refRemove(R,kind,id){window.dnmaxPont.constituer.retirerDuReferentiel(R,kind,id)}
/* Données complètes à partir de buildData (installation neuve, exemple) : un diplôme, le dictionnaire
   et le référentiel de ce diplôme, puis la vue fusionnée du référentiel actif. */
function construireDonnees(d){
  const full=d.diplome||"";
  const men=(full.match(/mention\s+(.+)$/i)||[])[1]||"";
  const nom=full.replace(/\s*mention\s+.+$/i,"").trim();
  // sans référentiel, un diplôme-cadre caché tient lieu de diplôme actif (voir dipVisibles)
  d.diplomes=[nom?{id:"d0",nom,mention:men.trim()}:{id:"d0",nom:"",mention:"",cadre:true}];
  d.activeDiplome="d0";
  d.ues.forEach(u=>{u.diplomeId="d0";if(!Array.isArray(u.sems))u.sems=SEMS.slice();
    if(u.code===undefined)u.code="";if(u.ects===undefined)u.ects="";});
  d.blocs.forEach(b=>{b.diplomeId="d0"});
  d.competences.forEach(c=>{c.diplomeId="d0"});
  classerDico(d);
  // l'identifiant d'année se déduit du code du diplôme : le référentiel source porte « DN1 », « DN2 »…
  (d.niveaux||[]).forEach(n=>{if(/^DN\s*\d$/i.test(String(n.code||"").trim()))n.code=""});
  KINDS.forEach(k=>{if(!Array.isArray(d.dico[k]))d.dico[k]=[]});
  d.livrables=(d.livrables||[]).map(x=>typeof x==="string"?{nom:x,type:""}:x);
  d.enseignants=[];
  delete d.diplome;
  materialize(d);
  return d;
}
function livrNames(){return DATA.livrables.map(x=>x.nom).filter(Boolean)}
function newId(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
function addMention(srcId,nom){
  const D=DATA, dp={id:newId("d"),nom:nom||"",mention:"",code:""};
  absorb(D);
  D.diplomes.push(dp);
  D.refs[dp.id]=JSON.parse(JSON.stringify(refOf(D,srcId)));
  return dp;
}
function projectRef(d){
  const A=d.activeDiplome;
  const ues=d.ues.filter(u=>!u.diplomeId||u.diplomeId===A);
  const ueIds=ues.map(u=>u.id);
  const ecsRef=d.ecs.filter(e=>ueIds.includes(e.ueId));
  const uById=id=>ues.find(u=>u.id===id);
  const nomEc=e=>String(e.nom||"").trim()||ecCodeLbl(e);
  const dp=d.diplomes.find(x=>x.id===A)||{};
  return {
    meta:{diplome:dipLabel(dp),diplomeNom:dp.nom||"",mention:dp.mention||"",blocTint:d.blocTint,niveaux:d.niveaux},
    blocs:d.blocs.filter(b=>!b.diplomeId||b.diplomeId===A).map(b=>({num:b.num,nom:b.nom})),
    ues:ues.map(u=>({nom:u.nom,couleur:u.couleur,code:u.code,sems:u.sems})),
    ecs:ecsRef.map(e=>({id:e.id,nom:nomEc(e),couleur:e.couleur||"#9aa2ae",codes:Object.assign({},e.codes||{}),
      ue:(uById(e.ueId)||{}).nom||"UE non précisée",sems:(e.sems||[]).slice()})),
    competences:d.competences.filter(c=>!c.diplomeId||c.diplomeId===A).map(c=>{
      const ecs=[];
      (c.ecs||[]).forEach(lien=>{
        const e=d.ecs.find(x=>x.id===lien.id);if(!e||!ueIds.includes(e.ueId))return;
        const u=uById(e.ueId)||{sems:SEMS};
        const sems=((lien.sems&&lien.sems.length?lien.sems:e.sems)||[])
          .filter(sem=>(e.sems||[]).includes(sem)&&(u.sems||SEMS).includes(sem));
        sems.forEach(sem=>{const code=ecCodeAt(e,sem)||ecCodesList(e)[0]||nomEc(e);
          ecs.push({ec:code,id:e.id,nom:nomEc(e),couleur:e.couleur||"#9aa2ae",
            ue:u.nom||"UE non précisée",sem,dn:anneeCode(anneeOf(sem),d,dp)})});
      });
      return {code:c.code,libelle:c.libelle,bloc:c.bloc,ecs};
    })};
}
/* Une installation neuve démarre sans référentiel : l'enseignant en reçoit un ou construit le sien.
   Sans référentiel, l'exemple installe celui de la mention Objet livré avec DNMAX (src/heritage/exemple.ts). */
const REF_VIDE = {meta:{diplome:"",niveaux:[],blocTint:"#D1F1DA"},blocs:[],ues:[],familles:[],competences:[]};
let DATA = LS.get("dnmade.data",null);
if(DATA)materialize(DATA);else DATA=construireDonnees(buildData(REF_VIDE,SUPPORTS_DEF));
let REF = projectRef(DATA);
function saveData(repaint,fromDico){
  if(fromDico)materialize(DATA);
  else{absorb(DATA);if(DATA.activeDiplome!==DATA._viewOf)materialize(DATA)}
  persistData();
  REF=computeREF();
  F.items=F.items.filter(it=>REF.competences.some(c=>c.code===it.code));
  cleanOps();syncItemEcs();save();
  if(repaint!==false){paintForm();paintPick();paintLignes();paintRef();if(ui.tab==="org")paintOrg();if(ui.tab==="pref")paintPrefs()}
}
let fiches = LS.get("dnmade.fiches",[]);
/* préférences (menu « Mon compte ») : règles dans src/domaine/preferences.ts, écran dans src/preferences/ */
const PREF=window.dnmaxPont.preferences;
let PREFS = PREF.initiales(LS.get("dnmade.prefs",{}));
function critLabel(){return PREF.libelleCritere(PREFS)}
function savePrefs(){LS.set("dnmade.prefs",PREFS)}
let promos = LS.get("dnmade.promos",[]);

let delArm = null;
/* brouillon de départ : une évaluation vide (vierge() ne peut pas servir ici, elle lit F) */
let F = LS.get("dnmade.draft",null) || {id:uid(),promoId:"",titre:"",livrables:[],semestre:"S1",classe:"",
  date:new Date().toISOString().slice(0,10),prof:"",ues:[],ecCodes:[],compCode:"",consignes:"",
  ops:[],preset:DEF_PRESET_GET(),niveaux:PRESETS[DEF_PRESET_GET()].niveaux.slice(),opts:{crit:true,obs:true},
  eleves:"",items:[],res:{}};
/* Une évaluation de la liste est sa propre référence : un brouillon qui s'en écartait (modifications
   laissées sans « Enregistrer » avant l'enregistrement automatique) ne doit pas l'écraser à la première retouche. */
{const enregistree=fiches.find(f=>f&&f.id===F.id);if(enregistree)F=structuredClone(enregistree)}
migF(F);
/* un diplôme-cadre vierge resté à côté d'un vrai diplôme n'a plus lieu d'être */
{const nt=window.dnmaxPont.nettoyerDiplomesVierges(DATA,promos);
  if(nt&&nt.modifie){DATA=nt.donnees;materialize(DATA);REF=computeREF();persistData()}}
syncItemEcs();
let ui = {tab:"saved",step:1,sel:[],q:"",org:{pane:"diplome"},ref:{pane:"explorer",chain:"",cq:"",q:"",group:"bloc",annee:"*",sems:[]}};
let dl = window.dnmaxPont.telechargements;

function migF(f){return Object.assign(f,EVAL.normaliserEvaluation(f))}
/* Prénom et nom se saisissent à part (prenom, nomFam) ; « nom » reste le nom affiché
   « Prénom Nom ». Règles écrites et testées dans src/domaine/personnes.ts. */
function separerPrenomNom(s){return window.dnmaxPont.personnes.separerPrenomNom(s)}
function composerNom(prenom,nomFam){return window.dnmaxPont.personnes.composerNom(prenom,nomFam)}
function nouvellePersonne(id,ligne){return window.dnmaxPont.personnes.nouvellePersonne(id,ligne)}
function completerPersonne(e){return window.dnmaxPont.personnes.completerPersonne(e)}
function lignesNoms(txt){return window.dnmaxPont.personnes.lignesNoms(txt)}
function syncListe(pr,txt){
  const lignes=txt==null?(pr.liste||[]).map(e=>e.nom):lignesNoms(txt);
  const old=(pr.liste||[]).slice();
  pr.liste=lignes.map(l=>{const nom=composerNom(...Object.values(separerPrenomNom(l)));const i=old.findIndex(e=>e.nom===nom);
    return i>=0?completerPersonne(old.splice(i,1)[0]):nouvellePersonne(newId("s"),l)});
  pr.eleves=pr.liste.map(e=>e.nom).join("\n");
  return pr;
}
/* liste des étudiants d'une promotion : règle écrite et testée dans src/domaine/promotions.ts */
function migPromo(pr){return window.dnmaxPont.promotions.rafraichirListe(pr)}
/* étudiants de l'évaluation : ceux des promotions choisies (ou de l'ancienne promotion liée),
   réduits à un seul si l'évaluation vise un étudiant */
function promoElevesOf(ff){
  let prs=(ff.classes||[]).map(n=>promos.find(p=>p.nom===n)).filter(Boolean);
  if(!prs.length){const pr=promos.find(p=>p.id===ff.promoId);if(pr)prs=[pr]}
  const seen=new Set(), out=[];
  prs.forEach(pr=>migPromo(pr).liste.forEach(e=>{if(!seen.has(e.id)){seen.add(e.id);out.push({id:e.id,nom:e.nom,promo:pr})}}));
  return out;
}
function studentsOf(f){
  const ff=f||F;
  let L=promoElevesOf(ff).map(e=>({id:e.id,nom:e.nom}));
  if(!L.length)L=String(ff.eleves||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean)
    .map((nom,i)=>({id:"libre"+i,nom}));
  const ids=Array.isArray(ff.eleveIds)?ff.eleveIds:(ff.eleveId?[ff.eleveId]:[]);
  if(ids.length){const sel=L.filter(e=>ids.includes(e.id));if(sel.length)return sel}
  return L;
}
function paintEleveField(){
  const fld=document.getElementById("fld-eleve"), host=document.getElementById("f-eleve");
  if(!fld)return;
  fld.hidden=!MOD.eleves;if(!MOD.eleves)return;
  const all=promoElevesOf(F), many=new Set(all.map(e=>e.promo.id)).size>1;
  if(!Array.isArray(F.eleveIds))F.eleveIds=F.eleveId?[F.eleveId]:[];
  delete F.eleveId;
  F.eleveIds=F.eleveIds.filter(id=>all.some(e=>e.id===id));
  host.innerHTML=all.length?all.map(e=>`<button type="button" class="liv" data-elv="${esc(e.id)}" aria-pressed="${F.eleveIds.includes(e.id)}">${esc(e.nom)}${many?`<span class="n">${esc(promoDisp(e.promo.nom))}</span>`:""}</button>`).join("")
    +(F.eleveIds.length?`<button type="button" class="liv add" id="elvAll">Toute la promotion</button>`:"")
    :`<span class="hint">Choisissez d'abord une promotion.</span>`;
  const n=F.eleveIds.length;
  document.getElementById("eleveHint").textContent=!all.length?"":n?(n+" étudiant"+(n>1?"s":"")+" sur "+all.length+" : seuls "+(n>1?"eux sont notés":"lui est noté")+" à l'étape 4 et exporté"+(n>1?"s":"")+"."):"Toute la promotion — "+all.length+" étudiant"+(all.length>1?"s":"")+".";
  host.querySelectorAll("[data-elv]").forEach(b=>b.onclick=()=>{const id=b.dataset.elv;
    F.eleveIds=F.eleveIds.includes(id)?F.eleveIds.filter(x=>x!==id):[...F.eleveIds,id];
    save();paintEleveField();paintSteps();if(ui.step===4)paintEleves()});
  const ab=host.querySelector("#elvAll");if(ab)ab.onclick=()=>{F.eleveIds=[];save();paintEleveField();paintSteps()};
}

/* lignes de la grille, sous la forme qu'attend l'affichage : {k:"op",o,its} ou {k:"one",it} ;
   ce sont les objets mêmes de l'évaluation, que la saisie de la formulation modifie */
function lignesOf(f){
  const parCode=new Map((f.items||[]).map(i=>[i.code,i])), parId=new Map((f.ops||[]).map(o=>[o.id,o]));
  return EVAL.lignesDe(f).map(l=>l.regroupement?{k:"op",o:parId.get(l.regroupement.id),its:l.competences.map(c=>parCode.get(c.code))}
    :{k:"one",it:parCode.get(l.competence.code)});
}
function ligKey(l){return l.k==="op"?"op:"+l.o.id:"one:"+l.it.code}
function ligTitre(l){
  if(l.k==="op")return {code:l.its.map(i=>i.code).join(" + "),
    lib:l.o.libelle||"(compétence opérationnelle à formuler)",op:true};
  const c=REF.competences.find(x=>x.code===l.it.code)||{};
  return {code:l.it.code,lib:l.it.libelle||c.libelle||"",op:false};
}
function resOf(f,eid){
  const ff=f||F;
  if(!ff.res||typeof ff.res!=="object")ff.res={};
  const r=ff.res[eid]||(ff.res[eid]={n:{},obs:{},appr:""});
  if(!r.n)r.n={};if(!r.obs)r.obs={};if(r.appr==null)r.appr="";
  return r;
}
function evalStats(f){
  const ff=f||F, els=studentsOf(ff), keys=lignesOf(ff).map(ligKey);
  return {els:els.length,lignes:keys.length,...SAISIE.bilanSaisie(ff.res,els.map(e=>e.id),keys)};
}
function setClasses(list){Object.assign(F,EVAL.classesNettoyees(list||[]))}
function uid(){return Math.random().toString(36).slice(2,9)}
function asStart(as){const m=String(as||"").match(/(\d{4})/);return m?+m[1]:null}
function dipDuree(id){return +((DATA.diplomes.find(d=>d.id===id)||{}).duree)||3}
function promoDuree(pr){return dipDuree(pr.diplomeId)}
function promoNomAuto(pr){const dp=DATA.diplomes.find(d=>d.id===pr.diplomeId)||{};
  return (dipCode(dp)||"DN")+"-"+pr.debut+"-"+(+pr.debut+promoDuree(pr))}
function migPromoCohorte(pr){
  pr.debut=+pr.debut;
  if(!pr.diplomeId||!DATA.diplomes.some(d=>d.id===pr.diplomeId))pr.diplomeId=DATA.activeDiplome;
  pr.nom=promoNomAuto(pr);
  if(!Array.isArray(pr.liste))migPromo(pr);
  return pr;
}
function promoAnneeAt(pr,as){migPromoCohorte(pr);const y=asStart(as);return y==null?1:y-pr.debut+1}
function promoLive(pr,as){
  as=as||anneeScolaire();
  const a=promoAnneeAt(pr,as);
  pr.as=as;pr.annee=Math.min(promoDuree(pr),Math.max(1,a));
  return pr;
}
function curPromo(){const p=promos.find(x=>x.id===F.promoId);return p?promoLive(p):null}
/* nom simplifié (DNO2, DNE1…) pour une promotion en cours à la date du jour ; sinon nom complet */
function promoShort(pr){
  migPromoCohorte(pr);
  const a=promoAnneeAt(pr,anneeScolaire(new Date()));
  if(a<1||a>promoDuree(pr))return "";
  const dp=DATA.diplomes.find(d=>d.id===pr.diplomeId)||{};
  return dp.id===DATA.activeDiplome?anneeCode(a):dipCode(dp)+a;
}
function promoDisp(name){const pr=promos.find(x=>x.nom===name);return pr?(promoShort(pr)||pr.nom):name}
function classesDisp(f){f=f||F;const l=Array.isArray(f.classes)?f.classes:String(f.classe||"").split(/,\s*/).filter(Boolean);
  return l.map(promoDisp).join(", ")}
function savePromos(){LS.set("dnmade.promos",promos)}
function promoLabel(pr){promoLive(pr);const sh=promoShort(pr);return (sh?sh+" — ":"")+(pr.nom||"Sans nom")+" · Année "+pr.annee+(pr.as?" · "+pr.as:"")+
  " ("+String(pr.eleves||"").split(/\r?\n/).filter(x=>x.trim()).length+")"}
function refreshPromoOption(){const pr=curPromo();if(!pr)return;
  const o=document.querySelector('#f-promo option[value="'+pr.id+'"]');if(o)o.textContent=promoLabel(pr)}
function setSemestre(sem){F.semestre=sem;syncItemEcs()}
function ecsOf(c,sem){return (c.ecs||[]).filter(e=>e.sem===sem)}
function compsFor(sem){return REF.competences.filter(c=>ecsOf(c,sem).length>0)}
/* une UE retenue vaut tous ses EC du semestre */
function itemEcs(c,sem){return EVAL.ecsRetenus(ecsOf(c,sem).map(e=>e.ec),[...F.ecCodes,...(F.ues||[]).flatMap(u=>ecsOfUe(u,sem))])}
function syncItemEcs(){F.items.forEach(it=>{const c=REF.competences.find(x=>x.code===it.code);it.ecs=c?itemEcs(c,F.semestre):[]})}
function ecsOfSem(sem){
  const m=new Map();
  REF.competences.forEach(c=>ecsOf(c,sem).forEach(e=>{if(!m.has(e.ec))m.set(e.ec,{ec:e.ec,nom:e.nom,ue:e.ue,couleur:e.couleur})}));
  return [...m.values()].sort((a,b)=>ecNum(a.ec)-ecNum(b.ec));
}
function uesOfSem(sem){return [...new Set(ecsOfSem(sem).map(e=>e.ue))]}
function ecEntry(code,sem){return ecsOfSem(sem).find(e=>e.ec===code)||null}
function uesSelected(){
  const u=[...(F.ues||[])];
  F.ecCodes.forEach(c=>{const e=ecEntry(c,F.semestre);if(e&&!u.includes(e.ue))u.push(e.ue)});
  return u;
}
function ecsOfUe(u,sem){return ecsOfSem(sem||F.semestre).filter(e=>e.ue===u).map(e=>e.ec)}
function blocName(n){const b=REF.blocs.find(b=>b.num===String(n));return b?b.nom:"Bloc "+n}
function dnOf(sem){const i=SEMS.indexOf(sem);return i<0?"":anneeCode(Math.floor(i/2)+1)}
function dnLabel(sem){if(!MOD.dn)return "";const d=(REF.meta.niveaux||[]).find(n=>+n.annee===anneeOf(sem));return d&&d.label?dnOf(sem)+" · "+d.label:dnOf(sem)}
function anneeLabel(a){return "Année "+a+(MOD.dn?" — "+anneeCode(a):"")}
function semsOfAnnee(a){return EVAL.semestresDeLAnnee(a)}
function dateFiche(d){const t=new Date(d||F.distribPrev||F.date||Date.now());return isNaN(t)?new Date():t}
/* calendrier de l'établissement (Mon établissement > Établissement) */
function calendrier(){return EVAL.lireCalendrier(DATA.etab)}
function anneeScolaire(d){return EVAL.anneeScolaire(dateFiche(d),calendrier())}
function rangSemestre(d){return EVAL.rangSemestre(dateFiche(d),calendrier())}
function semSuggere(d){return EVAL.semestreSuggere(anneeFiche(),dateFiche(d),calendrier())}
function applySemDate(){
  if(F.semManuel)return false;
  const sug=semSuggere();
  if(sug&&sug!==F.semestre){setSemestre(sug);return true}
  return false;
}
function help(html,pos){return `<span class="help ${pos||""}" tabindex="0" role="note" aria-label="Aide"><span class="hbub">${html}</span></span>`}
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function askModal(html,onYes,onNo){
  const prev=document.activeElement;
  const el=document.createElement("div");
  el.className="modal";
  el.innerHTML=`<div class="card" role="dialog" aria-modal="true">
    <p>${html}</p>
    <div class="row"><button class="btn ghost" data-no>Non, juste cette évaluation</button>
      <button class="btn primary" data-yes>Oui, l'ajouter</button></div></div>`;
  const close=fn=>{el.remove();document.removeEventListener("keydown",key);if(prev&&prev.focus)prev.focus();if(fn)fn()};
  const key=e=>{if(e.key==="Escape")close(onNo)};
  el.querySelector("[data-yes]").onclick=()=>close(onYes);
  el.querySelector("[data-no]").onclick=()=>close(onNo);
  el.onclick=e=>{if(e.target===el)close(onNo)};
  document.addEventListener("keydown",key);
  document.body.appendChild(el);
  el.querySelector("[data-yes]").focus();
}
function toast(m){const d=document.createElement("div");d.className="toast";d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),3200)}
/* Chaque modification rejoint aussitôt « Mes évaluations » : rien ne se perd. Une évaluation qui y entre ainsi
   est un brouillon (hors Progression, ni distribuée ni évaluée) jusqu'à « Enregistrer l'évaluation », seul à
   appeler save(true). */
function save(valide){enregistrerDansListe(valide===true);LS.set("dnmade.draft",F);paintEnregistrement()}
/* Une nouvelle évaluation n'entre dans la liste qu'une fois commencée, pour qu'un clic sur
   « Nouvelle évaluation » sans suite n'y laisse pas une ligne vide. */
function evaluationCommencee(f){return SAISIE.evaluationCommencee(f)}
/* Rend "liste" si l'évaluation en cours est dans « Mes évaluations », "bloquee" si son référentiel
   non validé l'empêche d'y entrer, "vide" si elle n'est pas encore commencée. */
function etatEnregistrement(){
  return EVAL.etatEnregistrement({dansLaListe:fiches.some(f=>f.id===F.id),commencee:evaluationCommencee(F),referentielBloquant:dipBloquant(F)});
}
function enregistrerDansListe(valide){
  if(dipBloquant(F))return;
  const i=fiches.findIndex(f=>f.id===F.id);
  if(i<0&&!evaluationCommencee(F))return;
  if(valide)delete F.brouillon;else if(i<0)F.brouillon=true;
  suiviOf(F);
  if(!F.refV){const v=versionPourF();if(v)F.refV=v.id}
  const copy=structuredClone(F);
  if(i>=0)fiches[i]=copy;else fiches.unshift(copy);
  LS.set("dnmade.fiches",fiches);
}
/* Ligne d'enregistrement et barre des étapes : écrans écrits en TypeScript (src/editeur/barre-etapes.ts) */
function paintEnregistrement(){
  const v=versionPourF();
  window.dnmaxPont.editeur.peindreEnregistrement({etat:etatEnregistrement(),brouillon:!!F.brouillon,
    version:v?(REF.meta.diplome||"")+", version du "+frDate(v.date):""});
}

/* ---------- rendu ---------- */
function paintActions(){
  ["bExpJson"].forEach(id=>{
    const b=document.getElementById(id);if(!b)return;
    b.disabled=!dl;
    if(!dl)b.title="Téléchargement indisponible dans cette vue";else b.removeAttribute("title");
  });
}
/* onglets, vues et titre de la fenêtre : src/interface/onglets.ts */
function paintTabs(){
  ui.tab=window.dnmaxPont.interface.afficherPage(document,ui.tab);
  paintEnregistrement();
  paintActions();
}
/* une évaluation vierge, prête à composer */
function vierge(){
  const dp=DATA.diplomes.find(x=>x.id===DATA.activeDiplome)||{};
  return migF({id:uid(),promoId:"",titre:"",livrables:[],semestre:semSuggere()||"S1",classe:"",
    date:new Date().toISOString().slice(0,10),prof:"",ues:[],ecCodes:[],compCode:"",consignes:"",
    ops:[],preset:DEF_PRESET_GET(),niveaux:PRESETS[DEF_PRESET_GET()].niveaux.slice(),opts:{crit:true,obs:true},
    eleves:"",items:[],res:{}});
}
function nouvelleFiche(){
  if(!peutCreerFiche()){alerteRefNonValide(DATA.activeDiplome,"Impossible de créer une évaluation");return}
  F=vierge();
  {const me=DATA.enseignants.find(t=>t.id===DATA.moi);if(me&&me.nom){F.profs=[me.nom];F.prof=me.nom}}save();ui.tab="new";ui.step=1;ui.sel=[];ui.eleve="";
  paintTabs();paintForm();paintPick();paintLignes();goStep(1);
  window.scrollTo({top:0,behavior:"smooth"});
}
function paintForm(){
  REF=computeREF();
  const g=id=>document.getElementById(id);
  const dvs=dipVisibles(), nd=dvs.length;
  g("fld-dip").hidden = true;   // la mention découle des promotions cochées
  if(nd>1){
    g("f-dip").innerHTML=dvs.map(dp=>`<option value="${dp.id}">${esc(dipLabel(dp))}</option>`).join("");
    g("f-dip").value=DATA.activeDiplome;
  }
  paintLivrables();
  g("f-titre").value=F.titre;
  paintClasse();paintEleveField();paintProf();
  g("f-distrib").value=F.distribPrev||""; g("f-rendu").value=F.renduPrev||""; g("f-rendu").min=F.distribPrev||"";
  g("f-consignes").value=F.consignes;
  g("f-eleves").value=F.eleves;
  paintSems();
  paintContexte();
  g("panel-eleves").hidden=true;
  g("step1cols").style.gridTemplateColumns="minmax(0,1fr)";
  paintSteps();
}
function anneeOfClasse(t){return EVAL.anneeDeClasse(t)}
function anneeFiche(){
  const pr=curPromo();if(pr&&pr.annee)return +pr.annee;
  const ofC=c=>{const p2=promos.find(x=>x.nom===c);if(p2){const a=promoAnneeAt(p2,anneeScolaire());return a>=1&&a<=promoDuree(p2)?a:0}
    return anneeOfClasse(c)};
  const ys=[...new Set((F.classes||[]).map(ofC).filter(Boolean))];
  return ys.length===1?ys[0]:0;
}
/* Étape 1, semestre, enseignants et livrables : écrans écrits en TypeScript (src/editeur/etape-evaluation.ts) */
function paintSems(){
  const an=anneeFiche();
  window.dnmaxPont.editeur.peindreSemestres({semestre:F.semestre,tousLesSemestres:SEMS,autorises:an?semsOfAnnee(an):SEMS,annee:an,
    classe:F.classe||"",niveauDn:MOD.dn?dnLabel(F.semestre):"",nombreCompetences:compsFor(F.semestre).length,
    anneeScolaire:anneeScolaire(),choisiALaMain:!!F.semManuel,
    choisir:sem=>{F.semManuel=true;setSemestre(sem);save();paintForm();paintPick()},
    suivreLaDate:()=>{F.semManuel=false;applySemDate();save();paintForm();paintPick()}});
}
/* Étape 1, promotions : écran écrit en TypeScript (src/editeur/etape-evaluation.ts) ; même année de formation pour toutes (src/domaine/cadre-evaluation.ts) */
function paintClasse(){
  if(!Array.isArray(F.classes))migF(F);
  const AS=anneeScolaire();
  // promotions en cours de toutes les mentions du diplôme actif
  const dipA=DATA.diplomes.find(d=>d.id===DATA.activeDiplome)||{};
  const same=DATA.diplomes.filter(d=>norm(d.nom||"")===norm(dipA.nom||"")).map(d=>d.id);
  const dIdx=id=>DATA.diplomes.findIndex(d=>d.id===id);
  const ps=promos.map(migPromoCohorte).filter(pr=>same.includes(pr.diplomeId));
  const yr=pr=>promoAnneeAt(pr,AS), enCours=pr=>{const a=yr(pr);return a>=1&&a<=promoDuree(pr)};
  const live=ps.filter(pr=>enCours(pr)&&promoVisible(pr)).sort((x,y)=>(yr(x)-yr(y))||(dIdx(x.diplomeId)-dIdx(y.diplomeId)));
  const names=[...new Set([...live.map(pr=>pr.nom),...F.classes])].filter(Boolean);
  const bloquant=dipBloquant(F);
  window.dnmaxPont.editeur.peindrePromotions({
    promotions:names.map(n=>{const pr=ps.find(p=>p.nom===n);
      return {nom:n,libelle:promoDisp(n),annee:pr?yr(pr):null,enCours:!!pr&&enCours(pr),referentielValide:!pr||promoRefValide(pr)}}),
    cochees:F.classes,anneeScolaire:AS,aucuneEnCours:!live.length,referentielBloquant:!!bloquant,
    allerValidation:()=>allerValidation(bloquant),basculer:n=>toggleClasse(n)});
}
function paintProf(){
  window.dnmaxPont.editeur.peindreEnseignants({evaluation:F,enseignants:DATA.enseignants.map(t=>t.nom).filter(Boolean),
    enregistrer:()=>save(),apresChangement:()=>{paintContexte();paintSteps()}});
}
/* EC que les enseignants choisis assurent pour les promotions cochées (null : pas de restriction) */
function ecsAffectes(){
  const ids=(F.profs||[]).map(n=>(DATA.enseignants.find(t=>t.nom===n)||{}).id).filter(Boolean);
  const prs=(F.classes||[]).map(n=>promos.find(p=>p.nom===n)).filter(Boolean);
  if(!ids.length||!prs.length)return null;
  const set=new Set();let any=false;
  prs.forEach(pr=>{const A=affGet(pr.id);if(Object.keys(A).length)any=true;
    promoEcs(pr,anneeScolaire()).forEach(e=>{if((A[e.id]||[]).some(id=>ids.includes(id)))set.add(e.code)})});
  return any?set:null;
}
function toggleClasse(v){
  const cs=F.classes||[];
  setClasses(cs.includes(v)?cs.filter(x=>x!==v):[...cs,v]);
  {const pr=F.classes.map(n=>promos.find(p=>p.nom===n)).find(Boolean);F.promoId=pr?pr.id:"";
   if(pr&&pr.diplomeId&&pr.diplomeId!==DATA.activeDiplome&&DATA.diplomes.some(d=>d.id===pr.diplomeId)){
     DATA.activeDiplome=pr.diplomeId;saveData(false)}}
  const an=anneeFiche(), sems=an?semsOfAnnee(an):[];
  if(sems.length&&(!F.semManuel||!sems.includes(F.semestre)))setSemestre(semSuggere()||sems[0]);
  save();paintForm();paintPick();
}
function paintLivrables(){
  window.dnmaxPont.editeur.peindreLivrables({evaluation:F,livrablesEtablissement:livrNames(),
    enregistrer:()=>save(),apresChangement:()=>paintSteps(),
    proposerAjoutEtablissement:v=>askModal(`Ajouter « ${esc(v)} » à la liste des livrables de Mon établissement, pour les prochaines évaluations ?`,
      ()=>{DATA.livrables.push({nom:v,type:""});saveData();toast("« "+v+" » ajouté aux livrables.")})});
}
function brouillonF(){return !!F.brouillon||!fiches.some(f=>f.id===F.id)}
function goStep(n){
  ui.step=window.dnmaxPont.etapesEditeur.etapeAffichee(+n,window.dnmaxPont.etapesEditeur.derniereEtape({moduleEleves:!!MOD.eleves,brouillon:brouillonF()}));
  if(ui.step===3)ui.sel=[];
  paintSteps();
  if(ui.step===1)paintForm();
  if(ui.step===2)paintPick();
  if(ui.step===3)paintLignes();
  if(ui.step===4)paintEleves();
  window.scrollTo({top:0,behavior:"smooth"});
}
function paintSteps(){
  // un brouillon ne s'évalue pas : l'étape 4 se referme (décision 29)
  ui.step=window.dnmaxPont.etapesEditeur.etapeAffichee(ui.step,window.dnmaxPont.etapesEditeur.derniereEtape({moduleEleves:!!MOD.eleves,brouillon:brouillonF()}));
  const st=evalStats(F);
  window.dnmaxPont.editeur.peindreBarreEtapes({evaluation:F,etape:ui.step,moduleEleves:!!MOD.eleves,brouillon:brouillonF(),
    semestre:F.semestre,competencesDisponibles:compsFor(F.semestre).length,bilan:{etudiants:st.els,faits:st.faits,partiels:st.partiels}});
  paintEnregistrement();
}
/* Étape 1, UE et EC : écran écrit en TypeScript (src/editeur/etape-evaluation.ts), règles dans src/domaine/cadre-evaluation.ts */
function paintContexte(){
  const lim=ecsAffectes();
  window.dnmaxPont.editeur.peindreUesEtEcs({evaluation:F,
    ecs:ecsOfSem(F.semestre).map(e=>({ec:e.ec,nom:e.nom||"",ue:e.ue,couleur:e.couleur||ecColor(e.ec)})),
    couleurUe:u=>ueColor(u),nomUe:u=>tidy(u).replace(/^UE\s*/i,""),
    ecsAffectes:lim?[...lim]:null,enseignants:(F.profs||[]).join(", "),
    apresChangement:()=>{syncItemEcs();save();paintForm();paintPick()}});
}
function paintPromos(){
  const g=id=>document.getElementById(id);
  const hp=g("helpPromo");
  if(hp&&!hp.innerHTML)hp.innerHTML=help("Choisir une promotion renseigne la classe de l'évaluation et cale le semestre sur son année de formation. Ses étudiants apparaissent à l'étape 4, où vous notez chacun ; à l'export, le Word sort un document par étudiant, degrés cochés, et l'Excel ajoute un onglet « Grille classe » rempli. Renommer un étudiant lui donne une nouvelle ligne : ses résultats déjà saisis ne le suivent pas.");
  const sel=g("f-promo");
  sel.innerHTML=`<option value="">— Aucune promotion —</option>`+promos.filter(pr=>migPromoCohorte(pr).diplomeId===DATA.activeDiplome||pr.id===F.promoId).map(pr=>
    `<option value="${pr.id}">${esc(promoLabel(pr))}</option>`).join("");
  sel.value=F.promoId||"";
  const pr=curPromo();
  g("promoEdit").hidden=!pr;
  g("fld-eleves-libre").hidden=!!pr;
  if(pr){
    g("p-nom").value=pr.nom||""; g("p-nom").readOnly=true; g("p-nom").title="Code du diplôme, année de début, année de fin";
    g("p-as").value=pr.as||""; g("p-as").readOnly=true;
    g("p-as").title="Déduite de la date de l'évaluation";
    const an=g("p-annee");
    an.innerHTML=(REF.meta.niveaux||[{annee:1},{annee:2},{annee:3}]).map(n=>
      `<option value="${n.annee}">${esc(anneeLabel(n.annee))} — ${semsOfAnnee(n.annee).join(" / ")}</option>`).join("");
    an.value=String(pr.annee);
    g("p-eleves").value=pr.eleves||"";
    const n=(pr.eleves||"").split(/\r?\n/).filter(x=>x.trim()).length;
    g("p-count").textContent=n+(n>1?" inscrits":" inscrit");
    g("bPromoDel").textContent=delArm===pr.id?"Confirmer la suppression":"Supprimer";
  }
}
function selectPromo(id){
  const old=curPromo();
  F.promoId=id||"";delArm=null;
  const pr=curPromo();
  if(pr){
    if(pr.nom)setClasses([...(F.classes||[]).filter(x=>!(old&&x===old.nom)),pr.nom]);
    const sems=semsOfAnnee(pr.annee);
    if(!sems.includes(F.semestre))setSemestre(sems[0]);
  }
  save();paintForm();paintPick();
}
function opIndex(id){return F.ops.findIndex(o=>o.id===id)+1}
function lignes(){return lignesOf(F)}
function cleanOps(){Object.assign(F,EVAL.nettoyerRegroupements(F))}
/* Étape 3, formulation : écran écrit en TypeScript (src/editeur/formulation.ts), qui reçoit l'évaluation en cours */
function contexteFormulation(){
  return {evaluation:F,libelleCritere:critLabel(),
    libelleCompetence:code=>(REF.competences.find(x=>x.code===code)||{}).libelle||"",
    selection:()=>ui.sel,retenirSelection:cles=>{ui.sel=[...cles]},
    nouvelIdentifiant:uid,enregistrer:()=>save(),apresChangement:()=>paintSteps(),annoncer:m=>toast(m)};
}
function paintLignes(){window.dnmaxPont.editeur.peindreFormulation(contexteFormulation())}
/* ---------- étape 4 : évaluation des étudiants ---------- */
/* Niveau de maîtrise en pourcentage continu (0 à 100, sans crans visibles).
   Règle quel que soit le nombre N de niveaux : les deux niveaux extrêmes occupent chacun 60/N %
   (15 % pour 4 niveaux), les niveaux intermédiaires se partagent le reste à parts égales.
   Dans le premier et le dernier niveau, la jauge ne se remplit pas progressivement :
   elle vaut 0 dans le premier, 100 dans le dernier. r.n[k] garde l'indice du niveau, r.p[k] le pourcentage. */
/* Seuils des niveaux, position du curseur : règles testées dans src/domaine/saisie-resultats.ts */
function pctBounds(N){return SAISIE.bornesNiveaux(N)}
function pctLvl(p,N){return SAISIE.niveauDuPourcentage(p,N)}
function pctSnap(p,N){return SAISIE.aimanterPourcentage(p,N)}
function pctOf(r,k){return SAISIE.pourcentageAffiche(r,k,(F.niveaux||[]).length)}
/* Couleur et encre de chaque niveau : règles dans src/domaine/teintes-niveaux.ts */
function nivColor(i,n){return window.dnmaxPont.teintes.couleurNiveau(i,n)}
function nivEncre(i,n){return window.dnmaxPont.teintes.encreNiveau(i,n)}
function pctTxt(p,niv){
  niv=niv||F.niveaux||[];if(p==null)return "";
  const N=niv.length,l=pctLvl(p,N);
  return niv[l]||"";
}
/* Rendu de chaque étudiant (module Étudiants) : statut lu par les règles de src/domaine/saisie-resultats.ts */
function estOf(r){return SAISIE.statutRendu(r)}
function rendusManquants(f){if(!MOD.eleves)return 0;return SAISIE.etudiantsSansRendu(f.res,studentsOf(f).map(e=>e.id))}
/* Étape 4, saisie des étudiants : écran écrit en TypeScript (src/editeur/saisie-etudiants.ts), qui reçoit l'évaluation en cours */
function contexteSaisie(){
  if(!F.res||typeof F.res!=="object")F.res={};
  return {resultats:F.res,niveaux:F.niveaux||[],etudiants:studentsOf(F),
    lignes:lignes().map(l=>{const t=ligTitre(l);return {cle:ligKey(l),code:t.code,libelle:t.lib}}),
    vue:{mode:ui.emode==="fiche"?"fiche":"grille",etudiant:ui.eleve||""},
    aujourdhui:()=>new Date().toISOString().slice(0,10),
    retenirVue:v=>{ui.emode=v.mode;ui.eleve=v.etudiant},
    enregistrer:()=>save(),apresSaisie:()=>paintSteps(),annoncer:m=>toast(m)};
}
function paintEleves(){
  const host=document.getElementById("elevesPane");if(!host)return;
  window.dnmaxPont.editeur.peindreSaisieEtudiants(host,contexteSaisie());
}
function linkSelection(){window.dnmaxPont.editeur.lierSelection(contexteFormulation())}
/* Étape 2, compétences : écran écrit en TypeScript (src/editeur/competences.ts) ; la progression de la promotion
   (ses autres évaluations enregistrées, hors celle-ci) est calculée par src/domaine/progression-competences.ts */
function contexteCompetences(){
  const sem=F.semestre, dispo=compsFor(sem);
  const lim=ecsAffectes(), codes=F.ecCodes.length?F.ecCodes:(lim?[...lim]:[]);
  const prs=(F.classes||[]).map(n=>promos.find(p=>p.nom===n)).filter(Boolean);
  const progression=prs.length?window.dnmaxPont.progressionCompetences({codes:dispo.map(c=>c.code),semestre:sem,
    evaluations:fiches.filter(f=>f.id!==F.id&&!f.brouillon&&prs.some(pr=>(f.classes||[]).includes(pr.nom)||f.promoId===pr.id)),
    idsEtudiants:prs.flatMap(pr=>migPromo(pr).liste).map(e=>e.id),estEvaluee:evalueeF,moduleEleves:!!MOD.eleves}):null;
  return {evaluation:F,semestre:sem,
    competences:dispo.map(c=>({code:c.code,libelle:c.libelle,bloc:String(c.bloc),nomBloc:blocName(c.bloc),dansLeCadre:ecsOf(c,sem).some(e=>codes.includes(e.ec))})),
    cadre:codes.length?{enseignements:codes.length,unites:uesSelected().length}:null,
    toutVoir:()=>!!ui.allComps,basculerToutVoir:()=>{ui.allComps=!ui.allComps},
    recherche:()=>norm(ui.q.trim()),normaliser:norm,
    progression,nomPromotions:classesDisp(F),statutDe:f=>ST_LBL[statutOf(f)].toLowerCase(),
    filtre:()=>ui.pf||"tout",retenirFiltre:f=>{ui.pf=f},
    ecsDe:code=>itemEcs(REF.competences.find(x=>x.code===code),sem),
    regroupementDe:op=>({numero:opIndex(op),libelle:(F.ops.find(o=>o.id===op)||{}).libelle||""}),
    teinteBloc:BLOC_TINT,enregistrer:()=>save(),apresChangement:()=>paintSteps()};
}
function paintPick(){window.dnmaxPont.editeur.peindreCompetences(contexteCompetences())}
/* restitution : par promotion (module de base) et, avec le module Étudiants, par étudiant */
/* Suivi d'une évaluation : saisie dans DNMAX → distribuée aux étudiants (avec date de rendu) →
   évaluée (fiche remplie à la main hors DNMAX, ou saisie dans DNMAX) → restituée (par promotion,
   et par étudiant avec le module Étudiants). f.suivi = {saisie, distrib, butoir, evalue, mode:"main"|"dnmax"} */
/* Règles du suivi (statuts, libellés, frise) : src/domaine/suivi-evaluation.ts */
const SUIVI=window.dnmaxPont.suivi;
const ST_LBL=SUIVI.LIBELLES_STATUT;
function suiviOf(f){f.suivi=f.suivi||{};if(!f.suivi.saisie)f.suivi.saisie=f.date||new Date().toISOString().slice(0,10);return f.suivi}
function saisieDnmax(f){return SUIVI.avancementSaisie(f,studentsOf(f).map(e=>e.id))}
/* Le statut n'est jamais saisi : il découle de ce qui a été fait sur l'évaluation.
   - Restituée (en partie) : restitution marquée pour la ou les promotions, ou, avec le module Étudiants, pour chaque étudiant ;
   - Évaluée : tous les étudiants saisis dans DNMAX, ou évaluation marquée terminée (évaluation à la main) ;
   - Évaluation en cours : au moins un étudiant saisi dans DNMAX, ou grille d'évaluation exportée (sans module Étudiants) ;
   - Distribuée / Rendus à évaluer : les dates prévues de distribution / de rendu sont passées ;
   - Préparée : sinon. */
const isoToday=()=>new Date().toISOString().slice(0,10);
function promosNomsOf(f){return SUIVI.promotionsVisees(f)}
function restEleves(f){if(!MOD.eleves)return {n:0,tot:0};return SUIVI.restitutionsEtudiants(f,studentsOf(f).map(e=>e.id))}
/* suiviOf complète la date de saisie d'une évaluation ancienne avant de lire son statut */
function statutOf(f){
  suiviOf(f);
  return SUIVI.statutEvaluation(f,{aujourdhui:isoToday(),moduleEleves:!!MOD.eleves,idsEtudiants:MOD.eleves?studentsOf(f).map(e=>e.id):[]});
}
function evalueeF(f){return SUIVI.estEvaluee(statutOf(f))}
const fmtD=d=>d?d.split("-").reverse().slice(0,2).join("/"):"";
/* suivi simplifié (Paramètres > Règles d'évaluation) : affichage seul, le statut détaillé reste celui de l'évaluation */
function suiviSimple(){return !!LS.get("dnmade.reglages",{}).suiviSimplifie}
/* nombre d'étudiants ayant une évaluation individuelle enregistrée (niveaux, observations, appréciation ou restitution) */
function nbIndiv(f){return Object.values(f.res||{}).filter(r=>r&&(Object.values(r.n||{}).some(v=>v!=null&&v!=="")||Object.values(r.obs||{}).some(Boolean)||r.appr||r.rest)).length}
/* L'évaluation en cours d'édition ne doit pas garder celle qu'on supprime : la prochaine modification la remettrait dans la liste. */
function retirerDeLaListe(i){const f=fiches[i];if(!f)return;
  fiches.splice(i,1);LS.set("dnmade.fiches",fiches);
  if(F.id===f.id){F=vierge();LS.set("dnmade.draft",F)}
  paintSaved()}
function armList(key){ui.delArm=key;paintSaved();setTimeout(()=>{if(ui.delArm===key){ui.delArm=null;paintSaved()}},6000)}
/* filtres de la liste des évaluations : par défaut, promotions en cours et évaluations dont je suis l'enseignant·e */
/* Visibilité : un enseignant ne voit que les promotions de sa répartition de service (et leurs étudiants).
   Si « C'est moi » n'est pas défini, ou s'il n'a encore aucune affectation, tout reste visible. */
function mesPromoIds(){const me=DATA.moi;if(!me)return null;
  const ids=promos.filter(pr=>teachesPromo(pr.id,me)).map(p=>p.id);
  return ids.length?new Set(ids):null}
function promoVisible(pr){const v=mesPromoIds();return !v||v.has(pr.id)}
/* règles des filtres : écrites et testées dans src/domaine/filtres-evaluations.ts */
function sfDefault(){return window.dnmaxPont.filtresEvaluations.filtresParDefaut()}
function sfState(){return window.dnmaxPont.filtresEvaluations.normaliserFiltres(ui.sf=ui.sf||sfDefault())}
function profsOf(f){return window.dnmaxPont.filtresEvaluations.profsDe(f)}
function moiNom(){return (DATA.enseignants.find(t=>t.id===DATA.moi)||{}).nom||""}
function promosOfF(f){
  const l=Array.isArray(f.classes)&&f.classes.length?f.classes:String(f.classe||"").split(/,\s*/).filter(Boolean);
  const ps=l.map(n=>promos.find(x=>x.nom===n)).filter(Boolean);
  if(f.promoId){const p=promos.find(x=>x.id===f.promoId);if(p&&!ps.includes(p))ps.push(p)}
  return ps;
}
function promoEnCours(pr){const a=promoAnneeAt(pr,anneeScolaire(new Date()));return a>=1&&a<=promoDuree(pr)}
/* sélections multiples : une liste vide = pas de filtre ; "cur" = toutes les promotions en cours */
function sfMatch(f){return window.dnmaxPont.filtresEvaluations.correspondFiltres(f,sfState(),{visibles:mesPromoIds(),promotionsDe:promosOfF,enCours:promoEnCours,moi:moiNom(),statut:statutOf})}
function sfActive(){return window.dnmaxPont.filtresEvaluations.filtresActifs(sfState())}
/* barre des filtres de Mes évaluations : écran écrit en TypeScript (src/evaluations/filtres.ts),
   règles dans src/domaine/filtres-evaluations.ts */
function paintSavedFilters(){
  const host=document.getElementById("sFilters");
  promos.forEach(migPromoCohorte);
  const dipIdx=id=>DATA.diplomes.findIndex(d=>d.id===id);
  const sorted=promos.filter(promoVisible).sort((a,b)=>(dipIdx(a.diplomeId)-dipIdx(b.diplomeId))||(b.debut-a.debut));
  window.dnmaxPont.evaluations.peindreFiltres(host,{filtres:()=>sfState(),reinitialiser:()=>{ui.sf=sfDefault()},
    promotions:sorted.map(p=>({id:p.id,nom:p.nom,court:promoShort(p)||"",enCours:promoEnCours(p)})),
    existe:id=>promos.some(p=>p.id===id),
    nomPromotion:id=>{const p=promos.find(x=>x.id===id);return p?(promoShort(p)||p.nom||""):""},
    statuts:ST_LBL,ouvert:()=>ui.sfOpen||"",retenirOuvert:k=>{ui.sfOpen=k},redessiner:paintSaved});
}
/* liste de Mes évaluations : écran écrit en TypeScript (src/evaluations/liste.ts), règles de la frise dans
   src/domaine/frise-suivi.ts ; la fenêtre des actions est dans src/evaluations/actions.ts. */
function paintSaved(){
  paintSavedFilters();
  const h=document.getElementById("savedList");
  const syncF=f=>{if(F&&F.id===f.id){F.suivi=structuredClone(f.suivi);F.restit=structuredClone(f.restit||{});save()}LS.set("dnmade.fiches",fiches)};
  const contexteActions={evaluation:i=>fiches[i],moduleEleves:!!MOD.eleves,suivi:suiviOf,saisie:saisieDnmax,rendusManquants,
    evaluationsIndividuelles:nbIndiv,promotionsVisees:promosNomsOf,nomPromotion:promoDisp,promotions:f=>classesDisp(f),
    armee:()=>ui.delArm||null,armer:armList,desarmer:()=>{ui.delArm=null},aujourdhui:isoToday(),annoncer:toast,
    evaluer:i=>{if(refBloque(fiches[i],"Impossible de saisir les résultats"))return;
      F=migF(structuredClone(fiches[i]));vueMention(mentionDeFiche(F));save();
      ui.tab="new";ui.step=4;ui.eleve="";paintTabs();paintForm();paintPick();paintLignes();goStep(4)},
    exporter:(i,k,mode)=>{const f=fiches[i];if(!f)return;
      if(mode==="rest"){askRestitWarn(f,()=>exportFiche(i,k,"rest"));return}
      exportFiche(i,k,"eval");if(!suiviOf(f).exporte){f.suivi.exporte=isoToday();syncF(f)}paintSaved()},
    dupliquer:i=>{if(refBloque(fiches[i],"Impossible de dupliquer cette évaluation"))return;F=migF(structuredClone(fiches[i]));vueMention(mentionDeFiche(F));F.id=uid();F.titre+=" (copie)";F.date=new Date().toISOString().slice(0,10);delete F.distribPrev;delete F.renduPrev;if(F.suivi)F.suivi.saisie=F.date;save();ui.tab="new";paintTabs();paintForm();paintPick()},
    synchroniser:(f,vides)=>{if(vides&&F&&F.id===f.id){F.res={};save()}
      if(F&&F.id===f.id){if(f.annulee)F.annulee=f.annulee;else delete F.annulee}},
    enregistrer:f=>{syncF(f);paintSaved()}};
  const openF=i=>{F=migF(structuredClone(fiches[i]));vueMention(mentionDeFiche(F));save();ui.tab="new";ui.sel=[];ui.eleve="";
    paintTabs();paintForm();paintPick();paintLignes();goStep(ui.step===4?1:ui.step)};
  window.dnmaxPont.evaluations.peindreListe(h,document.getElementById("sCount"),{evaluations:()=>fiches,visible:sfMatch,
    moduleEleves:!!MOD.eleves,suiviSimplifie:suiviSimple(),promotions:f=>classesDisp(f),statut:statutOf,suivi:suiviOf,
    saisie:saisieDnmax,restitutions:restEleves,datesRestitutionEtudiants:f=>studentsOf(f).map(e=>((f.res||{})[e.id]||{}).rest),
    rendusManquants,evaluationsIndividuelles:nbIndiv,armee:ui.delArm||null,
    etapeOuverte:()=>ui.stOpen==null?null:String(ui.stOpen),retenirEtape:k=>{ui.stOpen=k},aujourdhui:isoToday(),
    enregistrer:f=>{syncF(f);paintSaved()},
    synchroniserPrevu:(f,k2)=>{if(F&&F.id===f.id){if(f[k2])F[k2]=f[k2];else delete F[k2];save()}},
    ouvrir:openF,ouvrirActions:i=>window.dnmaxPont.evaluations.ouvrirActions(i,contexteActions),
    supprimer:i=>{const f=fiches[i];if(!f||!f.annulee)return;
      const n=nbIndiv(f);
      if(n){toast("Suppression impossible : supprimez d'abord les "+n+" évaluation"+(n>1?"s":"")+" individuelle"+(n>1?"s":"")+" (bouton « Actions… »).");return}
      const k="f:"+f.id;
      if(ui.delArm!==k){toast("Suppression définitive : cliquez sur « Confirmer la suppression ».");armList(k);return}
      ui.delArm=null;retirerDeLaListe(i);toast("Évaluation supprimée.")},
    supprimerBrouillon:i=>{const f=fiches[i];if(!f||!f.brouillon)return;
      const k="b:"+f.id;
      if(ui.delArm!==k){toast("Suppression définitive : cliquez sur « Confirmer la suppression ».");armList(k);return}
      ui.delArm=null;retirerDeLaListe(i);toast("Brouillon supprimé.")},
    filtresParDefaut:()=>{ui.sf=sfDefault();paintSaved()},toutAfficher:()=>{ui.sf={per:[],mine:false,sem:[],st:[],q:""};paintSaved()},
    nouvelleEvaluation:nouvelleFiche,chargerExemple:loadDemo,
    apresDessin:()=>window.dnmaxPont.evaluations.apresDessinListe(h,contexteActions)});
}
const GROUPS = {bloc:"Par bloc de compétences",ue:"Par unité d'enseignement",ec:"Par enseignement constitutif",
  annee:"Par année",semestre:"Par semestre",liste:"Liste à plat"};
const tidy = s => String(s==null?"":s).replace(/([A-ZÀ-Ý])-([A-ZÀ-Ý])/g,"$1$2").trim();
const BLOC_TINT = (REF.meta&&REF.meta.blocTint)||"#D1F1DA";
function hueOf(k){let h=0;for(const ch of String(k||""))h=(h*31+ch.charCodeAt(0))%360;return `hsl(${h} 52% 60%)`}
function refEcByCode(code){return (REF.ecs||[]).find(x=>ANNEES.some(a=>(x.codes||{})[a]===code))||null}
function ecColor(code){const e=refEcByCode(code);return (e&&e.couleur)||hueOf(code)}
function ecNomRef(code){const e=refEcByCode(code);return (e&&e.nom)||code}
function ueColor(ue){const u=(REF.ues||[]).find(x=>tidy(x.nom)===tidy(ue));return (u&&u.couleur)||hueOf(ue)}
const ueOrd = ue => {const i=(REF.ecs||[]).findIndex(e=>tidy(e.ue)===ue);return i<0?99:i};
const norm = s => String(s==null?"":s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
function ecNum(ec){return window.dnmaxPont.constituer.numeroCode(ec)}
function lienEc(c,id){return ((c||{}).ecs||[]).find(x=>x.id===id)||null}
function ecOrd(e){return window.dnmaxPont.constituer.ordreEc(e||{})}
/* Explorer : la carte (radiale ou chaîne) reste dessinée ici ; la vue « Recherche » est écrite en TypeScript
   (src/referentiel/recherche.ts), ses règles dans src/domaine/exploration.ts */
function paintExplore(){
  const m=REF.meta||{};
  paintMap();
  document.getElementById("refSearch").hidden = (ui.ref.view||"radial")!=="search";
  window.dnmaxPont.referentiel.peindreRecherche({competences:REF.competences,recherche:ui.ref,filtre:refFilter(),modes:GROUPS,
    annees:(m.niveaux||[]).map(n=>({annee:String(n.annee),libelle:anneeLabel(n.annee)})),teinteBlocs:BLOC_TINT,
    nomBloc:blocName,rangUe:ueOrd,couleurUe:ueColor,couleurEc:ecColor,nomEcReferentiel:ecNomRef,
    sousTitreAnnee:p=>MOD.dn?(p.dn+" · "+(((REF.meta.niveaux||[]).find(n=>+n.annee===p.annee)||{}).label||"")):("Semestres "+semsOfAnnee(p.annee).join(" et ")),
    sousTitreSemestre:p=>"Année "+p.annee+(MOD.dn?" · "+p.dn:""),diplome:REF.meta.diplome||"",redessiner:paintRef});
}

function arcPath(cx,cy,r0,r1,a0,a1){
  const P=(r,a)=>[(cx+r*Math.cos(a)).toFixed(2),(cy+r*Math.sin(a)).toFixed(2)];
  const big=(a1-a0)>Math.PI?1:0;
  const [x0,y0]=P(r1,a0),[x1,y1]=P(r1,a1),[x2,y2]=P(r0,a1),[x3,y3]=P(r0,a0);
  return `M${x0} ${y0}A${r1} ${r1} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${big} 0 ${x3} ${y3}Z`;
}
function lab(cx,cy,r,a,txt,cls,size){
  const x=cx+r*Math.cos(a), y=cy+r*Math.sin(a);
  let deg=a*180/Math.PI;
  const flip=deg>90||deg<-90;
  if(flip)deg+=180;
  return `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${deg.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"
    text-anchor="middle" dominant-baseline="middle" font-size="${size}">${esc(txt)}</text>`;
}
function refFilter(){
  const f=ui.ref.filter;
  if(!f||!f.kind||!["ue","ec","bloc","comp"].includes(f.kind))return (ui.ref.filter={kind:"",value:""});
  // un filtre « EC » retenu d'une version antérieure portait un code, il porte maintenant un identifiant
  if(f.kind==="ec"&&!DATA.ecs.some(e=>e.id===f.value))return (ui.ref.filter={kind:"",value:""});
  return f;
}
function filtUes(ues){const f=refFilter(),D=DATA;
  if(f.kind==="ue")return ues.filter(u=>u.nom===f.value);
  if(f.kind==="ec"){const e=D.ecs.find(x=>x.id===f.value)||{};return ues.filter(u=>u.id===e.ueId)}
  return ues}
function filtEcs(ecs){const f=refFilter();return f.kind==="ec"?ecs.filter(e=>e.id===f.value):ecs}
function filtComps(cs){const f=refFilter();
  if(f.kind==="bloc")return cs.filter(c=>String(c.bloc)===f.value);
  if(f.kind==="comp")return cs.filter(c=>c.code===f.value);
  return cs}
function radialGroups(){
  const D=DATA;
  const g=filtUes(D.ues).map(u=>({u,ecs:filtEcs(D.ecs.filter(e=>e.ueId===u.id)).sort((a,b)=>ecOrd(a)-ecOrd(b))}))
    .filter(x=>x.ecs.length);
  const orph=filtEcs(D.ecs.filter(e=>!D.ues.some(u=>u.id===e.ueId)));
  if(orph.length&&refFilter().kind!=="ue")g.push({u:{id:"",nom:"Sans UE",couleur:"#9aa2ae"},ecs:orph});
  return g;
}
function compsOfEc(id){
  return DATA.competences.filter(c=>(c.ecIds||[]).includes(id));
}
let wheelAngle=0, wheelRaf=0;
// carte radiale : nouvelle mise à l'échelle quand la colonne ou la fenêtre change de taille
let radRedim=null, radObs=null;
window.addEventListener("resize",()=>{if(radRedim)radRedim()});
// Z0 : zoom de départ (quart bas-droit de la roue) ; ZMAX : grossissement le plus fort permis
const RAD={RARR:505,Z0:1.65,ZMAX:2.5,S:760,c:380,PAD:100,HUB:84,RB:360,RL:380,DIST:[9,17,25,33]};
function wrapN(txt,n,max,cut){
  const raw=String(txt==null?"":txt).split(/\s+/),ws=[];
  raw.forEach(w=>{
    if(cut){ws.push(w.length>n?w.slice(0,Math.max(1,n-1))+"…":w);return}
    while(w.length>n){ws.push(w.slice(0,n-1)+"-");w=w.slice(n-1)}if(w)ws.push(w)});
  const L=[];let cur="";
  ws.forEach(w=>{if((cur+" "+w).trim().length>n){if(cur)L.push(cur.trim());cur=w}else cur+=" "+w});
  if(cur.trim())L.push(cur.trim());
  if(L.length>max){const out=L.slice(0,max);out[max-1]=out[max-1].slice(0,Math.max(1,n-1))+"…";return out}
  return L;
}
function fitN(txt,size,lh,box,maxl){
  const n=Math.max(3,Math.round(box/(size*0.55)));
  const max=maxl||Math.max(1,Math.floor(box/lh));
  return wrapN(txt,n,max,true);
}
function tlabel(x,y,lines,cls,size,lh){
  if(!lines.length)return "";
  return `<text class="lbl ${cls}" data-x="${x.toFixed(1)}" data-y="${y.toFixed(1)}" font-size="${size}" text-anchor="middle">`+
    lines.map((t,i)=>`<tspan x="${x.toFixed(1)}" y="${(y+(i-(lines.length-1)/2)*lh).toFixed(1)}">${esc(t)}</tspan>`).join("")+
    `</text>`;
}
function polar(c,r,a){return [c+r*Math.cos(a),c+r*Math.sin(a)]}
function paintRadial(){
  const D=DATA, m=REF.meta||{};
  const groups=radialGroups();
  const S=760, c=S/2, HUB=84;
  const R={ue:[90,186],ec:[192,274],an:[280,324],dot:338};
  const w=g=>Math.max(1,g.ecs.length);
  const tot=groups.reduce((a,g)=>a+w(g),0)||1;
  const GAP=0.014;
  let a=-Math.PI/2, out=[], dots=[];
  const sg=(kind,sel,inner,p,id,sem)=>`<g class="sg" data-sel="${esc(sel)}" data-kind="${kind}" data-id="${esc(id||"")}"${sem?` data-sem="${esc(sem)}"`:""} tabindex="0"`
    +(p?` data-ring="${p.ring}" data-a0="${p.a0.toFixed(4)}" data-a1="${p.a1.toFixed(4)}" data-am="${p.am.toFixed(4)}"`:"")
    +`>${inner}</g>`;
  groups.forEach(g=>{
    const span=(w(g)/tot)*Math.PI*2, a0=a+GAP/2, a1=a+span-GAP/2;
    const uc=g.u.couleur||"#9aa2ae";
    const uam=(a0+a1)/2, ur=(R.ue[0]+R.ue[1])/2;
    const [ux,uy]=polar(c,ur,uam);
    out.push(sg("ue",g.u.nom,
      `<path class="seg" d="${arcPath(c,c,R.ue[0],R.ue[1],a0,a1)}" fill="${esc(uc)}" fill-opacity=".8"/>`+
      tlabel(ux,uy,fitN(g.u.nom.replace(/^UE\s*/i,""),10,11,Math.min((a1-a0)*ur,R.ue[1]-R.ue[0])-10),"lue",10,11),
      {ring:0,a0,a1,am:uam},g.u.id));
    let e0=a0;
    const step=(a1-a0)/Math.max(1,g.ecs.length);
    g.ecs.forEach(ec=>{
      const c0=e0+GAP/3, c1=e0+step-GAP/3, cm=(c0+c1)/2;
      const col=ec.couleur||uc;
      const nom=String(ec.nom||"").trim();
      const rNom=(R.ec[0]+R.ec[1])/2;
      const larg=(c1-c0)*rNom;
      const lignes=nom?fitN(nom,9,9.5,larg-3,4):[];
      const [ex,ey]=polar(c,rNom,cm);
      out.push(sg("ec",ec.id,
        `<path class="seg" d="${arcPath(c,c,R.ec[0],R.ec[1],c0,c1)}" fill="${esc(col)}" fill-opacity=".45"/>`+
        (lignes.length?tlabel(ex,ey,lignes,"lecn",9,9.5):""),
        {ring:1,a0:c0,a1:c1,am:cm},ec.id));
      // couronne des années : une part par année de diplôme, semestres réunis
      const sems0=SEMS.filter(x=>(ec.sems||[]).includes(x));
      const sl0=sems0.length||1, sstep0=(c1-c0)/sl0;
      const ans=ANNEES.map(an=>({an,idx:sems0.map((sm,i)=>anneeOf(sm)===an?i:-1).filter(i=>i>=0)})).filter(x=>x.idx.length);
      (ans.length?ans:[{an:0,idx:[0]}]).forEach(({an,idx})=>{
        const sep=ans.length>1;
        const b0=c0+Math.min(...idx)*sstep0+(sep?GAP/5:0), b1=c0+(Math.max(...idx)+1)*sstep0-(sep?GAP/5:0), bm=(b0+b1)/2;
        const rb=(R.an[0]+R.an[1])/2, larg=(b1-b0)*rb-4;
        const lbl=an?("Année "+an):"—", court=an?("A"+an):"—";
        const [mx2,my2]=polar(c,rb,bm);
        out.push(sg("an",ec.id+"|"+an,
          `<path class="seg" d="${arcPath(c,c,R.an[0],R.an[1],b0,b1)}" fill="${esc(col)}" fill-opacity=".26"/>`+
          tlabel(mx2,my2,[lbl.length*4.6<=larg?lbl:court],"lan",10.5,10),
          {ring:2,a0:b0,a1:b1,am:bm},ec.id,String(an)));
      });
      // points extérieurs : une compétence portée par cet EC, tous semestres confondus
      const comps=filtComps(compsOfEc(ec.id));
      comps.forEach((cp,i)=>{
        const ang=c0+((i+0.5)/comps.length)*(c1-c0);
        const rr=R.dot+(i%3)*10;
        const [dx,dy]=polar(c,rr,ang);
        dots.push(`<circle class="dot" cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="5.2"
          fill="${esc(col)}" data-sel="${esc(cp.code)}" data-kind="comp" data-id="${esc(cp.id)}" tabindex="0"
          data-ring="3" data-am="${ang.toFixed(4)}"><title>${esc(cp.code+" · "+(cp.libelle||""))}</title></circle>`);
      });
      e0+=step;
    });
    a+=span;
  });
  const dipL=wrapN(m.diplomeNom||m.diplome||"Aucun diplôme",14,3);
  const men=m.mention?"mention "+m.mention:"";
  const n=dipL.length+(men?1:0);
  let hy=c-((n-1)*16)/2;
  let hub="";
  dipL.forEach(t=>{hub+=`<text class="lhub" x="${c}" y="${hy.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${esc(t)}</text>`;hy+=16});
  if(men)hub+=`<text class="lmen" x="${c}" y="${hy.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${esc(men)}</text>`;
  const P=RAD.PAD;
  return `<svg viewBox="${-P} ${-P} ${S+2*P} ${S+2*P}" class="radial" role="img" aria-label="Carte du référentiel">
    <g id="wheelRot" transform="rotate(${wheelAngle.toFixed(2)} ${c} ${c})">${out.join("")}${dots.join("")}<g id="radSpread"></g></g>
    <circle class="hub" cx="${c}" cy="${c}" r="${HUB}"/>
    ${hub}
    <path class="zone" d="${arcPath(c,c,HUB+2,332,-Math.PI/4,Math.PI/4)}"/>
  </svg>`;
}
function chainNode(o){
  const lh=12.5,pad=9;
  const h=Math.max(34,(o.code?13:0)+o.t.length*lh+(o.sub?13:0)+pad*2-4);
  return {...o,h};
}
function chainSvgNode(o,w){
  const lh=12.5,pad=9;
  let ty=o.y+pad+6,t="";
  if(o.code){t+=`<text class="ccode" x="${o.x+12}" y="${ty.toFixed(1)}">${esc(o.code)}</text>`;ty+=13}
  o.t.forEach(l=>{t+=`<text class="cn${o.strong?" b":""}" x="${o.x+12}" y="${ty.toFixed(1)}">${esc(l)}</text>`;ty+=lh});
  if(o.sub){const sb=o.sub.length>32?o.sub.slice(0,31).trim()+"…":o.sub;
    t+=`<text class="cs" x="${o.x+12}" y="${(ty+1).toFixed(1)}">${esc(sb)}</text>`}
  return `<g class="cnode" id="${o.id}" data-node="${o.id}" data-kind="${o.kind}" data-sel="${esc(o.sel)}" data-code0="${esc(o.code||"")}" tabindex="0">
    <rect x="${o.x}" y="${o.y.toFixed(1)}" width="${w}" height="${o.h.toFixed(1)}" rx="7" class="cbox" style="--c:${esc(o.col)}"/>
    <rect x="${o.x}" y="${o.y.toFixed(1)}" width="4" height="${o.h.toFixed(1)}" rx="2" fill="${esc(o.col)}"/>
    ${t}</g>`;
}
function ecName(e){return e?(String(e.nom||"").trim()||ecCodeLbl(e)):""}
/* ---- Carte heuristique : cinq colonnes, l'une verrouillée en roue, les autres montrent ce qui lui est associé.
   Le semestre s'intercale entre la compétence et l'EC : c'est lui qui porte le code de l'année. ---- */
const CH_KINDS=["comp","sem","ec","ue","dip"];
const CH_LBL={comp:"Compétence",sem:"Semestre",ec:"Enseignement constitutif",ue:"Unité d'enseignement",dip:"Diplôme"};
/* un élément « semestre » : S1…S6, ceux où au moins un des EC retenus est assuré */
function semItems(ecs){
  return SEMS.filter(sm=>(ecs||[]).some(e=>(e.sems||[]).includes(sm)))
    .map(sm=>({id:sm,sem:sm,annee:anneeOf(sm),num:sm.slice(1)}));
}
function semLie(c,x){return ((c||{}).ecs||[]).some(l=>(l.sems||[]).includes(x.sem))}
const CH_WH=236;
function chainModel(){
  const D=DATA, f=refFilter();
  const dip=D.diplomes.find(x=>x.id===D.activeDiplome)||{id:"",nom:"Diplôme",mention:""};
  const uIdx=id=>D.ues.findIndex(u=>u.id===id);
  const ueOfE=e=>e?D.ues.find(u=>u.id===e.ueId)||null:null;
  // ensembles autorisés par le filtre des tuiles
  let A=null;
  if(f.kind){
    let C=[],E=[],U=[];
    const compsOfE=es=>D.competences.filter(c=>(c.ecIds||[]).some(x=>es.some(e=>e.id===x)));
    const ecsOfC=cs=>D.ecs.filter(e=>cs.some(c=>c.ecIds.includes(e.id)));
    const up=es=>{U=D.ues.filter(u=>es.some(e=>e.ueId===u.id))};
    if(f.kind==="ue"){U=D.ues.filter(u=>u.nom===f.value);E=D.ecs.filter(e=>U.some(u=>u.id===e.ueId));C=compsOfE(E)}
    else if(f.kind==="ec"){E=D.ecs.filter(e=>e.id===f.value);up(E);C=compsOfE(E)}
    else if(f.kind==="comp"){C=D.competences.filter(c=>c.code===f.value);E=ecsOfC(C);up(E)}
    else if(f.kind==="bloc"){C=D.competences.filter(c=>String(c.bloc)===f.value);E=ecsOfC(C);up(E)}
    const S2=semItems(E).filter(x=>C.some(c=>semLie(c,x)));
    A={comp:new Set(C.map(x=>x.id)),sem:new Set(S2.map(x=>x.id)),ec:new Set(E.map(x=>x.id)),ue:new Set(U.map(x=>x.id))};
  }
  const ok=(k,x)=>!A||k==="dip"||A[k].has(x.id);
  const ecKey=x=>[SEMS.indexOf(x.sem)];
  const cmp=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0};
  const lists={
    comp:D.competences.slice().sort((a,b)=>(+a.bloc-+b.bloc)||ecNum(a.code)-ecNum(b.code)),
    sem:semItems(D.ecs),
    ec:D.ecs.slice().sort((a,b)=>(uIdx(a.ueId)-uIdx(b.ueId))||ecOrd(a)-ecOrd(b)),
    ue:D.ues.slice(),
    dip:D.diplomes.slice()};
  Object.keys(lists).forEach(k=>lists[k]=lists[k].filter(x=>ok(k,x)));
  const rel=(k,a,b)=>k==="comp"?semLie(a,b):k==="sem"?(b.sems||[]).includes(a.sem):k==="ec"?a.ueId===b.id:true;
  // pivot
  const old=ui.ref.piv||{kind:"comp",id:""};
  let kind=CH_KINDS.includes(old.kind)?old.kind:"comp";
  if(!old.id&&kind==="comp"&&ui.ref.chain){const c=D.competences.find(x=>x.code===ui.ref.chain);if(c)old.id=c.id}
  let items=lists[kind];
  if(!items.length){kind="comp";items=lists.comp}
  let piv=kind==="dip"?dip:(items.find(x=>x.id===old.id)||items[0]);
  if(!piv)return null;
  ui.ref.piv={kind,id:piv.id};
  // colonnes associées
  const p=CH_KINDS.indexOf(kind), sets={};
  sets[p]=[piv];
  for(let i=p+1;i<CH_KINDS.length;i++){const k=CH_KINDS[i], prev=sets[i-1], pk=CH_KINDS[i-1];
    sets[i]=k==="dip"?[dip]:lists[k].filter(b=>prev.some(a=>rel(pk,a,b)))}
  for(let i=p-1;i>=0;i--){const k=CH_KINDS[i], nxt=sets[i+1];
    sets[i]=lists[k].filter(a=>nxt.some(b=>rel(k,a,b)))}
  // le semestre est commun à tous les EC : on ne garde que les triplets compétence–semestre–EC réels
  let ok3=null;
  if(sets[0]&&sets[1]&&sets[2]){
    const tri=[];
    D.competences.forEach(c=>(c.ecs||[]).forEach(l=>(l.sems||[]).forEach(sm=>tri.push({c:c.id,s:sm,e:l.id}))));
    const S0=new Set(sets[0].map(x=>x.id)),S1=new Set(sets[1].map(x=>x.id)),S2=new Set(sets[2].map(x=>x.id));
    const keep=tri.filter(t=>S0.has(t.c)&&S1.has(t.s)&&S2.has(t.e));
    if(keep.length){
      const k=[new Set(),new Set(),new Set()];
      keep.forEach(t=>{k[0].add(t.c);k[1].add(t.s);k[2].add(t.e)});
      [0,1,2].forEach(i=>{if(i!==p)sets[i]=sets[i].filter(x=>k[i].has(x.id))});
      if(p<3)sets[3]=sets[3].filter(u=>sets[2].some(e=>e.ueId===u.id));
      ok3=keep;
    }
  }
  const pair=(k,A,B)=>rel(k,A,B)&&(!ok3||(k==="comp"?ok3.some(t=>t.c===A.id&&t.s===B.id)
    :k==="sem"?ok3.some(t=>t.s===A.id&&t.e===B.id):true));
  // ordre : hiérarchique, compétences au barycentre de leurs EC
  if(sets[1].length>1)sets[1].sort((a,b)=>cmp(ecKey(a),ecKey(b)));
  if(p!==0&&sets[0].length>1){const ix=c=>{const l=sets[1].map((e,i)=>semLie(c,e)?i:-1).filter(i=>i>=0);
      return l.length?l.reduce((s2,i)=>s2+i,0)/l.length:999};
    sets[0].sort((a,b)=>(ix(a)-ix(b))||(+a.bloc-+b.bloc)||ecNum(a.code)-ecNum(b.code))}
  return {kind,p,piv,sets,items:kind==="dip"?lists.dip:items,rel:pair,dip,ueOfE};
}
function chainItemText(k,x,M){
  if(k==="comp")return {code:x.code,label:x.libelle||x.code};
  if(k==="sem")return {code:"",label:"Semestre "+x.num+" · année "+x.annee};
  if(k==="ec")return {code:ecCodeLbl(x),label:ecName(x)};
  if(k==="ue")return {code:x.code||"",label:x.nom};
  return {code:"",label:(x.nom||"Aucun diplôme")+(x.mention?" · mention "+x.mention:"")};
}
function paintChain(){
  const D=DATA, f=refFilter(), M=chainModel();
  if(!M)return `<div class="empty">Aucun élément ne correspond au filtre.</div>`;
  const {kind,p,piv,sets,rel}=M;
  const CW=172, CWP=238, GAP=30, PADX=10, TOP=44, VG=11;
  const widths=CH_KINDS.map((k,i)=>i===p?CWP:CW);
  const X=i=>PADX+widths.slice(0,i).reduce((a,w)=>a+w+GAP,0);
  const LAST=CH_KINDS.length-1, W=X(LAST)+widths[LAST]+PADX;
  const nid=(k,x)=>k+":"+x.id;
  // un seul semestre en vue (colonne verrouillée dessus, ou filtrée à un seul) : les EC portent son code
  const semFix=kind==="sem"?piv.sem:((sets[1]||[]).length===1?sets[1][0].sem:"");
  const node=(k,x,i)=>{
    const col=k==="comp"?"#10555F":k==="dip"?"#7c8698":(x.couleur||"#9aa2ae");
    let o={id:nid(k,x),kind:k,sel:x.id,col,x:X(i)};
    if(k==="comp")o=Object.assign(o,{code:x.code,t:wrapN(x.libelle||x.code,31,3)});
    else if(k==="sem")o=Object.assign(o,{t:["Semestre "+x.num],sub:"Année "+x.annee+" · "+anneeCode(x.annee),strong:true});
    else if(k==="ec")o=Object.assign(o,{code:semFix?(ecCodeAt(x,semFix)||"—"):ecCodeShort(x),t:wrapN(ecName(x),25,3)});
    else if(k==="ue")o=Object.assign(o,{t:wrapN(x.nom,25,3),sub:x.code||""});
    else o=Object.assign(o,{t:wrapN(chainItemText("dip",x).label,30,2),strong:true});
    return chainNode(o);
  };
  // pivot : roue seule, assez haute pour l'intitulé complet de l'élément sélectionné
  const pt=chainItemText(kind,piv);
  const cpl=pt.code?24:31, fullH=wrapN(pt.label,cpl,30).length*17+12;
  const WH=Math.max(CH_WH,fullH+150);
  const cols=CH_KINDS.map((k,i)=>i===p?null:sets[i].map(x=>node(k,x,i)));
  const pivN={id:nid(kind,piv),kind,h:WH,piv:true,x:X(p)};
  const colN=i=>i===p?[pivN]:cols[i];
  const anchor=n=>n.piv?n.y+WH/2:n.y+n.h/2;
  // colonne de base : la plus haute hors pivot
  const tall=i=>colN(i).reduce((a,n)=>a+n.h+VG,0);
  let base=CH_KINDS.map((_,i)=>i).filter(i=>i!==p).sort((a,b)=>tall(b)-tall(a))[0];
  let y=TOP;colN(base).forEach(n=>{n.y=y;y+=n.h+VG});
  const linked=(i,n,j)=>{ // nœuds de la colonne j liés à n (colonne i)
    const lo=Math.min(i,j), k=CH_KINDS[lo];
    const xs=i<j?[n]:colN(j), ys=i<j?colN(j):[n];
    return colN(j).filter(m=>{const a=lo===i?n:m, b=lo===i?m:n;
      const A=a.piv?piv:sets[lo].find(x=>nid(CH_KINDS[lo],x)===a.id), B=b.piv?piv:sets[lo+1].find(x=>nid(CH_KINDS[lo+1],x)===b.id);
      return A&&B&&rel(k,A,B)})};
  const placeCol=(i,ref)=>{
    let prev=-1e9;
    colN(i).forEach(n=>{
      const ls=linked(i,n,ref);
      let want=ls.length?ls.reduce((a,m)=>a+anchor(m),0)/ls.length:prev+n.h/2;
      let top=n.piv?want-WH/2:want-n.h/2;
      if(top<prev+VG)top=prev+VG;
      n.y=top;prev=top+n.h});
  };
  for(let i=base+1;i<CH_KINDS.length;i++)placeCol(i,i-1);
  for(let i=base-1;i>=0;i--)placeCol(i,i+1);
  const all=CH_KINDS.flatMap((_,i)=>colN(i));
  const minY=Math.min(...all.map(n=>n.y));
  all.forEach(n=>n.y+=TOP-minY);
  all.forEach(n=>{n.cy=anchor(n)});
  const H=Math.max(...all.map(n=>n.y+n.h))+22;
  // liens
  const links=[];
  for(let i=0;i<CH_KINDS.length-1;i++)colN(i).forEach(a=>linked(i,a,i+1).forEach(b=>links.push({a,b,col:b.piv?a.col||"#9aa2ae":b.col})));
  const path=l=>{const x1=l.a.x+widths[CH_KINDS.indexOf(l.a.kind)],y1=l.a.cy,x2=l.b.x,y2=l.b.cy,mx=(x1+x2)/2;
    return `<path class="clink" data-link="${esc(l.a.id)}|${esc(l.b.id)}" d="M${x1} ${y1.toFixed(1)}C${mx} ${y1.toFixed(1)} ${mx} ${y2.toFixed(1)} ${x2} ${y2.toFixed(1)}" stroke="${esc(l.col||"#9aa2ae")}"/>`};
  const lock=on=>`<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><rect x="3" y="7" width="10" height="8" rx="1.6" fill="currentColor"/><path d="${on?"M5.2 7V5a2.8 2.8 0 0 1 5.6 0v2":"M5.2 7V5a2.8 2.8 0 0 1 5.5-.6"}" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;
  return `<div class="tw"><div class="chainbox" style="width:${W}px;height:${H.toFixed(0)}px">
    <svg class="chain" width="${W}" height="${H.toFixed(0)}" viewBox="0 0 ${W} ${H.toFixed(0)}">
      ${CH_KINDS.map((k,i)=>`<rect class="ccol${i%2?" alt":""}${i===p?" piv":""}" x="${X(i)-9}" y="34" width="${widths[i]+18}" height="${(H-40).toFixed(0)}" rx="10"/>`).join("")}
      <g class="links">${links.map(path).join("")}</g>
      ${CH_KINDS.flatMap((k,i)=>i===p?[]:cols[i].map(n=>chainSvgNode(n,widths[i]))).join("")}
    </svg>
    ${CH_KINDS.map((k,i)=>`<button type="button" class="chh${i===p?" on":""}" data-lock="${k}" style="left:${X(i)-9}px;width:${widths[i]+18}px"
        aria-pressed="${i===p}" title="${i===p?"Colonne verrouillée":"Verrouiller cette colonne"}">${lock(i===p)}<span>${esc(CH_LBL[k])}</span><b>${i===p?M.items.length:sets[i].length}</b></button>`).join("")}
    <div class="chpiv" style="left:${X(p)}px;top:${pivN.y.toFixed(0)}px;width:${CWP}px">
      <div class="wheel tall" id="chainWheel" tabindex="0" role="listbox" aria-label="${esc(CH_LBL[kind])}" style="height:${WH}px"
        title="Molette ou flèches pour parcourir · clic ou Entrée pour sélectionner · tape du texte pour filtrer">
        <div class="wband"></div><div class="wstage"></div>
        <div class="wfade t"></div><div class="wfade b"></div>
        <div class="whint" hidden>molette ou flèches pour en changer</div>
        <div class="wq" hidden></div>
      </div>
    </div>
  </div></div>`;
}
function chainSetPivot(kind,id){
  const D=DATA;
  ui.ref.piv={kind,id};ui.ref.wq="";
  if(kind==="dip"&&id&&id!==D.activeDiplome){D.activeDiplome=id;ui.ref.filter={kind:"",value:""};saveData();return}
  paintRef();
}
function chainBind(host){
  const M=chainModel();if(!M)return;
  const el=host.querySelector("#chainWheel");
  const items=M.items.map(x=>Object.assign({id:x.id,
    col:M.kind==="comp"?"#10555F":M.kind==="dip"?"#7c8698":(x.couleur||"#9aa2ae"),
    strong:M.kind==="dip"},chainItemText(M.kind,x)));
  if(el)pivotWheel(el,items,M.piv.id,id=>{chainSetPivot(M.kind,id);
    const w=document.getElementById("chainWheel");if(w)w.focus({preventScroll:true})});
  host.querySelectorAll("[data-lock]").forEach(b=>b.onclick=()=>{
    const k=b.dataset.lock;if(k===M.kind)return;
    const i=CH_KINDS.indexOf(k), first=(M.sets[i]||[])[0];
    chainSetPivot(k,k==="dip"?DATA.activeDiplome:(first?first.id:""))});
  host.querySelectorAll("svg.chain .cnode").forEach(n=>{
    const go=()=>chainSetPivot(n.dataset.kind,n.dataset.sel);
    n.onclick=go;n.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}}});
  chainWire(host);
}
function pivotWheel(el,all,curId,onCommit){
  const stage=el.querySelector(".wstage"), qbox=el.querySelector(".wq"), band=el.querySelector(".wband");
  if(!all.length)return;
  const home=()=>Math.max(0,items.findIndex(c=>c.id===curId));
  let q=ui.ref.wq||"", items=all, idx=0, acc=0, last=0, browsing=false;
  idx=home();
  const SPAN=6, STEP=14, R=110, PRS=700, IH=26;
  const draw=()=>{
    const full=!browsing&&!q&&items[idx]&&items[idx].id===curId;
    el.classList.toggle("solo",!!full);
    let h="";
    for(let d=-SPAN;d<=SPAN;d++){
      if(full&&d)continue;
      const i=idx+d;if(i<0||i>=items.length)continue;
      const c=items[i], a=d*STEP, k=(PRS-R*Math.cos(a*Math.PI/180))/PRS;
      h+=`<button type="button" class="wit${d?"":" on"}${!d&&full?" full":""}${c.strong?" b":""}" data-wi="${i}" data-d="${d}" tabindex="-1"
        style="--c:${esc(c.col||"#9aa2ae")};transform:rotateX(${(-a).toFixed(1)}deg) translateZ(${R}px) scale(${k.toFixed(3)});opacity:${Math.max(0,1-Math.abs(d)/(SPAN+1.1)).toFixed(2)}"
        aria-selected="${!d}">${c.code?`<span class="wc">${esc(c.code)}</span>`:""}<span class="wt">${esc(c.label)}</span></button>`;
    }
    stage.innerHTML=h;
    band.style.height="";band.style.marginTop="";
    const on=stage.querySelector(".wit.on");
    if(full&&on){
      const hh=on.offsetHeight, ext=Math.max(0,hh-IH);
      on.style.marginTop=(-hh/2)+"px";
      band.style.height=(hh+4)+"px";band.style.marginTop=(-(hh+4)/2)+"px";
      if(ext)stage.querySelectorAll(".wit:not(.on)").forEach(b=>{
        b.style.transform=`translateY(${(Math.sign(+b.dataset.d)*ext/2).toFixed(1)}px) `+b.style.transform});
    }
    qbox.hidden=!q&&!browsing;
    qbox.textContent=q?"filtre : "+q+" · Entrée pour choisir":browsing?"clic ou Entrée pour choisir":"";
    const hint=el.querySelector(".whint");if(hint)hint.hidden=!full;
  };
  const select=i=>{const c=items[i];if(!c)return;
    browsing=false;
    if(c.id!==curId){onCommit(c.id);return}
    q="";ui.ref.wq="";items=all;idx=home();draw()};
  const move=n=>{const j=Math.max(0,Math.min(items.length-1,idx+n));if(j===idx)return;idx=j;browsing=true;draw()};
  const reset=()=>{if(!browsing&&!q)return;browsing=false;q="";ui.ref.wq="";items=all;idx=home();draw()};
  const refilter=()=>{
    ui.ref.wq=q;browsing=!!q;
    items=q?all.filter(c=>norm(c.code+" "+c.label).includes(norm(q))):all;
    if(!items.length){qbox.hidden=false;qbox.textContent="filtre : "+q+" · rien";stage.innerHTML="";band.style.height="";return}
    idx=q?0:home();draw();
  };
  // molette : un cran = un élément, jamais plus d'un pas toutes les 90 ms
  el.addEventListener("wheel",e=>{e.preventDefault();
    const dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?100:1);
    acc=Math.max(-120,Math.min(120,acc+dy));
    const now=performance.now();
    if(Math.abs(acc)>=40&&now-last>90){move(acc>0?1:-1);acc=0;last=now}},{passive:false});
  el.addEventListener("pointerenter",()=>{if(document.activeElement!==el)el.focus({preventScroll:true})});
  el.addEventListener("pointerleave",()=>{acc=0;reset()});
  el.addEventListener("blur",()=>{acc=0;reset()});
  el.addEventListener("keydown",e=>{
    if(e.key==="ArrowDown"||e.key==="ArrowRight"){e.preventDefault();move(1);return}
    if(e.key==="ArrowUp"||e.key==="ArrowLeft"){e.preventDefault();move(-1);return}
    if(e.key==="PageDown"){e.preventDefault();move(5);return}
    if(e.key==="PageUp"){e.preventDefault();move(-5);return}
    if(e.key==="Enter"){e.preventDefault();select(idx);return}
    if(e.key==="Escape"){e.preventDefault();reset();return}
    if(e.key==="Backspace"){e.preventDefault();if(q){q=q.slice(0,-1);refilter()}return}
    if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();q+=e.key;refilter()}
  });
  stage.addEventListener("click",e=>{const b=e.target.closest("[data-wi]");if(!b)return;select(+b.dataset.wi)});
  if(q)refilter();else draw();
}
function chainWire(host){
  const svg=host.querySelector("svg.chain");if(!svg)return;
  // survol d'un semestre : les EC affichent le code qu'ils portent cette année-là
  const ecN=[...svg.querySelectorAll('.cnode[data-kind="ec"]')];
  const setCodes=sem=>ecN.forEach(g=>{
    const t=g.querySelector(".ccode");if(!t)return;
    const e=DATA.ecs.find(x=>x.id===g.dataset.sel);
    t.textContent=(sem&&e)?(ecCodeAt(e,sem)||"—"):(g.dataset.code0||"");
    g.classList.toggle("ctmp",!!sem&&!!e);
  });
  svg.querySelectorAll('.cnode[data-kind="sem"]').forEach(n=>{
    n.addEventListener("pointerenter",()=>setCodes(n.dataset.sel));
    n.addEventListener("focus",()=>setCodes(n.dataset.sel));
    n.addEventListener("pointerleave",()=>setCodes(""));
    n.addEventListener("blur",()=>setCodes(""));
  });
  const links=[...svg.querySelectorAll(".clink")].map(el=>{
    const [a,b]=el.dataset.link.split("|");return {el,a,b}});
  const up={},down={};
  links.forEach(l=>{(up[l.b]=up[l.b]||[]).push(l);(down[l.a]=down[l.a]||[]).push(l)});
  const reach=(id,map,acc)=>{(map[id]||[]).forEach(l=>{const nxt=map===up?l.a:l.b;
    acc.links.add(l.el);if(!acc.nodes.has(nxt)){acc.nodes.add(nxt);reach(nxt,map,acc)}})};
  svg.querySelectorAll(".cnode").forEach(n=>{
    const id=n.dataset.node;
    n.addEventListener("pointerenter",()=>{
      const acc={nodes:new Set([id]),links:new Set()};
      reach(id,up,acc);reach(id,down,acc);
      svg.classList.add("dim");
      svg.querySelectorAll(".cnode").forEach(x=>x.classList.toggle("hot",acc.nodes.has(x.dataset.node)));
      links.forEach(l=>l.el.classList.toggle("hot",acc.links.has(l.el)));
    });
    n.addEventListener("pointerleave",()=>{
      svg.classList.remove("dim");
      svg.querySelectorAll(".hot").forEach(x=>x.classList.remove("hot"));
    });
  });
}
function radInfo(kind,sel,frozen,tint){
  const D=DATA, box=document.getElementById("radInfo");
  if(!box)return;
  if(!kind){
    box.innerHTML=`<div class="k">Carte du référentiel</div>
      <div class="hint">Survolez pour éclater une portion, cliquez pour la figer.</div>`;
    return;
  }
  const compsOfEcIds=ids=>filtComps(D.competences.filter(c=>c.ecIds.some(x=>ids.includes(x))));
  const plural=(n,a,b)=>n+" "+(n>1?b:a);
  let col="var(--line-strong)", cr="", k="", ttl="", tx="", sub="", pills="";
  if(kind==="ue"){
    const u=D.ues.find(x=>x.nom===sel)||{};
    const ecs=filtEcs(D.ecs.filter(e=>e.ueId===u.id));
    const ids=ecs.map(e=>e.id);
    col=u.couleur||col; cr=tidy(u.code||""); k="Unité d'enseignement"; ttl=sel.replace(/^UE\s*/i,"");
    sub=[plural(ecs.length,"enseignement","enseignements"),plural(compsOfEcIds(ids).length,"compétence","compétences")].join(" · ");
  }else if(kind==="ec"){
    const e=D.ecs.find(y=>y.id===sel)||{};
    const u=D.ues.find(y=>y.id===e.ueId)||{};
    col=e.couleur||col; cr=[tidy(u.code||""),(u.nom||"").replace(/^UE\s*/i,"")].filter(Boolean).join(" · ");
    k="Enseignement constitutif"; ttl=ecName(e); tx=ANNEES.map(a=>((e.codes||{})[a]?anneeCode(a)+" : "+e.codes[a]:"")).filter(Boolean).join("  ·  ");
    sub=[(e.sems||[]).join(" "),plural(compsOfEcIds([e.id]).length,"compétence","compétences")].filter(Boolean).join(" · ");
  }else if(kind==="an"){
    const [eid,a0]=String(sel).split("|"); const a=+a0;
    const e=D.ecs.find(y=>y.id===eid)||{};
    const u=D.ues.find(y=>y.id===e.ueId)||{};
    const sms=(e.sems||[]).filter(sm=>anneeOf(sm)===a);
    const n=filtComps(D.competences.filter(c=>{const l=lienEc(c,eid);
      return !!l&&(l.sems||[]).some(sm=>anneeOf(sm)===a)})).length;
    col=e.couleur||col;
    cr=[tidy(u.code||""),(u.nom||"").replace(/^UE\s*/i,"")].filter(Boolean).join(" · ");
    k="Année "+a+" · "+anneeCode(a)+(sms.length?" · "+sms.join(" "):"");
    ttl=[((e.codes||{})[a])||"code à renseigner",ecName(e)].filter(Boolean).join(" · ");
    tx=ANNEES.filter(y=>y!==a&&(e.codes||{})[y]).map(y=>anneeCode(y)+" : "+e.codes[y]).join("  ·  ");
    sub=plural(n,"compétence évaluée","compétences évaluées");
  }else{
    const cp=D.competences.find(y=>y.code===sel)||{};
    const b=D.blocs.find(y=>y.num===String(cp.bloc))||{};
    cr=b.nom?"Bloc "+cp.bloc+" · "+b.nom:(cp.bloc?"Bloc "+cp.bloc:""); k="Compétence"; ttl=sel; tx=cp.libelle||"";col=tint||col;
    const ecsC=D.ecs.filter(e=>(cp.ecIds||[]).includes(e.id));
    sub=plural(ecsC.length,"EC rattaché","EC rattachés");
    pills=`<div class="l">`+ecsC.map(e=>`<span class="pill c" style="--c:${esc(e.couleur||"#9aa2ae")}" title="${esc(ecCodeLbl(e)+" · "+ecName(e))}">${esc(ecCodeShort(e))}</span>`).join("")+`</div>`;
  }
  box.innerHTML=`<div class="rail" style="--c:${esc(col)}"></div>
    ${cr?`<div class="cr">${esc(cr)}</div>`:""}
    <div class="k">${esc(k)}</div>
    <b class="ttl">${esc(ttl)}</b>
    ${tx?`<p class="tx">${esc(tx)}</p>`:""}
    ${sub?`<div class="s">${esc(sub)}</div>`:""}
    ${pills}
    ${frozen?`<div class="fz">Figé · survole la roue pour relâcher</div>`:""}`;
}
function radialWire(host){
  const svg=host.querySelector("svg.radial");if(!svg)return;
  const D=DATA, C=RAD.c, P=RAD.PAD, VB=RAD.S+2*P;
  const rot=svg.querySelector("#wheelRot"), layer=svg.querySelector("#radSpread");
  if(wheelRaf)cancelAnimationFrame(wheelRaf);
  const reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lbls=[...svg.querySelectorAll(".lbl")].map(el=>({el,x:+el.dataset.x,y:+el.dataset.y}));
  const parts=[...svg.querySelectorAll("[data-am]")];
  const segs=parts.filter(x=>x.classList.contains("sg"));
  let cur=null, frozen=null, badges=[], callouts=[], v=0, last=0, relT=0, lastTarget=null, calR=RAD.RL;
  let vue=null;   // vue affichée (zoom et centre, en unités du dessin), voir domaine/zoom-carte
  const NS="http://www.w3.org/2000/svg";
  const mk=(tag,attrs,txt)=>{const el=document.createElementNS(NS,tag);
    for(const k in attrs)el.setAttribute(k,attrs[k]);if(txt!=null)el.textContent=txt;return el};
  // ---- placement des étiquettes dynamiques (toujours à l'endroit, hors de la roue)
  const place=()=>{
    const W=wheelAngle*Math.PI/180, ra=(-wheelAngle).toFixed(2);
    badges.forEach(b=>{const x=C+b.r*Math.cos(b.a), y=C+b.r*Math.sin(b.a);
      b.g.setAttribute("transform",`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ra})`)});
    // les pastilles de compétences comptent comme obstacles pour les étiquettes d'EC
    const boxes=badges.map(b=>{const t=b.a+W, sx=b.r*Math.cos(t), sy=b.r*Math.sin(t);
      return {x0:sx-b.w/2-2,x1:sx+b.w/2+2,y0:sy-12,y1:sy+12}});
    callouts.forEach(co=>{
      const th=co.a+W, ct=Math.cos(th), st=Math.sin(th);
      let d=calR+(co.w/2)*Math.abs(ct)+(co.h/2)*Math.abs(st), bx;
      for(let k=0;k<8;k++){
        const sx=d*ct, sy=d*st;
        bx={x0:sx-co.w/2-3,x1:sx+co.w/2+3,y0:sy-co.h/2-3,y1:sy+co.h/2+3};
        if(!boxes.some(o=>bx.x0<o.x1&&bx.x1>o.x0&&bx.y0<o.y1&&bx.y1>o.y0))break;
        d+=co.h*0.6+4;
      }
      boxes.push(bx);
      const x=C+d*Math.cos(co.a), y=C+d*Math.sin(co.a);
      co.g.setAttribute("transform",`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ra})`);
    });
  };
  const orient=()=>{const a=(-wheelAngle).toFixed(2);
    lbls.forEach(o=>o.el.setAttribute("transform",`rotate(${a} ${o.x} ${o.y})`));place()};
  orient();
  // ---- éclatement
  const push=(el,dist)=>{const a=+el.dataset.am;
    el.style.setProperty("--px",(Math.cos(a)*dist).toFixed(1)+"px");
    el.style.setProperty("--py",(Math.sin(a)*dist).toFixed(1)+"px")};
  const clear=()=>{svg.classList.remove("open","openc");
    parts.forEach(x=>{x.classList.remove("push","hot","trail","fam","lit");x.style.removeProperty("--px");x.style.removeProperty("--py")});
    layer.innerHTML="";badges=[];callouts=[];cur=null;calR=RAD.RL};
  const keysOf=c=>{const o=[];((c||{}).ecs||[]).forEach(l=>{o.push(l.id);
    (l.sems||[]).forEach(sm=>{const k2=l.id+"|"+anneeOf(sm);if(!o.includes(k2))o.push(k2)})});return o};
  const lit=keys=>segs.forEach(x=>{const k=x.dataset.kind;
    const key=k==="an"?x.dataset.id+"|"+(x.dataset.sem||""):x.dataset.id;
    x.classList.toggle("lit",(k==="ec"||k==="an")&&x.classList.contains("fam")&&keys.includes(key))});
  const info=()=>{
    const tintOf=g=>g?(g.getAttribute("fill")||(g.querySelector("rect,circle")||{getAttribute:()=>""}).getAttribute("fill")||""):"";
    if(frozen&&frozen.pin){radInfo("comp",frozen.pin.dataset.sel,true,tintOf(frozen.pin));return}
    if(cur)radInfo(cur.dataset.kind,cur.dataset.sel,!!frozen,tintOf(cur));else radInfo(null);
  };
  const angOff=(a,ref)=>{let d=a-ref;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d};
  const explodeSeg=el=>{
    clear();cur=el;
    const r=+el.dataset.ring, am=+el.dataset.am, a0=+el.dataset.a0, a1=+el.dataset.a1;
    svg.classList.add("open");
    el.classList.add("hot","fam");push(el,RAD.DIST[r]);
    segs.forEach(x=>{
      if(x===el)return;
      const xr=+x.dataset.ring, xa=+x.dataset.am;
      if(xr>r){if(xa<a0||xa>a1)return;x.classList.add("push","fam");push(x,RAD.DIST[xr])}
      else if(xr<r){if(am<+x.dataset.a0||am>+x.dataset.a1)return;x.classList.add("trail","fam")}
    });
    // EC de la portion : leur code reste dans la couronne, l'encadré de droite les détaille
    const anEls=segs.filter(x=>x.dataset.kind==="an"&&(x===el||x.classList.contains("push")));
    const ecEls=segs.filter(x=>x.dataset.kind==="ec"&&(x===el||x.classList.contains("push")));
    const held=c=>anEls.filter(x=>{const l=lienEc(c,x.dataset.id), a=+(x.dataset.sem||0);
      return !!l&&(a?(l.sems||[]).some(sm=>anneeOf(sm)===a):true)});
    // compétences de la portion, au semestre près : étalées autour de la roue
    const comps=filtComps(D.competences.filter(c=>held(c).length));
    const where=c=>{const own=held(c);
      return own.length?own.reduce((s2,x)=>s2+angOff(+x.dataset.am,am),0)/own.length:0};
    const list=comps.map(c=>({c,o:where(c)})).sort((p,q)=>p.o-q.o||(+p.c.bloc-+q.c.bloc)||ecNum(p.c.code)-ecNum(q.c.code));
    const n=list.length;
    if(n){
      // pastilles avec code, sur trois rangées au plus. Elles restent dans le secteur de la portion ;
      // si elles n'y tiennent pas, elles débordent sur le secteur de l'élément de dessous (l'UE),
      // et seulement au-delà si celui-ci ne suffit pas non plus.
      // présentation homogène : toujours en colonnes de trois rangées (moins s'il y a moins de trois
      // compétences), pastilles de même largeur. Le bloc reste dans le secteur de la portion, déborde
      // si besoin sur celui de l'élément de dessous, puis les pastilles rapetissent plutôt que de
      // s'étaler plus loin ; le chevauchement n'intervient qu'en dernier recours.
      const th=am+wheelAngle*Math.PI/180, sn=Math.abs(Math.sin(th)), cs=Math.abs(Math.cos(th));
      const rows=Math.min(3,n), cols=Math.ceil(n/rows);
      const maxLen=Math.max(...list.map(({c})=>String(c.code).length));
      const zf=1/(1+0.45*((vue?vue.zoom:RAD.Z0)-1));
      let sc=zf;
      const dims=()=>{const BW=(maxLen*6.6+12)*sc, BH=19*sc;
        return {BW,BH,PITCH:BW*sn+BH*cs+4*sc,ROWH:BW*cs+BH*sn+3*sc}};
      const EDGE=324+RAD.DIST[2]+16;   // au-delà de l'anneau des années éclaté et agrandi
      let d=dims(), R0=EDGE+d.ROWH/2;
      let lo=a0, hi=a1;
      const avail=()=>Math.max(hi-lo-0.012,0.02);
      const need=()=>cols*d.PITCH/R0;
      if(need()>avail()){
        const par=segs.filter(x=>x.classList.contains("trail")).sort((p2,q)=>(+q.dataset.ring)-(+p2.dataset.ring));
        for(const x of par){lo=Math.min(lo,+x.dataset.a0);hi=Math.max(hi,+x.dataset.a1);if(need()<=avail())break}
      }
      if(need()>avail()){sc=Math.max(0.62*zf,sc*avail()/need());d=dims();R0=EDGE+d.ROWH/2}
      const colStep=d.PITCH/R0, bloc=Math.min(cols*colStep,2*Math.PI*0.92);
      let from=am-bloc/2;
      if(bloc<=avail())from=Math.min(Math.max(from,lo+0.006),hi-0.006-bloc);
      calR=R0+(rows-1)*d.ROWH+d.ROWH/2+6;
      const colOf=c=>{const own=held(c)[0];
        const e=own?D.ecs.find(y=>y.id===own.dataset.id):null;
        return (e||{}).couleur||"#9aa2ae"};
      list.forEach(({c},i)=>{
        const g=mk("g",{class:"cb fam","data-sel":c.code,"data-id":c.id,"data-kind":"comp",tabindex:"0"});
        g.appendChild(mk("rect",{x:(-d.BW/2).toFixed(1),y:(-d.BH/2).toFixed(1),width:d.BW.toFixed(1),height:d.BH.toFixed(1),rx:(d.BH/2).toFixed(1),fill:colOf(c)}));
        g.appendChild(mk("text",{"text-anchor":"middle","dominant-baseline":"central",x:0,y:0.5,"font-size":(10.5*sc).toFixed(1)},c.code));
        g.appendChild(mk("title",{},c.code+" · "+(c.libelle||"")));
        layer.appendChild(g);
        const col=Math.floor(i/rows), row=i%rows;
        badges.push({g,a:from+colStep*(col+0.5),r:R0+row*d.ROWH,w:d.BW,c});
      });
    }
    callouts.sort((p,q)=>angOff(p.a,am)-angOff(q.a,am));
    place();
  };
  const explodeComp=el=>{
    clear();cur=el;
    svg.classList.add("openc");el.classList.add("hot","fam");
    const cp=D.competences.find(c=>c.id===el.dataset.id)||{};
    const keys=keysOf(cp), ids=cp.ecIds||[];
    const uids=D.ecs.filter(e=>ids.includes(e.id)).map(e=>e.ueId);
    segs.forEach(x=>{const k=x.dataset.kind, id=x.dataset.id;
      const key=k==="an"?id+"|"+(x.dataset.sem||""):id;
      if((k==="an"&&keys.includes(key))||(k==="ec"&&ids.includes(id))||(k==="ue"&&uids.includes(id)))x.classList.add("trail","fam")});
  };
  const explode=el=>{if(el.classList.contains("dot"))explodeComp(el);else explodeSeg(el)};
  // ---- gel au clic, relâché en survolant la zone de rotation
  const freeze=pin=>{
    frozen={pin:pin||null};v=0;clearTimeout(relT);relT=0;
    svg.classList.add("frozen");
    badges.forEach(b=>b.g.classList.toggle("pin",b.g===pin));
    lit(pin?keysOf(D.competences.find(c=>c.id===pin.dataset.id)):[]);
    info();
  };
  const release=()=>{
    frozen=null;clearTimeout(relT);relT=0;svg.classList.remove("frozen");clear();radInfo(null);
    const t=lastTarget&&lastTarget.closest&&lastTarget.closest(".sg,.dot");
    if(t&&svg.contains(t)){explode(t);info()}
  };
  segs.concat(parts.filter(x=>x.classList.contains("dot"))).forEach(el=>{
    const go=()=>{if(frozen)return;explode(el);info()};
    el.addEventListener("pointerenter",go);
    el.addEventListener("focus",go);
    el.addEventListener("click",e=>{e.stopPropagation();if(cur!==el)explode(el);freeze(null)});
  });
  layer.addEventListener("pointerover",e=>{const b=e.target.closest(".cb");if(!b)return;
    if(!(frozen&&frozen.pin))lit(keysOf(D.competences.find(c=>c.id===b.dataset.id)));
    radInfo("comp",b.dataset.sel,!!frozen,(b.querySelector("rect,circle")||{getAttribute:()=>""}).getAttribute("fill"))});
  layer.addEventListener("pointerout",e=>{const b=e.target.closest(".cb");if(!b||b.contains(e.relatedTarget))return;
    if(frozen&&frozen.pin)lit(keysOf(D.competences.find(c=>c.id===frozen.pin.dataset.id)));else lit([]);
    info()});
  layer.addEventListener("click",e=>{const b=e.target.closest(".cb");if(!b)return;e.stopPropagation();
    freeze(frozen&&frozen.pin===b?null:b)});
  svg.addEventListener("keydown",e=>{if(e.key==="Escape"&&frozen)release()});
  // ---- rotation
  const tick=ts=>{
    if(!last)last=ts;
    const dt=Math.min(.06,(ts-last)/1000);last=ts;
    if(v&&!frozen){wheelAngle=(wheelAngle+v*dt)%360;
      rot.setAttribute("transform",`rotate(${wheelAngle.toFixed(2)} ${C} ${C})`);orient()}
    wheelRaf=requestAnimationFrame(tick);
  };
  svg.addEventListener("pointermove",e=>{
    lastTarget=e.target;
    const r=svg.getBoundingClientRect();
    const vb=svg.viewBox.baseVal;
    const x=vb.x+(e.clientX-r.left)*(vb.width/r.width)-C, y=vb.y+(e.clientY-r.top)*(vb.height/r.height)-C;
    const dd=Math.hypot(x,y);
    // zone de rotation recalculée sur la partie visible (zoom) : quart droit de la vue = zone calme,
    // la vitesse dépend de la hauteur par rapport au milieu de la vue
    // la roue ne tourne qu'au survol des deux pastilles de rotation (toujours visibles, à gauche de la vue)
    const pad=e.target.closest&&e.target.closest(".rpad");
    if(frozen){
      v=0;
      if(pad){clearTimeout(relT);relT=0;release();v=(+pad.dataset.dir)*60}
      return;
    }
    // portion éclatée : la roue s'arrête, ce qu'on vise reste sous le doigt.
    // Elle ne repart qu'une fois sorti pour de bon — au centre ou au-delà des compétences.
    if(svg.classList.contains("open")||svg.classList.contains("openc")){
      if(dd>calR+18||dd<RAD.HUB+4){clear();radInfo(null)}
      else {v=0;return}
    }
    v=pad&&!reduce?(+pad.dataset.dir)*60:0;
  });
  svg.addEventListener("pointerleave",()=>{v=0;clearTimeout(relT);relT=0;if(!frozen){clear();radInfo(null)}});
  // zoom : au départ, le quart bas-droit de la roue remplit la vue (centre de la roue en haut à gauche) ;
  // en dézoomant, la roue rétrécit et se recentre jusqu'à la vue entière. Le cadre garde la même taille
  // à tous les zooms (seul le viewBox change) : rien ne saute ni ne déborde sur les blocs voisins.
  // Les calculs (bornes, centrage sur le pointeur, animation) sont dans src/domaine/zoom-carte.ts.
  const ZC=window.dnmaxPont.zoomCarte;
  const ZM=RAD.HUB+14;   // au zoom de départ, le cercle du diplôme reste entier et les compétences éclatées restent visibles
  const GEO={cote:VB,origine:-P,centreRoue:C,rayonCoeur:ZM,zoomMin:1,zoomMax:RAD.ZMAX,zoomDepart:RAD.Z0};
  // tailles de police (unités du dessin) des libellés qui disparaissent quand ils deviennent illisibles
  const LIBELLES={lue:10,lecn:9,lan:10.5};
  const cadre=host.querySelector(".radcadre"), barre=host.querySelector(".radzoom");
  const sortie=barre&&barre.querySelector("output");
  let rapport=1, hautCadre=0, cible=null, animRaf=0, animT=0;
  const NS2="http://www.w3.org/2000/svg";
  const zn0=svg.querySelector(".zone");if(zn0)zn0.remove();
  // flèches de rotation : deux arcs fléchés qui tournent autour de la roue, au-delà de la zone
  // d'éclatement, l'un en haut à droite de la vue (sens inverse), l'autre en bas à gauche (sens horaire)
  const pads=[-1,1].map(dir=>{const g=document.createElementNS(NS2,"g");g.setAttribute("class","rpad");g.dataset.dir=dir;
    g.innerHTML=`<path class="hit"/><path class="arc"/><path class="ah"/><title>${dir<0?"Tourner la roue dans le sens inverse":"Tourner la roue dans le sens des aiguilles d'une montre"} (survoler)</title>`;
    svg.appendChild(g);return g});
  // taille du cadre : largeur de la colonne, hauteur tenant dans la fenêtre (sous la barre de zoom)
  const dimensionner=()=>{
    const w=cadre?cadre.clientWidth:svg.getBoundingClientRect().width;
    const reste=window.innerHeight-(barre?barre.getBoundingClientRect().height+6:0);
    const h=ZC.hauteurCadre(w,reste,window.innerWidth>=2200?1120:940);
    if(cadre&&h)cadre.style.height=h+"px";
    hautCadre=h||svg.getBoundingClientRect().height;rapport=hautCadre?w/hautCadre:1;
  };
  const zoomDepart=()=>cadre&&cadre.clientWidth<480?1:RAD.Z0;
  const dessiner=vz=>{
    vue=vz;
    const {largeur:vw,hauteur:vh}=ZC.tailleVue(vz.zoom,VB,rapport);
    const ox=vz.centreX-vw/2, oy=vz.centreY-vh/2;
    svg.setAttribute("viewBox",`${ox.toFixed(2)} ${oy.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`);
    svg.setAttribute("preserveAspectRatio","xMidYMid meet");
    const u=vh/(hautCadre||600);
    // libellés trop petits à l'écran : masqués plutôt que superposés en bouillie
    const vis=ZC.libellesVisibles(1/u,LIBELLES);
    for(const k in vis)svg.classList.toggle("sans-"+k,!vis[k]);
    if(sortie)sortie.textContent=Math.round(vz.zoom*100)+" %";
    if(barre){barre.querySelector('[data-rz="-1"]').disabled=vz.zoom<=GEO.zoomMin+1e-3;
      barre.querySelector('[data-rz="1"]').disabled=vz.zoom>=GEO.zoomMax-1e-3}
    // flèches : deux arcs sur un même cercle virtuel autour de la roue (au-delà de la zone d'éclatement),
    // placés là où ce cercle est visible : en haut à droite (un peu plus haut) et en bas à gauche
    const R=RAD.RARR, M=26*u, span=0.24;
    const vis2=ang=>{const x=C+R*Math.cos(ang),y=C+R*Math.sin(ang);return x>=ox+M&&x<=ox+vw-M&&y>=oy+M&&y<=oy+vh-M};
    const fits=c=>{for(let k=-6;k<=6;k++)if(!vis2(c+span*k/6))return false;return true};
    const near=tgt=>{for(let d=0;d<=Math.PI;d+=0.01){if(fits(tgt+d))return tgt+d;if(fits(tgt-d))return tgt-d}return tgt};
    // flèche du haut : la position la plus haute possible côté droit ; flèche du bas : la plus à gauche côté bas
    const best=(from,to,score,fb)=>{let b=null,bs=Infinity;for(let a=from;a<=to;a+=0.01)if(fits(a)){const sc=score(a);if(sc<bs){bs=sc;b=a}}return b==null?near(fb):b};
    const targets=[
      best(-Math.PI*0.5,Math.PI*0.3,a=>Math.sin(a)+0.15*Math.abs(a+Math.PI*0.43),-Math.PI*0.43),
      best(Math.PI*0.3,Math.PI*1.25,a=>Math.cos(a)+0.15*Math.abs(a-Math.PI*0.83),Math.PI*0.83)];
    pads.forEach((pg,i)=>{
      const am=targets[i], dir=+pg.dataset.dir, a0=am-span, a1=am+span, pt=a=>[C+R*Math.cos(a),C+R*Math.sin(a)];
      const [x0,y0]=pt(a0),[x1,y1]=pt(a1);
      const arc=`M${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
      pg.querySelector(".arc").setAttribute("d",arc);pg.querySelector(".hit").setAttribute("d",arc);
      pg.querySelector(".ah").setAttribute("d",`M${-14} ${-8}L2 0L${-14} 8`);
      pg._g={a0,a1,dir,u};pg.style.setProperty("--u",u.toFixed(3));
      placeHead(pg);
    });
  };
  // animation douce vers la vue visée ; saut immédiat si les mouvements sont réduits
  const animer=ts=>{animRaf=0;if(!svg.isConnected||!cible)return;
    const dt=animT?Math.min(64,ts-animT):16;animT=ts;
    // seul le zoom s'anime : la vue suit le trajet de départ, la roue ne glisse que sur la diagonale
    const pas=ZC.pasAnimation(vue||cible,cible,dt,reduce?0:60);
    const suivante=pas===cible?cible:ZC.vueDepart(rapport,GEO,pas.zoom);
    dessiner(suivante);
    if(suivante!==cible)animRaf=requestAnimationFrame(animer);else animT=0};
  // seule une vue choisie par l'enseignant est retenue d'un affichage à l'autre ; sinon, la vue de
  // départ est recalculée à chaque changement de taille du cadre
  const viser=(vz,instant,retenir=true)=>{
    cible=ZC.bornerVue(vz,rapport,GEO);if(retenir)ui.radVue=cible;
    if(instant||reduce||!vue){if(animRaf){cancelAnimationFrame(animRaf);animRaf=0;animT=0}dessiner(cible);return}
    if(!animRaf)animRaf=requestAnimationFrame(animer);
  };
  const zoomer=facteur=>{const base=cible||vue;if(!base)return;
    viser(ZC.zoomerSurDiagonale(base,facteur,rapport,GEO))};
  const vueInitiale=()=>ui.radVue||ZC.vueDepart(rapport,GEO,zoomDepart());
  const ajuster=()=>{ui.radVue=null;viser(ZC.vueDepart(rapport,GEO,zoomDepart()),false,false)};
  const PAS=1.15;   // un clic sur + ou − : petit pas, sans à-coup
  // la pointe remonte le long du trait, dans le sens de rotation (plus vite au survol)
  // au toucher, pas de survol : la roue tourne tant qu'on appuie sur une flèche
  pads.forEach(pg=>{
    pg.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse")return;e.preventDefault();
      try{pg.setPointerCapture(e.pointerId)}catch(_){}if(frozen)release();v=(+pg.dataset.dir)*60;pg.classList.add("on")});
    const stop=()=>{if(pg.classList.contains("on")){v=0;pg.classList.remove("on")}};
    pg.addEventListener("pointerup",stop);pg.addEventListener("pointercancel",stop);
  });
  const placeHead=pg=>{const g=pg._g;if(!g)return;const ph=pg._ph||0;
    const a=g.dir>0?g.a0+(g.a1-g.a0)*ph:g.a1-(g.a1-g.a0)*ph;
    const x=C+RAD.RARR*Math.cos(a), y=C+RAD.RARR*Math.sin(a), deg=a*180/Math.PI+90*g.dir;
    pg.querySelector(".ah").setAttribute("transform",`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg.toFixed(1)}) scale(${g.u.toFixed(3)})`);
    pg.querySelector(".ah").style.opacity=(Math.min(1,ph*6,(1-ph)*6)).toFixed(2)};
  const padRaf=ts=>{pads.forEach(pg=>{const hov=pg.matches(":hover");
      pg._ph=((pg._ph||0)+(hov?0.028:0.009))%1;placeHead(pg)});
    if(svg.isConnected)requestAnimationFrame(padRaf)};
  if(!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches))requestAnimationFrame(padRaf);
  else pads.forEach(pg=>pg._ph=0.999);
  svg.addEventListener("wheel",e=>{e.preventDefault();
    zoomer(ZC.facteurMolette(e.deltaY,e.deltaMode,e.ctrlKey))},{passive:false});
  // pincement à deux doigts (écran tactile) : le zoom suit l'écart des doigts
  const doigts=new Map();let pince=null;
  const ecart=()=>{const [a,b]=[...doigts.values()];return {d:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2}};
  svg.addEventListener("pointerdown",e=>{if(e.pointerType!=="touch")return;doigts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(doigts.size===2){const g=ecart();pince={d:g.d||1,vue:cible||vue}}});
  svg.addEventListener("pointermove",e=>{if(!doigts.has(e.pointerId))return;doigts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pince&&doigts.size===2){const g=ecart();
      viser(ZC.zoomerSurDiagonale(pince.vue,g.d/pince.d,rapport,GEO),true)}});
  const lever=e=>{doigts.delete(e.pointerId);if(doigts.size<2)pince=null};
  ["pointerup","pointercancel","pointerleave"].forEach(t=>svg.addEventListener(t,lever));
  if(barre)barre.querySelectorAll("[data-rz]").forEach(b=>b.onclick=()=>{const k=+b.dataset.rz;
    if(k)zoomer(k>0?PAS:1/PAS);else ajuster()});
  svg.addEventListener("keydown",e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key==="+"||e.key==="="){e.preventDefault();zoomer(PAS)}
    else if(e.key==="-"||e.key==="_"){e.preventDefault();zoomer(1/PAS)}
    else if(e.key==="0"){e.preventDefault();ajuster()}});
  // mise en place, puis suivi de la taille de la colonne (fenêtre redimensionnée, panneau latéral, écran changé)
  dimensionner();
  viser(vueInitiale(),true,false);
  radRedim=()=>{if(!svg.isConnected)return;const avant=rapport, h0=hautCadre;dimensionner();
    if(rapport===avant&&hautCadre===h0&&vue)return;
    viser(vueInitiale(),true,false)};
  if(radObs)radObs.disconnect();
  radObs=window.ResizeObserver&&cadre?new ResizeObserver(()=>{if(radRedim)radRedim()}):null;
  if(radObs)radObs.observe(cadre);
  radInfo(null);
  wheelRaf=requestAnimationFrame(tick);
}
/* Habillage de la carte : écrit en TypeScript (src/referentiel/habillage-carte.ts), règles dans src/domaine/exploration.ts.
   La carte radiale (paintRadial, radialWire) et la chaîne (paintChain, chainBind) restent ici, inchangées. */
function paintMap(){
  const D=DATA, m=REF.meta||{}, host=document.getElementById("refMeta");
  const ecsOfUe=u=>filtEcs(D.ecs.filter(e=>e.ueId===u.id)).sort((a,b)=>ecOrd(a)-ecOrd(b));
  const compsOfUe=u=>{const ids=ecsOfUe(u).map(e=>e.id);
    return D.competences.filter(c=>(c.ecIds||[]).some(x=>ids.includes(x))).length};
  const orphan=filtEcs(D.ecs.filter(e=>!D.ues.some(u=>u.id===e.ueId)));
  const groups=[...filtUes(D.ues).map(u=>({u,ecs:ecsOfUe(u)})),
    ...(orphan.length&&refFilter().kind!=="ue"?[{u:{nom:"Sans UE",couleur:"#9aa2ae",id:""},ecs:orphan}]:[])]
    .filter(g=>g.ecs.length);
  const toSearch=v=>{ui.ref.q=v;ui.ref.view="search";paintRef();
    const t=document.getElementById("r-search");if(t)t.scrollIntoView({block:"center",behavior:"smooth"})};
  const view=ui.ref.view||"radial";
  window.dnmaxPont.referentiel.peindreHabillageCarte(host,{diplomes:D.diplomes,actif:D.activeDiplome,
    versionActive:versionActive(D.activeDiplome),aJour:refAJour(D.activeDiplome),filtre:refFilter(),vue:view,
    ues:REF.ues,blocs:REF.blocs,competences:REF.competences,ecs:D.ecs.slice().sort((a,b)=>ecOrd(a)-ecOrd(b)),competencesVue:D.competences,
    groupesTableau:view==="table"?groups.map(g=>({ue:g.u,ecs:g.ecs,competences:compsOfUe(g.u)})):[],
    codeAnnee:a=>anneeCode(a),nomBloc:blocName,couleurEc:ecColor,teinteBlocs:BLOC_TINT,
    niveaux:MOD.dn?(m.niveaux||[]).map(n=>anneeCode(n.annee)+" "+n.label).join(" · "):null,
    carteRadiale:()=>paintRadial(),carteChaine:()=>paintChain(),
    choisirVue:v=>{ui.ref.view=v;paintRef()},
    filtrer:(kind,value)=>{
      ui.ref.filter=value?{kind,value}:{kind:"",value:""};
      if(ui.ref.view==="chain"&&value){
        const pk={comp:"comp",ec:"ec",ue:"ue"}[kind], cur=ui.ref.piv||{};
        const hit=pk==="comp"?D.competences.find(c=>c.code===value):pk==="ec"?D.ecs.find(e=>e.id===value)
          :pk==="ue"?D.ues.find(u=>u.nom===value):null;
        if(hit&&pk===cur.kind)ui.ref.piv={kind:pk,id:hit.id};}
      paintRef()},
    choisirMention:id=>{D.activeDiplome=id;ui.ref.filter={kind:"",value:""};saveData()},
    choisirDiplome:nom=>{const dp=D.diplomes.find(x=>norm(x.nom||"")===norm(nom));if(!dp)return false;
      D.activeDiplome=dp.id;ui.ref.filter={kind:"",value:""};saveData();return true},
    allerALEc:nom=>allerEtape("ecs",nom),
    rechercher:(texte,parUe)=>{if(parUe)ui.ref.group="ue";toSearch(texte)}});
  if(host.querySelector(".chainbox"))chainBind(host);
  const svgHost=host.querySelector(".radwrap");
  if(svgHost)radialWire(svgHost);
}

const REF_PANES={constituer:"Constituer",explorer:"Explorer"};
/* Constituer le référentiel de la mention active, une étape par niveau : chaque étape ne crée, ne renomme
   et ne retire que ses propres éléments ; ceux des autres étapes y sont en lecture seule. Noms, codes et
   intitulés restent rangés dans le dictionnaire commun à toutes les mentions (DATA.dico). */
const CON_PANES={ues:"Unités d'enseignement",ecs:"Enseignements constitutifs",blocs:"Blocs et compétences",tableau:"Planification par semestre",valider:"Validation"};
/* les livrables proposés se règlent dans Mon compte > Préférences */
const ORG_PANES={etab:"Établissement",diplome:"Diplômes et mentions",promos:"Promotions",enseignants:"Enseignants",affect:"Répartition de service"};
let edArm=null;
function paintOrg(){
  const pane=ORG_PANES[ui.org.pane]?ui.org.pane:"diplome";
  const nav=document.getElementById("orgNav");
  nav.innerHTML=Object.entries(ORG_PANES).map(([k,v])=>
    `<button type="button" data-opane="${k}" aria-pressed="${pane===k}">${esc(v)}</button>`).join("");
  nav.querySelectorAll("[data-opane]").forEach(b=>b.onclick=()=>{
    ui.org.pane=b.dataset.opane;edArm=null;paintOrg();window.scrollTo({top:0,behavior:"smooth"})});
  const host=document.getElementById("orgPane");
  if(pane==="etab")return paintEtab(host);
  if(pane==="promos")return paintPromosOrg(host);
  if(pane==="affect")return paintAffect(host);
  paintEditor(pane,host);
}
/* Volets Établissement et Répartition de service : écrans écrits en TypeScript (src/etablissement/volets.ts) */
function paintEtab(host){
  DATA.etab=DATA.etab||{nom:"",uai:"",ville:"",academie:"",contactDpo:""};
  const cal=calendrier();
  window.dnmaxPont.etablissement.peindreVoletEtablissement(host,{etablissement:DATA.etab,calendrier:{rentree:cal.rentree,bascule:cal.bascule},enregistrer:()=>persistData()});
}
/* Répartition de service : pour chaque promotion, les EC de son année (dans le référentiel de sa mention)
   et le ou les enseignants qui les assurent. rangés par année scolaire dans DATA.affectH (voir affH). */
function promoEcs(pr,as){
  const D=DATA, a=promoAnneeAt(pr,as||anneeScolaire(new Date())), R=refOf(D,pr.diplomeId);
  return R.ecs.map(r=>{const x=D.dico.ecs.find(y=>y.id===r.id)||{};const code=((r.codes||{})[a])||"";
      const u=D.dico.ues.find(y=>y.id===r.ueId)||{};
      return code?{id:r.id,code,nom:x.nom||code,couleur:x.couleur||u.couleur||"#9aa2ae",ue:u.nom||"",ueId:r.ueId||""}:null})
    .filter(Boolean).sort((p2,q)=>ecNum(p2.code)-ecNum(q.code));
}
/* Répartition de service historisée par année scolaire : DATA.affectH["2026-2027"][promoId][ecId] = [idEnseignant…]. */
const asOf=y=>y+"-"+(+y+1);
function affH(){DATA.affectH=DATA.affectH||{};return DATA.affectH}
function affectOf(prId,as){const H=affH(), y=as||anneeScolaire(new Date());H[y]=H[y]||{};return H[y][prId]||(H[y][prId]={})}
function affGet(prId,as){return ((affH()[as||anneeScolaire(new Date())])||{})[prId]||{}}
/* l'enseignant a-t-il eu cette promotion, une année ou une autre ? (mes étudiants et mes anciens étudiants) */
function teachesPromo(prId,tid){return !!tid&&Object.values(affH()).some(Y=>Object.values((Y||{})[prId]||{}).some(l=>(l||[]).includes(tid)))}
function paintAffect(host){
  const D=DATA, ASnow=anneeScolaire(new Date()), y0=asStart(ASnow);
  const years=[0,1,2,3,4].map(k=>asOf(y0-k));
  const AS=years.includes(ui.org.affY)?ui.org.affY:ASnow;ui.org.affY=AS;
  const cur=promos.map(migPromoCohorte).filter(pr=>{const a=promoAnneeAt(pr,AS);return a>=1&&a<=promoDuree(pr)});
  const dIdx=id=>D.diplomes.findIndex(d=>d.id===id);
  cur.sort((x,y)=>(dIdx(x.diplomeId)-dIdx(y.diplomeId))||(promoAnneeAt(x,AS)-promoAnneeAt(y,AS)));
  const vide=!D.enseignants.length||!cur.length;
  const pr=vide?null:(cur.find(x=>x.id===ui.org.aff)||cur[0]);if(pr)ui.org.aff=pr.id;
  const A=pr?affectOf(pr.id,AS):{}, a=pr?promoAnneeAt(pr,AS):0;
  window.dnmaxPont.etablissement.peindreRepartition(host,{annees:years,anneeCourante:ASnow,annee:AS,
    promotions:cur.map(x=>({id:x.id,court:promoShort(x)||"",nom:x.nom||"",diplome:dipLabel(D.diplomes.find(d=>d.id===x.diplomeId)||{})})),
    promotion:pr?pr.id:"",ecs:pr?promoEcs(pr,AS):[],enseignants:D.enseignants.map(t=>({id:t.id,nom:t.nom})),repartition:A,
    anneeFormation:a,semestres:pr?semsOfAnnee(a):[],manque:{enseignants:!D.enseignants.length,promotions:!cur.length},
    nomUe:u=>tidy(u),choisirAnnee:y=>{ui.org.affY=y;paintOrg()},choisirPromotion:id=>{ui.org.aff=id;paintOrg()},
    enregistrer:rep=>{const H=affH();H[AS]=H[AS]||{};H[AS][pr.id]=rep;persistData();paintOrg()}});
}
/* Volet Promotions : écran écrit en TypeScript (src/etablissement/promotions.ts) ; règles dans src/domaine/promotions.ts */
function paintPromosOrg(host){
  const D=DATA, AS=anneeScolaire(new Date());
  promos.forEach(migPromoCohorte);
  window.dnmaxPont.etablissement.peindrePromotions(host,{promotions:()=>promos,ordreDiplomes:D.diplomes.map(d=>d.id),
    diplomes:dipVisibles().map(dp=>({id:dp.id,libelle:dipLabel(dp)})),libelleDiplome:id=>dipLabel(D.diplomes.find(d=>d.id===id)||{}),
    anneeScolaire:AS,moduleEleves:!!MOD.eleves,ouverte:ui.org.promo||"",
    basculer:id=>{ui.org.promo=ui.org.promo===id?"":id;paintOrg()},
    anneeFormation:pr=>promoAnneeAt(pr,AS),duree:promoDuree,nomCourt:pr=>promoShort(pr)||"",renommer:pr=>{pr.nom=promoNomAuto(pr)},
    ajouterPromotion:()=>{const pr={id:uid(),nom:"",debut:asStart(AS),diplomeId:D.activeDiplome,eleves:"",liste:[]};
      pr.nom=promoNomAuto(pr);promos.push(pr);savePromos();paintOrg();return pr.id},
    supprimerPromotion:pid=>{promos=promos.filter(x=>x.id!==pid);if(F.promoId===pid){F.promoId="";save()}},
    nouvelIdentifiantEtudiant:()=>newId("s"),enregistrer:savePromos,redessiner:paintOrg,
    armement:{arme:edArm,armer:(id,fn)=>armDel(id,fn)},annoncer:toast});
}
function paintRef(){
  if(!REF_PANES[ui.ref.pane])ui.ref.pane="explorer";
  if(!CON_PANES[ui.ref.cp])ui.ref.cp="ues";
  const pane=ui.ref.pane;
  const nav=document.getElementById("refNav");
  const nb=([k,v])=>`<button type="button" data-pane="${k}" aria-pressed="${pane===k}">${esc(v)}</button>`;
  const E=Object.entries(REF_PANES);
  nav.innerHTML=E.map(nb).join("");
  nav.querySelectorAll("[data-pane]").forEach(b=>b.onclick=()=>{
    ui.ref.pane=b.dataset.pane;edArm=null;paintRef();window.scrollTo({top:0,behavior:"smooth"})});
  document.getElementById("refExplore").hidden = pane!=="explorer";
  document.getElementById("refPane").hidden = pane==="explorer";
  if(pane==="explorer")return paintExplore();
  paintConstituer(document.getElementById("refPane"));
}
/* Ouvre une étape de Constituer, filtrée sur un nom ou un code (depuis Explorer ou la planification). */
function allerEtape(cp,q){
  ui.ref.pane="constituer";ui.ref.cp=cp;ui.ref.cq=q||"";edArm=null;paintRef();
  const t=document.getElementById("cq");if(t)t.scrollIntoView({block:"center",behavior:"smooth"});
}
/* ---- versions datées du référentiel d'une mention ---- */
function versionsOf(dip){const D=DATA;D.versions=D.versions||{};D.versions[dip]=D.versions[dip]||[];return D.versions[dip]}
function refJSON(dip){const R=refOf(DATA,dip);return JSON.stringify(KINDS.map(k=>R[k]))}
function versionActive(dip){const v=versionsOf(dip);return v.find(x=>x.id===((DATA.valide||{})[dip]))||null}
function refAJour(dip){const v=versionActive(dip);return !!v&&JSON.stringify(KINDS.map(k=>v.snap[k]))===refJSON(dip)}
/* Validation par l'enseignant, qui est responsable du référentiel sur lequel il évalue : seule une version
   qu'il a attestée lui-même (v.attestation, date) permet de créer ou d'enregistrer une évaluation et de
   saisir des résultats. Une version reçue, livrée avec l'application ou validée avant l'attestation n'en a pas.
   La règle est tenue par l'application (src/domaine/validation-referentiel.ts) et passe par le pont. */
function dipRefValide(dip){return window.dnmaxPont.referentielValide.diplome(DATA,dip)}
function promoRefValide(pr){return window.dnmaxPont.referentielValide.promotion(DATA,pr)}
function promosDeF(f){
  const l=[promos.find(p=>p.id===f.promoId),...(f.classes||[]).map(n=>promos.find(p=>p.nom===n))].filter(Boolean);
  return [...new Set(l)];
}
/* diplôme dont le référentiel bloque l'évaluation, ou "" si rien ne la bloque ; sans promotion, le diplôme affiché */
function dipBloquant(f){
  const l=promosDeF(f);
  if(!l.length)return dipRefValide(DATA.activeDiplome)?"":DATA.activeDiplome;
  const pr=l.find(p=>!promoRefValide(p));return pr?(pr.diplomeId||DATA.activeDiplome):"";
}
function peutCreerFiche(){return dipRefValide(DATA.activeDiplome)||promos.some(promoRefValide)}
function allerValidation(dip){
  if(dip&&dip!==DATA.activeDiplome&&DATA.diplomes.some(d=>d.id===dip))vueMention(dip);
  ui.tab="ref";ui.ref.pane="constituer";ui.ref.cp="valider";edArm=null;
  paintTabs();paintRef();window.scrollTo({top:0,behavior:"smooth"});
}
/* Explique pourquoi l'action est refusée et mène au volet de validation. */
function alerteRefNonValide(dip,action){
  const prev=document.activeElement, el=document.createElement("div");el.className="modal";
  const dp=DATA.diplomes.find(x=>x.id===dip);
  el.innerHTML=`<div class="card" role="alertdialog" aria-modal="true" aria-labelledby="rnvT" aria-describedby="rnvD" style="max-width:500px;width:100%">
    <p id="rnvT"><b>${esc(action)} : le référentiel${dp?" "+esc(dipLabel(dp)):""} n'est pas validé.</b></p>
    <p id="rnvD">Avant une première évaluation, le référentiel doit être vérifié et validé par l'enseignant, dans Référentiel > Constituer > Validation. C'est vous qui en êtes responsable, pas l'hébergeur ni le développeur de DNMAX.</p>
    <p class="hint">Les évaluations déjà enregistrées ne sont pas touchées : elles restent consultables et exportables.</p>
    <div class="row"><button class="btn ghost" data-no>Fermer</button><button class="btn primary" data-yes>Aller à la validation</button></div></div>`;
  const close=()=>{el.remove();document.removeEventListener("keydown",key);if(prev&&prev.focus&&document.contains(prev))prev.focus()};
  const key=e=>{if(e.key==="Escape")close()};
  el.querySelector("[data-no]").onclick=close;
  el.querySelector("[data-yes]").onclick=()=>{close();allerValidation(dip)};
  el.onclick=e=>{if(e.target===el)close()};
  document.addEventListener("keydown",key);document.body.appendChild(el);
  el.querySelector("[data-yes]").focus();
}
/* Vrai, avec le message, si le référentiel de l'évaluation empêche l'action. */
function refBloque(f,action){const dip=dipBloquant(f);if(!dip)return false;alerteRefNonValide(dip,action);return true}
/* Versions du référentiel par promotion : une promo utilise la version validée qui lui est appliquée
   (pr.refV) ; sans choix explicite, la version en vigueur de sa mention. Une évaluation enregistrée
   garde la version sur laquelle elle a été faite (f.refV) : appliquer une nouvelle version à une promo
   ne touche pas à ses évaluations passées. */
function promoDeF(f){return promos.find(p=>p.id===f.promoId)||(f.classes||[]).map(n=>promos.find(p=>p.nom===n)).find(Boolean)||null}
function promoVid(pr){if(!pr)return "";const vs=versionsOf(pr.diplomeId);
  if(pr.refV&&vs.some(v=>v.id===pr.refV))return pr.refV;return (DATA.valide||{})[pr.diplomeId]||""}
function promosEnCours(dip){const AS=anneeScolaire(new Date().toISOString().slice(0,10));
  return promos.map(migPromoCohorte).filter(pr=>{if(pr.diplomeId!==dip)return false;const a=promoAnneeAt(pr,AS);return a>=1&&a<=promoDuree(pr)})}
function versionPourF(){
  const A=DATA.activeDiplome, vs=versionsOf(A), pr=promoDeF(F);
  if(!pr||pr.diplomeId!==A)return null;
  const id=(F.refV&&vs.some(v=>v.id===F.refV))?F.refV:promoVid(pr);
  return vs.find(v=>v.id===id)||null;
}
function projectSnap(d,A,snap){const o=Object.assign({},d,{refs:Object.assign({},d.refs,{[A]:snap}),activeDiplome:A});materialize(o);return projectRef(o)}
function computeREF(){try{const v=versionPourF();return v?projectSnap(DATA,DATA.activeDiplome,v.snap):projectRef(DATA)}catch(e){return projectRef(DATA)}}
function versionUsage(dip,vid){
  const ps=promos.filter(p=>p.diplomeId===dip&&promoVid(p)===vid);
  const fs=fiches.filter(f=>f.refV===vid);
  return {ps,fs};
}
/* Appelée seulement une fois l'attestation cochée : la version validée la porte. */
function validerVersion(date,note){
  absorb(DATA);
  const dip=DATA.activeDiplome, R=refOf(DATA,dip), prevId=(DATA.valide||{})[dip]||"", today=new Date().toISOString().slice(0,10);
  // version en vigueur identique au référentiel, mais jamais attestée (reçue, installée) : on l'atteste
  // sans en créer une copie, pour que promotions et évaluations qui la suivent n'aient pas à changer de version
  const va=versionActive(dip);
  if(va&&!va.attestation&&refAJour(dip)){
    va.attestation=today;persistData();REF=computeREF();paintRef();
    toast("Référentiel validé — version du "+frDate(va.date)+", vérifiée par vous.");return;
  }
  const v={id:newId("v"),date:date||today,note:String(note||"").trim(),attestation:today,
    snap:JSON.parse(JSON.stringify({ues:R.ues,ecs:R.ecs,blocs:R.blocs,competences:R.competences}))};
  // ce qui suivait l'ancienne version y reste attaché : promos sans choix explicite, évaluations enregistrées
  if(prevId){
    promos.forEach(p=>{if(p.diplomeId===dip&&!p.refV)p.refV=prevId});
    fiches.forEach(f=>{if(!f.refV){const p=promoDeF(f);if(p&&p.diplomeId===dip)f.refV=prevId}});
    savePromos();LS.set("dnmade.fiches",fiches);
  }
  versionsOf(dip).unshift(v);
  DATA.valide=Object.assign({},DATA.valide||{});DATA.valide[dip]=v.id;
  persistData();REF=computeREF();paintRef();
  const enc=promosEnCours(dip);
  if(prevId&&enc.length)askPromosVersion(dip,v,enc);
  else toast("Référentiel validé — version du "+frDate(v.date)+(enc.length?", appliquée aux promotions de cette mention.":"."));
}
function askPromosVersion(dip,v,enc){
  const prev=document.activeElement, el=document.createElement("div");el.className="modal";
  const vdate=id=>{const x=versionsOf(dip).find(y=>y.id===id);return x?frDate(x.date):"référentiel non validé"};
  el.innerHTML=`<div class="card" role="dialog" aria-modal="true" aria-labelledby="pvT" style="max-width:480px;width:100%">
    <p id="pvT"><b>Version du ${esc(frDate(v.date))} validée</b> — à quelles promotions en cours l'appliquer ?</p>
    <div style="display:flex;flex-direction:column;gap:6px;margin:6px 0 10px">
      ${enc.map(p=>`<label class="sw" style="align-items:flex-start"><input type="checkbox" data-pv="${esc(p.id)}" checked>
        <span>${esc(promoLabel(p))}<br><span class="hint" style="font-size:11.5px">actuellement : version du ${esc(vdate(p.refV))}</span></span></label>`).join("")}
    </div>
    <p class="hint" style="font-size:12.5px">Les évaluations déjà enregistrées gardent le référentiel sur lequel elles ont été faites. Les nouvelles promotions utiliseront cette version.</p>
    <div class="row"><button class="btn ghost" data-no>N'appliquer à aucune</button><button class="btn primary" data-yes>Appliquer</button></div></div>`;
  const close=()=>{el.remove();document.removeEventListener("keydown",key);if(prev&&prev.focus)prev.focus();REF=computeREF();paintRef();paintForm();paintPick()};
  const key=e=>{if(e.key==="Escape"){close();toast("Version validée, appliquée à aucune promotion en cours.")}};
  el.querySelector("[data-no]").onclick=()=>{close();toast("Version validée, appliquée à aucune promotion en cours.")};
  el.querySelector("[data-yes]").onclick=()=>{
    let n=0;el.querySelectorAll("[data-pv]").forEach(c=>{if(c.checked){const p=promos.find(x=>x.id===c.dataset.pv);if(p){p.refV=v.id;n++}}});
    savePromos();close();toast("Version du "+frDate(v.date)+" appliquée à "+n+" promotion"+(n>1?"s":"")+".")};
  document.addEventListener("keydown",key);document.body.appendChild(el);
}
function restaurerVersion(id){
  const dip=DATA.activeDiplome, v=versionsOf(dip).find(x=>x.id===id);if(!v)return;
  const R=refOf(DATA,dip);KINDS.forEach(k=>R[k]=JSON.parse(JSON.stringify(v.snap[k]||[])));
  DATA.valide=Object.assign({},DATA.valide||{});DATA.valide[dip]=v.id;
  materialize(DATA);REF=computeREF();persistData();
  paintRef();paintForm();paintPick();paintLignes();
  toast("Version du "+frDate(v.date)+" rétablie."+(v.attestation?"":" Validez-la avant d'évaluer avec."));
}
/* afficher le référentiel de la mention d'une promotion : chaque mention a le sien,
   et une évaluation suit toujours la mention de sa promotion */
function mentionDeFiche(f){
  const pr=promos.find(p=>p.id===f.promoId)||(f.classes||[]).map(n=>promos.find(p=>p.nom===n)).find(Boolean);
  const d=pr&&pr.diplomeId;return d&&DATA.diplomes.some(x=>x.id===d)?d:"";
}
function vueMention(dip){
  if(!dip||dip===DATA.activeDiplome)return;
  absorb(DATA);DATA.activeDiplome=dip;materialize(DATA);REF=computeREF();persistData();
}
function frDate(d){const t=new Date(d+"T12:00:00");return isNaN(t)?d:t.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}
/* ---- Tableau du référentiel : compétences en lignes, enseignements en colonnes,
   comme le tableau d'origine ; chaque case ouvre ou ferme un semestre ---- */
/* Étape 4, planification par semestre : écran écrit en TypeScript (src/referentiel/planification.ts) ;
   règles dans src/domaine/planification.ts */
function paintMatrice(host){
  window.dnmaxPont.referentiel.peindrePlanification(host,{vue:DATA,semestre:SEMS.includes(ui.ref.msem)?ui.ref.msem:"",
    choisirSemestre:sem=>{ui.ref.msem=sem;edArm=null;paintRef()},teinteBlocs:BLOC_TINT,
    enregistrer:()=>saveData(false),allerALaCompetence:code=>allerEtape("blocs",code)});
}
/* Constituer le référentiel d'une mention, en 5 étapes comme une évaluation : 1. les UE retenues, 2. les EC,
   3. les blocs et leurs compétences, 4. la planification par semestre (tableau compétences × EC), 5. la validation datée. */
function paintConstituer(host){
  /* page et étape 5 : écran écrit en TypeScript (src/referentiel/constituer.ts) ; règles dans src/domaine/constituer.ts */
  const D=DATA, dip=D.activeDiplome;
  window.dnmaxPont.referentiel.peindrePageConstituer(host,{vue:D,diplomes:D.diplomes,actif:dip,etape:ui.ref.cp,
    versions:versionsOf(dip),versionActive:versionActive(dip),aJour:refAJour(dip),
    usage:vid=>{const u=versionUsage(dip,vid);return {promotions:u.ps.map(p=>p.nom||"promo"),evaluations:u.fs.length}},
    aujourdhui:new Date().toISOString().slice(0,10),
    choisirEtape:cp=>{ui.ref.cp=cp;ui.ref.cq="";edArm=null;paintRef();window.scrollTo({top:0,behavior:"smooth"})},
    choisirDiplome:nom=>{const dp=D.diplomes.find(x=>norm(x.nom||"")===norm(nom));
      if(dp){D.activeDiplome=dp.id;ui.ref.filter={kind:"",value:""};saveData()}},
    choisirMention:id=>{D.activeDiplome=id;ui.ref.filter={kind:"",value:""};saveData()},
    peindreEtape:(cp,main)=>cp==="tableau"?paintMatrice(main):paintEtape(cp,main),
    valider:validerVersion,
    attester:vid=>{const v=versionsOf(dip).find(x=>x.id===vid);if(!v)return;
      v.attestation=new Date().toISOString().slice(0,10);persistData();REF=computeREF();paintRef()},
    retablir:restaurerVersion,
    supprimerVersion:i=>{window.dnmaxPont.constituer.supprimerVersion(D,dip,i);persistData();paintRef()},
    armement:{arme:edArm,armer:(id,fn)=>armDel(id,fn)},annoncer:toast});
}
/* Étapes 1 à 3 de Constituer : écrans écrits en TypeScript (src/referentiel/etapes.ts) ;
   règles dans src/domaine/constituer.ts */
function paintEtape(kind,host){
  const D=DATA, dipL=REF.meta.diplome||"—", R=window.dnmaxPont.referentiel;
  (kind==="ues"?R.peindreEtapeUes:kind==="ecs"?R.peindreEtapeEcs:R.peindreEtapeBlocs)(host,contexteEtape(D,dipL));
}
/* contexte des étapes de Constituer écrites en TypeScript : la vue du référentiel actif et de quoi l'enregistrer */
function contexteEtape(D,dipL){
  return {vue:D,diplome:dipL,nouvelIdentifiant:newId,enregistrer:redessiner=>saveData(redessiner?undefined:false),
    filtre:ui.ref.cq||"",filtrer:texte=>{ui.ref.cq=texte;paintRef()},viderFiltre:()=>{ui.ref.cq=""},
    reprendre:(k,v)=>{const R=refOf(D,D.activeDiplome);if(!R[k].some(r=>r.id===v))R[k].push(assocFor(D.activeDiplome,k,v));saveData(true,true)},
    retirer:(k,id)=>{absorb(D);refRemove(refOf(D,D.activeDiplome),k,id);saveData(true,true)},
    renumeroterBloc:(id,v)=>{absorb(D);const r=window.dnmaxPont.renumeroterBloc(D,id,v);
      if(r.modifie){D.dico=r.donnees.dico;D.refs=r.donnees.refs;if(r.donnees.versions)D.versions=r.donnees.versions;saveData(true,true)}
      return r},
    redessiner:paintRef,
    armement:{arme:edArm,armer:(id,fn)=>armDel(id,fn)},annoncer:toast};
}
/* suppression en deux temps, partagée par les écrans de l'éditeur commun (src/etablissement/editeur-commun.ts) :
   le premier clic arme le bouton et redessine, le second supprime */
function armDel(id,fn){
  if(edArm!==id){edArm=id;(ui.tab==="org"?paintOrg:ui.tab==="pref"?paintPrefs:paintRef)();return}
  edArm=null;fn();
}
/* Éditeur commun de Mon établissement et des Préférences : écrans écrits en TypeScript (src/etablissement/),
   règles dans src/domaine/ (diplomes, personnes). Seule la suppression en deux temps reste tenue ici (edArm, armDel). */
function paintEditor(pane,host){
  host=host||document.getElementById("refPane");
  const D=DATA, armement={arme:edArm,armer:(id,fn)=>armDel(id,fn)};
  const enregistrer=redessiner=>saveData(redessiner?undefined:false);
  if(pane==="diplome")return window.dnmaxPont.etablissement.peindreDiplomes(host,{donnees:D,visibles:dipVisibles(),
    estCadreVierge,nouvelIdentifiant:()=>newId("d"),ajouterMention:addMention,enregistrer,
    apresChangementDuree:()=>{promos.forEach(migPromoCohorte);savePromos()},armement,annoncer:toast});
  if(pane==="enseignants")return window.dnmaxPont.etablissement.peindreEnseignants(host,{enseignants:D.enseignants,
    moi:()=>D.moi,definirMoi:id=>{D.moi=id;persistData()},armement,nouvelIdentifiant:()=>"t"+Date.now().toString(36),enregistrer,
    renommerMoi:(prenom,nomFam)=>{if(window.dnmaxPont.renommerMoi)window.dnmaxPont.renommerMoi(prenom,nomFam)},annoncer:toast});
  if(pane==="livrables")return window.dnmaxPont.etablissement.peindreLivrables(host,{livrables:()=>D.livrables,
    remplacer:l=>{D.livrables=l},listeOrigine:SUPPORTS_DEF,retirerDeLEvaluation:nom=>{F.livrables=F.livrables.filter(x=>x!==nom)},
    armement,enregistrer,annoncer:toast});
}
/* Contenu de l'exemple (noms, évaluations, résultats) : src/domaine/exemple.ts */
const EXEMPLE=window.dnmaxPont.exemple;
function fillRes(f,seed,part){
  f.res=EXEMPLE.resultatsDetailles(studentsOf(f).map(e=>e.id),lignesOf(f).map(ligKey),(f.niveaux||[]).length||4,seed,part);
  return f;
}
function contexteDetaille(){
  return {competence:code=>REF.competences.find(x=>x.code===code),ecsRetenus:itemEcs,nouvelIdentifiant:uid,
    maintenant:Date.now(),niveaux:PRESETS.maitrise.niveaux};
}
/* Jeu d'exemple étendu : 4 mentions, des promotions de chaque année (et une sortie),
   des dizaines d'évaluations réparties sur les semestres écoulés, avec résultats. */
function demoMass(){
  const D=DATA, AS0=asStart(anneeScolaire(new Date()));
  const rnd=EXEMPLE.suiteEtendue(EXEMPLE.GRAINE_ETENDUE);
  const base=D.diplomes.find(d=>d.id===D.activeDiplome), act=base.id;
  const dips=[[base,EXEMPLE.THEME_MENTION_REFERENTIEL]];
  EXEMPLE.MENTIONS_EXEMPLE.forEach(([m,code,th])=>{let dp=D.diplomes.find(d=>d.nom===base.nom&&d.mention===m);
    if(!dp){dp=addMention(base.id,base.nom);dp.mention=m;dp.code=code;dp.duree=+base.duree||3}dips.push([dp,th])});
  saveData(false);
  const PROFS=EXEMPLE.ENSEIGNANTS_EXEMPLE;
  PROFS.forEach(nom=>{if(!D.enseignants.some(t=>t.nom===nom))D.enseignants.push(nouvellePersonne(uid(),nom))});
  if(!D.moi)D.moi=(D.enseignants.find(t=>t.nom===PROFS[0])||{}).id;
  const LIV=livrNames().length?livrNames():EXEMPLE.LIVRABLES_PAR_DEFAUT;
  const out=[];let nEl=0,nPr=0;
  dips.forEach(([dp,theme])=>{
    D.activeDiplome=dp.id;saveData(false);
    const duree=+dp.duree||3;
    for(let k=0;k<=duree;k++){             // k = années depuis l'entrée ; k=duree : promotion sortie
      const debut=AS0-k;
      let pr=promos.find(x=>migPromoCohorte(x).diplomeId===dp.id&&x.debut===debut);
      if(!pr){pr={id:uid(),debut,diplomeId:dp.id,eleves:"",liste:[]};promos.push(pr)}
      migPromoCohorte(pr);nPr++;
      {const mi=dips.findIndex(x=>x[0]===dp);
        // l'enseignant « moi » (Sophie Hébert) n'intervient qu'en Objet et en Espace
        const tids=D.enseignants.filter(t=>PROFS.includes(t.nom)&&(mi<2||t.nom!==PROFS[0])).map(t=>t.id);
        // une répartition par année scolaire vécue par la promotion (historique)
        for(let y=debut;y<=AS0&&y<debut+duree;y++){const as=asOf(y), A=affectOf(pr.id,as);
          promoEcs(pr,as).forEach((e,j)=>{if(!(A[e.id]||[]).length)A[e.id]=EXEMPLE.enseignantsDeLEc(rnd,j,tids)})}}
      if(!(pr.liste||[]).length||pr.liste.every(e=>EXEMPLE.estNomExemple(e.nom))){
        const had=(pr.liste||[]).length, noms=EXEMPLE.nomsDePromotion(rnd,had);
        // promotion d'exemple déjà là : on garde les étudiants (et leurs résultats), seuls les noms changent
        if(had){pr.liste.forEach((e,j)=>e.nom=noms[j]);pr.eleves=noms.join("\n")}
        else syncListe(pr,noms.join("\n"));
      }
      const els=migPromo(pr).liste;nEl+=els.length;
      const ySem=EXEMPLE.semestresOuverts(k,duree,rangSemestre(new Date()));
      for(let si=0;si<ySem&&si<SEMS.length;si++){
        const sem=SEMS[si], dispo=compsFor(sem);if(!dispo.length)continue;
        out.push(...EXEMPLE.evaluationsDuSemestre({hasard:rnd,rang:si,semestre:sem,competences:dispo,ecsRetenus:itemEcs,livrables:LIV,theme,
          promotion:{id:pr.id,nom:pr.nom},debut,etudiants:els.map(e=>e.id),maintenant:Date.now(),nouvelIdentifiant:uid,
          preset:DEF_PRESET_GET(),niveaux:PRESETS[DEF_PRESET_GET()].niveaux}));
      }
    }
  });
  D.activeDiplome=act;saveData(false);savePromos();persistData();
  out.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  return {fiches:out,nPr,nEl,nM:dips.length};
}
function validerExemple(dips){
  absorb(DATA);
  const today=new Date().toISOString().slice(0,10);
  dips.forEach(dip=>{
    if(dipRefValide(dip))return;
    const R=refOf(DATA,dip), v={id:newId("v"),date:today,note:"Exemple",attestation:today,
      snap:JSON.parse(JSON.stringify({ues:R.ues,ecs:R.ecs,blocs:R.blocs,competences:R.competences}))};
    versionsOf(dip).unshift(v);
    DATA.valide=Object.assign({},DATA.valide||{});DATA.valide[dip]=v.id;
  });
  persistData();REF=computeREF();
}
async function loadDemo(){
  // sans référentiel, l'exemple apporte le sien : celui du DN MADE mention Objet livré avec DNMAX,
  // installé comme à la bienvenue (src/heritage/exemple.ts) ; le reste de l'établissement est gardé
  const refExemple=!refOf(DATA,DATA.activeDiplome).competences.length;
  if(refExemple){
    persistData();
    let dip;
    try{dip=await window.dnmaxPont.installerReferentielExemple()}catch(e){toast("Exemple : "+(e&&e.message||e));return}
    DATA=LS.get("dnmade.data",null);materialize(DATA);
    if(dip&&DATA.diplomes.some(d=>d.id===dip))DATA.activeDiplome=dip;
    const nt=window.dnmaxPont.nettoyerDiplomesVierges(DATA,promos);if(nt&&nt.modifie){DATA=nt.donnees;materialize(DATA)}
    REF=computeREF();persistData();
  }
  const dipsAvant=new Set(refExemple?[]:DATA.diplomes.map(d=>d.id));
  EXEMPLE.ENSEIGNANTS_DETAILLES
    .forEach(([nom,discipline])=>{if(!DATA.enseignants.some(t=>t.nom===nom))DATA.enseignants.push({...nouvellePersonne(uid(),nom),discipline})});
  persistData();
  const AS0=asStart(anneeScolaire(new Date()));
  const promo=(an,noms)=>{
    const debut=AS0-an+1;
    let pr=promos.find(x=>migPromoCohorte(x).diplomeId===DATA.activeDiplome&&x.debut===debut);
    if(!pr){pr={id:uid(),debut,diplomeId:DATA.activeDiplome,eleves:"",liste:[]};promos.push(pr)}
    migPromoCohorte(pr);syncListe(pr,noms.join("\n"));
    return pr;
  };
  const p2=promo(2,EXEMPLE.ETUDIANTS_DEUXIEME_ANNEE);
  const p1=promo(1,EXEMPLE.ETUDIANTS_PREMIERE_ANNEE);
  savePromos();
  const cl=(f,pr)=>{f.promoId=pr.id;f.classe=pr.nom;f.classes=[pr.nom];migF(f);return f};
  const f1=cl(EXEMPLE.evaluationMobilier(contexteDetaille()),p2); fillRes(f1,11,3);
  const f2=cl(EXEMPLE.evaluationLecture(contexteDetaille()),p1); fillRes(f2,29,0);
  const f3=cl(EXEMPLE.evaluationSoutenance(contexteDetaille()),p2); fillRes(f3,47,8);
  const titres=[f1.titre,f2.titre,f3.titre];
  const MS=demoMass();
  // Le référentiel que l'exemple installe lui-même est validé pour la démonstration ; celui de l'enseignant
  // (et les mentions que l'exemple en dérive) reste à valider par lui.
  if(refExemple)validerExemple(DATA.diplomes.filter(d=>!dipsAvant.has(d.id)).map(d=>d.id));
  fiches=[structuredClone(f1),structuredClone(f3),structuredClone(f2),...MS.fiches,...fiches.filter(x=>!titres.includes(x.titre)&&!x.demo)];
  LS.set("dnmade.fiches",fiches);
  F=migF(f1);save();
  let on="";
  if(!MOD.eleves){MOD.eleves=true;LS.set("dnmade.modules",MOD);on=" · module Étudiants activé"}
  ui.step=4;ui.sel=[];ui.emode="grille";ui.eleve="";
  ui.tab="saved";
  paintTabs();paintForm();paintPick();paintLignes();paintSaved();paintSteps();paintEleves();
  toast("Exemple chargé : "+MS.nM+" mentions, "+MS.nPr+" promotions, "+(MS.fiches.length+3)+" évaluations, résultats saisis"+on+".");
  window.scrollTo({top:0,behavior:"smooth"});
}
function paintSceau(){
  PREF.peindreSceau(document,{actif:sceauActif(),choisir:actif=>{PREFS.sceau=actif;savePrefs()}});
  PREF.peindreDossierExports(document,window.dnmaxPont.dossierExports,toast);
}
function paintVocab(){
  PREF.peindreVocabulaire(document,{libelle:critLabel(),choisir:libelle=>{PREFS.critLabel=libelle;savePrefs();paintLignes()}});
}
/* Préférences (menu « Mon compte ») : vocabulaire et livrables proposés ; le thème est tenu par l'application. */
function paintPrefs(){
  paintVocab();paintSceau();
  paintEditor("livrables",document.getElementById("prefLivr"));
}
/* Paramètres > Modules : écran écrit en TypeScript (src/parametres/modules.ts) */
function paintSet(){
  window.dnmaxPont.modules.peindre(document.getElementById("modList"),document.getElementById("mCount"),{actifs:MOD,
    ouvrirDocuments:()=>window.dnmaxPont.documentsModuleEleves(DATA.etab||{}),
    confirmerEleves:()=>window.dnmaxPont.confirmerModuleEleves(DATA.etab||{}),
    appliquer:appliquerModule});
}
function appliquerModule(cle,actif){
  if(!actif&&window.dnmaxPont.modules.entraineDautres(cle,MOD))
    toast("Niveaux d'acquisition désactivé aussi : il nécessite le module "+MODULES[cle].nom+".");
  MOD[cle]=actif;modDeps();LS.set("dnmade.modules",MOD);
  paintSet();paintTabs();paintForm();paintPick();paintLignes();paintVocab();paintRef();
  toast(MODULES[cle].nom+(actif?" : activé":" : désactivé"));
}

/* ---------- construction de la fiche ---------- */
/* colonnes des documents exportés : règle dans src/export/modele.ts */
function columns(){return window.dnmaxPont.exports.colonnesExport(F.livrables.length,rows().map(r=>r.livr||""),critLabel())}
function ecNoms(codes){
  const nomOf=code=>{const m=REF.competences.flatMap(c=>c.ecs||[]).find(x=>x.ec===code);if(m&&m.nom)return m.nom;
    const e=DATA.ecs.find(x=>x.code===code||Object.values(x.codes||{}).includes(code));return e?(e.nom||code):code};
  return [...new Set((codes||[]).map(nomOf).filter(Boolean))].join(", ");
}
function rows(){
  const out=[];
  (F.ops||[]).forEach(o=>{
    const its=F.items.filter(i=>i.op===o.id);
    if(!its.length)return;
    const cs=its.map(i=>REF.competences.find(x=>x.code===i.code)).filter(Boolean);
    out.push({op:true,
      bloc:[...new Set(cs.map(c=>c.bloc))].sort((a,b)=>+a-+b).join(", "),
      code:its.map(i=>i.code).join(" + "),
      lib:o.libelle||"(compétence opérationnelle à formuler)",
      comp:cs.map(c=>c.code+" — "+c.libelle).join("\n"),   // le code facilite le report dans un autre logiciel
      ec:[...new Set(its.flatMap(i=>i.ecs||[]))].join(", "),
      ecn:ecNoms([...new Set(its.flatMap(i=>i.ecs||[]))]),
      livr:(o.livrables||[]).join(" ; "),
      key:"op:"+o.id,
      ord:[0,opIndex(o.id),0]});
  });
  F.items.filter(i=>!i.op).forEach(it=>{
    const c=REF.competences.find(x=>x.code===it.code)||{libelle:"",bloc:""};
    out.push({op:false,bloc:c.bloc,code:it.code,comp:c.libelle?it.code+" — "+c.libelle:it.code,lib:it.libelle&&it.libelle!==c.libelle?it.libelle:"",ec:(it.ecs||[]).join(", "),ecn:ecNoms(it.ecs),
      livr:(it.livrables||[]).join(" ; "),key:"one:"+it.code,
      ord:[1,+c.bloc||99,ecNum(it.code)]});
  });
  return out.sort((a,b)=>{for(let i=0;i<3;i++){const x=(a.ord[i]||0)-(b.ord[i]||0);if(x)return x}return 0});
}
/* EXPORT_VIDE : export de « l'évaluation » (grille vierge) plutôt que des restitutions remplies par étudiant */
let EXPORT_VIDE=false;
function eleveList(){return MOD.eleves&&!EXPORT_VIDE?studentsOf(F):[]}
function fname(ext,who){
  const p=[F.semestre,classesDisp(F),F.titre||"évaluation",who].filter(Boolean).join(" - ");
  return p.replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").slice(0,120)+"."+ext;
}
/* En-tête des documents exportés : une ligne de contexte et l'enseignant·e, sans cartouche. */
function ligneContexte(){
  return [classesDisp(F),F.livrables.join(" · "),F.semestre+(MOD.dn?" · "+dnLabel(F.semestre):"")].filter(Boolean).join(" — ");
}
/* au-dessus de la ligne de contexte : l'établissement et le ou les enseignants, qui signent le document */
function ligneSignature(){
  const profs=(Array.isArray(F.profs)&&F.profs.length?F.profs:[F.prof]).map(p=>String(p||"").trim()).filter(Boolean);
  return [String((DATA.etab||{}).nom||"").trim(),profs.join(", ")].filter(Boolean).join(" — ");
}
function ligneEnseignant(who){
  return who?"Étudiant : "+who:"";
}

/* ---------- exports Word, OpenDocument et tableur : écrits en TypeScript (src/export/) ---------- */
/* L'évaluation en cours, mise en forme pour les documents : une fiche par étudiant (module Étudiants), sinon une fiche vierge. */
function ficheExport(){
  const rs=rows();
  return {diplome:REF.meta.diplome||"",titre:F.titre||"",signature:ligneSignature(),contexte:ligneContexte(),
    consignes:F.consignes||"",prof:F.prof||"",semestre:F.semestre,promotions:classesDisp(F),plusieursPromotions:(F.classes||[]).length>1,
    livrables:F.livrables,niveaux:F.niveaux||[],colonnes:columns(),
    lignes:rs.map(r=>({cle:r.key,op:r.op,bloc:r.bloc,code:r.code,lib:r.lib,comp:r.comp,ec:r.ec,ecn:r.ecn,livr:r.livr})),
    etudiants:eleveList().map(e=>({nom:e.nom,resultat:(F.res||{})[e.id]})),sceau:sceauActif()?SCEAU:null};
}
function buildXlsx(fmt){
  const ods=fmt==="ods";
  return new Blob([window.dnmaxPont.exports.construireTableur(ficheExport(),ods?"ods":"xlsx")],
    {type:ods?"application/vnd.oasis.opendocument.spreadsheet":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
/* Sceau DN MADE en tête des documents Word et OpenDocument : facultatif, réglé dans
   Mon compte > Préférences > Documents exportés, désactivé par défaut. Image
   public/documents/sceau-dn-made.png (voir outils/generer-sceau.ts), lue au premier export qui l'affiche. */
let SCEAU=null;
function sceauActif(){return PREF.sceauActif(PREFS)}
async function chargerSceau(){
  if(SCEAU)return SCEAU;
  const r=await fetch("/documents/sceau-dn-made.png");
  if(!r.ok)throw new Error("image du sceau DN MADE introuvable");
  const b=new Uint8Array(await r.arrayBuffer());let t="";
  for(let i=0;i<b.length;i+=0x8000)t+=String.fromCharCode(...b.subarray(i,i+0x8000));
  return SCEAU=btoa(t);
}
async function buildDocx(){
  if(sceauActif())await chargerSceau();
  return new Blob([await window.dnmaxPont.exports.construireDocx(ficheExport(),window.dnmaxPont.exports.dessinateurJauge((F.niveaux||[]).length))],
    {type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
async function buildOdt(){
  if(sceauActif())await chargerSceau();
  return new Blob([await window.dnmaxPont.exports.construireOdt(ficheExport(),window.dnmaxPont.exports.dessinateurJauge((F.niveaux||[]).length))],
    {type:"application/vnd.oasis.opendocument.text"});
}

/* ---------- Progression d'une promotion : ce qui reste à évaluer au semestre ---------- */
function paintProg(){
  const host=document.getElementById("progPane");if(!host)return;
  ui.prog=ui.prog||{};
  const AS=anneeScolaire(new Date());
  // si « c'est moi » est défini : seulement les promotions de ma répartition de service, en cours ou terminées
  // (mes étudiants et mes anciens étudiants) ; sinon, les promotions en cours
  const me=DATA.enseignants.find(t=>t.id===DATA.moi);
  // règle du choix des promotions : src/domaine/vue-progression.ts
  const mine=pr=>me&&teachesPromo(pr.id,me.id);
  const dIdx=id=>DATA.diplomes.findIndex(d=>d.id===id);
  const suivies=window.dnmaxPont.vueProgression.promotionsSuivies(promos.map(migPromoCohorte).filter(pr=>DATA.diplomes.some(d=>d.id===pr.diplomeId))
    .map(pr=>({promotion:pr,annee:promoAnneeAt(pr,AS),duree:promoDuree(pr),rangDiplome:dIdx(pr.diplomeId),debut:pr.debut,mienne:!!mine(pr)})),!!me);
  const ps=suivies.promotions;
  if(!ps.length){host.innerHTML=`<div class="panel"><div class="empty">Aucune promotion en cours pour ${esc(REF.meta.diplome||"cette mention")} en ${esc(AS)}.
    Crée-la dans Mon établissement > Promotions.</div></div>`;return}
  const pr=ps.find(x=>x.id===ui.prog.promo)||ps.find(x=>x.diplomeId===DATA.activeDiplome)||ps[0];ui.prog.promo=pr.id;
  // la progression lit le référentiel de la mention de la promotion affichée
  if(pr.diplomeId!==DATA.activeDiplome){DATA.activeDiplome=pr.diplomeId;saveData(false)}
  if(ui.prog.t==null&&me&&mine(pr))ui.prog.t=[me.id];
  const semP=window.dnmaxPont.vueProgression.semestresProgression(promoAnneeAt(pr,AS),promoDuree(pr),rangSemestre(new Date()));
  const semCur=semP.courant, semsAll=semP.semestres;
  const sem=semsAll.includes(ui.prog.sem)?ui.prog.sem:semCur;ui.prog.sem=sem;
  const filt=ui.prog.f||"tout";
  const els=migPromo(pr).liste;
  const fs=fiches.filter(f=>!f.brouillon&&((f.classes||[]).includes(pr.nom)||f.promoId===pr.id));
  /* filtres communs aux deux vues : écrans dans src/progression/ */
  const dips=[...new Set(ps.map(p=>p.diplomeId))];
  const optP=p=>({id:p.id,libelle:(promoShort(p)?promoShort(p)+" — ":"")+(p.nom||"")});
  const communs={groupes:dips.length>1?dips.map(d=>({diplome:dipLabel(DATA.diplomes.find(x=>x.id===d)||{}),promotions:ps.filter(p=>p.diplomeId===d).map(optP)})):[{diplome:null,promotions:ps.map(optP)}],
    promotion:pr.id,nomPromotion:pr.nom,semestres:semsAll,semestre:sem,courant:semCur,
    choisir:(k,v)=>{if(k==="promo"){ui.prog.promo=v;ui.prog.sem="";ui.prog.t=null;ui.prog.el=""}
      else if(k==="sem")ui.prog.sem=v;else if(k==="f")ui.prog.f=v;else if(k==="t")ui.prog.t=v?[v]:[];else if(k==="el")ui.prog.el=v;
      paintProg()},
    choisirVue:v=>{ui.prog.view=v;paintProg()}};
  if(MOD.eleves&&ui.prog.view==="eleve"){paintProgEleve(host,{pr,sem,els,fs,communs});return}
  // avec « c'est moi » : uniquement mes enseignements (pas de choix d'un autre enseignant)
  const aSem=Math.floor(SEMS.indexOf(sem)/2)+1, asSem=asOf(pr.debut+aSem-1);
  const A0=affGet(pr.id,asSem), A=Object.keys(A0).length?A0:affGet(pr.id);   // répartition de l'année du semestre affiché
  const tSel=me?(Object.values(A).some(l=>(l||[]).includes(me.id))?[me.id]:[]):(ui.prog.t||[]).filter(id=>DATA.enseignants.some(t=>t.id===id));
  let expected=compsFor(sem);
  const tAvail=me?[]:DATA.enseignants.filter(t=>Object.values(A).some(l=>(l||[]).includes(t.id)));
  if(tSel.length){
    const a=Math.floor(SEMS.indexOf(sem)/2)+1, as=(pr.debut+a-1)+"-"+(pr.debut+a);
    const set=new Set(promoEcs(pr,as).filter(e=>(A[e.id]||[]).some(id=>tSel.includes(id))).map(e=>e.code));
    expected=expected.filter(c=>ecsOf(c,sem).some(e=>set.has(e.ec)));
  }
  const LV=PRESETS[DEF_PRESET_GET()].niveaux, NL=LV.length;
  // couverture de chaque compétence et dernier niveau de chaque étudiant : src/domaine/progression.ts
  const PP=window.dnmaxPont.progression.progressionPromotion({codes:expected.map(c=>c.code),semestre:sem,evaluations:fs,
    idsEtudiants:els.map(e=>e.id),nombreNiveaux:NL,estEvaluee:evalueeF,moduleEleves:!!MOD.eleves});
  const rowsP=expected.map(c=>{const p=PP[c.code];
    const ecn=[...new Set((c.ecs||[]).filter(e=>e.sem===sem).map(e=>e.nom||e.ec))].join(", ");
    return {c,cover:p.partout,inSem:p.auSemestre,done:p.faits,dist:p.repartition,ecn,state:p.etat};
  });
  /* vue « Promotion » : écran écrit en TypeScript (src/progression/promotion.ts), règles dans src/domaine/vue-progression.ts */
  window.dnmaxPont.progression.peindrePromotion(host,{...communs,
    enseignants:tAvail.map(t=>({id:t.id,nom:t.nom})),enseignantsChoisis:tSel,
    nomsChoisis:tSel.map(id=>(DATA.enseignants.find(t=>t.id===id)||{}).nom).join(", "),filtre:filt,
    lignes:rowsP.map(r=>({c:{code:r.c.code,libelle:r.c.libelle,bloc:r.c.bloc},inSem:r.inSem.map(f=>({titre:f.titre||"",date:f.date})),
      cover:r.cover.map(f=>({semestre:f.semestre||"",titre:f.titre||""})),done:r.done,dist:r.dist,ecn:r.ecn,state:r.state})),
    moduleEleves:!!MOD.eleves,etudiants:els.length,evaluationsAuSemestre:fs.filter(f=>f.semestre===sem).length,niveaux:LV,
    couleurNiveau:nivColor,nomBloc:n=>((REF.blocs||[]).find(b=>String(b.num)===n)||{}).nom||"",vueEtudiant:ui.prog.view==="eleve"});
}
/* ---------- Progression étudiant (module Étudiants) ----------
   Pour un étudiant d'une promotion en cours : où il en est dans les évaluations du semestre, comparé aux autres
   (évalué, partiel, non rendu, oublié alors que les autres l'ont été), et ce qu'il a acquis sur les compétences
   jusqu'à ce semestre (dernier niveau connu ; niveau d'acquisition atteint avec le module Niveaux d'acquisition). */
function dnPalier(a){const n=(REF.meta.niveaux||[]).find(x=>+x.annee===+a);return (n&&n.label)||window.dnmaxPont.niveauxAcquisition.noms[a-1]||("Année "+a)}
function paintProgEleve(host,c){
  const {pr,sem,els,fs,communs}=c;
  // acquise à partir de « Satisfaisant » (voir src/domaine/evaluation.ts)
  const LV=PRESETS[DEF_PRESET_GET()].niveaux, NL=LV.length, thr=EVAL.RANG_ACQUIS;
  const el=els.find(e=>e.id===ui.prog.el)||els[0];if(el)ui.prog.el=el.id;
  // règles : src/domaine/progression.ts ; écran : src/progression/etudiant.ts
  const PG=window.dnmaxPont.progression, dateOf=f=>PG.dateDeLEvaluation(f);
  const live=fs.filter(f=>!f.annulee&&el&&studentsOf(f).some(e=>e.id===el.id));
  /* A. avancement du semestre */
  const rowsA=live.filter(f=>f.semestre===sem).sort((a,b)=>dateOf(a).localeCompare(dateOf(b))).map(f=>{
    const keys=lignesOf(f).map(ligKey), r=(f.res||{})[el.id]||{}, st=saisieDnmax(f), e=PG.etatEtudiantDansEvaluation(r,keys,st.any);
    return {etat:e.etat,titre:f.titre||"",distribPrev:f.distribPrev||"",renduPrev:f.renduPrev||"",
      saisies:e.lignesSaisies,lignes:keys.length,sansLignes:!!(r.nr||r.disp),promoSaisis:st.full,promoTotal:st.tot}});
  /* rendus, non-rendus et dispenses de l'étudiant au semestre, comparés à la moyenne de la promo */
  const evSem=fs.filter(f=>!f.annulee&&f.semestre===sem);
  const estCount=e=>{const o={tot:0,rendu:0,nr:0,disp:0};
    evSem.forEach(f=>{if(!studentsOf(f).some(x=>x.id===e.id))return;o.tot++;const st=estOf((f.res||{})[e.id]);if(o[st]!=null)o[st]++});return o};
  const moi=el?estCount(el):{tot:0,rendu:0,nr:0,disp:0};
  const moy=k=>els.length?els.reduce((a,e)=>a+estCount(e)[k],0)/els.length:0;
  /* B. acquisition des compétences, cumulée jusqu'au semestre affiché */
  const traj=PG.trajectoires(live.filter(f=>SEMS.indexOf(f.semestre)<=SEMS.indexOf(sem)),el?el.id:"",NL);
  /* niveau de la classe sur chaque compétence : dernier niveau de chaque étudiant, jusqu'au semestre affiché */
  const lastOf=e=>PG.derniersNiveaux(fs.filter(f=>!f.annulee&&SEMS.indexOf(f.semestre)<=SEMS.indexOf(sem)&&studentsOf(f).some(x=>x.id===e.id)),e.id,NL);
  const classe=els.map(lastOf);
  // la comparaison à la promotion se masque dans Paramètres > Règles d'évaluation
  const masquer=!!LS.get("dnmade.reglages",{}).masquerComparaison;
  const competences=Object.entries(traj).map(([code,L])=>{
    const cc=REF.competences.find(x=>x.code===code)||{code,libelle:code,bloc:""};
    const last=L[L.length-1];
    return {code:String(cc.code),libelle:cc.libelle||"",bloc:String(cc.bloc),
      trajectoire:L.map(x=>({titre:x.evaluation.titre||"",semestre:x.evaluation.semestre||"",niveau:x.niveau,annee:anneeOf(x.semestre)})),
      position:masquer?null:(PG.positionDansLaClasse(last.niveau,classe.map(m=>m[cc.code]))||null)}});
  window.dnmaxPont.progression.peindreEtudiant(host,{...communs,
    etudiants:els.map(e=>({id:e.id,nom:e.nom})),etudiant:el?el.id:null,promotionCourte:promoShort(pr)||pr.nom,
    avancement:rowsA,rendus:moi,moyennes:{rendu:moy("rendu"),nr:moy("nr"),disp:moy("disp")},
    competences,niveaux:LV,seuil:thr,couleurNiveau:nivColor,encreNiveau:nivEncre,
    nomBloc:n=>((REF.blocs||[]).find(b=>String(b.num)===n)||{}).nom||"",
    paliers:MOD.dn?[1,2,3].map(dnPalier):null,anneeCourante:anneeOf(sem),
    choisirEtudiant:id=>{ui.prog.el=id;paintProg()}});
}

/* ---------- téléchargements ---------- */
async function exportFiche(i,kind,mode){
  const f=fiches[i];if(!f)return;
  const keep=F, rest=mode==="rest"&&MOD.eleves, vue=DATA.activeDiplome;
  try{
    F=migF(structuredClone(f));EXPORT_VIDE=!rest;vueMention(mentionDeFiche(F));REF=computeREF();
    const nom=fname(kind,rest?"restitutions":""), data = kind==="docx" ? await buildDocx() : kind==="odt" ? await buildOdt() : buildXlsx(kind);
    F=keep;EXPORT_VIDE=false;vueMention(vue);REF=computeREF();
    await offer(nom,data,rest);
  }catch(e){F=keep;EXPORT_VIDE=false;vueMention(vue);REF=computeREF();toast(({docx:"Word",odt:"OpenDocument texte",ods:"OpenDocument tableur"}[kind]||"Excel")+" : "+(e&&e.message||e))}
}
/* étudiants pas encore entièrement évalués (non rendu et dispensé comptent comme terminés) */
function elevesNonFinis(f){const keys=lignesOf(f).map(ligKey);
  return studentsOf(f).filter(e=>{const r=(f.res||{})[e.id]||{};if(r.nr||r.disp)return false;
    return !(keys.length&&keys.every(k=>(r.n||{})[k]!=null&&(r.n||{})[k]!==""))})}
function askRestitWarn(f,onGo){
  const L=elevesNonFinis(f);if(!L.length)return onGo();
  const prev=document.activeElement, el=document.createElement("div");el.className="modal";
  el.innerHTML=`<div class="card" role="dialog" aria-modal="true" aria-labelledby="rwT" style="max-width:440px">
    <p id="rwT"><b>Évaluation pas terminée</b> — ${L.length} étudiant${L.length>1?"s ne sont":" n'est"} pas entièrement évalué${L.length>1?"s":""} :
      ${esc(L.slice(0,8).map(e=>e.nom).join(", "))}${L.length>8?"…":""}.</p>
    <p class="hint" style="font-size:12.5px">Les non rendus et les dispensés comptent comme terminés. Les restitutions de ces étudiants seront incomplètes.</p>
    <div class="row"><button class="btn ghost" data-no>Annuler</button><button class="btn primary" data-yes>Exporter quand même</button></div></div>`;
  const close=()=>{el.remove();document.removeEventListener("keydown",key);if(prev&&prev.focus)prev.focus()};
  const key=e=>{if(e.key==="Escape")close()};
  el.querySelector("[data-no]").onclick=close;el.onclick=e=>{if(e.target===el)close()};
  el.querySelector("[data-yes]").onclick=()=>{close();onGo()};
  document.addEventListener("keydown",key);document.body.appendChild(el);el.querySelector("[data-yes]").focus();
}
/* exports d'une ligne (fenêtre des actions) : l'évaluation (grille vierge) et, avec le module Étudiants, les restitutions par étudiant */
async function offer(filename,data,eleves=false){
  if(!dl){toast("Téléchargement indisponible ici.");return}
  try{ await dl.save({filename,data,eleves}); toast("Fichier enregistré : "+filename); }
  catch(e){
    const c=e&&e.code;
    if(c==="declined")return;
    if(c==="rate_limited")toast("Une demande est déjà en cours, réessaie dans un instant.");
    else if(c==="too_large")toast("Fichier trop volumineux pour cette destination.");
    else toast("Échec de l'enregistrement"+(e&&e.message?" : "+e.message:"."));
  }
}

/* ---------- événements ---------- */
const bind=(id,ev,fn)=>{const el=document.getElementById(id);if(el)el.addEventListener(ev,fn)};
window.dnmaxPont.interface.brancherOnglets(document,page=>{
  ui.tab=page;paintTabs();
  if(ui.tab==="new"){paintForm();paintPick();paintLignes()}
  if(ui.tab==="saved")paintSaved();if(ui.tab==="prog")paintProg();if(ui.tab==="ref")paintRef();if(ui.tab==="org")paintOrg();
  if(ui.tab==="set")paintSet()});
bind("bDemo","click",loadDemo);
bind("bBack","click",()=>{ui.tab="saved";paintTabs();paintSaved();window.scrollTo({top:0,behavior:"smooth"})});
bind("bNew","click",nouvelleFiche);
bind("bModReset","click",()=>{MOD=modDefaults();LS.set("dnmade.modules",MOD);
  paintSet();paintTabs();paintForm();paintPick();paintRef();toast("Modules remis par défaut.")});
[["f-titre","titre"],["f-consignes","consignes"],["f-eleves","eleves"]]
  .forEach(([id,k])=>bind(id,"input",e=>{F[k]=e.target.value;save()}));
bind("f-distrib","input",e=>{F.distribPrev=e.target.value;applySemDate();save();paintForm();paintPick()});
bind("f-rendu","input",e=>{F.renduPrev=e.target.value;save();paintForm()});

bind("f-dip","change",e=>{DATA.activeDiplome=e.target.value;saveData()});
bind("f-promo","change",e=>selectPromo(e.target.value));

bind("bPromoNew","click",()=>{
  const pr={id:uid(),nom:"",debut:asStart(anneeScolaire()),diplomeId:DATA.activeDiplome,eleves:"",liste:[]};
  pr.nom=promoNomAuto(pr);promoLive(pr);
  promos.push(pr);savePromos();selectPromo(pr.id);document.getElementById("p-nom").focus();
});
bind("bPromoDel","click",()=>{
  const pr=curPromo();if(!pr)return;
  if(delArm!==pr.id){delArm=pr.id;paintPromos();return}
  promos=promos.filter(x=>x.id!==pr.id);savePromos();delArm=null;selectPromo("");
  toast("Promotion supprimée.");
});
bind("p-nom","input",e=>{const pr=curPromo();if(!pr)return;
  const old=pr.nom, v=e.target.value;pr.nom=v;
  const cs=(F.classes||[]).slice(), i=cs.indexOf(old);
  if(i>=0){if(v.trim())cs[i]=v;else cs.splice(i,1)}else if(v.trim())cs.push(v);
  setClasses(cs);
  savePromos();save();paintClasse();refreshPromoOption();paintSteps()});
bind("p-annee","change",e=>{const pr=curPromo();if(!pr)return;
  const old=pr.nom;pr.debut=asStart(anneeScolaire())-(+e.target.value)+1;pr.nom=promoNomAuto(pr);
  if(old!==pr.nom)setClasses((F.classes||[]).map(x=>x===old?pr.nom:x));
  promoLive(pr);savePromos();
  const sems=semsOfAnnee(pr.annee);if(!sems.includes(F.semestre))setSemestre(sems[0]);
  save();paintForm();paintPick()});
bind("p-eleves","input",e=>{const pr=curPromo();if(!pr)return;
  syncListe(pr,e.target.value);savePromos();
  const n=(pr.liste||[]).length;
  document.getElementById("p-count").textContent=n+(n>1?" inscrits":" inscrit");refreshPromoOption();
  if(ui.step===4)paintEleves();paintSteps()});
bind("f-search","input",e=>{ui.q=e.target.value;paintPick()});
bind("bClear","click",()=>{F.items=[];F.ops=[];ui.sel=[];save();paintPick();paintSteps()});
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>goStep(b.dataset.go));
document.querySelectorAll(".steps [data-step]").forEach(b=>b.onclick=()=>goStep(b.dataset.step));
bind("bLink","click",linkSelection);
bind("bLinkNone","click",()=>{ui.sel=[];paintLignes()});
/* L'évaluation est déjà enregistrée, modification après modification : le bouton ne fait que ramener à la liste,
   sauf si le référentiel non validé l'a tenue hors de la liste, ce qu'il explique alors. */
bind("bSave3","click",()=>{
  if(refBloque(F,"Impossible d'enregistrer cette évaluation"))return;
  const brouillon=!!F.brouillon||!fiches.some(f=>f.id===F.id);
  if(brouillon){
    const manque=EVAL.manquesPourEnregistrer(F);
    if(manque.length){toast("Pour enregistrer l'évaluation, il lui manque "+EVAL.enumerer(manque)+".");return}
  }
  save(true);
  ui.tab="saved";paintTabs();paintSaved();window.scrollTo({top:0,behavior:"smooth"});
  toast((brouillon?"Évaluation enregistrée — ":"")+"Le Word et l'Excel se génèrent d'ici, quand vous voulez.");
});
document.querySelectorAll("#eMode [data-emode]").forEach(b=>b.onclick=()=>{ui.emode=b.dataset.emode;paintEleves()});
bind("bExpJson","click",()=>offer("fiches-dnmade.json",JSON.stringify({ref:REF.meta,fiches},null,1),true));
bind("r-search","input",e=>{ui.ref.q=e.target.value;paintRef()});
bind("r-group","change",e=>{ui.ref.group=e.target.value;paintRef()});
bind("r-annee","change",e=>{ui.ref.annee=e.target.value;paintRef()});
bind("rClear","click",()=>{Object.assign(ui.ref,{q:"",group:"bloc",annee:"*",sems:[]});paintRef()});

paintTabs();paintForm();paintPick();paintSaved();paintRef();paintSet();paintPrefs();

/* Pont vers l'application : le menu « Mon compte » ouvre les Préférences. */
window.dnmaxPont.ouvrirPreferences=()=>{
  ui.tab="pref";edArm=null;paintTabs();paintPrefs();window.scrollTo({top:0,behavior:"smooth"});
};

/* Pont vers l'application : contenu lisible (sans identifiants internes) du référentiel d'un diplôme,
   pour l'une de ses versions validées ou, si `versionId` est vide ou inconnu, pour son référentiel de travail.
   Sert à vérifier que deux enseignants travaillent sur la même base. */
window.dnmaxPont.projeterReferentiel=(diplomeId,versionId)=>{
  if(!DATA.diplomes.some(d=>d.id===diplomeId))return null;
  const v=versionsOf(diplomeId).find(x=>x.id===versionId);
  return projectSnap(DATA,diplomeId,JSON.parse(JSON.stringify(v?v.snap:refOf(DATA,diplomeId))));
};

/* Pont vers l'application : elle fait appliquer ses règles aux enseignants (déclarer l'enseignant de
   l'installation, reporter son changement de nom). La règle reçoit les données et rend les nouvelles, ou null. */
window.dnmaxPont.ajusterEnseignants=regle=>{
  const r=regle({enseignants:DATA.enseignants.slice(),moi:DATA.moi});
  if(!r||!Array.isArray(r.enseignants))return;
  DATA.enseignants=r.enseignants.slice();DATA.moi=typeof r.moi==="string"?r.moi:DATA.moi;persistData();
  if(ui.tab==="org")paintOrg();
};

/* Pont vers l'application : les documents RGPD du module Étudiants demandent le nom de l'établissement et le contact
   du délégué à la protection des données. Mène à leur saisie, curseur sur le premier des deux qui est vide. */
window.dnmaxPont.ouvrirEtablissement=()=>{
  ui.tab="org";ui.org.pane="etab";paintTabs();paintOrg();window.scrollTo({top:0,behavior:"smooth"});
  const E=DATA.etab||{}, k=!(E.nom||"").trim()?"nom":"contactDpo";
  const inp=document.getElementById("et-"+k);if(inp)inp.focus();
};

/* Pont vers l'application : les données de l'établissement (diplômes, dictionnaire, référentiels) ne sont
   enregistrées qu'à leur première modification. L'échange entre enseignants les lit dans le stockage :
   on les y inscrit dès le chargement, pour qu'une installation neuve connaisse aussi son diplôme par défaut. */
persistData();
