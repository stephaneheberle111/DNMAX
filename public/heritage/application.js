// SPDX-License-Identifier: CECILL-2.1
/* Interface historique de DNMAX, reprise de la maquette d'origine ; en cours de réécriture en TypeScript. */
/* DATA, REF, F, fiches, promos, MOD, PREFS, ui et edArm ne sont plus déclarés ici : ce sont des accesseurs posés
   sur la fenêtre par l'application, qui tient l'état (src/interface/etat.ts, décision 38). SEMS, PRESETS,
   SUPPORTS_DEF, GROUPS, tidy et norm sont publiés par src/interface/constantes.ts ; BLOC_TINT est un accesseur
   de l'état. Toutes les autres fonctions de l'interface sont écrites en TypeScript (src/interface/) et publiées
   sous leur ancien nom ; le démarrage est dans src/interface/demarrage.ts, appelé juste après ce script.
   Restent ici la carte radiale, la chaîne et leurs aides. */
const anneeOf = sem => Math.floor(Math.max(0,SEMS.indexOf(sem))/2)+1;
const ANNEES=[1,2,3];

/* promotions, années scolaires et calendrier (promoShort, anneeScolaire, semSuggere…) : src/interface/promotions-calendrier.ts */
/* Aides communes (esc, toast, askModal, paintTabs, blocName, hueOf, ecColor, ecNomRef, ueColor, ueOrd, ecNum, lienEc,
   ecOrd, refEcByCode) : écrites en TypeScript (src/interface/aides-communes.ts) et publiées sous leur ancien nom. */
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

/* Référentiel (barre Constituer / Explorer, page des cinq étapes, étapes 1 à 4, passages vers une étape ou la
   validation), Mon établissement, éditeur commun, Préférences et Paramètres > Modules : écrits en TypeScript
   (src/interface/referentiel.ts, etablissement.ts, preferences-parametres.ts). Reste ici la carte. */
