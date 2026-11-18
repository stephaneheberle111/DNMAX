// SPDX-License-Identifier: CECILL-2.1
/* Interface historique de DNMAX, reprise telle quelle depuis la maquette d'origine.
   Seules différences : le stockage et l'enregistrement de fichiers passent par
   `window.dnmaxPont`, fourni par l'application avant le chargement de ce script. */
const STOCKAGE = window.dnmaxPont.stockage;
/* DATA, REF, F, fiches, promos, MOD, PREFS et ui ne sont plus déclarés ici : ce sont des accesseurs posés
   sur la fenêtre par l'application, qui tient l'état (src/interface/etat.ts, décision 38). */
/* Règles de la saisie des résultats : écrites et testées dans src/domaine/saisie-resultats.ts. */
const SAISIE = window.dnmaxPont.saisie;
/* Règles de la composition d'une évaluation : écrites et testées dans src/domaine/evaluation.ts. */
const EVAL = window.dnmaxPont.evaluation;
const JAUGE = window.dnmaxPont.jauge;
/* SEMS, PRESETS, SUPPORTS_DEF, GROUPS, tidy et norm sont publiés sur la fenêtre par l'application
   (src/interface/constantes.ts) ; BLOC_TINT est un accesseur de l'état (src/interface/etat.ts). */
const anneeOf = sem => Math.floor(Math.max(0,SEMS.indexOf(sem))/2)+1;
const DEF_PRESET_GET=()=>"maitrise";
/* modules (Paramètres > Modules) : catalogue et règles dans src/domaine/modules.ts */
const MODULES = window.dnmaxPont.modules.MODULES;
const modDefaults = () => window.dnmaxPont.modules.modulesParDefaut();
const LS = {
  get(k,d){try{const v=STOCKAGE.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},
  set(k,v){try{STOCKAGE.setItem(k,JSON.stringify(v))}catch(e){}}
};
MOD = Object.assign(modDefaults(), LS.get("dnmade.modules",{}));
// un module qui en requiert un autre ne reste pas actif sans lui (Niveaux d'acquisition → Étudiants)
function modDeps(){window.dnmaxPont.modules.appliquerDependances(MOD)}
modDeps();
MOD.base=true;
/* Modèle des données de l'établissement (dictionnaire, référentiel de chaque diplôme, vue fusionnée du
   référentiel actif) : règles écrites et testées dans src/domaine/modele-donnees.ts. Les identifiants neufs
   sont tirés par newId. */
const MODELE=window.dnmaxPont.modele;
function buildData(ref,livr){return MODELE.donneesDuReferentiel(ref,livr)}
/* code et libellé d'un diplôme : règles écrites et testées dans src/domaine/diplomes.ts */
function autoDipCode(dp){return window.dnmaxPont.diplomes.codeAutomatique(dp)}
/* Diplômes montrés à l'enseignant : le cadre vierge d'une installation neuve reste caché.
   Le premier référentiel reçu, ou le premier diplôme créé à la main, le réutilise. */
function estCadreVierge(id){return window.dnmaxPont.estCadreVierge(DATA,id,promos)}
function dipVisibles(){return DATA.diplomes.filter(dp=>!estCadreVierge(dp.id))}
function dipCode(dp){return window.dnmaxPont.diplomes.codeDiplome(dp)}
/* identifiant d'une année : celui du diplôme suivi du numéro d'année, sauf si on l'a réécrit */
function anneeCode(a,d,dp){return MODELE.codeAnnee(a,d||DATA,dp||undefined)}
function dipLabel(dp){return window.dnmaxPont.diplomes.libelleDiplome(dp)}
const KINDS=MODELE.SORTES;
function refOf(d,id){return MODELE.referentielDe(d,id)}
const ANNEES=[1,2,3];
function ecCodeAt(e,sem){const a=anneeOf(sem);return String(((e||{}).codes||{})[a]||"")}
/* codes et rang d'un EC : règles écrites et testées dans src/domaine/constituer.ts */
function ecCodesList(e){return window.dnmaxPont.constituer.codesEc(e||{})}
function ecCodeLbl(e){const l=ecCodesList(e);return l.length?l.join(" · "):"—"}
/* dans une colonne étroite : « EC 2.3 · 10.3 · 18.3 » */
function ecCodeShort(e){const l=ecCodesList(e);if(!l.length)return "—";
  return l.map((c,i)=>i?String(c).replace(/^EC\s*/i,""):c).join(" · ")}
function materialize(d){MODELE.materialiser(d)}
function absorb(d){MODELE.absorber(d,newId)}
function persistData(){LS.set("dnmade.data",MODELE.donneesAEnregistrer(DATA))}
/* associations proposées quand un élément du dictionnaire entre dans un référentiel */
function assocFor(dpId,kind,id){return MODELE.associationsProposees(DATA,dpId,kind,id)}
/* retirer un élément du référentiel d'une mention : règle écrite et testée dans src/domaine/constituer.ts */
function refRemove(R,kind,id){window.dnmaxPont.constituer.retirerDuReferentiel(R,kind,id)}
/* Données complètes à partir de buildData (installation neuve, exemple) : un diplôme, le dictionnaire
   et le référentiel de ce diplôme, puis la vue fusionnée du référentiel actif. */
function construireDonnees(d){return MODELE.construireDonnees(d,newId)}
function livrNames(){return DATA.livrables.map(x=>x.nom).filter(Boolean)}
function newId(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
function addMention(srcId,nom){return MODELE.ajouterMention(DATA,srcId,nom,newId)}
/* référentiel actif tel que l'interface le lit */
function projectRef(d){return MODELE.projeterReferentiel(d)}
/* Une installation neuve démarre sans référentiel : l'enseignant en reçoit un ou construit le sien.
   Sans référentiel, l'exemple installe celui de la mention Objet livré avec DNMAX (src/heritage/exemple.ts). */
const REF_VIDE = {meta:{diplome:"",niveaux:[],blocTint:"#D1F1DA"},blocs:[],ues:[],familles:[],competences:[]};
DATA = LS.get("dnmade.data",null);
if(DATA)materialize(DATA);else DATA=construireDonnees(buildData(REF_VIDE,SUPPORTS_DEF));
REF = projectRef(DATA);
function saveData(repaint,fromDico){
  if(fromDico)materialize(DATA);
  else{absorb(DATA);if(DATA.activeDiplome!==DATA._viewOf)materialize(DATA)}
  persistData();
  REF=computeREF();
  F.items=F.items.filter(it=>REF.competences.some(c=>c.code===it.code));
  cleanOps();syncItemEcs();save();
  if(repaint!==false){paintForm();paintPick();paintLignes();paintRef();if(ui.tab==="org")paintOrg();if(ui.tab==="pref")paintPrefs()}
}
fiches = LS.get("dnmade.fiches",[]);
/* préférences (menu « Mon compte ») : règles dans src/domaine/preferences.ts, écran dans src/preferences/ */
const PREF=window.dnmaxPont.preferences;
PREFS = PREF.initiales(LS.get("dnmade.prefs",{}));
function critLabel(){return PREF.libelleCritere(PREFS)}
function savePrefs(){LS.set("dnmade.prefs",PREFS)}
promos = LS.get("dnmade.promos",[]);

/* brouillon de départ : une évaluation vide (vierge() ne peut pas servir ici, elle lit F) */
F = LS.get("dnmade.draft",null) || {id:uid(),promoId:"",titre:"",livrables:[],semestre:"S1",classe:"",
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
ui = {tab:"saved",step:1,sel:[],q:"",org:{pane:"etab"},ref:{pane:"explorer",chain:"",cq:"",q:"",group:"bloc",annee:"*",sems:[]}};

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
/* promotions, années scolaires et calendrier (promoShort, anneeScolaire, semSuggere…) : src/interface/promotions-calendrier.ts */
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
/* Enregistrement de l'évaluation en cours (save, brouillon), passage d'une étape à l'autre (goStep, paintSteps),
   contextes de la formulation et de la saisie des étudiants : écrits en TypeScript (src/interface/editeur.ts). */

/* ---------- rendu ---------- */
/* onglets, vues et titre de la fenêtre : src/interface/onglets.ts */
function paintTabs(){
  ui.tab=window.dnmaxPont.interface.afficherPage(document,ui.tab);
  paintEnregistrement();
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
  F=vierge();
  {const me=DATA.enseignants.find(t=>t.id===DATA.moi);if(me&&me.nom){F.profs=[me.nom];F.prof=me.nom}}save();ui.tab="new";ui.step=1;ui.sel=[];ui.eleve="";
  paintTabs();paintForm();paintPick();paintLignes();goStep(1);
  window.scrollTo({top:0,behavior:"smooth"});
}
/* Étape 1 : champs simples dans src/editeur/formulaire.ts, autres blocs dans src/editeur/etape-evaluation.ts */
function paintForm(){
  REF=computeREF();
  paintLivrables();
  window.dnmaxPont.editeur.remplirFormulaire(document,{titre:F.titre,consignes:F.consignes,distribution:F.distribPrev||"",rendu:F.renduPrev||""});
  paintClasse();paintEleveField();paintProf();
  paintSems();
  paintContexte();
  paintSteps();
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
  // toutes les promotions en cours : celles de ma répartition de service d'abord, les autres en retrait
  const live=ps.filter(pr=>enCours(pr)).sort((x,y)=>(yr(x)-yr(y))||(dIdx(x.diplomeId)-dIdx(y.diplomeId)));
  const names=[...new Set([...live.map(pr=>pr.nom),...F.classes])].filter(Boolean);
  const bloquant=dipBloquant(F);
  window.dnmaxPont.editeur.peindrePromotions({
    promotions:names.map(n=>{const pr=ps.find(p=>p.nom===n);
      return {nom:n,libelle:promoDisp(n),annee:pr?yr(pr):null,enCours:!!pr&&enCours(pr),referentielValide:!pr||promoRefValide(pr),mienne:!pr||promoVisible(pr)}}),
    cochees:F.classes,anneeScolaire:AS,aucuneEnCours:!live.length,referentielNonValide:!!bloquant,
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
  // Une promotion au référentiel non validé se coche quand même : l'enseignant en est averti.
  {const valide=n=>{const pr=promos.find(p=>p.nom===n);return !pr||promoRefValide(pr)};
   const aAvertir=window.dnmaxPont.referentielValide.aAvertir(cs,F.classes||[],valide);
   if(aAvertir.length){const pr=promos.find(p=>p.nom===aAvertir[0]), dp=DATA.diplomes.find(d=>pr&&d.id===pr.diplomeId);
     window.dnmaxPont.referentielValide.avertir(document,{promotions:aAvertir.map(promoDisp),diplome:dp?dipLabel(dp):"",
       allerValidation:()=>allerValidation(pr?pr.diplomeId:DATA.activeDiplome)})}}
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
/* Étape 1, UE et EC : écran écrit en TypeScript (src/editeur/etape-evaluation.ts), règles dans src/domaine/cadre-evaluation.ts */
function paintContexte(){
  const lim=ecsAffectes();
  window.dnmaxPont.editeur.peindreUesEtEcs({evaluation:F,
    ecs:ecsOfSem(F.semestre).map(e=>({ec:e.ec,nom:e.nom||"",ue:e.ue,couleur:e.couleur||ecColor(e.ec)})),
    couleurUe:u=>ueColor(u),nomUe:u=>tidy(u).replace(/^UE\s*/i,""),
    ecsAffectes:lim?[...lim]:null,enseignants:(F.profs||[]).join(", "),promotionChoisie:(F.classes||[]).length>0,
    apresChangement:()=>{syncItemEcs();save();paintForm();paintPick()}});
}
function opIndex(id){return F.ops.findIndex(o=>o.id===id)+1}
function lignes(){return lignesOf(F)}
function cleanOps(){Object.assign(F,EVAL.nettoyerRegroupements(F))}
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
/* Le statut n'est jamais saisi : il découle de ce qui a été fait sur l'évaluation.
   - Restituée (en partie) : restitution marquée pour la ou les promotions, ou, avec le module Étudiants, pour chaque étudiant ;
   - Évaluée : tous les étudiants saisis dans DNMAX, ou évaluation marquée terminée (évaluation à la main) ;
   - Évaluation en cours : au moins un étudiant saisi dans DNMAX, ou grille d'évaluation exportée (sans module Étudiants) ;
   - Distribuée / Rendus à évaluer : les dates prévues de distribution / de rendu sont passées ;
   - Préparée : sinon. */
/* suiviOf complète la date de saisie d'une évaluation ancienne avant de lire son statut */
/* suivi simplifié (Paramètres > Règles d'évaluation) : affichage seul, le statut détaillé reste celui de l'évaluation */
/* nombre d'étudiants ayant une évaluation individuelle enregistrée (niveaux, observations, appréciation ou restitution) */
/* L'évaluation en cours d'édition ne doit pas garder celle qu'on supprime : la prochaine modification la remettrait dans la liste. */
/* filtres de la liste des évaluations : par défaut, promotions en cours et évaluations dont je suis l'enseignant·e */
/* Visibilité : un enseignant ne voit que les promotions de sa répartition de service (et leurs étudiants).
   Si « C'est moi » n'est pas défini, ou s'il n'a encore aucune affectation, tout reste visible. */
/* règles des filtres : écrites et testées dans src/domaine/filtres-evaluations.ts */
/* sélections multiples : une liste vide = pas de filtre ; "cur" = toutes les promotions en cours */
/* barre des filtres de Mes évaluations : écran écrit en TypeScript (src/evaluations/filtres.ts),
   règles dans src/domaine/filtres-evaluations.ts */
/* liste de Mes évaluations : écran écrit en TypeScript (src/evaluations/liste.ts), règles de la frise dans
   src/domaine/frise-suivi.ts ; la fenêtre des actions est dans src/evaluations/actions.ts. */
BLOC_TINT = (REF.meta&&REF.meta.blocTint)||"#D1F1DA";
function hueOf(k){let h=0;for(const ch of String(k||""))h=(h*31+ch.charCodeAt(0))%360;return `hsl(${h} 52% 60%)`}
function refEcByCode(code){return (REF.ecs||[]).find(x=>ANNEES.some(a=>(x.codes||{})[a]===code))||null}
function ecColor(code){const e=refEcByCode(code);return (e&&e.couleur)||hueOf(code)}
function ecNomRef(code){const e=refEcByCode(code);return (e&&e.nom)||code}
function ueColor(ue){const u=(REF.ues||[]).find(x=>tidy(x.nom)===tidy(ue));return (u&&u.couleur)||hueOf(ue)}
const ueOrd = ue => {const i=(REF.ecs||[]).findIndex(e=>tidy(e.ue)===ue);return i<0?99:i};
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

/* Référentiel (barre Constituer / Explorer, page des cinq étapes, étapes 1 à 3, passages vers une étape ou la
   validation) : écrit en TypeScript (src/interface/referentiel.ts). Restent ici la carte et la planification. */
/* Mon établissement (barre des volets, Établissement, Répartition de service, Promotions) et suppression en
   deux temps (armDel, edArm) : écrits en TypeScript (src/interface/etablissement.ts), règles dans
   src/domaine/repartition.ts. Reste ici asOf, dont l'exemple et la progression se servent. */
const asOf=y=>y+"-"+(+y+1);
/* ---- Tableau du référentiel : compétences en lignes, enseignements en colonnes,
   comme le tableau d'origine ; chaque case ouvre ou ferme un semestre ---- */
/* Étape 4, planification par semestre : écran écrit en TypeScript (src/referentiel/planification.ts) ;
   règles dans src/domaine/planification.ts */
function paintMatrice(host){
  window.dnmaxPont.referentiel.peindrePlanification(host,{vue:DATA,semestre:SEMS.includes(ui.ref.msem)?ui.ref.msem:"",
    choisirSemestre:sem=>{ui.ref.msem=sem;edArm=null;paintRef()},teinteBlocs:BLOC_TINT,
    enregistrer:()=>saveData(false),allerALaCompetence:code=>allerEtape("blocs",code)});
}
/* suppression en deux temps, partagée par les écrans de l'éditeur commun (src/etablissement/editeur-commun.ts) :
   le premier clic arme le bouton et redessine, le second supprime */
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
/* L'exemple (évaluations détaillées, jeu étendu, validation de son référentiel) : écrit en TypeScript
   (src/interface/exemple.ts) ; son contenu et ses tirages sont dans src/domaine/exemple.ts. */
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
/* EXPORT_VIDE : export de « l'évaluation » (grille vierge) plutôt que des restitutions remplies par étudiant */
/* En-tête des documents exportés : une ligne de contexte et l'enseignant·e, sans cartouche. */
/* au-dessus de la ligne de contexte : l'établissement et le ou les enseignants, qui signent le document */

/* ---------- exports Word, OpenDocument et tableur : écrits en TypeScript (src/export/) ---------- */
/* L'évaluation en cours, mise en forme pour les documents : une fiche par étudiant (module Étudiants), sinon une fiche vierge. */
/* Sceau DN MADE en tête des documents Word et OpenDocument : facultatif, réglé dans
   Mon compte > Préférences > Documents exportés, désactivé par défaut. Image
   public/documents/sceau-dn-made.png (voir outils/generer-sceau.ts), lue au premier export qui l'affiche. */

/* ---------- Progression : écrite en TypeScript (src/interface/progression.ts) ---------- */

/* ---------- téléchargements ---------- */
/* étudiants pas encore entièrement évalués (non rendu et dispensé comptent comme terminés) */
/* exports d'une ligne (fenêtre des actions) : l'évaluation (grille vierge) et, avec le module Étudiants, les restitutions par étudiant */

/* ---------- événements ---------- */
window.dnmaxPont.interface.brancherOnglets(document,page=>{
  ui.tab=page;paintTabs();
  if(ui.tab==="new"){paintForm();paintPick();paintLignes()}
  if(ui.tab==="saved")paintSaved();if(ui.tab==="prog")paintProg();if(ui.tab==="ref")paintRef();if(ui.tab==="org")paintOrg();
  if(ui.tab==="set")paintSet()});
window.dnmaxPont.editeur.brancherFormulaire(document,{
  changerTitre:v=>{F.titre=v;save()},changerConsignes:v=>{F.consignes=v;save()},
  changerDistribution:v=>{F.distribPrev=v;applySemDate();save();paintForm();paintPick()},
  changerRendu:v=>{F.renduPrev=v;save();paintForm()}});
/* boutons et champs fixes de la page : src/interface/branchements.ts */
window.dnmaxPont.interface.brancherInterface(document,{
  chargerExemple:loadDemo,
  nouvelleEvaluation:nouvelleFiche,
  revenirALaListe:()=>{ui.tab="saved";paintTabs();paintSaved();window.scrollTo({top:0,behavior:"smooth"})},
  remettreModulesParDefaut:()=>{MOD=modDefaults();LS.set("dnmade.modules",MOD);
    paintSet();paintTabs();paintForm();paintPick();paintRef();toast("Modules remis par défaut.")},
  chercherCompetence:q=>{ui.q=q;paintPick()},
  viderSelection:()=>{F.items=[];F.ops=[];ui.sel=[];save();paintPick();paintSteps()},
  allerALEtape:goStep,
  regrouperSelection:linkSelection,
  annulerSelection:()=>{ui.sel=[];paintLignes()},
  /* L'évaluation est déjà enregistrée, modification après modification : le bouton ne fait que ramener à la liste
     (un brouillon complet en sort). */
  terminer:()=>{
    const brouillon=!!F.brouillon||!fiches.some(f=>f.id===F.id);
    if(brouillon){
      const manque=EVAL.manquesPourEnregistrer(F);
      if(manque.length){toast("Pour enregistrer l'évaluation, il lui manque "+EVAL.enumerer(manque)+".");return}
    }
    save(true);
    ui.tab="saved";paintTabs();paintSaved();window.scrollTo({top:0,behavior:"smooth"});
    toast((brouillon?"Évaluation enregistrée — ":"")+"Le Word et l'Excel se génèrent d'ici, quand vous voulez.");
  },
  choisirModeSaisie:mode=>{ui.emode=mode;paintEleves()},
  chercherDansReferentiel:q=>{ui.ref.q=q;paintRef()},
  regrouperReferentiel:g=>{ui.ref.group=g;paintRef()},
  filtrerAnneeReferentiel:a=>{ui.ref.annee=a;paintRef()},
  effacerFiltresReferentiel:()=>{Object.assign(ui.ref,{q:"",group:"bloc",annee:"*",sems:[]});paintRef()}});

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
