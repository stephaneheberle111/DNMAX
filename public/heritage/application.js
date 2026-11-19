// SPDX-License-Identifier: CECILL-2.1
/* Interface historique de DNMAX, reprise de la maquette d'origine ; en cours de réécriture en TypeScript. */
/* DATA, REF, F, fiches, promos, MOD, PREFS, ui et edArm ne sont plus déclarés ici : ce sont des accesseurs posés
   sur la fenêtre par l'application, qui tient l'état (src/interface/etat.ts, décision 38). SEMS, PRESETS,
   SUPPORTS_DEF, GROUPS, tidy et norm sont publiés par src/interface/constantes.ts ; BLOC_TINT est un accesseur
   de l'état. Toutes les autres fonctions de l'interface sont écrites en TypeScript (src/interface/) et publiées
   sous leur ancien nom ; le démarrage est dans src/interface/demarrage.ts, appelé juste après ce script.
   Restent ici la carte radiale et son habillage (paintMap) ; la chaîne est dans src/interface/chaine-*.ts. */
const anneeOf = sem => Math.floor(Math.max(0,SEMS.indexOf(sem))/2)+1;
const ANNEES=[1,2,3];

/* promotions, années scolaires et calendrier (promoShort, anneeScolaire, semSuggere…) : src/interface/promotions-calendrier.ts */
/* Aides communes (esc, toast, askModal, paintTabs, blocName, hueOf, ecColor, ecNomRef, ueColor, ueOrd, ecNum, lienEc,
   ecOrd, refEcByCode) : écrites en TypeScript (src/interface/aides-communes.ts) et publiées sous leur ancien nom. */
/* Calculs des cartes (arcPath, polar, wrapN, fitN : src/domaine/carte-geometrie.ts) et données qu'elles affichent
   (refFilter, filtUes, filtEcs, filtComps, radialGroups, compsOfEc, semItems, semLie, ecName :
   src/interface/carte-donnees.ts) : écrits en TypeScript et publiés sous leur ancien nom. */
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

let wheelAngle=0, wheelRaf=0;
// carte radiale : nouvelle mise à l'échelle quand la colonne ou la fenêtre change de taille
let radRedim=null, radObs=null;
window.addEventListener("resize",()=>{if(radRedim)radRedim()});
// Z0 : zoom de départ (quart bas-droit de la roue) ; ZMAX : grossissement le plus fort permis
const RAD={RARR:505,Z0:1.65,ZMAX:2.5,S:760,c:380,PAD:100,HUB:84,RB:360,RL:380,DIST:[9,17,25,33]};
function tlabel(x,y,lines,cls,size,lh){
  if(!lines.length)return "";
  return `<text class="lbl ${cls}" data-x="${x.toFixed(1)}" data-y="${y.toFixed(1)}" font-size="${size}" text-anchor="middle">`+
    lines.map((t,i)=>`<tspan x="${x.toFixed(1)}" y="${(y+(i-(lines.length-1)/2)*lh).toFixed(1)}">${esc(t)}</tspan>`).join("")+
    `</text>`;
}
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
/* Carte heuristique (chaîne) : modèle (chainModel, chainItemText, chainNode, CH_KINDS, CH_LBL) dans
   src/interface/chaine-modele.ts ; dessin et gestes (paintChain, chainSvgNode, chainSetPivot, chainBind, pivotWheel,
   chainWire) dans src/interface/chaine-dessin.ts. Écrits en TypeScript et publiés sous leur ancien nom. */
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
   La carte radiale (paintRadial, radialWire) reste ici, inchangée ; la chaîne (paintChain, chainBind) est dessinée
   par src/interface/chaine-dessin.ts. */
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
