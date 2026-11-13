// SPDX-License-Identifier: AGPL-3.0-or-later
/* Interface historique de DNMAX, reprise telle quelle depuis la maquette d'origine.
   Seules différences : le stockage et l'enregistrement de fichiers passent par
   `window.dnmaxPont`, fourni par l'application avant le chargement de ce script. */
const STOCKAGE = window.dnmaxPont.stockage;
/* Téléphone ou ordinateur : on croise plusieurs indices plutôt que la seule largeur d'écran —
   indication « mobile » du navigateur, type d'appareil annoncé, pointeur tactile sans survol
   et petite taille physique d'écran (le plus petit côté). Une tablette (tactile, grand écran)
   garde la mise en page d'ordinateur. */
const TAB_SHORT={"t-saved":"Évaluations","t-prog":"Progression","t-ref":"Référentiel","t-org":"Établissement","t-set":"Réglages"};
const DEVICE=(()=>{
  let force="auto";   // mise en page détectée automatiquement (plus de réglage manuel)
  const q=new URLSearchParams(location.search).get("device");if(q)force=q;
  const mm=m=>!!(window.matchMedia&&matchMedia(m).matches);
  const uaMobile=navigator.userAgentData&&navigator.userAgentData.mobile===true;
  const uaRe=/Android.+Mobile|iPhone|iPod|Windows Phone|IEMobile|Opera Mini|BlackBerry/i.test(navigator.userAgent||"");
  const touchOnly=mm("(pointer: coarse)")&&mm("(hover: none)")&&!mm("(any-pointer: fine)");
  const small=Math.min(screen.width||9999,screen.height||9999)<=640;
  const auto=uaMobile||uaRe||(touchOnly&&small)?"phone":(touchOnly?"tablet":"desktop");
  const d=force==="phone"||force==="desktop"?force:auto;
  document.documentElement.dataset.device=d;
  return {kind:d,auto,force,phone:d==="phone"};
})();
const REF_DEFAULT = {
 "meta": {
  "source": "VF_DNMADE-OBJET_TABLEAU competences 2023",
  "diplome": "DN MADE mention Objet",
  "niveaux": [
   {
    "code": "DN1",
    "label": "Initié",
    "annee": 1,
    "semestres": [
     "S1",
     "S2"
    ]
   },
   {
    "code": "DN2",
    "label": "Guidé",
    "annee": 2,
    "semestres": [
     "S3",
     "S4"
    ]
   },
   {
    "code": "DN3",
    "label": "Autonomie",
    "annee": 3,
    "semestres": [
     "S5",
     "S6"
    ]
   }
  ],
  "blocTint": "#D1F1DA"
 },
 "blocs": [
  {
   "num": "1",
   "nom": "Utiliser les outils numériques de référence"
  },
  {
   "num": "2",
   "nom": "S'exprimer et communiquer à l'oral, à l'écrit et dans au moins une langue étrangère"
  },
  {
   "num": "3",
   "nom": "Se positionner vis-à-vis d'un champ professionnel"
  },
  {
   "num": "4",
   "nom": "Exploiter des données à des fins d'analyse"
  },
  {
   "num": "5",
   "nom": "Agir en tant que professionnel dans le domaine Objet"
  },
  {
   "num": "6",
   "nom": "Exercer des activités de veille professionnelle en design et métiers d'art"
  },
  {
   "num": "7",
   "nom": "Employer différentes techniques d'information et de communication en design et métiers d'art"
  },
  {
   "num": "8",
   "nom": "Coopérer et travailler en équipe"
  },
  {
   "num": "9",
   "nom": "Elaborer une stratégie personnelle relative aux métiers de design d'objet"
  },
  {
   "num": "10",
   "nom": "Développer et mettre en œuvre des outils de création et de recherche relevant du design d'objet"
  },
  {
   "num": "11",
   "nom": "Concevoir, conduire et superviser une production relevant du design d'objet"
  }
 ],
 "familles": [
  {
   "nom": "EC Humanités",
   "ue": "UE HUMANITES et CULTURE",
   "couleur": "#91CC78"
  },
  {
   "nom": "EC Culture des arts, du design et des techniques",
   "ue": "UE HUMANITES et CULTURE",
   "couleur": "#B8E778"
  },
  {
   "nom": "EC Outils d'expression et d'exploration créative",
   "ue": "UE METHODOLOGIES, TECHNIQUES ET LANGUES",
   "couleur": "#E4E432"
  },
  {
   "nom": "EC Technologies et matériaux",
   "ue": "UE METHODOLOGIES, TECHNIQUES ET LANGUES",
   "couleur": "#D1D174"
  },
  {
   "nom": "EC Outils et langages numériques",
   "ue": "UE METHODOLOGIES, TECHNIQUES ET LANGUES",
   "couleur": "#F0BB39"
  },
  {
   "nom": "EC Langues vivantes",
   "ue": "UE METHODOLOGIES, TECHNIQUES ET LANGUES",
   "couleur": "#F5AB66"
  },
  {
   "nom": "EC Contextes économiques et juridiques",
   "ue": "UE METHODOLOGIES, TECHNIQUES ET LANGUES",
   "couleur": "#F09569"
  },
  {
   "nom": "EC Techniques et savoir-faire",
   "ue": "UE ATELIERS DE CREATION",
   "couleur": "#8DABC7"
  },
  {
   "nom": "EC Pratiques et mises en œuvre du projet",
   "ue": "UE ATELIERS DE CREATION",
   "couleur": "#79A9D3"
  },
  {
   "nom": "EC Communication et médiation du projet",
   "ue": "UE ATELIERS DE CREATION",
   "couleur": "#9FDBE8"
  },
  {
   "nom": "EC Démarche de recherche en lien avec la pratique de projet",
   "ue": "UE ATELIERS DE CREATION",
   "couleur": "#96C8D1"
  },
  {
   "nom": "EC Parcours de professionnalisation et poursuite d'étude",
   "ue": "UE PROFESSIONNALISA-TION",
   "couleur": "#E260A4"
  },
  {
   "nom": "EC Stage",
   "ue": "UE PROFESSIONNALISA-TION",
   "couleur": "#D394B5"
  }
 ],
 "competences": [
  {
   "code": "C1.1",
   "libelle": "Utiliser les outils numériques de référence et les règles de sécurité informatique pour acquérir, traiter, produire et diffuser de l'information ainsi que pour collaborer en interne et en externe.",
   "bloc": "1",
   "ecs": [
    {
     "ec": "EC 2.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 2.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 3.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C2.1",
   "libelle": "Se servir aisément des différents registres d'expression écrite et orale de la langue française.",
   "bloc": "2",
   "ecs": [
    {
     "ec": "EC 1.1",
     "famille": "EC Humanités",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 1.1",
     "famille": "EC Humanités",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 9.1",
     "famille": "EC Humanités",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 9.1",
     "famille": "EC Humanités",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 17.1",
     "famille": "EC Humanités",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 17.1",
     "famille": "EC Humanités",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 9.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 9.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 17.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 2.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S6",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C2.2",
   "libelle": "Communiquer par oral et par écrit, de façon claire et non ambiguë, dans au moins une langue vivante étrangère.",
   "bloc": "2",
   "ecs": [
    {
     "ec": "EC 2.4",
     "famille": "EC Langues vivantes",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 2.4",
     "famille": "EC Langues vivantes",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.4",
     "famille": "EC Langues vivantes",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.4",
     "famille": "EC Langues vivantes",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.4",
     "famille": "EC Langues vivantes",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.4",
     "famille": "EC Langues vivantes",
     "sem": "S6",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C3.1",
   "libelle": "Désigner les ressources, mettre en oeuvre les outils et les méthodes de recherche propres au champ professionnel abordé.",
   "bloc": "3",
   "ecs": [
    {
     "ec": "EC 1.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 9.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 17.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 2.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 2.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 12",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S3",
     "dn": "DN2"
    }
   ]
  },
  {
   "code": "C3.2",
   "libelle": "Expérimenter des outils de création et de recherche plastique et conceptuelle permettant de structurer les étapes d'un projet et leurs interactions.",
   "bloc": "3",
   "ecs": [
    {
     "ec": "EC 2.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 2.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S6",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C3.3",
   "libelle": "Caractériser et valoriser son identité, ses compétences et son projet professionnel.",
   "bloc": "3",
   "ecs": [
    {
     "ec": "EC 18.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 12",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 12",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 20.1",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 20.1",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S6",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C4.1",
   "libelle": "Identifier, sélectionner et analyser avec esprit critique diverses ressources dans son domaine de spécialité.",
   "bloc": "4",
   "ecs": [
    {
     "ec": "EC 17.1",
     "famille": "EC Humanités",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 17.1",
     "famille": "EC Humanités",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 1.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 1.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 9.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 9.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 17.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 17.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 2.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 2.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 2.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 2.4",
     "famille": "EC Langues vivantes",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 18.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C4.2",
   "libelle": "Recueillir des ressources pour documenter un sujet et synthétiser ces données en vue de leur exploitation.",
   "bloc": "4",
   "ecs": [
    {
     "ec": "EC 17.1",
     "famille": "EC Humanités",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 17.1",
     "famille": "EC Humanités",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 1.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 1.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 9.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 9.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 17.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 17.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 2.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 2.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 2.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 2.4",
     "famille": "EC Langues vivantes",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 2.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C4.3",
   "libelle": "Analyser et synthétiser des données en vue de leur exploitation.",
   "bloc": "4",
   "ecs": [
    {
     "ec": "EC 1.1",
     "famille": "EC Humanités",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 1.1",
     "famille": "EC Humanités",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 9.1",
     "famille": "EC Humanités",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 9.1",
     "famille": "EC Humanités",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 1.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 1.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 9.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 9.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 17.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 17.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 2.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 2.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 2.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C4.4",
   "libelle": "Développer une argumentation avec un esprit critique.",
   "bloc": "4",
   "ecs": [
    {
     "ec": "EC 1.1",
     "famille": "EC Humanités",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 1.1",
     "famille": "EC Humanités",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 9.1",
     "famille": "EC Humanités",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 9.1",
     "famille": "EC Humanités",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 9.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 9.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 17.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 2.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 10.4",
     "famille": "EC Langues vivantes",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.4",
     "famille": "EC Langues vivantes",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 2.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C5.1",
   "libelle": "Situer son rôle et sa mission au sein d'une organisation pour s'adapter et prendre des initiatives.",
   "bloc": "5",
   "ecs": [
    {
     "ec": "EC 2.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "NE",
     "famille": "EC Stage",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 20.2",
     "famille": "EC Stage",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C5.2",
   "libelle": "Respecter les principes d'éthique, de déontologie et de responsabilité environnementale.",
   "bloc": "5",
   "ecs": [
    {
     "ec": "EC 17.1",
     "famille": "EC Humanités",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 10.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "NE",
     "famille": "EC Stage",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 20.2",
     "famille": "EC Stage",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C5.3",
   "libelle": "Identifier et situer les champs professionnels potentiellement en relation avec les acquis de la mention ainsi que les parcours possibles pour y accéder.",
   "bloc": "5",
   "ecs": [
    {
     "ec": "EC 10.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 4",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 4",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 12",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 20.1",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 20.1",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "NE",
     "famille": "EC Stage",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 20.2",
     "famille": "EC Stage",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C5.4",
   "libelle": "Prendre en compte l'environnement économique de l'activité professionnelle et appréhender des démarches entrepreneuriales.",
   "bloc": "5",
   "ecs": [
    {
     "ec": "EC 10.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 4",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 4",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 12",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 20.1",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 20.1",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "NE",
     "famille": "EC Stage",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 20.2",
     "famille": "EC Stage",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C6.1",
   "libelle": "Identifier les enjeux du domaine et des métiers au regard de l'actualité et des perspectives d'évolution, dans une démarche prospective.",
   "bloc": "6",
   "ecs": [
    {
     "ec": "EC 17.1",
     "famille": "EC Humanités",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 9.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 9.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 17.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C6.2",
   "libelle": "S'informer des pratiques d'atelier et des productions émergentes associant ou non le numérique et la CFAO.",
   "bloc": "6",
   "ecs": [
    {
     "ec": "EC 9.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 9.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 17.2",
     "famille": "EC Culture des arts, du design et des techniques",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S6",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C7.1",
   "libelle": "Développer ses propres ressources, méthodes et outils de médiation et de communication.",
   "bloc": "7",
   "ecs": [
    {
     "ec": "EC 1.1",
     "famille": "EC Humanités",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 1.1",
     "famille": "EC Humanités",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 9.1",
     "famille": "EC Humanités",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 2.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 2.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 3.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "NE",
     "famille": "EC Stage",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 20.2",
     "famille": "EC Stage",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C7.2",
   "libelle": "Veiller à l'adéquation des connaissances et compétences aux évolutions et besoin du métier.",
   "bloc": "7",
   "ecs": [
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 20.2",
     "famille": "EC Stage",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C8.1",
   "libelle": "Entretenir des liens et dialoguer au sein des équipes, avec les partenaires du projet et les experts associés.",
   "bloc": "8",
   "ecs": [
    {
     "ec": "EC 1.1",
     "famille": "EC Humanités",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 1.1",
     "famille": "EC Humanités",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 2.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 18.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "NE",
     "famille": "EC Stage",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 20.2",
     "famille": "EC Stage",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C8.2",
   "libelle": "Partager ses connaissances au sein d'une équipe et d'un réseau d'acteurs professionnels pluridisciplinaires.",
   "bloc": "8",
   "ecs": [
    {
     "ec": "EC 1.1",
     "famille": "EC Humanités",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 1.1",
     "famille": "EC Humanités",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 4",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 4",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "NE",
     "famille": "EC Stage",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 20.2",
     "famille": "EC Stage",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C8.3",
   "libelle": "Engager sa responsabilité au service du projet en prenant en compte les outils et méthodes de conception, de création et de réalisation.",
   "bloc": "8",
   "ecs": [
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "NE",
     "famille": "EC Stage",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 20.2",
     "famille": "EC Stage",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C9.1",
   "libelle": "Faire état d'une écriture et d'une pratique expérimentale personnelle : des dimensions plastique, sensorielle, graphique, volumique,fonctionnelles technologique, structurelle et signifiante des objets et de leur structuration.",
   "bloc": "9",
   "ecs": [
    {
     "ec": "EC 2.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 2.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 12",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 20.1",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S6",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C9.2",
   "libelle": "Formaliser et rendre visible ses expériences pour valoriser son identité personnelle : - dans la conception et le pilotage de projets relatifs à l'objet. - dans la gestion de projet et la réalisation d'objets.",
   "bloc": "9",
   "ecs": [
    {
     "ec": "EC 2.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 12",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 20.1",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S6",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C9.3",
   "libelle": "S'auto évaluer et se remettre en question pour apprendre : - Maîtrise des outils, protocoles et techniques relevant de l'objet. - Développement d'une culture professionnelle de l'objet.",
   "bloc": "9",
   "ecs": [
    {
     "ec": "EC 10.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 2.5",
     "famille": "EC Contextes économiques et juridiques",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 4",
     "famille": "EC Parcours de professionnalisation et poursuite d'étude",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "NE",
     "famille": "EC Stage",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 20.2",
     "famille": "EC Stage",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C10.1",
   "libelle": "Définir une approche collaborative avec l'ensemble des acteurs concernés : client, service marketing, recherche et développement, ergonomes, fabricant, technicien, artisans, usager et, selon l'échelle du programme, sémiologue, sociologue, philosophe, historien…",
   "bloc": "10",
   "ecs": [
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S6",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C10.2",
   "libelle": "Proposer des orientations créatives et prospectives relevant du domaine de l'objet.",
   "bloc": "10",
   "ecs": [
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S6",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C10.3",
   "libelle": "Expérimenter les différents champs d'hypothèses en prenant en compte l'aspect formel (plastique, volumique, technologique), l'aspect structurel (organisation, articulation des systèmes), leur sens (dimension sémantique), l'usage, le rapport à l'utilisateur (expérience, ergonomie), les matériaux, les process et le rapport à l'environnement (cycle de vie, écoconception).",
   "bloc": "10",
   "ecs": [
    {
     "ec": "EC 2.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 2.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.1",
     "famille": "EC Outils d'expression et d'exploration créative",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C10.4",
   "libelle": "Au regard de la demande initiale cahier des charges, commande, vérifier la faisabilité technique et économique de production du projet relevant de l'objet.",
   "bloc": "10",
   "ecs": [
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C10.5",
   "libelle": "Veiller au respect des échéances et au contrôle technique et artistique selon les contraintes budgétaires, administratives, techniques, légales.",
   "bloc": "10",
   "ecs": [
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C10.6",
   "libelle": "Énoncer ses idées d'objets et de services, argumenter ses choix au travers de supports et de média adaptés 2D et/ou 3D et/ou supports vidéos et/ou interactifs.",
   "bloc": "10",
   "ecs": [
    {
     "ec": "EC 2.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 2.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.4",
     "famille": "EC Langues vivantes",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.4",
     "famille": "EC Langues vivantes",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.3",
     "famille": "EC Communication et médiation du projet",
     "sem": "S6",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C10.7",
   "libelle": "Mettre en oeuvre les matériaux, les techniques et les technologies innovantes ou traditionnelles, dans le cadre de la conception et de la réalisation partielle d'un projet et dans l'adaptation des process de fabrication, en prenant en compte le cycle de vie et la durabilité (conception d'objets et de leur environnement: produits, procédés, services ou systèmes).",
   "bloc": "10",
   "ecs": [
    {
     "ec": "EC 2.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 2.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 3.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S6",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C11.1",
   "libelle": "Saisir les éléments caractéristiques d'un projet relevant de l'objet au travers de maquettes et d'échantillons en prenant en compte les étapes de fabrication.",
   "bloc": "11",
   "ecs": [
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    }
   ]
  },
  {
   "code": "C11.2",
   "libelle": "Prototyper ou réaliser tout ou partie du projet en incluant les outils numériques CAO, DAO, PAO.",
   "bloc": "11",
   "ecs": [
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 3.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.1",
     "famille": "EC Techniques et savoir-faire",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    }
   ]
  },
  {
   "code": "C11.3",
   "libelle": "Établir des principes d'évolution du projet relevant de l''objet selon des critères explicités.",
   "bloc": "11",
   "ecs": [
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    }
   ]
  },
  {
   "code": "C11.4",
   "libelle": "Faire la démonstration que le projet relevant de l'objet est bien en adéquation avec la demande initiale et son économie générale.",
   "bloc": "11",
   "ecs": [
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S1",
     "dn": "DN1"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    }
   ]
  },
  {
   "code": "C11.5",
   "libelle": "Planifier et gérer les différentes étapes d'un projet jusqu'à son rendu et sa validation en prenant en compte les aspects techniques et réglementaires.",
   "bloc": "11",
   "ecs": [
    {
     "ec": "EC 10.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S5",
     "dn": "DN3"
    },
    {
     "ec": "EC 18.2",
     "famille": "EC Technologies et matériaux",
     "sem": "S6",
     "dn": "DN3"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 10.3",
     "famille": "EC Outils et langages numériques",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 3.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S2",
     "dn": "DN1"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  },
  {
   "code": "C11.6",
   "libelle": "Favoriser le dialogue au sein des équipes et avec les partenaires du projet et les experts associés: client, service marketing, recherche et développement, ergonomes, fabricant, technicien, artisans, usager et, selon l'échelle du programme, sémiologue, sociologue, philosophe, historien…",
   "bloc": "11",
   "ecs": [
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S3",
     "dn": "DN2"
    },
    {
     "ec": "EC 11.2",
     "famille": "EC Pratiques et mises en œuvre du projet",
     "sem": "S4",
     "dn": "DN2"
    },
    {
     "ec": "EC 19.4",
     "famille": "EC Démarche de recherche en lien avec la pratique de projet",
     "sem": "S5",
     "dn": "DN3"
    }
   ]
  }
 ],
 "ues": [
  {
   "nom": "UE HUMANITES et CULTURE",
   "couleur": "#91CC78"
  },
  {
   "nom": "UE METHODOLOGIES, TECHNIQUES ET LANGUES",
   "couleur": "#ECA765"
  },
  {
   "nom": "UE ATELIERS DE CREATION",
   "couleur": "#79A9D3"
  },
  {
   "nom": "UE PROFESSIONNALISA-TION",
   "couleur": "#D394B5"
  }
 ]
};
const SEMS = ["S1","S2","S3","S4","S5","S6"];
const anneeOf = sem => Math.floor(Math.max(0,SEMS.indexOf(sem))/2)+1;
const PRESETS = {
  maitrise:{nom:"Niveaux de maîtrise",niveaux:["Insuffisant","Fragile","Satisfaisant","Très bonne maîtrise"]},
  acq:{nom:"Degrés d'acquisition",niveaux:["Non acquis","En cours d'acquisition","Acquis","Maîtrisé"]},
  dn:{nom:"Niveaux DN MADE",niveaux:["Initié — DN1","Guidé — DN2","Autonome — DN3"]},
  note:{nom:"Note chiffrée",niveaux:["Note / 20"]},
  libre:{nom:"Personnalisé",niveaux:["À compléter"]}
};
/* échelles : actives et par défaut se règlent dans Paramètres ; chaque évaluation garde la sienne */
const ECH=(()=>{let e=null;try{e=JSON.parse(STOCKAGE.getItem("dnmade.echelles")||"null")}catch(_){}
  e=e||{};if(Array.isArray(e.actifs))e.actifs=e.actifs.filter(k=>k!=="dn");   // les niveaux DN MADE ne sont plus une échelle
  if(!Array.isArray(e.actifs)||!e.actifs.length)e.actifs=["maitrise"];   // « Degrés d'acquisition » se coche dans Paramètres
  if(!e.def||!e.actifs.includes(e.def))e.def=e.actifs.includes("maitrise")?"maitrise":e.actifs[0];
  if(Array.isArray(e.libre)&&e.libre.length)PRESETS.libre.niveaux=e.libre.slice();return e})();
function saveEch(){try{STOCKAGE.setItem("dnmade.echelles",JSON.stringify(ECH))}catch(_){}}
const DEF_PRESET_GET=()=>PRESETS[ECH.def]?ECH.def:"maitrise";
const MODULES = {
  base:{nom:"Base",def:true,locked:true,
    d:"Toujours actif. Composer une évaluation (livrables, compétences, regroupements, consignes et attendus, rattachement aux UE et EC), l'enregistrer dans Mes évaluations avec son suivi, l'exporter en Word, Excel ou OpenDocument ; explorer et importer le référentiel ; décrire l'établissement (mentions, enseignants, promotions, répartition de service) et suivre la progression des promotions."},
  eleves:{nom:"Élèves",def:false,
    d:"Gestion nominative des évaluations directement dans l'application, élève par élève : promotions nominatives, saisie de chaque élève ligne par ligne (grille de la promo ou fiche individuelle, observations, appréciation), non-rendus, restitution par élève, un document Word par élève, et la page « Progression élève » pour savoir où en est chacun dans le semestre et dans l'acquisition des compétences."},
  dn:{nom:"Niveaux DN MADE",def:false,req:"eleves",
    d:"Attribue à chaque élève le niveau DN MADE atteint sur chaque compétence : Initié en année 1, Guidé en année 2, Autonome en année 3, dès qu'il y est évalué avec un niveau de maîtrise suffisant. Affiché dans « Progression élève », dans les intitulés d'année et dans les exports."}
};
/* visite guidée de chaque module (voir src/parcours-etapes.ts) */
const VISITE_MODULE={eleves:"eleves",dn:"niveaux"};
/* ces anciens modules font désormais partie de la Base : toujours actifs */
const BASE_KEYS=["base","ec","consignes","fiches","referentiel"];
const SUPPORTS_DEF = ["Carnet de projet","Catalogue d'expérimentation","Planches de projet",
  "Maquettes de recherches","Frise chronologique","Fiche de lecture","Devoir réflexif",
  "Carnet d'exposition","Diaporama","Oral de présentation de projet"];
const modDefaults = () => Object.assign(Object.fromEntries(Object.entries(MODULES).map(([k,v])=>[k,v.def])),Object.fromEntries(BASE_KEYS.map(k=>[k,true])));
const LS = {
  get(k,d){try{const v=STOCKAGE.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},
  set(k,v){try{STOCKAGE.setItem(k,JSON.stringify(v))}catch(e){}}
};
let MOD = Object.assign(modDefaults(), LS.get("dnmade.modules",{}));
// un module qui en requiert un autre ne reste pas actif sans lui (Niveaux DN MADE → Élèves)
function modDeps(){Object.entries(MODULES).forEach(([k,v])=>{if(v.req&&!MOD[v.req])MOD[k]=false})}
modDeps();
BASE_KEYS.forEach(k=>MOD[k]=true);
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
function autoDipCode(dp){
  const a=String((dp||{}).nom||"").replace(/[^A-Za-zÀ-ÿ]/g,"").slice(0,2).toUpperCase();
  const b=String((dp||{}).mention||"").replace(/[^A-Za-zÀ-ÿ]/g,"").slice(0,1).toUpperCase();
  return a+b;
}
/* Diplômes montrés à l'enseignant : le cadre vierge d'une installation neuve reste caché.
   Le premier référentiel reçu, ou le premier diplôme créé à la main, le réutilise. */
function estCadreVierge(id){return window.dnmaxPont.estCadreVierge(DATA,id,promos)}
function dipVisibles(){return DATA.diplomes.filter(dp=>!estCadreVierge(dp.id))}
function dipCode(dp){return String((dp||{}).code||"").trim()||autoDipCode(dp)}
/* identifiant d'une année : celui du diplôme suivi du numéro d'année, sauf si on l'a réécrit */
function anneeCode(a,d,dp){
  d=d||DATA;
  const n=((d||{}).niveaux||[]).find(x=>+x.annee===+a);
  const c=String((n||{}).code||"").trim();
  if(c)return c;
  const p=dp||((d||{}).diplomes||[]).find(x=>x.id===d.activeDiplome)||{};
  return dipCode(p)+a;
}
function classeOptions(){
  const dp=DATA.diplomes.find(x=>x.id===DATA.activeDiplome)||{};
  const c=dipCode(dp);
  const years=(DATA.niveaux||[]).map(n=>n.annee).filter(Boolean);
  const base=c?(years.length?years:[1,2,3]).map(n=>anneeCode(n)):[];
  return [...new Set([...base,...promos.map(p=>p.nom).filter(Boolean)])];
}
function dipLabel(dp){if(!dp)return "";return (dp.nom||"")+(dp.mention?" mention "+dp.mention:"")}
/* Dictionnaire : les éléments eux-mêmes (nom, code, couleur, intitulé), communs à tous les diplômes.
   Référentiel : pour chaque diplôme-mention, les éléments retenus et leurs associations
   (semestres et ECTS des UE, UE et semestres de chaque EC, bloc et EC de chaque compétence).
   DATA.ues, DATA.ecs… sont la vue fusionnée du référentiel actif, reconstruite à chaque changement. */
const KINDS=["ues","ecs","blocs","competences"];
const DICO_F={ues:["nom","code","couleur"],ecs:["nom","couleur"],blocs:["num","nom"],competences:["code","libelle"]};
const REF_F={ues:["sems"],ecs:["ueId","sems","ects","codes"],blocs:[],competences:["bloc","ecs"]};
const KIND_LBL={ues:"Unités d'enseignement",ecs:"Enseignements constitutifs",blocs:"Blocs",competences:"Compétences"};
function emptyRef(){return {ues:[],ecs:[],blocs:[],competences:[]}}
function refOf(d,id){d.refs=d.refs||{};return d.refs[id]||(d.refs[id]=emptyRef())}
const cloneV=v=>Array.isArray(v)?v.map(x=>x&&typeof x==="object"?Object.assign({},x,Array.isArray(x.sems)?{sems:x.sems.slice()}:{}):x)
  :(v&&typeof v==="object"?Object.assign({},v):v);
const ANNEES=[1,2,3];
function ecCodeAt(e,sem){const a=anneeOf(sem);return String(((e||{}).codes||{})[a]||"")}
function ecCodesList(e){return ANNEES.map(a=>((e||{}).codes||{})[a]).filter(Boolean)}
function ecCodeLbl(e){const l=ecCodesList(e);return l.length?l.join(" · "):"—"}
/* dans une colonne étroite : « EC 2.3 · 10.3 · 18.3 » */
function ecCodeShort(e){const l=ecCodesList(e);if(!l.length)return "—";
  return l.map((c,i)=>i?String(c).replace(/^EC\s*/i,""):c).join(" · ")}
function migrateDico(d){
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
/* le niveau « matière » a disparu : chaque EC porte son nom, sa couleur et son UE */
function migrateSansMatieres(d){
  if(!d.dico||!d.dico.matieres)return;
  const mById={};(d.dico.matieres||[]).forEach(m=>mById[m.id]=m);
  const ecById={};(d.dico.ecs||[]).forEach(e=>ecById[e.id]=e);
  Object.values(d.refs||{}).forEach(R=>{
    const mat={};(R.matieres||[]).forEach(r=>mat[r.id]=r);
    (R.ecs||[]).forEach(r=>{
      const lien=mat[r.matiereId], dm=mById[r.matiereId], de=ecById[r.id];
      r.ueId=lien?lien.ueId||"":"";
      if(de){
        if(!String(de.nom||"").trim()&&dm)de.nom=dm.nom||"";
        if(!String(de.couleur||"").trim()&&dm)de.couleur=dm.couleur||"#9aa2ae";
      }
      delete r.matiereId;
    });
    delete R.matieres;
  });
  (d.dico.ecs||[]).forEach(e=>{if(!String(e.couleur||"").trim())e.couleur="#9aa2ae"});
  delete d.dico.matieres;
  delete d.matieres;
}
/* un EC = un enseignement ; son code dépend de l'année (EC 1.1 en DN1, EC 9.1 en DN2…),
   et le lien avec une compétence se fait au semestre */
function migrateCodesAnnee(d){
  if(d.ecv2)return;
  const nrm=t=>String(t==null?"":t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  const dico=d.dico||{}, src={};(dico.ecs||[]).forEach(e=>src[e.id]=e);
  const canon={}, garde=new Map();
  Object.values(d.refs||{}).forEach(R=>{
    (R.ecs||[]).forEach(r=>{
      const e=src[r.id];if(!e)return;
      const key=nrm(e.nom||e.code||r.id)+"|"+nrm(r.ueId||"");
      let g=garde.get(key);
      if(!g){g={id:r.id,nom:String(e.nom||"").trim()||String(e.code||"").trim(),couleur:e.couleur||"#9aa2ae"};garde.set(key,g)}
      if(canon[r.id]===undefined)canon[r.id]=g.id;
    });
  });
  if(!garde.size){d.ecv2=true;return}
  Object.values(d.refs||{}).forEach(R=>{
    const anc={};(R.ecs||[]).forEach(r=>anc[r.id]=r);
    const fusion=new Map();
    (R.ecs||[]).forEach(r=>{
      const nid=canon[r.id];if(!nid)return;
      const e=src[r.id]||{};
      let x=fusion.get(nid);
      if(!x){x={id:nid,ueId:r.ueId||"",sems:[],ects:r.ects||"",codes:{}};fusion.set(nid,x)}
      if(!x.ueId)x.ueId=r.ueId||"";
      if(!x.ects)x.ects=r.ects||"";
      (r.sems||[]).forEach(sm=>{
        if(!x.sems.includes(sm))x.sems.push(sm);
        const a=anneeOf(sm);
        if(!x.codes[a]&&e.code)x.codes[a]=e.code;
      });
    });
    fusion.forEach(x=>x.sems.sort((a,b)=>SEMS.indexOf(a)-SEMS.indexOf(b)));
    R.ecs=[...fusion.values()];
    (R.competences||[]).forEach(c=>{
      const liens=new Map();
      (c.ecIds||[]).forEach(oid=>{
        const nid=canon[oid];if(!nid)return;
        const o=anc[oid], f=fusion.get(nid)||{sems:[]};
        const sems=(o&&(o.sems||[]).length)?o.sems:f.sems;
        const l=liens.get(nid)||{id:nid,sems:[]};
        sems.forEach(sm=>{if(!l.sems.includes(sm))l.sems.push(sm)});
        liens.set(nid,l);
      });
      liens.forEach(l=>l.sems.sort((a,b)=>SEMS.indexOf(a)-SEMS.indexOf(b)));
      c.ecs=[...liens.values()];
      delete c.ecIds;
    });
  });
  dico.ecs=[...garde.values()].map(g=>({id:g.id,nom:g.nom,couleur:g.couleur}));
  d.ecv2=true;
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
function refRemove(R,kind,id){
  R[kind]=R[kind].filter(r=>r.id!==id);
  if(kind==="ues")R.ecs.forEach(e=>{if(e.ueId===id)e.ueId=""});
  if(kind==="ecs")R.competences.forEach(c=>c.ecs=(c.ecs||[]).filter(x=>x.id!==id));
}
function migrateData(d){
  if(!Array.isArray(d.diplomes)||!d.diplomes.length){
    const full=d.diplome||"";
    const men=(full.match(/mention\s+(.+)$/i)||[])[1]||"";
    const nom=full.replace(/\s*mention\s+.+$/i,"").trim();
    // sans référentiel, un diplôme-cadre caché tient lieu de diplôme actif (voir dipVisibles)
    d.diplomes=[nom?{id:"d0",nom,mention:men.trim()}:{id:"d0",nom:"",mention:"",cadre:true}];
  }
  if(!d.activeDiplome||!d.diplomes.some(x=>x.id===d.activeDiplome))d.activeDiplome=d.diplomes[0].id;
  if(!(d.dico&&d.refs)){
    const A=d.activeDiplome;
    KINDS.forEach(k=>{if(!Array.isArray(d[k]))d[k]=[]});
    d.ues.forEach(u=>{if(!u.diplomeId)u.diplomeId=A;if(!Array.isArray(u.sems))u.sems=SEMS.slice();
      if(u.code===undefined)u.code="";if(u.ects===undefined)u.ects="";});
    d.ecs.forEach(e=>{if(e.nom===undefined)e.nom="";if(e.ects===undefined)e.ects="";if(!Array.isArray(e.sems))e.sems=[]});
    d.blocs.forEach(b=>{if(!b.diplomeId)b.diplomeId=A});
    d.competences.forEach(c=>{if(!c.diplomeId)c.diplomeId=A});
    migrateDico(d);
    d.ecv2=true;
  }
  migrateSansMatieres(d);
  migrateCodesAnnee(d);
  // l'identifiant d'année se déduit du code du diplôme : on libère les « DN1 » hérités du référentiel source
  if(!d.nvv2){(d.niveaux||[]).forEach(n=>{if(/^DN\s*\d$/i.test(String(n.code||"").trim()))n.code=""});d.nvv2=true}
  KINDS.forEach(k=>{if(!Array.isArray(d.dico[k]))d.dico[k]=[]});
  d.diplomes.forEach(dp=>refOf(d,dp.id));
  d.livrables=(d.livrables||[]).map(x=>typeof x==="string"?{nom:x,type:""}:x);
  if(!Array.isArray(d.enseignants))d.enseignants=[];
  delete d.diplome;delete d.source;
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
   Le référentiel d'origine (REF_DEFAULT) ne sert plus qu'à l'exemple, qui l'installe à la demande. */
const REF_VIDE = {meta:{diplome:"",niveaux:[],blocTint:"#D1F1DA"},blocs:[],ues:[],familles:[],competences:[]};
let DATA = LS.get("dnmade.data",null) || buildData(LS.get("dnmade.ref",null)||REF_VIDE, LS.get("dnmade.supports",null)||SUPPORTS_DEF);
DATA = migrateData(DATA);
let REF = projectRef(DATA);
try{STOCKAGE.removeItem("dnmade.hist")}catch(e){}
function saveData(repaint,fromDico){
  if(fromDico)materialize(DATA);
  else{absorb(DATA);if(DATA.activeDiplome!==DATA._viewOf)materialize(DATA)}
  persistData();
  REF=computeREF();
  F.items=F.items.filter(it=>REF.competences.some(c=>c.code===it.code));
  cleanOps();syncItemEcs();save();
  if(repaint!==false){paintForm();paintPick();paintLignes();paintRef();if(ui.tab==="org")paintOrg()}
}
let fiches = LS.get("dnmade.fiches",[]);
let PREFS = Object.assign({critLabel:"Compétence opérationnelle"}, LS.get("dnmade.prefs",{}));
const CRIT_PRESETS=["Critère observable","Critère opérationnel","Compétence opérationnelle","Attendu","Indicateur de réussite"];
function critLabel(){return (PREFS.critLabel||"Compétence opérationnelle").trim()||"Compétence opérationnelle"}
function savePrefs(){LS.set("dnmade.prefs",PREFS)}
let promos = LS.get("dnmade.promos",[]);

let delArm = null;
/* brouillon de départ : une évaluation vide (vierge() ne peut pas servir ici, elle lit F) */
let F = LS.get("dnmade.draft",null) || {id:uid(),promoId:"",titre:"",livrables:[],semestre:"S1",classe:"",
  date:new Date().toISOString().slice(0,10),prof:"",ues:[],ecCodes:[],compCode:"",consignes:"",
  ops:[],preset:DEF_PRESET_GET(),niveaux:PRESETS[DEF_PRESET_GET()].niveaux.slice(),opts:{crit:true,obs:true,coef:false},
  eleves:"",items:[],res:{}};
if(F.preset && !PRESETS[F.preset]){F.preset=DEF_PRESET_GET();F.niveaux=PRESETS[DEF_PRESET_GET()].niveaux.slice()}
if(F.promoId===undefined)F.promoId="";
["compCode"].forEach(k=>{if(F[k]===undefined)F[k]=""});
migF(F);
if(!Array.isArray(F.ops))F.ops=[];
if(!Array.isArray(F.livrables))F.livrables=F.support?[F.support]:[];
delete F.support;
F.ops.forEach(o=>{if(!Array.isArray(o.livrables))o.livrables=[];
  if(!o.libelle&&o.critere)o.libelle=o.critere;delete o.critere});
F.items.forEach(it=>{if(it.op===undefined)it.op="";if(it.libelle===undefined)it.libelle="";
  if(!it.libelle&&it.critere)it.libelle=it.critere;delete it.critere;
  if(!Array.isArray(it.livrables))it.livrables=F.livrables.slice()});
if(!Array.isArray(F.ecCodes))F.ecCodes=F.ecCode?[F.ecCode]:[];
delete F.ecCode;
delete F.ec;
/* un diplôme-cadre vierge resté à côté d'un vrai diplôme n'a plus lieu d'être */
{const nt=window.dnmaxPont.nettoyerDiplomesVierges(DATA,promos);
  if(nt&&nt.modifie){DATA=nt.donnees;materialize(DATA);REF=computeREF();persistData()}}
syncItemEcs();
let ui = {tab:"saved",step:1,sel:[],q:"",org:{pane:"diplome"},ref:{pane:"explorer",chain:"",edq:"",q:"",group:"bloc",annee:"*",sems:[]}};
let dl = window.dnmaxPont.telechargements;

function demo(){
  const codes=["C4.1","C4.3","C10.3","C10.6","C11.2"];
  const items=codes.map(c=>{const k=REF.competences.find(x=>x.code===c);if(!k)return null;
    return {code:c,ecs:ecsOf(k,"S3").map(e=>e.ec),critere:"",op:"",coef:1,libelle:"",livrables:[]}}).filter(Boolean);
  return {id:uid(),promoId:"",titre:"Évaluation de projet — mobilier modulaire",livrables:["Carnet de projet","Maquettes de recherches"],
    semestre:"S3",classe:"DN MADE 2 Objet",date:new Date().toISOString().slice(0,10),prof:"",ues:["UE ATELIERS DE CREATION"],ecCodes:["EC 11.2","EC 11.1"],compCode:"C10.6",
    consignes:"Présentation du projet en cours : intentions, références, expérimentations matériaux, prototype à l'échelle 1/2.",
    ops:[],preset:"acq",niveaux:PRESETS.acq.niveaux.slice(),opts:{crit:true,obs:true,coef:false},
    eleves:"",items};
}
function migF(f){if(!Array.isArray(f.ues))f.ues=f.ue?[f.ue]:[];delete f.ue;
  if(!Array.isArray(f.classes))f.classes=String(f.classe||"").trim()?[String(f.classe).trim()]:[];
  f.classe=f.classes.join(", ");
  if(!f.res||typeof f.res!=="object")f.res={};
  return f}
/* Prénom et nom se saisissent à part (prenom, nomFam) ; « nom » reste le nom affiché
   « Prénom Nom », utilisé partout ailleurs (listes, exports, échanges, rapprochements). */
function separerPrenomNom(s){
  const t=String(s||"").trim();
  const tab=t.indexOf("\t");   // deux colonnes collées depuis un tableur : prénom, puis nom
  if(tab>=0)return {prenom:t.slice(0,tab).replace(/\s+/g," ").trim(),nomFam:t.slice(tab+1).replace(/\s+/g," ").trim()};
  const u=t.replace(/\s+/g," ");const k=u.indexOf(" ");   // sinon : premier mot = prénom
  return k<0?{prenom:"",nomFam:u}:{prenom:u.slice(0,k),nomFam:u.slice(k+1)}}
function composerNom(prenom,nomFam){return [prenom,nomFam].map(x=>String(x||"").replace(/\s+/g," ").trim()).filter(Boolean).join(" ")}
function nouvellePersonne(id,ligne){const p=separerPrenomNom(ligne);return {id,prenom:p.prenom,nomFam:p.nomFam,nom:composerNom(p.prenom,p.nomFam)}}
function completerPersonne(e){
  if(typeof e.prenom!=="string"||typeof e.nomFam!=="string"){const p=separerPrenomNom(e.nom);e.prenom=p.prenom;e.nomFam=p.nomFam}
  return e}
function lignesNoms(txt){return String(txt||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}
function syncListe(pr,txt){
  const lignes=txt==null?(pr.liste||[]).map(e=>e.nom):lignesNoms(txt);
  const old=(pr.liste||[]).slice();
  pr.liste=lignes.map(l=>{const nom=composerNom(...Object.values(separerPrenomNom(l)));const i=old.findIndex(e=>e.nom===nom);
    return i>=0?completerPersonne(old.splice(i,1)[0]):nouvellePersonne(newId("s"),l)});
  pr.eleves=pr.liste.map(e=>e.nom).join("\n");
  return pr;
}
function migPromo(pr){
  if(!Array.isArray(pr.liste))pr.liste=lignesNoms(pr.eleves).map(l=>nouvellePersonne(newId("s"),l));
  pr.liste.forEach(completerPersonne);
  pr.eleves=pr.liste.map(e=>e.nom).join("\n");
  return pr;
}
/* élèves de l'évaluation : ceux des promotions choisies (ou de l'ancienne promotion liée),
   réduits à un seul si l'évaluation vise un élève */
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
    :`<span class="hint">Choisis d'abord une promotion.</span>`;
  const n=F.eleveIds.length;
  document.getElementById("eleveHint").textContent=!all.length?"":n?(n+" élève"+(n>1?"s":"")+" sur "+all.length+" : seuls "+(n>1?"eux sont notés":"lui est noté")+" à l'étape 4 et exporté"+(n>1?"s":"")+"."):"Toute la promotion — "+all.length+" élève"+(all.length>1?"s":"")+".";
  host.querySelectorAll("[data-elv]").forEach(b=>b.onclick=()=>{const id=b.dataset.elv;
    F.eleveIds=F.eleveIds.includes(id)?F.eleveIds.filter(x=>x!==id):[...F.eleveIds,id];
    save();paintEleveField();paintSteps();if(ui.step===4)paintEleves()});
  const ab=host.querySelector("#elvAll");if(ab)ab.onclick=()=>{F.eleveIds=[];save();paintEleveField();paintSteps()};
}

function lignesOf(f){
  const L=[];
  (f.ops||[]).forEach(o=>{const its=(f.items||[]).filter(i=>i.op===o.id);if(its.length)L.push({k:"op",o,its})});
  (f.items||[]).filter(i=>!i.op).forEach(it=>L.push({k:"one",it}));
  return L;
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
  if(!r.n)r.n={};if(!r.obs)r.obs={};if(r.appr==null)r.appr="";if(!r.c)r.c={};
  for(const k in r.n){const v=+r.n[k];if(r.n[k]===""||isNaN(v)||Number.isInteger(v)&&v>=0)continue;
    const b=v<0?0:Math.floor(v),f=Math.round((v-b)*4);r.n[k]=b;r.c[k]=b===0?0:(f>=2?3*b:f===1?3*b-1:3*b)}
  return r;
}
function evalStats(f){
  const ff=f||F, els=studentsOf(ff), keys=lignesOf(ff).map(ligKey);
  let faits=0, partiels=0;
  els.forEach(e=>{const r=(ff.res||{})[e.id]||{n:{}};
    const n=keys.filter(k=>(r.n||{})[k]!=null&&(r.n||{})[k]!=="").length;
    if(keys.length&&n>=keys.length)faits++;else if(n)partiels++;});
  return {els:els.length,lignes:keys.length,faits,partiels};
}
function setClasses(list){
  F.classes=[...new Set((list||[]).map(x=>String(x||"").trim()).filter(Boolean))];
  F.classe=F.classes.join(", ");
}
function uid(){return Math.random().toString(36).slice(2,9)}
function asStart(as){const m=String(as||"").match(/(\d{4})/);return m?+m[1]:null}
function dipDuree(id){return +((DATA.diplomes.find(d=>d.id===id)||{}).duree)||3}
function promoDuree(pr){return dipDuree(pr.diplomeId)}
function promoNomAuto(pr){const dp=DATA.diplomes.find(d=>d.id===pr.diplomeId)||{};
  return (dipCode(dp)||"DN")+"-"+pr.debut+"-"+(+pr.debut+promoDuree(pr))}
function migPromoCohorte(pr){
  if(pr.debut==null||isNaN(+pr.debut)){
    const y=asStart(pr.as)||asStart(anneeScolaire(new Date()));pr.debut=y-((+pr.annee||1)-1);
  }
  pr.debut=+pr.debut;
  delete pr.duree;
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
function itemEcs(c,sem){
  const all=ecsOf(c,sem).map(e=>e.ec);
  const keep=all.filter(x=>F.ecCodes.includes(x));
  return keep.length?keep:all;
}
function syncItemEcs(){F.items.forEach(it=>{const c=REF.competences.find(x=>x.code===it.code);it.ecs=c?itemEcs(c,F.semestre):[]})}
function ecsOfSem(sem){
  const m=new Map();
  REF.competences.forEach(c=>ecsOf(c,sem).forEach(e=>{if(!m.has(e.ec))m.set(e.ec,{ec:e.ec,nom:e.nom,ue:e.ue,couleur:e.couleur})}));
  return [...m.values()].sort((a,b)=>ecNum(a.ec)-ecNum(b.ec));
}
function uesOfSem(sem){return [...new Set(ecsOfSem(sem).map(e=>e.ue))]}
function ecEntry(code,sem){return ecsOfSem(sem).find(e=>e.ec===code)||null}
function ecLabel(e){return e?e.ec+" · "+(e.nom||""):""}
function compLabel(code){const c=REF.competences.find(x=>x.code===code);return c?c.code+" · "+c.libelle:""}
function compsOfEcs(sem,codes){
  return compsFor(sem).filter(c=>!codes.length||ecsOf(c,sem).some(e=>codes.includes(e.ec)));
}
function uesSelected(){
  const u=[...(F.ues||[])];
  F.ecCodes.forEach(c=>{const e=ecEntry(c,F.semestre);if(e&&!u.includes(e.ue))u.push(e.ue)});
  return u;
}
function ecsOfUe(u,sem){return ecsOfSem(sem||F.semestre).filter(e=>e.ue===u).map(e=>e.ec)}
function ecLabels(){return F.ecCodes.map(c=>ecLabel(ecEntry(c,F.semestre))||c)}
function blocName(n){const b=REF.blocs.find(b=>b.num===String(n));return b?b.nom:"Bloc "+n}
function dnOf(sem){const i=SEMS.indexOf(sem);return i<0?"":anneeCode(Math.floor(i/2)+1)}
function dnLabel(sem){if(!MOD.dn)return "";const d=(REF.meta.niveaux||[]).find(n=>+n.annee===anneeOf(sem));return d&&d.label?dnOf(sem)+" · "+d.label:dnOf(sem)}
function anneeLabel(a){return "Année "+a+(MOD.dn?" — "+anneeCode(a):"")}
function semsOfAnnee(a){return SEMS.slice((a-1)*2,a*2)}
function dateFiche(d){const t=new Date(d||F.distribPrev||F.date||Date.now());return isNaN(t)?new Date():t}
function anneeScolaire(d){const t=dateFiche(d), y=t.getFullYear(), a=(t.getMonth()+1>=9)?y:y-1;
  return a+"-"+(a+1)}
function rangSemestre(d){const m=dateFiche(d).getMonth()+1;return (m>=9||m<=1)?1:2}
function semSuggere(d){
  const an=anneeFiche();if(!an)return "";
  const sems=semsOfAnnee(an);return sems[rangSemestre(d)-1]||sems[0];
}
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
function save(){LS.set("dnmade.draft",F)}

/* ---------- rendu ---------- */
function paintActions(){
  ["bExpJson"].forEach(id=>{
    const b=document.getElementById(id);if(!b)return;
    b.disabled=!dl;
    if(!dl)b.title="Téléchargement indisponible dans cette vue";else b.removeAttribute("title");
  });
}
function paintTabs(){
  // « Mes évaluations » porte les deux vues : la liste, et la composition d'une évaluation
  const avail={ref:!!MOD.referentiel,org:true,set:true,prog:true};
  if(ui.tab==="saved"&&!MOD.fiches)ui.tab="new";
  if(ui.tab!=="new"&&ui.tab!=="saved"&&!avail[ui.tab])ui.tab=MOD.fiches?"saved":"new";
  const bs=document.getElementById("t-saved");
  bs.textContent=MOD.fiches?(DEVICE.phone?"Évaluations":"Mes évaluations"):(DEVICE.phone?"Nouvelle":"Nouvelle évaluation");
  bs.setAttribute("aria-selected",String(ui.tab==="new"||ui.tab==="saved"));
  document.getElementById("v-new").hidden = ui.tab!=="new";
  document.getElementById("v-saved").hidden = ui.tab!=="saved";
  for(const [id,v] of [["t-prog","prog"],["t-ref","ref"],["t-org","org"],["t-set","set"]]){
    const b=document.getElementById(id);
    b.hidden=!avail[v];
    b.setAttribute("aria-selected",String(ui.tab===v));
    document.getElementById("v"+id.slice(1)).hidden = ui.tab!==v;
  }
  const bb=document.getElementById("bBack");if(bb)bb.hidden=!MOD.fiches;
  const nw=document.getElementById("newWhat");
  if(nw){const v=versionPourF();nw.textContent=(fiches.some(x=>x.id===F.id)?"Évaluation enregistrée — les modifications sont à ré-enregistrer":"Nouvelle évaluation")
    +(v?" · référentiel "+(REF.meta.diplome||"")+", version du "+frDate(v.date):"")}
  paintActions();
}
/* une évaluation vierge, prête à composer */
function vierge(){
  const dp=DATA.diplomes.find(x=>x.id===DATA.activeDiplome)||{};
  return migF({id:uid(),promoId:"",titre:"",livrables:[],semestre:semSuggere()||"S1",classe:"",
    date:new Date().toISOString().slice(0,10),prof:"",ues:[],ecCodes:[],compCode:"",consignes:"",
    ops:[],preset:DEF_PRESET_GET(),niveaux:PRESETS[DEF_PRESET_GET()].niveaux.slice(),opts:{crit:true,obs:true,coef:false},
    eleves:"",items:[],res:{}});
}
function nouvelleFiche(){
  if(!peutCreerFiche()){alerteRefNonValide(DATA.activeDiplome,"Impossible de créer une évaluation");return}
  F=vierge();
  {const me=DATA.enseignants.find(t=>t.id===DATA.moi);if(me&&me.nom){F.profs=[me.nom];F.prof=me.nom}}save();ui.tab="new";ui.step=1;ui.sel=[];ui.eleve="";
  paintTabs();paintForm();paintPick();paintLignes();goStep(1);
  window.scrollTo({top:0,behavior:"smooth"});
}
function paintEchForm(){
  const g=id=>document.getElementById(id);if(!g("lvRead"))return;
  if(!F.niveaux||!F.niveaux.length||!F.preset){F.preset=F.preset||DEF_PRESET_GET();F.niveaux=(F.niveaux&&F.niveaux.length)?F.niveaux:PRESETS[F.preset].niveaux.slice()}
  ["f-levels","bAddLevel"].forEach(id=>{const x=g(id);if(x)x.hidden=true});
  g("lvRead").hidden=false;
  g("lvRead").innerHTML=F.niveaux.map((n,i)=>
    `<span class="pill">${i+1}. ${esc(n)}</span>`).join(" ");
}
function paintForm(){
  REF=computeREF();
  try{paintEchForm()}catch(e){console.error(e)}
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
  const hE=g("helpEch");
  if(hE&&!hE.innerHTML)hE.innerHTML=help("L'échelle donne les niveaux de la jauge d'évaluation, à l'écran comme dans le Word et l'Excel. Une nouvelle évaluation prend l'échelle par défaut ; la liste propose toutes les échelles activées dans Paramètres › Échelles d'évaluation.");
  g("row-ec").hidden=!MOD.ec;
  g("fgroup-ref").hidden=!MOD.ec;
  paintContexte();
  g("fld-consignes").hidden=!MOD.consignes;
  g("panel-eleves").hidden=true;
  g("step1cols").style.gridTemplateColumns="minmax(0,1fr)";
  const ps=g("f-preset");
  // l'échelle se choisit parmi celles activées dans Paramètres (par défaut : celle marquée « par défaut ») ;
  // on ne la change plus une fois des niveaux saisis pour des élèves
  if(!F.niveaux||!F.niveaux.length){F.preset=DEF_PRESET_GET();F.niveaux=PRESETS[F.preset].niveaux.slice()}
  g("fld-preset").hidden=false;
  g("f-levels").hidden=true;
  g("bAddLevel").hidden=true;
  g("lvRead").hidden=false;
  g("lvRead").innerHTML=F.niveaux.map((n,i)=>
    `<span class="pill">${i+1}. ${esc(n)}</span>`).join(" ");
  if(F.preset==="dn"){F.preset=DEF_PRESET_GET();F.niveaux=PRESETS[DEF_PRESET_GET()].niveaux.slice()}
  ps.innerHTML=Object.entries(PRESETS).filter(([k])=>k!=="dn"&&(ECH.actifs.includes(k)||k===F.preset))
    .map(([k,v])=>`<option value="${k}">${esc(v.nom)}${k===ECH.def?" (par défaut)":""}${!ECH.actifs.includes(k)?" — désactivée":""}</option>`).join("");
  ps.value=F.preset;
  {const saisi=Object.values(F.res||{}).some(r=>hasSaisie(r)), h=g("f-presetHint");
   ps.disabled=saisi;
   if(h)h.textContent=saisi?"Des niveaux sont déjà saisis pour des élèves : l'échelle ne peut plus changer.":"Échelles activées dans Paramètres › Échelles d'évaluation."}
  ps.onchange=()=>{if(Object.values(F.res||{}).some(r=>hasSaisie(r)))return;F.preset=ps.value;F.niveaux=PRESETS[ps.value].niveaux.slice();save();paintForm();paintLignes()};
  g("f-levels").innerHTML=F.niveaux.map((n,i)=>
    `<div class="lv"><input type="text" value="${esc(n)}" data-i="${i}" aria-label="Degré ${i+1}"><button class="btn ghost" data-rm="${i}" aria-label="Supprimer">×</button></div>`).join("");
  g("f-levels").querySelectorAll("input").forEach(inp=>inp.oninput=()=>{F.niveaux[+inp.dataset.i]=inp.value;F.preset="libre";save()});
  g("f-levels").querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{if(F.niveaux.length<2)return;F.niveaux.splice(+b.dataset.rm,1);F.preset="libre";save();paintForm()});
  // colonne observations toujours présente ; colonne coef. seulement avec l'échelle « note chiffrée »
  F.opts=F.opts||{};F.opts.obs=true;F.opts.coef=F.preset==="note";
  // une seule échelle possible : rien à choisir, le bloc Échelle n'apparaît pas
  {const one=g("f-preset").options.length<=1;["fgroup-ech","fld-preset","lvRead"].forEach(id=>{const x=g(id);if(x)x.hidden=one})}
  paintSteps();
}
function anneeOfClasse(t){
  t=String(t||"");
  let m=t.match(/-\s*([1-3])\s*$/);if(m)return +m[1];
  m=t.match(/(?:^|[^\d])([1-3])(?:[^\d]|$)/);return m?+m[1]:0;
}
function anneeFiche(){
  const pr=curPromo();if(pr&&pr.annee)return +pr.annee;
  const ofC=c=>{const p2=promos.find(x=>x.nom===c);if(p2){const a=promoAnneeAt(p2,anneeScolaire());return a>=1&&a<=promoDuree(p2)?a:0}
    return anneeOfClasse(c)};
  const ys=[...new Set((F.classes||[]).map(ofC).filter(Boolean))];
  return ys.length===1?ys[0]:0;
}
function paintSems(){
  const host=document.getElementById("f-sem");if(!host)return;
  const an=anneeFiche(), ok=an?semsOfAnnee(an):SEMS;
  host.innerHTML=SEMS.map(x=>`<button type="button" data-sem="${x}" aria-pressed="${x===F.semestre}" ${
    ok.includes(x)?"":`disabled title="Hors de l'année ${an}${F.classe?" ("+esc(F.classe)+")":""}"`}>${x}</button>`).join("");
  host.querySelectorAll("button").forEach(b=>b.onclick=()=>{
    if(b.disabled)return;F.semManuel=true;setSemestre(b.dataset.sem);save();paintForm();paintPick()});
  const hint=document.getElementById("semHint");
  if(hint)hint.innerHTML=(MOD.dn?`<span class="dnbadge">${esc(dnLabel(F.semestre))}</span> &nbsp;`:"")
    +`${compsFor(F.semestre).length} compétences mobilisées`
    +(an?` · semestres d'année ${an}`:"")
    +` · année scolaire ${esc(anneeScolaire())}`
    +(F.semManuel?` · <button type="button" class="lnk" id="semAuto">suivre la date</button>`:"");
  const ba=document.getElementById("semAuto");
  if(ba)ba.onclick=()=>{F.semManuel=false;applySemDate();save();paintForm();paintPick()};
}
function paintClasse(){
  const host=document.getElementById("f-classes");
  if(!host)return;
  if(!Array.isArray(F.classes))migF(F);
  const AS=anneeScolaire();
  // promotions en cours de toutes les mentions du diplôme actif
  const dipA=DATA.diplomes.find(d=>d.id===DATA.activeDiplome)||{};
  const same=DATA.diplomes.filter(d=>norm(d.nom||"")===norm(dipA.nom||"")).map(d=>d.id);
  const dIdx=id=>DATA.diplomes.findIndex(d=>d.id===id);
  const ps=promos.map(migPromoCohorte).filter(pr=>same.includes(pr.diplomeId));
  const yr=pr=>promoAnneeAt(pr,AS);
  const live=ps.filter(pr=>{const a=yr(pr);return a>=1&&a<=promoDuree(pr)&&promoVisible(pr)})
    .sort((x,y)=>(yr(x)-yr(y))||(dIdx(x.diplomeId)-dIdx(y.diplomeId)));
  // plusieurs promotions possibles, mais toutes de la même année de formation
  const selPr=F.classes.map(n=>ps.find(p=>p.nom===n)).filter(Boolean);
  const lockY=selPr.length?yr(selPr[0]):null;
  const names=[...new Set([...live.map(pr=>pr.nom),...F.classes])].filter(Boolean);
  const tag=n=>{const pr=ps.find(x=>x.nom===n);if(!pr)return "";const a=yr(pr);
    return a>=1&&a<=promoDuree(pr)?`<span class="n">Année ${a}</span>`:""};
  host.innerHTML=names.map(x=>{
    const pr=ps.find(p=>p.nom===x), on=F.classes.includes(x), off=!on&&pr&&lockY!=null&&yr(pr)!==lockY;
    return `<button type="button" class="liv" data-classe="${esc(x)}" aria-pressed="${on}" ${off?"disabled":""}
      title="${esc(x)}${off?" — autre année de formation que la promotion déjà choisie":""}${pr&&!promoRefValide(pr)?" — référentiel non validé":""}">${esc(promoDisp(x))}${promoDisp(x)===x?tag(x):""}${pr&&!promoRefValide(pr)?`<span class="n">référentiel à valider</span>`:""}</button>`}).join("")
    +(live.length?"":`<span class="hint">Aucune promotion en cours en ${esc(AS)} : crée-la dans Mon établissement › Promotions.</span>`)
    +(dipBloquant(F)?`<span class="hint" id="f-refnv" style="color:var(--signal);flex-basis:100%">Le référentiel de cette évaluation n'est pas validé : elle ne pourra pas être enregistrée. <button type="button" class="btn ghost" data-allerval>Valider le référentiel</button></span>`:"");
  {const b=host.querySelector("[data-allerval]");if(b)b.onclick=()=>allerValidation(dipBloquant(F))}
  host.querySelectorAll("[data-classe]").forEach(b=>b.onclick=()=>toggleClasse(b.dataset.classe));
}
function paintProf(){
  const host=document.getElementById("f-prof-sel");if(!host)return;
  if(!Array.isArray(F.profs))F.profs=F.prof?String(F.prof).split(/,\s*/).filter(Boolean):[];
  const all=[...new Set([...DATA.enseignants.map(t=>t.nom).filter(Boolean),...F.profs])];
  host.innerHTML=all.map(n=>`<button type="button" class="liv" data-prof="${esc(n)}" aria-pressed="${F.profs.includes(n)}">${esc(n)}</button>`).join("")
    ||`<span class="hint">Ajoute les enseignants dans Mon établissement › Enseignants.</span>`;
  host.querySelectorAll("[data-prof]").forEach(b=>b.onclick=()=>{const n=b.dataset.prof;
    F.profs=F.profs.includes(n)?F.profs.filter(x=>x!==n):[...F.profs,n];F.prof=F.profs.join(", ");
    save();paintProf();paintContexte();paintSteps()});
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
function livrablesAll(){return [...new Set([...livrNames(),...F.livrables])].filter(Boolean)}
function paintLivrables(){
  const host=document.getElementById("f-livr");
  host.innerHTML=livrablesAll().map(x=>
    `<button type="button" class="liv" data-livr="${esc(x)}" aria-pressed="${F.livrables.includes(x)}">${esc(x)}</button>`).join("")
    +`<span class="livnew"><button type="button" class="liv add" id="livAddChip">Autre livrable…</button>`
    +`<input type="text" id="f-livr-new" class="livinput" placeholder="Nom du livrable" hidden></span>`;
  host.querySelectorAll("[data-livr]").forEach(b=>b.onclick=()=>{
    const v=b.dataset.livr;
    F.livrables=F.livrables.includes(v)?F.livrables.filter(x=>x!==v):[...F.livrables,v];
    F.ops.forEach(o=>o.livrables=o.livrables.filter(x=>F.livrables.includes(x)));
    F.items.forEach(i=>i.livrables=i.livrables.filter(x=>F.livrables.includes(x)));
    save();paintLivrables();paintSteps()});
  const chip=host.querySelector("#livAddChip"), inp=host.querySelector("#f-livr-new");
  const revert=()=>{inp.hidden=true;inp.value="";chip.hidden=false;chip.setAttribute("aria-pressed","false")};
  chip.onclick=()=>{chip.hidden=true;chip.setAttribute("aria-pressed","true");inp.hidden=false;inp.value="";inp.focus()};
  const commit=()=>{
    const v=inp.value.trim();
    if(!v){revert();return}
    inp.disabled=true;
    if(!F.livrables.includes(v))F.livrables.push(v);
    save();paintLivrables();paintSteps();
    if(!livrNames().includes(v))
      askModal(`Ajouter « ${esc(v)} » à la liste des livrables de Mon établissement, pour les prochaines évaluations ?`,
        ()=>{DATA.livrables.push({nom:v,type:""});saveData();toast("« "+v+" » ajouté aux livrables.")});
  };
  inp.onkeydown=e=>{
    if(e.key==="Enter"){e.preventDefault();commit()}
    else if(e.key==="Escape"){e.preventDefault();revert()}};
  inp.onblur=()=>{if(!inp.disabled)commit()};
}
function addLivrable(v){
  v=String(v||"").trim();if(!v)return;
  if(!livrNames().includes(v)){DATA.livrables.push({nom:v,type:""});persistData()}
  if(!F.livrables.includes(v))F.livrables.push(v);
  save();paintLivrables();paintSteps();
}
function goStep(n){
  const max=MOD.eleves?4:3;
  ui.step=Math.min(max,Math.max(1,+n));
  if(ui.step===3)ui.sel=[];
  paintSteps();
  if(ui.step===1)paintForm();
  if(ui.step===2)paintPick();
  if(ui.step===3)paintLignes();
  if(ui.step===4)paintEleves();
  window.scrollTo({top:0,behavior:"smooth"});
}
function paintSteps(){
  const li4=document.getElementById("li-step4");
  // l'évaluation des élèves s'ouvre depuis Mes évaluations (« Évaluer ») : pas d'étape 4 dans le parcours
  if(li4)li4.hidden=true;
  if(!MOD.eleves&&ui.step===4)ui.step=3;
  for(const n of [1,2,3,4]){
    const pane=document.getElementById("step"+n);if(!pane)continue;
    pane.hidden = ui.step!==n;
    const b=document.querySelector(`.steps [data-step="${n}"]`);
    if(b)b.setAttribute("aria-current",String(ui.step===n));
  }
  const nliv=F.livrables.length, nit=F.items.length, dispo=compsFor(F.semestre).length;
  const nop=F.ops.filter(o=>F.items.some(i=>i.op===o.id)).length;
  const nform=rows().filter(r=>r.lib&&r.op).length+F.items.filter(i=>!i.op&&i.libelle).length;
  document.getElementById("s1sum").innerHTML= nliv
    ? `${nliv} livrable${nliv>1?"s":""}<em> attendu${nliv>1?"s":""}</em>`
    : `<em>aucun livrable attendu</em>`;
  document.getElementById("s2sum").innerHTML= nit
    ? `${nit} retenue${nit>1?"s":""}<em> sur ${dispo} au ${esc(F.semestre)}</em>`
    : `<em>aucune compétence cochée</em>`;
  const nl=rows().length;
  document.getElementById("s3sum").innerHTML= nl
    ? `${nl} ligne${nl>1?"s":""}<em>${nop?" · "+nop+" regroupement"+(nop>1?"s":""):""}${nform?" · "+nform+" formulée"+(nform>1?"s":""):""}</em>`
    : `<em>rien à formuler</em>`;
  document.getElementById("n1hint").textContent=nliv?"":"Choisis au moins un livrable pour pouvoir les associer à l'étape 3.";
  document.getElementById("n2hint").textContent=F.items.length?"":"Coche les compétences évaluées sur ce travail.";
  const s4=document.getElementById("s4sum");
  if(s4){const st=evalStats(F);
    s4.innerHTML=!st.els?`<em>aucun élève</em>`
      :st.faits>=st.els?`${st.els} évalué${st.els>1?"s":""}<em> — complet</em>`
      :`${st.faits} / ${st.els}<em> évalué${st.els>1?"s":""}${st.partiels?" · "+st.partiels+" en cours":""}</em>`;}
  const n3s=document.getElementById("n3save");
  if(n3s){const saved=fiches.some(f=>f.id===F.id);
    n3s.textContent=saved?"Déjà dans « Mes évaluations » — enregistre pour la mettre à jour, le Word et l'Excel se génèrent de là-bas."
      :"Enregistre-la pour la retrouver dans « Mes évaluations » : c'est de là que sortent le Word et l'Excel.";}
}
function paintContexte(){
  const g=id=>document.getElementById(id), sem=F.semestre;
  const ues=uesOfSem(sem);
  if(!Array.isArray(F.ues))F.ues=[];
  F.ues=F.ues.filter(u=>ues.includes(u));
  const all=ecsOfSem(sem);
  F.ecCodes=F.ecCodes.filter(c=>all.some(e=>e.ec===c));
  const lim0=ecsAffectes();
  g("f-ue").innerHTML=ues.filter(u=>!lim0||F.ues.includes(u)||all.some(e=>e.ue===u&&lim0.has(e.ec))).map(u=>{
    const on=F.ues.includes(u), tot=all.filter(e=>e.ue===u).length,
          nb=all.filter(e=>e.ue===u&&F.ecCodes.includes(e.ec)).length;
    return `<button type="button" class="ec${on&&nb<tot?" part":""}" style="--c:${ueColor(u)}" data-uepick="${esc(u)}" aria-pressed="${on}">${esc(tidy(u).replace(/^UE\s*/i,""))}${on&&tot?`<em>${nb}/${tot}</em>`:""}</button>`}).join("")
    ||`<span class="hint">Aucune UE à ce semestre.</span>`;
  g("f-ue").querySelectorAll("[data-uepick]").forEach(b=>b.onclick=()=>toggleUe(b.dataset.uepick));
  const lim=ecsAffectes();
  const shown=lim?all.filter(e=>lim.has(e.ec)||F.ecCodes.includes(e.ec)):all;
  g("f-ecsel").innerHTML=shown.map(e=>
    `<button type="button" class="ec" style="--c:${e.couleur||ecColor(e.ec)}" data-ecc="${esc(e.ec)}" aria-pressed="${F.ecCodes.includes(e.ec)}" title="${esc(e.ue)}"><span class="k">${esc(e.ec)}</span>${esc(e.nom||"")}</button>`).join("");
  g("f-ecsel").querySelectorAll("[data-ecc]").forEach(b=>b.onclick=()=>toggleEc(b.dataset.ecc));
  const n=F.ecCodes.length, nu=uesSelected().length;
  g("ecHint").textContent=(n||nu
    ?[nu?nu+(nu>1?" UE":" UE"):"",n?n+(n>1?" EC sélectionnés":" EC sélectionné"):"aucun EC"].filter(Boolean).join(" · ")
    :"Aucune UE ni EC précisé — toutes les compétences du semestre sont proposées")
    +(lim?" · EC limités à ceux de "+(F.profs||[]).join(", ")+" ("+shown.length+" sur "+all.length+")":"");
}
function paintPromos(){
  const g=id=>document.getElementById(id);
  const hp=g("helpPromo");
  if(hp&&!hp.innerHTML)hp.innerHTML=help("Choisir une promotion renseigne la classe de l'évaluation et cale le semestre sur son année de formation. Ses élèves apparaissent à l'étape 4, où tu notes chacun ; à l'export, le Word sort un document par élève, degrés cochés, et l'Excel ajoute un onglet « Grille classe » rempli. Renommer un élève lui donne une nouvelle ligne : ses résultats déjà saisis ne le suivent pas.");
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
function livChips(sel,attr,id){
  if(!F.livrables.length)return `<span class="hint">Aucun livrable défini à l'étape 1.</span>`;
  return F.livrables.map(x=>
    `<button type="button" class="liv" data-${attr}="${esc(id)}" data-v="${esc(x)}" aria-pressed="${sel.includes(x)}">${esc(x)}</button>`).join("");
}
let dragOn=false;
function magnetDrag(e,src,payload){
  if(e.button)return;
  const sx=e.clientX, sy=e.clientY;
  let started=false, ghost=null, target=null, zones=[];
  const R=38;
  const begin=()=>{
    started=true;dragOn=true;
    src.classList.add("dragging");
    document.body.classList.add("dragging-now");
    zones=[...document.querySelectorAll("#lignes [data-drop]")]
      .filter(z=>payload.kind!=="comp"||z.dataset.drop!==payload.from)
      .map(z=>({el:z,key:z.dataset.drop}));
    ghost=document.createElement("div");
    ghost.className="dragghost"+(payload.kind==="comp"?" gcomp":" gliv");
    ghost.innerHTML=`<span class="gtxt"></span><span class="ghint"></span>`;
    ghost.querySelector(".gtxt").textContent=payload.label;
    document.body.appendChild(ghost);
  };
  const move=ev=>{
    if(!started){
      if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<5)return;
      begin();
    }
    ev.preventDefault();
    const x=ev.clientX,y=ev.clientY;
    let best=null,bd=1e9;
    zones.forEach(z=>{
      const r=z.el.getBoundingClientRect();
      const dx=Math.max(r.left-x,0,x-r.right), dy=Math.max(r.top-y,0,y-r.bottom);
      const d=Math.hypot(dx,dy);
      if(d<bd){bd=d;best=z}
    });
    const ok=!!best&&bd<=R;
    zones.forEach(z=>z.el.classList.toggle("magnet",ok&&z===best));
    target=ok?best:null;
    let gx=x+14,gy=y+10;
    if(ok){
      const r=best.el.getBoundingClientRect();
      const k=Math.pow(1-Math.min(1,bd/R),1.5);
      gx+= (r.left+26-gx)*k*0.9; gy+=(r.top+18-gy)*k*0.9;
    }
    ghost.style.transform=`translate(${gx}px,${gy}px)`;
    ghost.classList.toggle("snap",ok);
    ghost.classList.toggle("off",!ok&&!!payload.canDetach);
    ghost.querySelector(".ghint").textContent=ok
      ? (payload.kind==="comp"?"réunir ici":"associer ici")
      : (payload.canDetach?(payload.kind==="comp"?"détacher du groupe":"retirer de la ligne"):"");
  };
  const up=()=>{
    document.removeEventListener("pointermove",move);
    document.removeEventListener("pointerup",up);
    document.removeEventListener("pointercancel",up);
    if(!started)return;
    src.classList.remove("dragging");
    document.body.classList.remove("dragging-now");
    if(ghost)ghost.remove();
    document.querySelectorAll(".lg.magnet").forEach(z=>z.classList.remove("magnet"));
    setTimeout(()=>{dragOn=false},0);
    if(target){
      if(payload.kind==="comp")attachTo(target.key,payload.code);
      else addLivrTo(target.key,payload.v);
    }else if(payload.canDetach){
      if(payload.kind==="comp")detachCode(payload.code);
      else removeLivrFrom(payload.from,payload.v);
    }
  };
  document.addEventListener("pointermove",move,{passive:false});
  document.addEventListener("pointerup",up);
  document.addEventListener("pointercancel",up);
}
function removeLivrFrom(key,v){
  const t=lineOf(key);if(!t)return;
  t.livrables=(t.livrables||[]).filter(x=>x!==v);save();paintLignes();
}
function cleanOps(){
  F.ops=F.ops.filter(o=>{
    const its=F.items.filter(i=>i.op===o.id);
    if(its.length>=2)return true;
    if(its.length===1){const it=its[0];
      it.livrables=[...new Set([...(it.livrables||[]),...(o.livrables||[])])];
      if(!String(it.libelle||"").trim()&&String(o.libelle||"").trim())it.libelle=o.libelle;
      it.op="";}
    return false;
  });
}
function lineOf(key){return key.startsWith("op:")?F.ops.find(o=>o.id===key.slice(3)):F.items.find(i=>i.code===key.slice(4))}
function attachTo(key,code){
  const it=F.items.find(i=>i.code===code);if(!it)return;
  if(key.startsWith("op:")){
    const id=key.slice(3);if(it.op===id)return;it.op=id;
    const op=F.ops.find(o=>o.id===id);
    if(op)(it.livrables||[]).forEach(l=>{if(!op.livrables.includes(l))op.livrables.push(l)});
  }else{
    const tcode=key.slice(4);if(tcode===code)return;
    const t=F.items.find(i=>i.code===tcode);if(!t)return;
    const op={id:uid(),libelle:t.libelle||"",critere:t.critere||"",
      livrables:[...new Set([...(t.livrables||[]),...(it.livrables||[])])]};
    F.ops.push(op);t.op=op.id;it.op=op.id;
  }
  cleanOps();save();paintLignes();paintSteps();
}
function detachCode(code){
  const it=F.items.find(i=>i.code===code);if(!it||!it.op)return;
  const op=F.ops.find(o=>o.id===it.op);
  if(op){it.libelle=it.libelle||"";it.livrables=[...new Set([...(it.livrables||[]),...(op.livrables||[])])]}
  it.op="";cleanOps();save();paintLignes();paintSteps();
}
function addLivrTo(key,v){
  const t=lineOf(key);if(!t)return;
  if(!F.livrables.includes(v))return;
  if(!t.livrables.includes(v))t.livrables.push(v);
  save();paintLignes();
}
function paintPalette(){
  const hd=document.getElementById("helpDrag");
  if(hd&&!hd.innerHTML)hd.innerHTML=help("Tout se fait à l'aimant : en approchant une pastille d'une ligne, celle-ci s'allume et la pastille vient s'y coller. <b>Un code de compétence</b> déposé sur une autre ligne réunit les deux en compétence opérationnelle ; lâché à l'écart, il se détache de son groupe. <b>Un livrable</b> déposé sur une ligne s'y associe ; sorti de la ligne, il s'en retire.");
  const host=document.getElementById("palLivr");
  host.innerHTML=F.livrables.length?F.livrables.map(x=>
    `<span class="liv drg" data-dragliv="${esc(x)}" aria-pressed="true" title="Glisser sur une ligne pour l'associer">${esc(x)}</span>`).join("")
    :`<span class="hint">Aucun livrable — reviens à l'étape 1.</span>`;
  host.querySelectorAll("[data-dragliv]").forEach(el=>el.addEventListener("pointerdown",e=>
    magnetDrag(e,el,{kind:"liv",v:el.dataset.dragliv,label:el.dataset.dragliv,canDetach:false})));
}
function paintLignes(){
  paintPalette();
  const L=lignes(), host=document.getElementById("lignes");
  document.getElementById("lCount").textContent=L.length;
  document.getElementById("bLink").disabled=ui.sel.length<2;
  document.getElementById("n3hint").textContent=ui.sel.length?ui.sel.length+" ligne(s) cochée(s)":"Glisse-dépose, ou coche deux lignes et clique « Lier ».";
  if(!L.length){host.innerHTML=`<div class="empty">Aucune compétence retenue. Reviens à l'étape 2.</div>`;return}
  host.innerHTML=L.map((l,n)=>{
    const key=l.k==="op"?"op:"+l.o.id:"one:"+l.it.code;
    const on=ui.sel.includes(key);
    const codes=l.k==="op"?l.its.map(i=>i.code):[l.it.code];
    const liv=(l.k==="op"?l.o.livrables:l.it.livrables)||[];
    return `<div class="lg ${on?"sel":""}" data-drop="${esc(key)}">
      <input class="cbox" type="checkbox" data-lsel="${esc(key)}" ${on?"checked":""} aria-label="Sélectionner la ligne ${n+1}">
      <div style="display:flex;flex-direction:column;gap:8px;min-width:0">
        <div class="top">
          ${l.k==="op"?`<span class="num">OP ${opIndex(l.o.id)}</span>`:""}
          ${codes.map(c=>{const lb=(REF.competences.find(x=>x.code===c)||{}).libelle||"";
            return `<span class="cd drg" data-dragcomp="${esc(c)}" title="${esc(c+(lb?" · "+lb:""))} — glisser vers une autre ligne pour réunir, ou à l'écart pour détacher"><span class="grip" aria-hidden="true">⠿</span><b>${esc(c)}</b>${lb?`<span class="t">${esc(lb)}</span>`:""}</span>`}).join("")}
          ${l.k==="op"?`<button class="btn ghost" data-unlink="${l.o.id}" style="margin-left:auto">Délier</button>`:""}
        </div>
        <div class="ro"><label class="mini">${esc(critLabel())}</label>
          <input type="text" data-lib="${esc(key)}" value="${esc(l.k==="op"?l.o.libelle:l.it.libelle)}" style="flex:1 1 240px"
            placeholder="${l.k==="op"?"Formuler ce qui est attendu pour ce regroupement…":"Formuler ce qui est attendu (sinon l'intitulé du référentiel)…"}"></div>
        <div class="ro livrow">${liv.length
          ? liv.map(x=>`<button type="button" class="liv on drg" data-lliv="${esc(key)}" data-v="${esc(x)}" aria-pressed="true" title="Glisser à l'écart pour retirer">${esc(x)}</button>`).join("")
          : `<span class="hint">aucun livrable — glisse-en un ici</span>`}</div>
      </div></div>`}).join("");
  host.querySelectorAll("[data-lsel]").forEach(cb=>cb.onchange=()=>{
    const k=cb.dataset.lsel;ui.sel=cb.checked?[...ui.sel,k]:ui.sel.filter(x=>x!==k);paintLignes()});
  host.querySelectorAll("[data-lib]").forEach(inp=>inp.oninput=()=>{
    const t=lineOf(inp.dataset.lib);if(t){t.libelle=inp.value;save();paintSteps()}});
  host.querySelectorAll("[data-lliv]").forEach(b=>{
    b.addEventListener("pointerdown",e=>{
      const t=lineOf(b.dataset.lliv);
      magnetDrag(e,b,{kind:"liv",v:b.dataset.v,label:b.dataset.v,from:b.dataset.lliv,
        canDetach:!!(t&&(t.livrables||[]).includes(b.dataset.v))});
    });
    b.onclick=()=>{
      if(dragOn)return;
      const t=lineOf(b.dataset.lliv);if(!t)return;
      t.livrables=(t.livrables||[]).filter(x=>x!==b.dataset.v);save();paintLignes()};
  });
  host.querySelectorAll("[data-unlink]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.unlink;
    F.items.forEach(i=>{if(i.op===id){const op=F.ops.find(o=>o.id===id);
      if(op)i.livrables=[...new Set([...(i.livrables||[]),...(op.livrables||[])])];i.op=""}});
    F.ops=F.ops.filter(o=>o.id!==id);ui.sel=[];save();paintLignes();paintSteps();toast("Compétences déliées.")});
  host.querySelectorAll("[data-dragcomp]").forEach(el=>{
    const zone=el.closest("[data-drop]");
    el.addEventListener("pointerdown",e=>{
      const code=el.dataset.dragcomp, it=F.items.find(i=>i.code===code);
      const lb=(REF.competences.find(x=>x.code===code)||{}).libelle||"";
      magnetDrag(e,el,{kind:"comp",code,label:code+(lb?" · "+lb:""),from:zone?zone.dataset.drop:"",canDetach:!!(it&&it.op)});
    });
  });
}
/* ---------- étape 4 : évaluation des élèves ---------- */
function curEleve(){
  const els=studentsOf(F);if(!els.length)return null;
  return els.find(e=>e.id===ui.eleve)||els[0];
}
function eleveDone(eid){
  const keys=lignes().map(ligKey), r=(F.res||{})[eid]||{n:{}};
  const n=keys.filter(k=>(r.n||{})[k]!=null&&(r.n||{})[k]!=="").length;
  return {n,tot:keys.length};
}
function paintEprog(){
  const els=studentsOf(F), L=lignes(), st=evalStats(F);
  const c=document.getElementById("eCount");if(c)c.textContent=els.length;
  const prog=document.getElementById("eProg");
  if(prog)prog.textContent=!els.length?""
    :`${st.faits} / ${els.length} élève${els.length>1?"s":""} évalué${els.length>1?"s":""}`
     +(st.partiels?` · ${st.partiels} commencé${st.partiels>1?"s":""}`:"")
     +` · ${L.length} ligne${L.length>1?"s":""}`;
  const h=document.getElementById("n4hint");
  if(h)h.textContent=!els.length?""
    :(st.faits===els.length?"Tout le monde est évalué — le Word par élève et l'Excel de la promo se génèrent depuis « Mes évaluations »."
      :"Les résultats sont enregistrés avec l'évaluation ; les documents se génèrent depuis « Mes évaluations ».");
}
/* Niveau d'acquisition en pourcentage continu (0 à 100, sans crans visibles).
   Règle quel que soit le nombre N de niveaux : les deux niveaux extrêmes occupent chacun 60/N %
   (15 % pour 4 niveaux), les niveaux intermédiaires se partagent le reste à parts égales.
   Dans le premier et le dernier niveau, la jauge ne se remplit pas progressivement :
   elle vaut 0 dans le premier, 100 dans le dernier. r.n[k] garde l'indice du niveau, r.p[k] le pourcentage. */
function pctBounds(N){
  if(N<=1)return [0,100];
  if(N===2)return [0,50,100];
  const ed=60/N, mid=(100-2*ed)/(N-2), t=[0];
  for(let i=1;i<N;i++)t.push(ed+(i-1)*mid);
  t.push(100);return t;
}
function pctLvl(p,N){const t=pctBounds(N);let l=0;for(let i=1;i<N;i++)if(p>=t[i]-1e-9)l=i;return l}
function pctSnap(p,N){const t=pctBounds(N);if(N<=1)return 100;
  if(p<t[1])return 0;if(p>=t[N-1])return 100;return Math.round(p)}
function pctOf(r,k){
  const N=(F.niveaux||[]).length, v=(r.n||{})[k];if(v==null||v==="")return null;
  const p=(r.p||{})[k];
  if(p!=null&&pctLvl(+p,N)===+v)return +p;
  const t=pctBounds(N);
  return +v<=0?0:+v>=N-1?100:Math.round((t[+v]+t[+v+1])/2);
}
function nivColor(i,n){const h=Math.round(8+137*(n>1?i/(n-1):1));return `hsl(${h} 58% 56%)`}
function nivHex(i,n){const h=(8+137*(n>1?i/(n-1):1))/360,sat=.58,l=.70;
  const f=t=>{t=(t+1)%1;const q=l<.5?l*(1+sat):l+sat-l*sat,p=2*l-q;
    const v=t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p;return Math.round(v*255).toString(16).padStart(2,"0")};
  return (f(h+1/3)+f(h)+f(h-1/3)).toUpperCase()}
function pctTxt(p,niv){
  niv=niv||F.niveaux||[];if(p==null)return "";
  const N=niv.length,l=pctLvl(p,N);
  return niv[l]||"";
}
function ntkHtml(eid,k,p,niv,big){
  const N=niv.length,t=pctBounds(N),has=p!=null,l=has?pctLvl(p,N):0;
  const ticks=t.slice(1,-1).map(x=>`<b class="maj" style="left:${x.toFixed(3)}%"></b>`).join("");
  const scale=big?`<span class="ns">${niv.map((x,i)=>`<span style="left:${((t[i]+t[i+1])/2).toFixed(2)}%">${esc(x)}</span>`).join("")}</span>`:"";
  return `<div class="ntk${big?" big":""}${has?"":" empty"}" data-el="${esc(eid)}" data-k="${esc(k)}" data-p="${has?p:""}"
      role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="100" ${has?`aria-valuenow="${p}"`:""}
      aria-valuetext="${esc(has?pctTxt(p,niv):"non renseigné")}" title="Glisser ou cliquer · flèches pour ajuster · Suppr ou double-clic pour effacer">
    <span class="nt"><i class="nf${has&&p===0?" zero":""}" style="width:${has?p:0}%;background:${has?nivColor(l,N):"transparent"}"></i>${ticks}</span>
    ${scale}<span class="nl">${esc(has?pctTxt(p,niv):"—")}</span></div>`;
}
function wireNtk(host,after){
  const niv=F.niveaux||[], N=niv.length;
  const show=(el,p)=>{const f=el.querySelector(".nf"), l=el.querySelector(".nl");
    if(p==null){f.style.width="0";f.style.background="transparent";f.classList.remove("zero");l.textContent="—";el.classList.add("empty");return}
    f.style.width=p+"%";f.style.background=nivColor(pctLvl(p,N),N);f.classList.toggle("zero",p===0);l.textContent=pctTxt(p,niv);el.classList.remove("empty")};
  // pendant le glisser, la jauge suit la souris partout ; au relâchement, la zone du premier niveau retombe à 0 et celle du dernier monte à 100
  const at=(el,x)=>{const r=el.querySelector(".nt").getBoundingClientRect();return Math.round(Math.max(0,Math.min(100,(x-r.left)/r.width*100)))};
  const commit=(el,p)=>{el.dataset.p=p==null?"":p;setPct(el.dataset.el,el.dataset.k,p);show(el,p);
    el.setAttribute("aria-valuetext",p==null?"non renseigné":pctTxt(p,niv));if(p==null)el.removeAttribute("aria-valuenow");else el.setAttribute("aria-valuenow",p);
    if(after)after(el.dataset.el)};
  host.querySelectorAll(".ntk").forEach(el=>{
    let drag=null;
    el.onpointerdown=e=>{if(e.button>0)return;e.preventDefault();el.focus({preventScroll:true});
      try{el.setPointerCapture(e.pointerId)}catch(_){}drag={p:at(el,e.clientX)};el.classList.add("drag");show(el,drag.p)};
    el.onpointermove=e=>{if(!drag)return;const q=at(el,e.clientX);if(q!==drag.p){drag.p=q;show(el,q)}};
    el.onpointerup=()=>{if(!drag)return;const q=pctSnap(drag.p,N);drag=null;el.classList.remove("drag");commit(el,q)};
    el.onpointercancel=()=>{drag=null;el.classList.remove("drag");show(el,el.dataset.p===""?null:+el.dataset.p)};
    el.ondblclick=()=>commit(el,null);
    el.onkeydown=e=>{const cur=el.dataset.p===""?null:+el.dataset.p, t=pctBounds(N);let q;
      const step=e.shiftKey?10:1;
      if(e.key==="ArrowRight"||e.key==="ArrowUp")q=cur==null?0:pctSnap(Math.min(100,cur===0?t[1]:cur+step),N);
      else if(e.key==="ArrowLeft"||e.key==="ArrowDown")q=cur==null?0:pctSnap(Math.max(0,cur===100?t[N-1]-step:cur-step),N);
      else if(e.key==="Home")q=0;else if(e.key==="End")q=100;
      else if(e.key==="Delete"||e.key==="Backspace")q=null;
      else return;
      e.preventDefault();commit(el,q)};
  });
}
function setPct(eid,key,p){
  const r=resOf(F,eid);if(!r.p)r.p={};
  if(r.c)delete r.c[key];
  if(p==null){delete r.n[key];delete r.p[key]}else{r.n[key]=pctLvl(p,(F.niveaux||[]).length);r.p[key]=p}
  // un niveau saisi = travail rendu
  if(p!=null&&!r.rendu){const was=r.nr||r.disp;delete r.nr;delete r.disp;r.rendu=new Date().toISOString().slice(0,10);
    if(was){save();paintEleves();paintSteps();return}
    document.querySelectorAll(`[data-est="${CSS.escape(eid)}"],#eEst`).forEach(sl=>{sl.value="rendu";sl.classList.remove("vide","on")})}
  save();paintEprog();paintSteps();
}
/* Rendu de chaque élève (module Élèves) : vide au départ, « Rendu » dès qu'un niveau est saisi,
   « Non rendu » ou « Dispensé » vident ce qui avait été saisi pour lui. */
const hasSaisie=r=>Object.values((r||{}).n||{}).some(v=>v!=null&&v!=="");
function estOf(r){r=r||{};return r.nr?"nr":r.disp?"disp":(r.rendu||hasSaisie(r))?"rendu":""}
function estSelect(r,attr,lbl){const st=estOf(r);
  return `<select class="est${st==="nr"||st==="disp"?" on":st===""?" vide":""}" ${attr} aria-label="${esc(lbl)}"><option value="" ${st===""?"selected":""}>—</option><option value="rendu" ${st==="rendu"?"selected":""}>Rendu</option><option value="nr" ${st==="nr"?"selected":""}>Non rendu</option><option value="disp" ${st==="disp"?"selected":""}>Dispensé</option></select>`}
function rendusManquants(f){if(!MOD.eleves)return 0;return studentsOf(f).filter(e=>!estOf((f.res||{})[e.id])).length}
function setEst(eid,v){const r=resOf(F,eid), had=hasSaisie(r)||Object.values(r.obs||{}).some(Boolean)||!!r.appr, t=new Date().toISOString().slice(0,10);
  delete r.nr;delete r.disp;delete r.rendu;
  if(v==="rendu")r.rendu=t;
  if(v==="nr"||v==="disp"){r[v]=t;r.n={};r.c={};r.p={};r.obs={};r.appr="";if(had)toast("Niveaux, observations et appréciation de l'élève effacés.")}
  if(v===""&&hasSaisie(r)){r.rendu=t;toast("Des niveaux sont saisis pour cet élève : il reste « Rendu ».")}
  save();paintEleves();paintSteps()}
function paintEleves(){
  const host=document.getElementById("elevesPane");if(!host)return;
  const els=studentsOf(F), L=lignes();
  const mode=ui.emode||(DEVICE.phone?"fiche":"grille");
  document.querySelectorAll("#eMode [data-emode]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.emode===mode)));
  paintEprog();
  if(!els.length){
    host.innerHTML=`<div class="empty">Aucun élève. Choisis une promotion à l'étape 1, ou saisis une liste de noms,
      puis reviens ici pour évaluer chacun.</div>`;return;
  }
  if(!L.length){host.innerHTML=`<div class="empty">Aucune ligne à évaluer : reviens à l'étape 2 pour choisir des compétences.</div>`;return}
  const niv=F.niveaux||[];
  if(mode==="grille"){
    const css=`grid-template-columns:minmax(150px,1.4fr) 112px repeat(${L.length},minmax(140px,1fr)) 64px 86px`;
    const estSel=(e,r)=>estSelect(r,`data-est="${esc(e.id)}"`,"Rendu de "+e.nom);
    host.innerHTML=`<div class="tw"><div class="egrid">
      <div class="eh" style="${css}">
        <span>Élève</span><span title="Rendu, non rendu ou dispensé — à renseigner pour chaque élève avant de terminer l'évaluation. Un niveau saisi le passe en « Rendu »">Rendu</span>
        ${L.map(l=>{const t=ligTitre(l);
          return `<span title="${esc(t.lib)}"><b>${esc(t.code)}</b></span>`}).join("")}
        <span style="text-align:center" title="Résultat rendu à l'élève">Restitué</span>
        <span style="text-align:right">Fait</span>
      </div>
      ${els.map(e=>{const d=eleveDone(e.id), r=resOf(F,e.id);
        return `<div class="er${r.nr||r.disp?" abs":d.n>=d.tot?" ok":d.n?" part":""}" style="${css}" data-row="${esc(e.id)}">
          <span class="nm"><button type="button" class="lnk" data-eopen="${esc(e.id)}">${esc(e.nom)}</button></span>
          <span>${estSel(e,r)}</span>
          ${L.map(l=>{const k=ligKey(l), v=r.n[k];
            return `<span>${ntkHtml(e.id,k,pctOf(r,k),niv,false)}</span>`}).join("")}
          <span style="text-align:center"><input type="checkbox" class="cbox" data-rest="${esc(e.id)}" ${r.rest?"checked":""} title="${r.rest?"Restitué le "+esc(r.rest):"Pas encore restitué"}" aria-label="Restitué à ${esc(e.nom)}"></span>
          <span class="n">${d.n}/${d.tot}</span></div>`}).join("")}
    </div></div>
    <div class="hint" style="padding:10px 14px 2px">Une ligne par élève, une colonne par compétence évaluée. Un clic sur un nom ouvre sa fiche.</div>`;
    wireNtk(host,eid=>{
      const row=host.querySelector(`[data-row="${CSS.escape(eid)}"]`), d=eleveDone(eid);
      if(row){row.classList.toggle("ok",d.n>=d.tot);row.classList.toggle("part",d.n>0&&d.n<d.tot);
        const c=row.querySelector(":scope>.n");if(c)c.textContent=d.n+"/"+d.tot}
    });
    host.querySelectorAll("[data-rest]").forEach(cb=>cb.onchange=()=>{const r=resOf(F,cb.dataset.rest);
      if(cb.checked)r.rest=new Date().toISOString().slice(0,10);else delete r.rest;save();paintEprog();
      cb.title=r.rest?"Restitué le "+r.rest:"Pas encore restitué"});
    host.querySelectorAll("[data-eopen]").forEach(b=>b.onclick=()=>{
      ui.eleve=b.dataset.eopen;ui.emode="fiche";paintEleves()});
    host.querySelectorAll("[data-est]").forEach(sl=>sl.onchange=()=>setEst(sl.dataset.est,sl.value));
    return;
  }
  const el=curEleve(); ui.eleve=el.id;
  const idx=els.findIndex(x=>x.id===el.id), r=resOf(F,el.id), d=eleveDone(el.id);
  host.innerHTML=`<div class="efiche">
    <div class="ehead">
      <button class="btn ghost" id="ePrev" ${idx<=0?"disabled":""}>←</button>
      <select id="eSel" aria-label="Élève">${els.map(x=>{const dd=eleveDone(x.id);
        return `<option value="${esc(x.id)}" ${x.id===el.id?"selected":""}>${esc(x.nom)} — ${dd.n}/${dd.tot}</option>`}).join("")}</select>
      <button class="btn ghost" id="eNext" ${idx>=els.length-1?"disabled":""}>→</button>
      <span class="hint mono">${idx+1} / ${els.length}</span>
      <span style="margin-left:auto">${estSelect(r,'id="eEst"',"Rendu")}</span>
      <label class="rstl"><input type="checkbox" class="cbox" id="eRest" ${r.rest?"checked":""}> Restitué${r.rest?` <span class="hint mono">${esc(r.rest)}</span>`:""}</label>
      <span class="count">${d.n}/${d.tot}</span>
    </div>
    ${L.map(l=>{const k=ligKey(l), t=ligTitre(l), v=r.n[k];
      return `<div class="eline">
        <div class="t"><span class="code">${esc(t.code)}</span> <span>${esc(t.lib)}</span></div>
        <div class="nbrow">${ntkHtml(el.id,k,pctOf(r,k),niv,true)}
          <button type="button" class="btn ghost nclr" data-nclr="${esc(k)}" title="Effacer">—</button></div>
        <input type="text" class="eobs" data-obsfor="${esc(k)}" value="${esc(r.obs[k]||"")}" placeholder="Observation (facultatif)">
      </div>`}).join("")}
    <div class="eline">
      <div class="t"><span>Appréciation générale</span></div>
      <textarea id="eAppr" rows="3" placeholder="Quelques lignes pour ${esc(el.nom)}…">${esc(r.appr||"")}</textarea>
    </div>`;
  const go=id=>{ui.eleve=id;paintEleves();host.scrollIntoView({block:"start",behavior:"smooth"})};
  host.querySelector("#eSel").onchange=e=>go(e.target.value);
  host.querySelector("#ePrev").onclick=()=>{if(idx>0)go(els[idx-1].id)};
  host.querySelector("#eNext").onclick=()=>{if(idx<els.length-1)go(els[idx+1].id)};
  const upd=()=>{const c=host.querySelector(".ehead .count"), dd=eleveDone(el.id);if(c)c.textContent=dd.n+"/"+dd.tot};
  wireNtk(host,upd);
  host.querySelectorAll("[data-nclr]").forEach(b=>b.onclick=()=>{setPct(el.id,b.dataset.nclr,null);paintEleves()});
  host.querySelectorAll("[data-obsfor]").forEach(i=>i.oninput=()=>{
    resOf(F,el.id).obs[i.dataset.obsfor]=i.value;save()});
  {const es=host.querySelector("#eEst");if(es)es.onchange=()=>setEst(el.id,es.value)}
  const rs=host.querySelector("#eRest");
  if(rs)rs.onchange=()=>{const rr=resOf(F,el.id);if(rs.checked)rr.rest=new Date().toISOString().slice(0,10);else delete rr.rest;save();paintEleves()};
  const ap=host.querySelector("#eAppr");
  if(ap)ap.oninput=()=>{resOf(F,el.id).appr=ap.value;save()};
}
function linkSelection(){
  if(ui.sel.length<2)return;
  const opKeys=ui.sel.filter(k=>k.startsWith("op:")).map(k=>k.slice(3));
  const codes=ui.sel.filter(k=>k.startsWith("one:")).map(k=>k.slice(4));
  let op;
  if(opKeys.length){op=F.ops.find(o=>o.id===opKeys[0]);
    opKeys.slice(1).forEach(id=>{F.items.forEach(i=>{if(i.op===id)i.op=op.id});F.ops=F.ops.filter(o=>o.id!==id)});
  } else {op={id:uid(),libelle:"",critere:"",livrables:[]};F.ops.push(op)}
  codes.forEach(c=>{const it=F.items.find(i=>i.code===c);if(it){it.op=op.id;
    it.livrables.forEach(l=>{if(!op.livrables.includes(l))op.livrables.push(l)});
    if(!op.libelle&&it.libelle)op.libelle=it.libelle}});
  ui.sel=[];save();paintLignes();paintSteps();
  const el=document.querySelector(`[data-lib="op:${op.id}"]`);if(el){el.focus();el.scrollIntoView({block:"center"})}
}
/* progression des promotions de l'évaluation en cours, pour chaque compétence du semestre
   (les autres évaluations enregistrées de ces promotions, hors celle-ci) */
function pickProgress(){
  const sem=F.semestre;
  const prs=(F.classes||[]).map(n=>promos.find(p=>p.nom===n)).filter(Boolean);
  if(!prs.length)return null;
  const els=prs.flatMap(pr=>migPromo(pr).liste);
  const fs=fiches.filter(f=>f.id!==F.id&&prs.some(pr=>(f.classes||[]).includes(pr.nom)||f.promoId===pr.id));
  const out={};
  compsFor(sem).forEach(c=>{
    const cover=fs.filter(f=>(f.items||[]).some(it=>it.code===c.code));
    const inSem=cover.filter(f=>f.semestre===sem);
    const seen=new Set();
    inSem.forEach(f=>(f.items||[]).filter(it=>it.code===c.code).forEach(it=>{
      const key=it.op?"op:"+it.op:"one:"+it.code;
      Object.entries(f.res||{}).forEach(([eid,r])=>{const v=(r.n||{})[key];if(v!=null&&v!=="")seen.add(eid)})}));
    const done=els.filter(e=>seen.has(e.id)).length;
    out[c.code]={inSem,cover,done,tot:els.length,
      state:inSem.length?(!inSem.some(evalueeF)?"prevue":(MOD.eleves&&els.length&&done<els.length?"part":"ok")):(cover.length?"autre":"todo")};
  });
  return out;
}
function paintPick(){
  const sem=F.semestre, dispo=compsFor(sem);
  const _lim=ecsAffectes(), codes=F.ecCodes.length?F.ecCodes:(_lim?[..._lim]:[]), cadre=codes.length&&!ui.allComps;
  const all=cadre
    ? dispo.filter(c=>ecsOf(c,sem).some(e=>codes.includes(e.ec))||F.items.some(i=>i.code===c.code))
    : dispo;
  const sc=document.getElementById("pickScope");
  if(sc){
    const nues=uesSelected().length;
    sc.innerHTML = codes.length
      ? (cadre
        ? `${all.length} compétence${all.length>1?"s":""} portée${all.length>1?"s":""} par ${codes.length>1?"les "+codes.length+" enseignements":"l'enseignement"} choisi${codes.length>1?"s":""} à l'étape 1${nues?" ("+nues+(nues>1?" unités d'enseignement)":" unité d'enseignement)"):""} · <button type="button" class="lnk" id="pickAll">voir les ${dispo.length} du semestre</button>`
        : `Les ${dispo.length} compétences du semestre · <button type="button" class="lnk" id="pickAll">revenir aux ${dispo.filter(c=>ecsOf(c,sem).some(e=>codes.includes(e.ec))||F.items.some(i=>i.code===c.code)).length} de la sélection</button>`)
      : `Les ${dispo.length} compétences du ${esc(sem)} — choisis des unités ou des enseignements à l'étape 1 pour n'en voir que la part concernée.`;
    const ba=document.getElementById("pickAll");
    if(ba)ba.onclick=()=>{ui.allComps=!ui.allComps;paintPick()};
  }
  const q=norm(ui.q.trim());
  const PG=pickProgress(), pf=PG?(ui.pf||"tout"):"tout";
  const keep=all.filter(c=>!q||norm(c.code+" "+c.libelle+" "+blocName(c.bloc)).includes(q))
    .filter(c=>pf==="tout"||!PG[c.code]||(pf==="todo"?!PG[c.code].inSem.length:PG[c.code].inSem.length));
  const pgTxt=g=>g.state==="todo"?"À évaluer":g.state==="prevue"?"Prévue · "+ST_LBL[statutOf(g.inSem[0])].toLowerCase():g.state==="autre"?"Vue au "+[...new Set(g.cover.map(f=>f.semestre))].join(", ")
    :g.state==="part"?"En cours · "+g.done+"/"+g.tot:"Évaluée";
  const pgDet=g=>g.inSem.length?g.inSem.map(f=>esc(f.titre||"Sans titre")+(f.date?" ("+esc(f.date)+")":"")).join(" · "):"";
  const byBloc=new Map();
  keep.forEach(c=>{if(!byBloc.has(c.bloc))byBloc.set(c.bloc,[]);byBloc.get(c.bloc).push(c)});
  const host=document.getElementById("pick");
  const nTodo=PG?all.filter(c=>PG[c.code]&&!PG[c.code].inSem.length).length:0;
  const bar=PG?`<div class="pkbar"><span class="hint">Progression de ${esc(classesDisp(F))} au ${esc(sem)} : <b>${all.length-nTodo}</b> / ${all.length} déjà évaluées ailleurs, <b>${nTodo}</b> à évaluer.</span>
    <span class="dkinds" style="margin:0">${[["tout","Toutes"],["todo","À évaluer"],["fait","Déjà évaluées"]].map(([k,l])=>`<button type="button" data-pkf="${k}" aria-pressed="${k===pf}">${l}</button>`).join("")}</span></div>`:"";
  if(!keep.length){host.innerHTML=bar+`<div class="empty">Aucune compétence ne correspond à ce filtre.</div>`;}
  else host.innerHTML=bar+[...byBloc.entries()].sort((a,b)=>(+a[0])-(+b[0])).map(([n,cs])=>`
    <div class="bloc"><div class="bh ${(+n)%2?"tint":""}" style="--bloc:${BLOC_TINT}"><span class="n">BLOC ${esc(n)}</span><span class="t">${esc(blocName(n))}</span></div>
    ${cs.map(c=>{
      const it=F.items.find(i=>i.code===c.code), on=!!it;
      return `<div class="cp ${on?"on":""}">
        <input class="cbox" type="checkbox" data-code="${c.code}" ${on?"checked":""} aria-label="Évaluer ${c.code}">
        <div><div><span class="code">${esc(c.code)}</span> <span class="lib">${esc(c.libelle)}</span></div>
        ${PG&&PG[c.code]?`<div class="pkline"><span class="pill pst ${PG[c.code].state}">${esc(pgTxt(PG[c.code]))}</span>${pgDet(PG[c.code])?` <span class="hint">${pgDet(PG[c.code])}</span>`:""}</div>`:""}
        ${on&&it.op?`<div class="optag">OP ${opIndex(it.op)}${(F.ops.find(o=>o.id===it.op)||{}).libelle?" · "+esc((F.ops.find(o=>o.id===it.op)||{}).libelle):""}</div>`:""}
        </div></div>`}).join("")}</div>`).join("");
  host.querySelectorAll("[data-pkf]").forEach(b=>b.onclick=()=>{ui.pf=b.dataset.pkf;paintPick()});
  host.querySelectorAll(".cbox").forEach(cb=>cb.onchange=()=>{
    const code=cb.dataset.code, c=REF.competences.find(x=>x.code===code);
    if(cb.checked)F.items.push({code,ecs:itemEcs(c,sem),critere:"",coef:1,op:"",libelle:"",livrables:[]});
    else F.items=F.items.filter(i=>i.code!==code);
    save();paintPick();paintSteps()});

  document.getElementById("cCount").textContent=F.items.length+" / "+all.length;
  paintSteps();
}
/* restitution : par promotion (module de base) et, avec le module Élèves, par élève */
/* Suivi d'une évaluation : saisie dans DNMAX → distribuée aux élèves (avec date de rendu) →
   évaluée (fiche remplie à la main hors DNMAX, ou saisie dans DNMAX) → restituée (par promotion,
   et par élève avec le module Élèves). f.suivi = {saisie, distrib, butoir, evalue, mode:"main"|"dnmax"} */
const ST_RANK={annulee:-1,prep:0,distrib:1,rendu:1,evalcours:2,eval:3,restpart:4,restit:5};
const ST_LBL={prep:"Préparée",distrib:"Distribuée",rendu:"Rendus à évaluer",evalcours:"Évaluation en cours",eval:"Évaluée",restpart:"Restituée en partie",restit:"Restituée",annulee:"Annulée"};
function suiviOf(f){f.suivi=f.suivi||{};if(!f.suivi.saisie)f.suivi.saisie=f.date||new Date().toISOString().slice(0,10);return f.suivi}
function saisieDnmax(f){
  const els=studentsOf(f);
  let any=0,full=0;const n=(f.items||[]).length?[...new Set((f.items||[]).map(it=>it.op?"op:"+it.op:"one:"+it.code))]:[];
  els.forEach(e=>{const r=(f.res||{})[e.id]||{};if(r.nr||r.disp){any++;full++;return}   // non rendu ou dispensé : rien à saisir pour cet élève
    const k=n.filter(x=>((r.n||{})[x]!=null&&(r.n||{})[x]!==""));if(k.length)any++;if(n.length&&k.length>=n.length)full++});
  return {any,full,tot:els.length};
}
/* Le statut n'est jamais saisi : il découle de ce qui a été fait sur l'évaluation.
   - Restituée (en partie) : restitution marquée pour la ou les promotions, ou, avec le module Élèves, pour chaque élève ;
   - Évaluée : tous les élèves saisis dans DNMAX, ou évaluation marquée terminée (évaluation à la main) ;
   - Évaluation en cours : au moins un élève saisi dans DNMAX, ou grille d'évaluation exportée (sans module Élèves) ;
   - Distribuée / Rendus à évaluer : les dates prévues de distribution / de rendu sont passées ;
   - Préparée : sinon. */
const isoToday=()=>new Date().toISOString().slice(0,10);
function promosNomsOf(f){return (f.classes&&f.classes.length?f.classes:[f.classe]).filter(Boolean)}
function restEleves(f){if(!MOD.eleves)return {n:0,tot:0};const ids=studentsOf(f).map(e=>e.id);
  return {n:ids.filter(id=>((f.res||{})[id]||{}).rest).length,tot:ids.length}}
function statutOf(f){
  if(f.annulee)return "annulee";
  const s=suiviOf(f), ps=promosNomsOf(f), R=f.restit||{}, t=isoToday();
  const nr=ps.filter(n=>R[n]).length, re=restEleves(f);
  if(s.restitue||(ps.length&&nr===ps.length)||(re.tot&&re.n>=re.tot))return "restit";
  if(nr||re.n)return "restpart";
  const d=MOD.eleves?saisieDnmax(f):{any:0,full:0,tot:0};
  if(s.evalue||(d.tot&&d.full>=d.tot))return "eval";
  if(s.evalDebut||d.any||(!MOD.eleves&&s.exporte))return "evalcours";
  const dist=f.distribPrev, rend=f.renduPrev||s.butoir;
  if(s.rendu||(rend&&rend<=t))return "rendu";
  if(s.distrib||(dist&&dist<=t))return "distrib";
  return "prep";
}
function evalueeF(f){return ST_RANK[statutOf(f)]>=ST_RANK.eval}
const fmtD=d=>d?d.split("-").reverse().slice(0,2).join("/"):"";
/* Éditeur du suivi : chaque étape a sa ou ses dates, modifiables ; « Passer à l'étape suivante » date l'étape d'aujourd'hui. */
const ST_NEXT={prep:["distrib","Distribuée"],distrib:["rendu","Rendue"],rendu:["evalDebut","Évaluation en cours"],evalcours:["evalue","Évaluée"],eval:["restitue","Restituée"],restpart:["restitue","Restituée"]};
/* Petite fenêtre d'une seule étape, ouverte en cliquant sur son point dans la frise */
function stepEditor(f,i,k){
  const s=suiviOf(f), st=statutOf(f), d=MOD.eleves?saisieDnmax(f):null, [idx]=ST_POS[st]||[0];
  const di=(attr,key,val,lbl)=>`<label class="sted"><span>${lbl}</span><input type="date" ${attr}="${key}" value="${esc(val||"")}"></label>`;
  const fr=v=>v?v.split("-").reverse().join("/"):"—";
  const btn=(key,lbl)=>`<button type="button" class="btn primary" data-stset="${key}">${lbl}</button>`;
  let body="", act="";
  if(k===0)body=`<p class="stro">Saisie le <b>${fr(s.saisie)}</b><br><span class="hint">Date enregistrée automatiquement à la création.</span></p>`;
  if(k===1){body=di("data-svp","distribPrev",f.distribPrev,"Prévue le")+di("data-sv","distrib",s.distrib,"Faite le");if(!s.distrib)act=btn("distrib","Distribuée aujourd'hui")}
  if(k===2){body=di("data-svp","renduPrev",f.renduPrev||s.butoir,"Prévu le")+di("data-sv","rendu",s.rendu,"Rendu le");if(!s.rendu)act=btn("rendu","Rendue aujourd'hui")}
  const manq=rendusManquants(f);
  if(k===3){body=di("data-sv","evalDebut",s.evalDebut,"Commencée le")+(manq&&!s.evalue?`<label class="sted"><span>Terminée le</span><input type="date" disabled></label><span class="hint" style="flex-basis:100%;color:var(--signal)">${manq} élève${manq>1?"s":""} sans « Rendu », « Non rendu » ou « Dispensé » : à renseigner dans l'évaluation avant de la terminer.</span>`:di("data-sv","evalue",s.evalue,"Terminée le"))
      +(d&&d.any?`<span class="hint" style="flex-basis:100%">Saisie dans DNMAX : ${d.full}/${d.tot} élèves</span>`:(!MOD.eleves&&s.exporte?`<span class="hint" style="flex-basis:100%">Grille exportée le ${fr(s.exporte)}</span>`:""));
    if(!s.evalue&&!manq)act=btn("evalue","Terminée aujourd'hui")}
  if(k===4){body=di("data-sv","restitue",s.restitue,"Restituée le");if(!s.restitue)act=btn("restitue","Restituée aujourd'hui")}
  return `<div class="sth"><b>${esc(ST_STEPS[k])}</b><span class="hint">${k<idx||(k===idx&&!(ST_POS[st]||[])[1])?"étape franchie":k===idx?"étape commencée":"à venir"}</span></div>
    <div class="stbody">${body}</div>${act?`<div class="stact">${act}</div>`:""}`;
}
/* Suivi affiché comme une frise de 5 étapes : les étapes franchies sont pleines, l'étape en cours
   à moitié pleine si elle est commencée ; dessous, le statut et la prochaine chose à faire. */
const ST_STEPS=["Préparée","Distribuée","Rendue","Évaluée","Restituée"];
const ST_POS={prep:[0,0],distrib:[1,0],rendu:[2,0],evalcours:[3,1],eval:[3,0],restpart:[4,1],restit:[4,0],annulee:[-1,0]};
function suiviCell(f,i){
  const st=statutOf(f), s=suiviOf(f), t=isoToday();
  const dist=f.distribPrev||s.distrib, rend=f.renduPrev||s.butoir||s.rendu, re=restEleves(f);
  const [idx,half]=ST_POS[st]||[0,0];
  const lastRest=[s.restitue,...Object.values(f.restit||{}),...(MOD.eleves?studentsOf(f).map(e=>((f.res||{})[e.id]||{}).rest):[])].filter(Boolean).sort().slice(-1)[0];
  const next=st==="annulee"?"annulée le "+fmtD(f.annulee)
    :st==="prep"?(dist?"→ distribution prévue le "+fmtD(dist):"→ à distribuer (date non fixée)")
    :st==="distrib"?(rend?"→ rendu attendu le "+fmtD(rend):"→ rendu attendu (date non fixée)")
    :st==="rendu"?(MOD.eleves?"→ saisir les évaluations":"→ exporter la grille et évaluer")
    :st==="evalcours"?(MOD.eleves?(()=>{const d=saisieDnmax(f), n=d.tot-d.full;return "→ "+n+" élève"+(n>1?"s":"")+" à saisir ("+d.full+"/"+d.tot+")"})():"→ marquer terminée une fois évaluée")
    :st==="eval"?"→ à restituer aux élèves"
    :st==="restpart"?(re.tot&&re.n?(()=>{const n=re.tot-re.n;return "→ à restituer à "+n+" élève"+(n>1?"s":"")})():"→ promotion restante à restituer")
    :"✓ terminée"+(lastRest?" le "+fmtD(lastRest):"");
  const dots=ST_STEPS.map((l,k)=>{
    const c=idx<0?"":k<idx?"done":k===idx?(half?"half cur":"done cur"):"";
    return `<span class="stc${idx>=k&&k?" on":""}${c?" "+c:""}">`+(idx<0?`<span class="sd"></span>`:`<button type="button" class="sd ${c}" data-sts="${i}:${k}" title="${esc(l)} — modifier les dates" aria-label="${esc(l)} : modifier les dates"></button>`)+`<small>${esc(l)}</small></span>`}).join("");
  const tip=["Saisie le "+fmtD(s.saisie),dist?"distribution prévue le "+fmtD(dist):"distribution non datée",rend?"rendu prévu le "+fmtD(rend):"rendu non daté",
    s.evalue?"terminée le "+fmtD(s.evalue):"",lastRest?"restituée le "+fmtD(lastRest):""].filter(Boolean).join(" · ");
  return `<div class="stw st-${st}" title="${esc(tip)}"><span class="stp">${dots}</span><div class="xpop stpop" hidden data-stp="${i}"></div>
    <div class="stl">${esc(ST_LBL[st])}</div><div class="stn">${esc(next)}</div></div>`;
}
function suiviEditor(f,i){
  const s=suiviOf(f), ps=(f.classes&&f.classes.length?f.classes:[f.classe]).filter(Boolean), d=saisieDnmax(f);
  const row=(lbl,body)=>`<div class="str"><b>${lbl}</b><div>${body}</div></div>`;
  return row("1. Saisie",`<input type="date" data-sv="saisie" value="${esc(s.saisie||"")}">`)
    +row("2. Distribuée",`<input type="date" data-sv="distrib" value="${esc(s.distrib||"")}"> <span class="hint">à rendre le</span> <input type="date" data-sv="butoir" value="${esc(s.butoir||"")}">${(f.distribPrev||f.renduPrev)?`<div class="hint">Prévu : ${f.distribPrev?"distribution le "+esc(fmtD(f.distribPrev)):""}${f.distribPrev&&f.renduPrev?" · ":""}${f.renduPrev?"rendu le "+esc(fmtD(f.renduPrev)):""}</div>`:""}`)
    +row("3. Évaluée",`<input type="date" data-sv="evalue" value="${esc(s.evalue||"")}">
        <label class="rstl"><input type="radio" name="md${i}" data-svm="main" ${s.mode==="main"?"checked":""}> à la main, hors DNMAX</label>
        <label class="rstl"><input type="radio" name="md${i}" data-svm="dnmax" ${s.mode!=="main"?"checked":""}> dans DNMAX</label>
        ${MOD.eleves&&d.tot?`<span class="hint">${d.full}/${d.tot} élèves saisis dans DNMAX</span>`:""}`)
    +row("4. Restituée",ps.map(n=>`<label class="rstl">${esc(promoDisp(n))} <input type="date" data-svr="${esc(n)}" value="${esc((f.restit||{})[n]||"")}"></label>`).join(""))
    +`<div class="hint" style="padding:6px 2px 2px">Une date vide = étape pas encore faite. Le statut affiché est l'étape la plus avancée.</div>`;
}
function restitCell(f,i){
  const ps=(f.classes&&f.classes.length?f.classes:[f.classe||"Promotion"]).filter(Boolean);
  f.restit=f.restit||{};
  const chips=ps.map(n=>{const d=f.restit[n];
    return `<button type="button" class="rst${d?" on":""}" data-rst="${i}" data-rp="${esc(n)}" title="${d?"Restituée le "+esc(d)+" — cliquer pour annuler":"Formulée, pas encore rendue — cliquer pour marquer comme restituée"}">${d?"✓ ":""}${esc(ps.length>1?promoDisp(n):(d?"Restituée":"À restituer"))}</button>`}).join("");
  let el="";
  if(MOD.eleves){const ids=studentsOf(f).map(e=>e.id);const n=ids.filter(id=>((f.res||{})[id]||{}).rest).length;
    if(n)el=`<div class="hint mono">${n}/${ids.length} élève${ids.length>1?"s":""}</div>`}
  return `<div class="rstw">${chips}</div>${el}`;
}
/* actions de suivi proposées dans le menu Évaluer / Exporter de la liste */
function actsMenu(f,i){
  const s=suiviOf(f), ps=promosNomsOf(f), R=f.restit||{}, d=MOD.eleves?saisieDnmax(f):null;
  if(f.annulee){const n=nbIndiv(f), k="r:"+f.id;
    return `<button type="button" data-act="retab" data-xi="${i}">Rétablir l'évaluation</button>`
      +(n?`<button type="button" class="danger" data-act="delres" data-xi="${i}">${ui.delArm===k?"Confirmer : supprimer définitivement":"Supprimer les évaluations individuelles"} <span class="hint">${n}</span></button>`
         :`<span class="xh" style="text-transform:none;letter-spacing:0">Aucune évaluation individuelle : l'évaluation peut être supprimée.</span>`)}
  let h=`<span class="xsep"></span>`;
  if(!MOD.eleves)h+=`<button type="button" data-act="fin" data-xi="${i}">${s.evalue?"Rouvrir l'évaluation":"Marquer l'évaluation terminée"}</button>`;
  else if(s.evalue)h+=`<button type="button" data-act="fin" data-xi="${i}">Rouvrir l'évaluation</button>`;
  else if(d&&d.any&&d.full<d.tot){const m=rendusManquants(f);h+=m?`<button type="button" disabled title="${m} élève${m>1?"s":""} sans statut de rendu : à renseigner dans l'évaluation" style="opacity:.5;cursor:not-allowed">Terminer l'évaluation <span class="hint">${m} sans rendu</span></button>`:`<button type="button" data-act="fin" data-xi="${i}">Terminer l'évaluation <span class="hint">${d.full}/${d.tot}</span></button>`}
  if(ps.length)h+=ps.map(n=>`<button type="button" data-act="rest" data-rp="${esc(n)}" data-xi="${i}">${R[n]?"Annuler la restitution":"Marquer restituée"}${ps.length>1?` <span class="hint">${esc(promoDisp(n))}</span>`:""}</button>`).join("");
  h+=`<span class="xsep"></span><button type="button" class="danger" data-act="annul" data-xi="${i}">Annuler l'évaluation</button>`;
  return h;
}
/* nombre d'élèves ayant une évaluation individuelle enregistrée (niveaux, observations, appréciation ou restitution) */
function nbIndiv(f){return Object.values(f.res||{}).filter(r=>r&&(Object.values(r.n||{}).some(v=>v!=null&&v!=="")||Object.values(r.obs||{}).some(Boolean)||r.appr||r.rest)).length}
function armList(key){ui.delArm=key;paintSaved();setTimeout(()=>{if(ui.delArm===key){ui.delArm=null;paintSaved()}},6000)}
/* Fenêtre des actions d'une évaluation. Elle remplace un petit menu déroulant que l'on remarquait mal :
   les exports y deviennent de vrais boutons. Les gestionnaires restent ceux de paintSaved (bind). */
let XA=null, XA_RETOUR=null;
function actionsHtml(f,i){
  const sec=(titre,corps)=>`<section class="xasec"><h3>${titre}</h3>${corps}</section>`;
  if(f.annulee)return sec("Autres actions",`<div class="xalist">${actsMenu(f,i)}</div>`);
  return (MOD.eleves?sec("Évaluer",`<button type="button" class="btn primary xabig" data-sai="${i}">Évaluer les élèves</button>`):"")
    +sec("Exporter",exportItems(i))
    +sec("Autres actions",`<div class="xalist"><button type="button" data-dup="${i}">Dupliquer</button>${actsMenu(f,i)}</div>`);
}
/* rendreFocus : faux quand l'action quitte la liste (saisie, duplication). Sinon le focus revient au bouton
   de la ligne, et encore après le prochain dessin de la liste (XA_RETOUR), qui remplace ce bouton. */
function fermerActions(rendreFocus=true){
  if(!XA)return;const {el,i,prev,key}=XA;XA=null;
  document.removeEventListener("keydown",key);el.remove();
  if(!rendreFocus)return;
  XA_RETOUR=i;
  const b=document.querySelector(`#savedList [data-xm="${i}"]`)||prev;if(b&&b.isConnected&&b.focus)b.focus();
}
function ouvrirActions(i,bind){
  const f=fiches[i];if(!f)return;
  const prev=XA?XA.prev:document.activeElement;fermerActions(false);XA_RETOUR=null;
  const el=document.createElement("div");el.className="modal xamodal";
  const sous=[classesDisp(f)||f.classe,f.semestre].filter(Boolean).join(" · ")+(f.annulee?" · annulée":"");
  el.innerHTML=`<div class="card xabox" role="dialog" aria-modal="true" aria-labelledby="xaT">
    <button type="button" class="xaclose" aria-label="Fermer" title="Fermer">×</button>
    <h2 id="xaT">${esc(f.titre||"Sans titre")}</h2>${sous?`<p class="hint">${esc(sous)}</p>`:""}
    <div class="xabody"></div></div>`;
  const card=el.querySelector(".xabox"), body=el.querySelector(".xabody");
  const focusables=()=>[...card.querySelectorAll("button:not([disabled])")];
  const remplir=bd=>{body.innerHTML=actionsHtml(fiches[i],i);bd(body);
    if(el.isConnected&&!card.contains(document.activeElement))(body.querySelector("button:not([disabled])")||card.querySelector(".xaclose")).focus()};
  /* le clic doit commencer et finir sur le fond : une sélection relâchée hors de la boîte ne la ferme pas */
  let surFond=false;
  el.onmousedown=e=>{surFond=e.target===el};
  el.onclick=e=>{e.stopPropagation();if(surFond&&e.target===el)fermerActions()};
  el.querySelector(".xaclose").onclick=()=>fermerActions();
  const key=e=>{if(e.key==="Escape"){e.preventDefault();fermerActions();return}
    if(e.key!=="Tab")return;const L=focusables();if(!L.length)return;
    const a=L[0], z=L[L.length-1];
    if(e.shiftKey&&(document.activeElement===a||!card.contains(document.activeElement))){e.preventDefault();z.focus()}
    else if(!e.shiftKey&&(document.activeElement===z||!card.contains(document.activeElement))){e.preventDefault();a.focus()}};
  XA={el,i,prev,key,id:f.id,refresh:bd=>{if(fiches[i]&&fiches[i].id===XA.id)remplir(bd);else fermerActions(false)}};
  remplir(bind);
  document.addEventListener("keydown",key);document.body.appendChild(el);
  const premier=body.querySelector("button:not([disabled])")||el.querySelector(".xaclose");premier.focus();
}
/* filtres de la liste des évaluations : par défaut, promotions en cours et évaluations dont je suis l'enseignant·e */
/* Visibilité : un enseignant ne voit que les promotions de sa répartition de service (et leurs élèves).
   Si « C'est moi » n'est pas défini, ou s'il n'a encore aucune affectation, tout reste visible. */
function mesPromoIds(){const me=DATA.moi;if(!me)return null;
  const ids=promos.filter(pr=>teachesPromo(pr.id,me)).map(p=>p.id);
  return ids.length?new Set(ids):null}
function promoVisible(pr){const v=mesPromoIds();return !v||v.has(pr.id)}
function sfDefault(){return {per:["cur"],mine:true,sem:[],st:[],q:""}}
function sfState(){const s=ui.sf=ui.sf||sfDefault();["per","sem","st"].forEach(k=>{if(!Array.isArray(s[k]))s[k]=s[k]&&s[k]!=="all"?[s[k]]:[]});return s}
function profsOf(f){return Array.isArray(f.profs)&&f.profs.length?f.profs:String(f.prof||"").split(/,\s*/).filter(Boolean)}
function moiNom(){return (DATA.enseignants.find(t=>t.id===DATA.moi)||{}).nom||""}
function promosOfF(f){
  const l=Array.isArray(f.classes)&&f.classes.length?f.classes:String(f.classe||"").split(/,\s*/).filter(Boolean);
  const ps=l.map(n=>promos.find(x=>x.nom===n)).filter(Boolean);
  if(f.promoId){const p=promos.find(x=>x.id===f.promoId);if(p&&!ps.includes(p))ps.push(p)}
  return ps;
}
function promoEnCours(pr){const a=promoAnneeAt(pr,anneeScolaire(new Date()));return a>=1&&a<=promoDuree(pr)}
/* sélections multiples : une liste vide = pas de filtre ; "cur" = toutes les promotions en cours */
function sfMatch(f){
  const s=sfState();
  {const vis=mesPromoIds();if(vis&&!(promosOfF(f).some(p=>vis.has(p.id))||profsOf(f).includes(moiNom())))return false}
  if(s.per.length){const ps=promosOfF(f);
    const ok=(s.per.includes("cur")&&(!ps.length||ps.some(promoEnCours)))||ps.some(p=>s.per.includes(p.id));
    if(!ok)return false}
  if(s.sem.length&&!s.sem.includes(f.semestre))return false;
  if(s.st.length&&!s.st.includes(statutOf(f)))return false;
  if(s.q&&!String(f.titre||"").toLowerCase().includes(s.q.toLowerCase()))return false;
  return true;
}
function sfActive(){return JSON.stringify(sfState())!==JSON.stringify(sfDefault())}
function paintSavedFilters(){
  const host=document.getElementById("sFilters");if(!host)return;
  if(!fiches.length){host.hidden=true;host.innerHTML="";return}
  const s=sfState(), me=moiNom(), ae=document.activeElement, qFocus=ae&&ae.id==="sfQ", caret=qFocus?ae.selectionStart:0;
  promos.forEach(migPromoCohorte);
  const dipIdx=id=>DATA.diplomes.findIndex(d=>d.id===id);
  const sorted=promos.filter(promoVisible).sort((a,b)=>(dipIdx(a.diplomeId)-dipIdx(b.diplomeId))||(b.debut-a.debut));
  const cur=sorted.filter(promoEnCours), old=sorted.filter(p=>!promoEnCours(p));
  s.per=s.per.filter(v=>v==="cur"||promos.some(p=>p.id===v));
  const pName=p=>(promoShort(p)?promoShort(p)+" — ":"")+p.nom;
  const cb=(k,v,l,extra)=>`<label class="sfo"><input type="checkbox" data-sfk="${k}" value="${esc(v)}" ${s[k].includes(v)?"checked":""}> <span>${esc(l)}</span>${extra||""}</label>`;
  const sum=(k)=>{const v=s[k];
    if(k==="per"){if(!v.length)return "Toutes les promotions";const n=v.map(x=>x==="cur"?"En cours":(promoShort(promos.find(p=>p.id===x))||(promos.find(p=>p.id===x)||{}).nom||""));
      return n.length<=2?n.join(", "):n.length+" sélections"}
    if(k==="sem")return v.length?SEMS.filter(x=>v.includes(x)).join(", "):"Tous les semestres";
    return !v.length?"Tous les suivis":v.length===1?ST_LBL[v[0]]:v.length+" suivis"};
  const menu=(k,label,body)=>`<span class="xmenu sfm"><button type="button" class="sfb${s[k].length?" on":""}" data-sfm="${k}" aria-haspopup="true" aria-expanded="false" aria-label="${label}"><span class="sfl2">${label}</span> ${esc(sum(k))} ▾</button>
    <span class="xpop sfpop" hidden data-sfp="${k}">${body}<span class="xsep"></span><span class="sfpa"><button type="button" data-sfclr="${k}">Tout afficher</button></span></span></span>`;
  host.hidden=false;
  host.innerHTML=`<span class="sfl">Filtrer</span>
    ${menu("per","Promotions",cb("per","cur","Promotions en cours",` <span class="hint">${cur.length}</span>`)
      +(cur.length?`<span class="xh">En cours</span>${cur.map(p=>cb("per",p.id,pName(p))).join("")}`:"")
      +(old.length?`<span class="xh">Terminées ou à venir</span>${old.map(p=>cb("per",p.id,p.nom)).join("")}`:""))}

    ${menu("sem","Semestres",SEMS.map(x=>cb("sem",x,x)).join(""))}
    ${menu("st","Suivi",Object.keys(ST_LBL).map(k=>cb("st",k,ST_LBL[k])).join(""))}
    <input type="search" id="sfQ" placeholder="Rechercher un intitulé" value="${esc(s.q)}" aria-label="Rechercher un intitulé">
    ${sfActive()?`<button type="button" class="btn ghost" id="sfReset">Filtres par défaut</button>`:""}`;
  const g=id=>document.getElementById(id);
  const reopen=k=>{const b=host.querySelector(`[data-sfm="${k}"]`);if(!b)return;b.nextElementSibling.hidden=false;b.setAttribute("aria-expanded","true")};
  host.querySelectorAll("[data-sfm]").forEach(b=>b.onclick=e=>{e.stopPropagation();const p=b.nextElementSibling,was=!p.hidden;
    document.querySelectorAll(".xpop").forEach(x=>{if(!x.hidden){x.hidden=true;x.previousElementSibling.setAttribute("aria-expanded","false")}});
    ui.sfOpen=was?"":b.dataset.sfm;if(!was)reopen(b.dataset.sfm)});
  host.querySelectorAll(".sfpop").forEach(p=>p.onclick=e=>e.stopPropagation());
  host.querySelectorAll("[data-sfk]").forEach(c=>c.onchange=()=>{const k=c.dataset.sfk, v=c.value;
    s[k]=c.checked?[...new Set([...s[k],v])]:s[k].filter(x=>x!==v);ui.sfOpen=k;paintSaved()});
  host.querySelectorAll("[data-sfclr]").forEach(b=>b.onclick=()=>{s[b.dataset.sfclr]=[];ui.sfOpen=b.dataset.sfclr;paintSaved()});
  g("sfQ").oninput=e=>{s.q=e.target.value;ui.sfOpen="";paintSaved()};
  if(g("sfReset"))g("sfReset").onclick=()=>{ui.sf=sfDefault();ui.sfOpen="";paintSaved()};
  if(ui.sfOpen)reopen(ui.sfOpen);
  if(!document._sfClose){document._sfClose=true;document.addEventListener("click",()=>{ui.sfOpen=""})}
  if(qFocus){const q=g("sfQ");q.focus();try{q.setSelectionRange(caret,caret)}catch(e){}}
}
function paintSaved(){
  paintSavedFilters();
  const vis=fiches.map(sfMatch), nVis=vis.filter(Boolean).length;
  document.getElementById("sCount").textContent=nVis<fiches.length?nVis+" / "+fiches.length:fiches.length;
  const h=document.getElementById("savedList");
  if(!fiches.length){h.innerHTML=`<div class="empty">Aucune évaluation enregistrée.
    <button class="btn" id="bNew2">+ Nouvelle évaluation</button> ou <button class="btn ghost" id="bDemo2">charge un exemple</button>.</div>`;
    const d=document.getElementById("bDemo2");if(d)d.onclick=loadDemo;
    const n=document.getElementById("bNew2");if(n)n.onclick=nouvelleFiche;return}
  h.innerHTML=`<table class="t slist"><thead><tr><th>Promotion</th><th>Sem.</th><th>Intitulé</th><th>Livrables</th><th>Comp.</th><th class="csuivi"><span style="display:inline-flex;gap:6px;align-items:center">Suivi ${help("Chaque évaluation avance sur 5 étapes : <b>Préparée → Distribuée → Rendue → Évaluée → Restituée</b>. Point plein = étape franchie, point à moitié plein = étape commencée. Distribuée et Rendue avancent seules avec les dates prévues ; les suivantes avec vos actions (saisie ou export de la grille, « Terminer », « Marquer restituée »). La ligne grise indique la prochaine chose à faire.","rt")}</span></th><th aria-label="Actions"></th></tr></thead><tbody>
  ${nVis?"":`<tr><td colspan="7"><div class="empty">Aucune évaluation ne correspond aux filtres. <button type="button" class="btn ghost" id="sfReset2">Revenir aux filtres par défaut</button> <button type="button" class="btn ghost" id="sfAll">Tout afficher</button></div></td></tr>`}
  ${fiches.map((f,i)=>{if(!vis[i])return "";const liv=(f.livrables||[]).filter(Boolean), st=MOD.eleves?evalStats(f):null;
  return `<tr class="srow${f.annulee?" annulee":""}" data-open="${i}" tabindex="0" title="Ouvrir l'évaluation"><td title="${esc(f.classe||"")}"><b>${esc(classesDisp(f)||f.classe||"—")}</b></td><td><span class="pill">${esc(f.semestre)}</span></td>
  <td>${esc(f.titre||"Sans titre")}</td><td>${liv.length?esc(liv[0])+(liv.length>1?` <span class="hint">+${liv.length-1}</span>`:""):`<span class="hint">—</span>`}</td>
  <td class="mono">${(f.items||[]).length}</td>
  <td class="sact csuivi">${suiviCell(f,i)}</td>
  <td style="white-space:nowrap;text-align:right" class="sact"><button type="button" class="btn xact" data-xm="${i}" aria-haspopup="dialog" title="${f.annulee?"Rétablir, supprimer les évaluations individuelles…":"Évaluer, exporter, dupliquer…"}">Actions…</button>${f.annulee?`<button class="btn ghost${ui.delArm==="f:"+f.id?" danger":""}" data-del="${i}" title="${nbIndiv(f)?"Supprimez d'abord les évaluations individuelles (bouton « Actions… »)":"Suppression définitive"}">${ui.delArm==="f:"+f.id?"Confirmer la suppression":"Supprimer"}</button>`:""}</td></tr>`}).join("")}
  </tbody></table>`;
  {const r2=document.getElementById("sfReset2");if(r2)r2.onclick=()=>{ui.sf=sfDefault();paintSaved()};
   const al=document.getElementById("sfAll");if(al)al.onclick=()=>{ui.sf={per:[],mine:false,sem:[],st:[],q:""};paintSaved()}}
  h.querySelectorAll("[data-rst]").forEach(b=>b.onclick=e=>{e.stopPropagation();
    const f=fiches[+b.dataset.rst], k=b.dataset.rp;f.restit=f.restit||{};
    if(f.restit[k])delete f.restit[k];else f.restit[k]=new Date().toISOString().slice(0,10);
    if(F&&F.id===f.id){F.restit=structuredClone(f.restit);save()}
    LS.set("dnmade.fiches",fiches);paintSaved()});
  /* les actions vivent dans une fenêtre (ouvrirActions) : on les relie chaque fois qu'elle est remplie */
  const closeX=()=>fermerActions();
  h.querySelectorAll("[data-xm]").forEach(b=>b.onclick=e=>{e.stopPropagation();ouvrirActions(+b.dataset.xm,bindActs)});
  const syncF=f=>{if(F&&F.id===f.id){F.suivi=structuredClone(f.suivi);F.restit=structuredClone(f.restit||{});save()}LS.set("dnmade.fiches",fiches)};
  const bindActs=root=>{
    root.querySelectorAll("[data-sai]").forEach(b=>b.onclick=e=>{e.stopPropagation();fermerActions(false);
      if(refBloque(fiches[+b.dataset.sai],"Impossible de saisir les résultats"))return;
      F=migF(structuredClone(fiches[+b.dataset.sai]));vueMention(mentionDeFiche(F));save();
      ui.tab="new";ui.step=4;ui.eleve="";paintTabs();paintForm();paintPick();paintLignes();goStep(4)});
    root.querySelectorAll("[data-xk]").forEach(b=>b.onclick=e=>{e.stopPropagation();closeX();const i=+b.dataset.xi, f=fiches[i], k=b.dataset.xk;if(!f)return;
      if(b.dataset.xmode==="rest"){askRestitWarn(f,()=>exportFiche(i,k,"rest"));return}
      exportFiche(i,k,"eval");if(!suiviOf(f).exporte){f.suivi.exporte=isoToday();syncF(f)}paintSaved()});
    root.querySelectorAll("[data-act]").forEach(b=>b.onclick=e=>{e.stopPropagation();closeX();const f=fiches[+b.dataset.xi];if(!f)return;
      const s=suiviOf(f);
      if(b.dataset.act==="fin"){if(s.evalue){delete s.evalue;delete s.mode}else{if(rendusManquants(f)){toast("Renseigne d'abord le rendu de chaque élève.");return}s.evalue=isoToday();s.mode=MOD.eleves?"dnmax":"main"}}
      if(b.dataset.act==="rest"){f.restit=f.restit||{};const k=b.dataset.rp;if(f.restit[k])delete f.restit[k];else f.restit[k]=isoToday()}
      if(b.dataset.act==="annul"){f.annulee=isoToday();toast("Évaluation annulée. Elle peut être rétablie depuis le bouton « Actions… ».")}
      if(b.dataset.act==="retab"){delete f.annulee;ui.delArm=null}
      if(b.dataset.act==="delres"){const k="r:"+f.id;
        if(ui.delArm!==k){toast("Action irréversible : cliquez à nouveau pour confirmer.");armList(k);const m=document.querySelector('#savedList [data-xm="'+b.dataset.xi+'"]');if(m)m.click();return}
        ui.delArm=null;const n=nbIndiv(f);f.res={};if(F&&F.id===f.id){F.res={};save()}toast(n+" évaluation"+(n>1?"s":"")+" individuelle"+(n>1?"s":"")+" supprimée"+(n>1?"s":"")+".")}
      if(F&&F.id===f.id){if(f.annulee)F.annulee=f.annulee;else delete F.annulee}
      syncF(f);paintSaved()});
    root.querySelectorAll("[data-dup]").forEach(b=>b.onclick=e=>{e.stopPropagation();fermerActions(false);
      if(refBloque(fiches[+b.dataset.dup],"Impossible de dupliquer cette évaluation"))return;F=migF(structuredClone(fiches[+b.dataset.dup]));vueMention(mentionDeFiche(F));F.id=uid();F.titre+=" (copie)";F.date=new Date().toISOString().slice(0,10);delete F.distribPrev;delete F.renduPrev;if(F.suivi)F.suivi.saisie=F.date;save();ui.tab="new";paintTabs();paintForm();paintPick()});
  };
  const openSt=key=>{const [i,k]=String(key).split(":").map(Number), b=h.querySelector(`[data-sts="${i}:${k}"]`);if(!b)return;
    const pop=h.querySelector(`[data-stp="${i}"]`), f=fiches[i];
    pop.innerHTML=stepEditor(f,i,k);pop.style.setProperty("--stx",(b.getBoundingClientRect().left-b.closest(".stw").getBoundingClientRect().left+18-270)+"px");pop.hidden=false;b.classList.add("open");ui.stOpen=key;
    pop.onclick=ev=>ev.stopPropagation();
    pop.querySelectorAll("[data-sv]").forEach(inp=>inp.onchange=()=>{const s=suiviOf(f), k2=inp.dataset.sv;
      if(inp.value)s[k2]=inp.value;else delete s[k2];if(k2==="evalue"){if(inp.value)s.mode=s.mode||(MOD.eleves?"dnmax":"main");else delete s.mode}
      syncF(f);paintSaved()});
    pop.querySelectorAll("[data-svp]").forEach(inp=>inp.onchange=()=>{const k2=inp.dataset.svp;
      if(inp.value)f[k2]=inp.value;else delete f[k2];if(k2==="renduPrev")delete suiviOf(f).butoir;
      if(F&&F.id===f.id){if(f[k2])F[k2]=f[k2];else delete F[k2];save()}syncF(f);paintSaved()});
    pop.querySelectorAll("[data-stset]").forEach(x=>x.onclick=()=>{const s=suiviOf(f), k2=x.dataset.stset;s[k2]=isoToday();
      if(k2==="evalue")s.mode=s.mode||(MOD.eleves?"dnmax":"main");syncF(f);paintSaved()})};
  h.querySelectorAll("[data-sts]").forEach(b=>b.onclick=e=>{e.stopPropagation();const key=b.dataset.sts, was=ui.stOpen===key;
    document.querySelectorAll(".xpop").forEach(x=>{if(!x.hidden){x.hidden=true;x.previousElementSibling&&x.previousElementSibling.setAttribute("aria-expanded","false")}});
    h.querySelectorAll(".sd.open").forEach(x=>x.classList.remove("open"));
    ui.stOpen=null;if(!was)openSt(key)});
  if(ui.stOpen!=null)openSt(ui.stOpen);
  if(!document._stClose){document._stClose=true;document.addEventListener("click",()=>{if(ui.stOpen!=null){ui.stOpen=null;document.querySelectorAll("#savedList .sd.open").forEach(x=>x.classList.remove("open"))}})}
  if(!document._xmClose){document._xmClose=true;document.addEventListener("click",()=>document.querySelectorAll(".xpop").forEach(p=>{if(!p.hidden){p.hidden=true;p.previousElementSibling.setAttribute("aria-expanded","false")}}))}
  const openF=i=>{F=migF(structuredClone(fiches[i]));vueMention(mentionDeFiche(F));save();ui.tab="new";paintTabs();paintForm();paintPick()};
  h.querySelectorAll("tr[data-open]").forEach(tr=>{
    tr.onclick=e=>{if(e.target.closest(".sact"))return;openF(+tr.dataset.open)};
    tr.onkeydown=e=>{if(e.target===tr&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openF(+tr.dataset.open)}}});
  h.querySelectorAll("[data-del]").forEach(b=>b.onclick=e=>{e.stopPropagation();const f=fiches[+b.dataset.del];if(!f||!f.annulee)return;
    const n=nbIndiv(f);
    if(n){toast("Suppression impossible : supprimez d'abord les "+n+" évaluation"+(n>1?"s":"")+" individuelle"+(n>1?"s":"")+" (bouton « Actions… »).");return}
    const k="f:"+f.id;
    if(ui.delArm!==k){toast("Suppression définitive : cliquez sur « Confirmer la suppression ».");armList(k);return}
    ui.delArm=null;fiches.splice(+b.dataset.del,1);LS.set("dnmade.fiches",fiches);paintSaved();toast("Évaluation supprimée.")});
  /* liste redessinée pendant que la fenêtre est ouverte (fin du délai de confirmation) : on la remet à jour */
  if(XA)XA.refresh(bindActs);
  else if(XA_RETOUR!=null){const b=h.querySelector(`[data-xm="${XA_RETOUR}"]`);XA_RETOUR=null;
    if(b&&(!document.activeElement||document.activeElement===document.body))b.focus()}
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
const ueOf = code => tidy((refEcByCode(code)||{}).ue||"") || "UE non précisée";
const ueOrd = ue => {const i=(REF.ecs||[]).findIndex(e=>tidy(e.ue)===ue);return i<0?99:i};
const norm = s => String(s==null?"":s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const squash = s => norm(s).replace(/[^a-z0-9.]/g,"");
function ecNum(ec){const m=String(ec||"").match(/(\d+)\.?(\d+)?/);return m?(+m[1])*100+(+(m[2]||0)):9999}
function lienEc(c,id){return ((c||{}).ecs||[]).find(x=>x.id===id)||null}
function ecOrd(e){const l=ecCodesList(e);return l.length?ecNum(l[0]):9999}
function hi(txt,q){
  if(!q)return esc(txt);
  const t=String(txt==null?"":txt), n=norm(t), i=n.indexOf(q);
  if(i<0)return esc(t);
  return esc(t.slice(0,i))+"<mark>"+esc(t.slice(i,i+q.length))+"</mark>"+esc(t.slice(i+q.length));
}
function refPairs(){
  const r=ui.ref, q=norm(r.q.trim()), qs=squash(r.q);
  const out=[];
  const hit=t=>{const n=norm(t);return n.includes(q)||(qs.length>1&&squash(n).includes(qs))};
  const tag=e=>e.ec+" "+(e.nom||"")+" "+(e.ue||"");
  const F2=refFilter();
  REF.competences.forEach(c=>{
    if(F2.kind==="bloc"&&String(c.bloc)!==F2.value)return;
    if(F2.kind==="comp"&&c.code!==F2.value)return;
    const compMatch = !q || hit([c.code,c.libelle,blocName(c.bloc)].join(" "));
    const any = compMatch || (c.ecs||[]).some(e=>hit(tag(e)));
    if(!any)return;
    (c.ecs||[]).forEach(e=>{
      if(F2.kind==="ue"&&e.ue!==F2.value)return;
      if(F2.kind==="ec"&&e.id!==F2.value)return;
      if(!compMatch && !hit(tag(e)))return;
      if(r.sems.length && !r.sems.includes(e.sem))return;
      if(r.annee!=="*" && String(anneeOf(e.sem))!==r.annee)return;
      out.push({c,ec:e.ec,ecId:e.id,nom:e.nom||"",couleur:e.couleur,ue:e.ue,sem:e.sem,dn:e.dn,annee:anneeOf(e.sem)});
    });
  });
  return out;
}
function groupPairs(pairs){
  const r=ui.ref, g=new Map();
  if(!GROUPS[r.group])r.group="bloc";
  const add=(k,label,sub,ord,p,c)=>{
    if(!g.has(k))g.set(k,{label,sub,ord,c:c||null,items:new Map()});
    const G=g.get(k), it=G.items.get(p.c.code)||{c:p.c,sems:new Set(),ecs:new Set()};
    it.sems.add(p.sem); it.ecs.add(p.ec); G.items.set(p.c.code,it);
  };
  pairs.forEach(p=>{
    if(r.group==="bloc")add("b"+p.c.bloc,"Bloc "+p.c.bloc,blocName(p.c.bloc),+p.c.bloc,p);
    else if(r.group==="ue")add("u"+p.ue,p.ue,"Unité d'enseignement",ueOrd(p.ue),p,ueColor(p.ue));
    else if(r.group==="ec")add("e"+p.ec,p.ec,(p.nom||"")+" · "+p.ue,ecNum(p.ec),p,p.couleur||ecColor(p.ec));
    else if(r.group==="annee")add("a"+p.annee,"Année "+p.annee,
      MOD.dn?(p.dn+" · "+(((REF.meta.niveaux||[]).find(n=>+n.annee===p.annee)||{}).label||"")):("Semestres "+semsOfAnnee(p.annee).join(" et ")),p.annee,p);
    else if(r.group==="semestre")add("s"+p.sem,p.sem,"Année "+p.annee+(MOD.dn?" · "+p.dn:""),SEMS.indexOf(p.sem),p);
    else add("all","Toutes les compétences",REF.meta.diplome||"",0,p);
  });
  return [...g.values()].sort((a,b)=>a.ord-b.ord);
}
function paintExplore(){
  const m=REF.meta||{};
  paintMap();
  document.getElementById("refSearch").hidden = (ui.ref.view||"radial")!=="search";
  const r=ui.ref;
  const gs=document.getElementById("r-group");
  gs.innerHTML=Object.entries(GROUPS).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join("");
  gs.value=r.group;
  const as=document.getElementById("r-annee");
  as.innerHTML=`<option value="*">Toutes les années</option>`+
    (m.niveaux||[]).map(n=>`<option value="${n.annee}">${esc(anneeLabel(n.annee))}</option>`).join("");
  as.value=r.annee;
  document.getElementById("r-sem").innerHTML=
    `<button type="button" data-sem="*" aria-pressed="${r.sems.length===0}">Tous</button>`+
    SEMS.map(x=>`<button type="button" data-sem="${x}" aria-pressed="${r.sems.includes(x)}">${x}</button>`).join("");
  document.getElementById("r-sem").querySelectorAll("button").forEach(b=>b.onclick=()=>{
    const v=b.dataset.sem;
    if(v==="*")r.sems=[];
    else r.sems=r.sems.includes(v)?r.sems.filter(x=>x!==v):[...r.sems,v].sort((a,b2)=>SEMS.indexOf(a)-SEMS.indexOf(b2));
    paintRef()});
  document.getElementById("r-search").value=r.q;

  const pairs=refPairs(), groups=groupPairs(pairs);
  const seen=new Set(pairs.map(p=>p.c.code));
  document.getElementById("rCount").textContent=seen.size+" / "+REF.competences.length;
  const q=norm(r.q.trim());
  const host=document.getElementById("refList");
  if(!groups.length){host.innerHTML=`<div class="empty">Aucune compétence ne correspond${r.q?` à « ${esc(r.q)} »`:""} avec ces filtres.</div>`;return}
  const showBloc=r.group!=="bloc";
  host.innerHTML=groups.map(G=>{
    const items=[...G.items.values()].sort((a,b)=>(+a.c.bloc-+b.c.bloc)||ecNum(a.c.code)-ecNum(b.c.code));
    const col=G.c||null;
    return `<div class="bloc grp"><div class="bh ${col?"rail":(r.group==="bloc"&&(+G.ord)%2?"tint":"")}" style="${col?`--c:${col}`:`--bloc:${BLOC_TINT}`}">
      <span class="n">${esc(G.label)}</span><span class="t">${esc(G.sub||"")}</span>
      <span class="c">${items.length} comp.</span></div>
      <div class="tw"><table class="t"><thead><tr>
        ${showBloc?"<th>Bloc</th>":""}<th>Code</th><th>Compétence</th><th>Semestres</th><th>EC</th></tr></thead><tbody>
      ${items.map(it=>{
        const sems=[...it.sems].sort((a,b)=>SEMS.indexOf(a)-SEMS.indexOf(b));
        const ecs=[...it.ecs].sort((a,b)=>ecNum(a)-ecNum(b));
        return `<tr>
          ${showBloc?`<td class="mono" title="${esc(blocName(it.c.bloc))}">${esc(it.c.bloc)}</td>`:""}
          <td class="mono" style="color:var(--accent);white-space:nowrap">${hi(it.c.code,q)}</td>
          <td style="min-width:240px">${hi(it.c.libelle,q)}</td>
          <td style="white-space:nowrap">${sems.map(x=>`<span class="pill">${x}</span>`).join(" ")}</td>
          <td class="hint">${ecs.map(x=>
            `<span class="pill c" style="--c:${ecColor(x)}" title="${esc(ecNomRef(x))}">${hi(x,q)}</span>`).join(" ")}</td></tr>`}).join("")}
      </tbody></table></div></div>`}).join("");
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
function arcLine(cx,cy,r,a0,a1){
  const mid=(a0+a1)/2, flip=mid>0&&mid<Math.PI;
  const [s0,e0]=flip?[a1,a0]:[a0,a1];
  const P=a=>[(cx+r*Math.cos(a)).toFixed(2),(cy+r*Math.sin(a)).toFixed(2)];
  const [x0,y0]=P(s0),[x1,y1]=P(e0);
  return `M${x0} ${y0}A${r} ${r} 0 ${Math.abs(a1-a0)>Math.PI?1:0} ${flip?0:1} ${x1} ${y1}`;
}
let _tp=0;
function curve(cx,cy,r,a0,a1,txt,cls,size){
  const max=Math.max(0,Math.floor(((a1-a0)*r)/(size*0.66)));
  if(max<3)return "";
  const t=txt.length>max?txt.slice(0,max-1).trim()+"…":txt;
  const id="tp"+(++_tp);
  return `<path id="${id}" d="${arcLine(cx,cy,r,a0,a1)}" fill="none"/>`+
    `<text class="${cls}" font-size="${size}"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${esc(t)}</textPath></text>`;
}
let wheelAngle=0, wheelRaf=0;
const RAD={RARR:505,ZMAX:1.65,S:760,c:380,PAD:100,HUB:84,RB:360,RL:380,DIST:[9,17,25,33]};
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
function ecAnnees(e){
  const ys=[...new Set((e.sems||[]).map(x=>Math.floor(Math.max(0,SEMS.indexOf(x))/2)+1))].sort();
  return ys.length?(ys.length>1?"années ":"année ")+ys.join(" et "):"";
}
function chainComps(){
  const D=DATA;
  let cs=D.competences.filter(c=>!c.diplomeId||c.diplomeId===D.activeDiplome);
  const f=refFilter();
  if(f.kind==="bloc")cs=cs.filter(c=>String(c.bloc)===f.value);
  else if(f.kind==="comp")cs=cs.filter(c=>c.code===f.value);
  else if(f.kind==="ec")cs=cs.filter(c=>(c.ecIds||[]).includes(f.value));
  else if(f.kind==="ue"){const u=D.ues.find(x=>x.nom===f.value)||{};
    const ids=D.ecs.filter(e=>e.ueId===u.id).map(e=>e.id);cs=cs.filter(c=>c.ecIds.some(x=>ids.includes(x)))}
  return cs.slice().sort((a,b)=>(+a.bloc-+b.bloc)||ecNum(a.code)-ecNum(b.code));
}
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
    const col=k==="comp"?"#1f4d8f":k==="dip"?"#7c8698":(x.couleur||"#9aa2ae");
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
    col:M.kind==="comp"?"#1f4d8f":M.kind==="dip"?"#7c8698":(x.couleur||"#9aa2ae"),
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
      <div class="hint">Survole pour éclater une portion, clique pour la figer.</div>`;
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
      const zf=1/(1+0.45*(((ui.radZoom==null?RAD.ZMAX:ui.radZoom))-1));
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
  // zoom à la molette : au départ, le quart bas-droit de la roue remplit la vue (centre de la roue
  // en haut à gauche) ; en dézoomant, la roue rétrécit et se recentre jusqu'à la vue entière.
  const ZMAX=RAD.ZMAX, ZM=RAD.HUB+14;   // au zoom maximal, le cercle du diplôme reste entier et les compétences éclatées restent visibles
  const NS2="http://www.w3.org/2000/svg";
  const zn0=svg.querySelector(".zone");if(zn0)zn0.remove();
  // flèches de rotation : deux arcs fléchés qui tournent autour de la roue, au-delà de la zone
  // d'éclatement, l'un en haut à droite de la vue (sens inverse), l'autre en bas à gauche (sens horaire)
  const pads=[-1,1].map(dir=>{const g=document.createElementNS(NS2,"g");g.setAttribute("class","rpad");g.dataset.dir=dir;
    g.innerHTML=`<path class="hit"/><path class="arc"/><path class="ah"/><title>${dir<0?"Tourner la roue dans le sens inverse":"Tourner la roue dans le sens des aiguilles d'une montre"} (survoler)</title>`;
    svg.appendChild(g);return g});
  const applyZoom=()=>{if(ui.radZoom!=null&&ui.radZoom>ZMAX)ui.radZoom=ZMAX;
    let z=DEVICE.phone?1:(ui.radZoom==null?ZMAX:ui.radZoom);
    let zoomed=z>1.01;
    // zoomée, la carte prend toute la largeur disponible (plus de vide jusqu'à l'encadré) ;
    // la vue s'étend donc vers la droite, à hauteur constante
    svg.style.maxWidth=zoomed?"none":"";
    svg.style.height=zoomed?`min(940px, calc(100vh - 110px))`:"";
    // la vue zoomée reste toujours plus large que haute (au moins 5:4), y compris sur grand écran où la
    // colonne est haute : la place à droite accueille les compétences éclatées et la flèche du haut
    if(zoomed){const cw=svg.getBoundingClientRect().width;
      if(cw)svg.style.height=`min(940px, calc(100vh - 110px), ${Math.round(cw*0.8)}px)`}
    svg.style.margin=zoomed?"0":"";
    svg.style.overflow=zoomed?"hidden":"";
    let rc=svg.getBoundingClientRect();
    // zone d'affichage étroite (grands écrans où la colonne est plus haute que large) : la vue entière
    // est déjà grande à l'écran ; on garde la roue entière pour que flèches et compétences éclatées restent visibles
    if(zoomed&&rc.width&&rc.width<480){z=1;zoomed=false;
      svg.style.maxWidth="";svg.style.height="";svg.style.margin="";svg.style.overflow="";rc=svg.getBoundingClientRect()}
    const t=(z-1)/(ZMAX-1), w=VB/z, o=-P+t*((C-ZM)+P);
    const asp=zoomed&&rc.height?Math.max(1,rc.width/rc.height):1;
    const vw=w*asp, vh=w;
    svg.setAttribute("viewBox",`${o.toFixed(1)} ${o.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`);
    svg.setAttribute("preserveAspectRatio",zoomed?"xMinYMin meet":"xMidYMid meet");
    const u=vh/(rc.height||600);
    // flèches : deux arcs sur un même cercle virtuel autour de la roue (au-delà de la zone d'éclatement),
    // placés là où ce cercle est visible : en haut à droite (un peu plus haut) et en bas à gauche
    const R=RAD.RARR, M=26*u, span=0.24;
    const vis=ang=>{const x=C+R*Math.cos(ang),y=C+R*Math.sin(ang);return x>=o+M&&x<=o+vw-M&&y>=o+M&&y<=o+vh-M};
    const fits=c=>{for(let k=-6;k<=6;k++)if(!vis(c+span*k/6))return false;return true};
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
    });};
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
    const z=ui.radZoom==null?ZMAX:ui.radZoom, dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?100:1);
    ui.radZoom=Math.max(1,Math.min(ZMAX,z*Math.exp(-dy*0.0015)));applyZoom()},{passive:false});
  applyZoom();
  radInfo(null);
  wheelRaf=requestAnimationFrame(tick);
}
function paintMap(){
  const D=DATA, m=REF.meta||{}, host=document.getElementById("refMeta");
  const nbComps=id=>D.competences.filter(c=>(c.ecIds||[]).includes(id)).length;
  const ecsOfUe=u=>filtEcs(D.ecs.filter(e=>e.ueId===u.id)).sort((a,b)=>ecOrd(a)-ecOrd(b));
  const compsOfUe=u=>{const ids=ecsOfUe(u).map(e=>e.id);
    return D.competences.filter(c=>(c.ecIds||[]).some(x=>ids.includes(x))).length};
  const orphan=filtEcs(D.ecs.filter(e=>!D.ues.some(u=>u.id===e.ueId)));
  const groups=[...filtUes(D.ues).map(u=>({u,ecs:ecsOfUe(u)})),
    ...(orphan.length&&refFilter().kind!=="ue"?[{u:{nom:"Sans UE",couleur:"#9aa2ae",id:""},ecs:orphan}]:[])]
    .filter(g=>g.ecs.length);
  // une case par suite de semestres où le code ne change pas
  const cells=ec=>{
    let out="",i=0;
    while(i<SEMS.length){
      const sm=SEMS[i], on=(ec.sems||[]).includes(sm);
      if(!on){out+=`<td><span class="vide">·</span></td>`;i++;continue}
      const code=ecCodeAt(ec,sm)||"";
      let j=i+1;
      while(j<SEMS.length&&(ec.sems||[]).includes(SEMS[j])&&(ecCodeAt(ec,SEMS[j])||"")===code)j++;
      const sp=j-i, lot=SEMS.slice(i,j);
      out+=`<td${sp>1?` colspan="${sp}"`:""}>${cell(ec,sm,lot)}</td>`;
      i=j;
    }
    return out;
  };
  const cell=(ec,sem,lot)=>(ec.sems||[]).includes(sem)
    ? `<button type="button" class="ecc" data-mapec="${esc(ecName(ec))}" style="--c:${esc(ec.couleur||"#9aa2ae")}" title="${esc((lot||[sem]).join(" ")+" · "+ecName(ec))}">${esc((ecCodeAt(ec,sem)||sem).replace(/^EC\s*/,""))}</button>`
    : `<span class="vide">·</span>`;
  const view=ui.ref.view||"radial";
  const dipNoms=[];D.diplomes.forEach(dp=>{const n=(dp.nom||"").trim();
    if(!dipNoms.some(x=>norm(x)===norm(n)))dipNoms.push(n)});
  const curDip=D.diplomes.find(x=>x.id===D.activeDiplome)||{};
  const mentionsCur=D.diplomes.filter(dp=>norm(dp.nom||"")===norm(curDip.nom||""));
  const nEc=REF.competences.reduce((a,c)=>a.concat(c.ecs.map(e=>e.ec)),[]).filter((v,i,t)=>t.indexOf(v)===i).length;
  const f=refFilter();
  const allEc=D.ecs.slice().sort((a,b)=>ecOrd(a)-ecOrd(b));
  const tileSel=(kind,label,count,items)=>`
    <div class="tile ${f.kind===kind?"on":""}"><span class="k">${esc(label)}</span>
      <select class="tsel" data-f="${kind}" aria-label="Filtrer par ${esc(label)}">
        <option value="" hidden ${f.kind===kind?"":"selected"}>${count}</option>
        ${f.kind===kind?`<option value="">Tout afficher</option>`:""}
        ${items.map(o=>`<option value="${esc(o.v)}" ${f.kind===kind&&f.value===o.v?"selected":""}>${esc(o.t)}</option>`).join("")}
      </select></div>`;
  host.innerHTML=`
    <div class="cbar">
      <label class="cf"><span>Diplôme</span>
        <select data-dipnom="1" aria-label="Diplôme">${dipNoms.map(n=>`<option value="${esc(n)}" ${norm(n)===norm(curDip.nom||"")?"selected":""}>${esc(n||"—")}</option>`).join("")}</select></label>
      <label class="cf"><span>Mention</span>
        <select data-dip="1" aria-label="Mention">${mentionsCur.map(dp=>
          `<option value="${dp.id}" ${dp.id===D.activeDiplome?"selected":""}>${esc(dp.mention||"sans mention")}</option>`).join("")}</select></label>
      ${(()=>{const va=versionActive(D.activeDiplome);
        return va?`<span class="vst ${refAJour(D.activeDiplome)?"ok":"mod"}">${refAJour(D.activeDiplome)?"Version du "+esc(frDate(va.date)):"Modifié depuis la version du "+esc(frDate(va.date))}</span>`
          :`<span class="vst draft">Référentiel non validé</span>`})()}
    </div>
    <div class="tiles">
      ${tileSel("ue","Unités d'enseignement",REF.ues.length+" UE",REF.ues.map(u=>({v:u.nom,t:u.nom})))}
      ${tileSel("ec","Enseignements constitutifs",allEc.length+" EC",allEc.map(e=>({v:e.id,t:ecName(e)+" · "+ecCodeLbl(e)})))}
      ${tileSel("bloc","Blocs",REF.blocs.length+" blocs",REF.blocs.map(b=>({v:b.num,t:b.num+" - "+b.nom})))}
      ${tileSel("comp","Compétences",REF.competences.length+" compétences",REF.competences.map(c=>({v:c.code,t:c.libelle.slice(0,64)+" — "+c.code})))}
    </div>
    <div class="subnav" style="margin:2px 0 0">
      <button type="button" data-view="radial" aria-pressed="${view==="radial"}">Carte radiale</button>
      <button type="button" data-view="chain" aria-pressed="${view==="chain"}">Carte heuristique</button>
      <button type="button" data-view="table" aria-pressed="${view==="table"}">Tableau EC × semestres</button>
      <button type="button" data-view="tablec" aria-pressed="${view==="tablec"}">Tableau compétences × semestres</button>
      <button type="button" data-view="search" aria-pressed="${view==="search"}">Recherche</button>
      ${help(view==="chain"?"Cinq colonnes, de la compétence au diplôme, le semestre entre la compétence et l'EC. La colonne verrouillée (cadenas fermé) tourne comme une roue ; les autres montrent ce qui est associé à l'élément choisi, avant et après lui. Le cadenas d'une autre colonne, ou un clic sur une case, y déplace le verrou. Survoler une case éclaire son chemin."
        :view==="table"?"Une ligne par enseignement constitutif, groupée par unité : la case donne le code que porte l'EC à ce semestre — il change d'une année de diplôme à l'autre. Un clic sur une case ouvre l'EC dans le dictionnaire ; un clic sur une unité bascule sur « Recherche »."
        :view==="tablec"?"Une ligne par compétence, groupée par bloc : chaque case donne les EC qui la portent à ce semestre. Vide = la compétence n'est pas mobilisable ce semestre-là. Un clic sur une pastille d'EC l'ouvre dans le dictionnaire ; un clic sur la compétence bascule sur « Recherche »."
        :view==="search"?"Recherche par code, UE ou mot-clé, regroupement au choix, filtres d'année et de semestres."
        :"Trois couronnes : unités d'enseignement, enseignements constitutifs, puis années de diplôme — une part par année, ses deux semestres réunis, le code de l'EC pour cette année-là s'affichant dans l'encadré de droite. Les points extérieurs sont les compétences. Pendant qu'une portion est éclatée la roue s'immobilise : ce qui est éclaté reste sous le curseur, et elle repart quand on s'éloigne. Survoler éclate la portion : ses EC affichent leur nom et ses compétences s'étalent autour de la roue. Un clic fige la carte jusqu'à ce que tu survoles une flèche de rotation. La roue tourne quand tu survoles l'une des deux flèches qui l'entourent, en haut à droite et en bas à gauche de la carte ; ailleurs, elle reste immobile. La molette zoome et dézoome.")}
    </div>
    ${view==="radial"?`<div class="radwrap">${paintRadial()}<div class="radinfo" id="radInfo"></div></div>`:""}
    ${view==="chain"?paintChain():""}
${MOD.dn?`<div class="hint">${(m.niveaux||[]).map(n=>esc(anneeCode(n.annee)+" "+n.label)).join(" · ")}</div>`:""}
    ${view!=="table"?"":`<div class="tw"><table class="mx">
      <thead>
        <tr><th class="st" rowspan="2">Enseignement constitutif</th>
          ${ANNEES.map(a=>`<th colspan="2" class="an">Année ${a} · ${esc(anneeCode(a))}</th>`).join("")}
          <th class="n" rowspan="2">Compétences</th></tr>
        <tr>${SEMS.map(x=>`<th>${x}</th>`).join("")}</tr></thead>
      <tbody>${groups.map(g=>`
        <tr class="band" style="--c:${esc(g.u.couleur||"#9aa2ae")}">
          <th colspan="${SEMS.length+2}"><button type="button" class="bandbtn" data-mapue="${esc(g.u.nom)}">${esc(g.u.nom)}</button>
            <span class="n">${g.ecs.length} EC · ${compsOfUe(g.u)} compétences</span></th></tr>
        ${g.ecs.map(ec=>`<tr style="--c:${esc(ec.couleur||"#9aa2ae")}">
          <th class="st"><span class="dot"></span><button type="button" class="matbtn" data-mapec="${esc(ecName(ec))}">${esc(ecName(ec))}</button></th>
          ${cells(ec)}
          <td class="n">${nbComps(ec.id)}</td></tr>`).join("")}`).join("")}
      </tbody></table></div>`}
    ${view!=="tablec"?"":(()=>{
      const f=refFilter();
      let cs=REF.competences.slice();
      if(f.kind==="bloc")cs=cs.filter(c=>String(c.bloc)===f.value);
      else if(f.kind==="comp")cs=cs.filter(c=>c.code===f.value);
      else if(f.kind==="ec")cs=cs.filter(c=>(c.ecs||[]).some(e=>e.id===f.value));
      else if(f.kind==="ue")cs=cs.filter(c=>(c.ecs||[]).some(e=>e.ue===f.value));
      cs.sort((a,b)=>(+a.bloc-+b.bloc)||ecNum(a.code)-ecNum(b.code));
      if(!cs.length)return `<div class="empty">Aucune compétence ne correspond au filtre.</div>`;
      const blocs=[];cs.forEach(c=>{if(!blocs.some(b=>b.num===String(c.bloc)))blocs.push({num:String(c.bloc),cs:[]});
        blocs.find(b=>b.num===String(c.bloc)).cs.push(c)});
      const cellc=(c,sem)=>{
        const l=[...new Set((c.ecs||[]).filter(e=>e.sem===sem).map(e=>e.ec))];
        if(!l.length)return `<span class="vide">·</span>`;
        return l.map(code=>{const e=(c.ecs||[]).find(x=>x.ec===code);
          return `<button type="button" class="ecc" data-mapec="${esc((e||{}).nom||code)}" style="--c:${esc((e||{}).couleur||ecColor(code))}" title="${esc(code+" · "+((e||{}).nom||""))}">${esc(code.replace(/^EC\s*/,""))}</button>`}).join("");
      };
      return `<div class="tw"><table class="mx">
      <thead>
        <tr><th class="st" rowspan="2">Compétence</th>
          ${ANNEES.map(a=>`<th colspan="2" class="an">Année ${a} · ${esc(anneeCode(a))}</th>`).join("")}
          <th class="n" rowspan="2">EC</th></tr>
        <tr>${SEMS.map(x=>`<th>${x}</th>`).join("")}</tr></thead>
      <tbody>${blocs.map(b=>`
        <tr class="band" style="--c:${esc(BLOC_TINT)}">
          <th colspan="${SEMS.length+2}">${esc("Bloc "+b.num+(blocName(b.num)&&blocName(b.num)!=="Bloc "+b.num?" · "+blocName(b.num):""))}
            <span class="n">${b.cs.length} compétence${b.cs.length>1?"s":""}</span></th></tr>
        ${b.cs.map(c=>{const n=[...new Set((c.ecs||[]).map(e=>e.ec))].length;
          return `<tr style="--c:${esc(BLOC_TINT)}">
          <th class="st cmp"><button type="button" class="matbtn" data-mapcomp="${esc(c.code)}"><b>${esc(c.code)}</b> <span>${esc(c.libelle||"")}</span></button></th>
          ${SEMS.map(x=>`<td>${cellc(c,x)}</td>`).join("")}
          <td class="n">${n}</td></tr>`}).join("")}`).join("")}
      </tbody></table></div>`;
    })()}
    `;
  host.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{ui.ref.view=b.dataset.view;paintRef()});
  host.querySelectorAll("[data-f]").forEach(s2=>s2.onchange=()=>{
    ui.ref.filter=s2.value?{kind:s2.dataset.f,value:s2.value}:{kind:"",value:""};
    if(ui.ref.view==="chain"&&s2.value){
      const pk={comp:"comp",ec:"ec",ue:"ue"}[s2.dataset.f], cur=ui.ref.piv||{};
      const hit=pk==="comp"?D.competences.find(c=>c.code===s2.value):pk==="ec"?D.ecs.find(e=>e.id===s2.value)
        :pk==="ue"?D.ues.find(u=>u.nom===s2.value):null;
      if(hit&&pk===cur.kind)ui.ref.piv={kind:pk,id:hit.id};}
    paintRef()});
  const dipSel=host.querySelector("[data-dip]");
  if(dipSel)dipSel.onchange=()=>{D.activeDiplome=dipSel.value;ui.ref.filter={kind:"",value:""};saveData()};
  const dipNomSel=host.querySelector("[data-dipnom]");
  if(dipNomSel)dipNomSel.onchange=()=>{
    const dp=D.diplomes.find(x=>norm(x.nom||"")===norm(dipNomSel.value));
    if(!dp){dipNomSel.value=curDip.nom||"";return}
    D.activeDiplome=dp.id;ui.ref.filter={kind:"",value:""};saveData()};
  if(host.querySelector(".chainbox"))chainBind(host);
  const toSearch=v=>{ui.ref.q=v;ui.ref.view="search";paintRef();
    const t=document.getElementById("r-search");if(t)t.scrollIntoView({block:"center",behavior:"smooth"})};
  const toDico=(kind,q)=>{ui.ref.pane="definir";ui.ref.dk=kind==="blocs"?"competences":kind;ui.ref.dq=q;edArm=null;paintRef();
    const t=document.getElementById("dq");if(t)t.scrollIntoView({block:"center",behavior:"smooth"})};
  host.querySelectorAll("[data-mapec]").forEach(b=>b.onclick=()=>toDico("ecs",b.dataset.mapec));
  host.querySelectorAll("[data-mapcomp]").forEach(b=>b.onclick=()=>toSearch(b.dataset.mapcomp));
  host.querySelectorAll("[data-mapue]").forEach(b=>b.onclick=()=>{ui.ref.group="ue";toSearch(b.dataset.mapue)});
  const svgHost=host.querySelector(".radwrap");
  if(svgHost)radialWire(svgHost);
}

const REF_PANES={definir:"Définir",constituer:"Constituer",explorer:"Explorer"};
/* Définir : les éléments eux-mêmes, communs à tous les diplômes (ex-dictionnaire).
   Constituer : ce que la mention active retient et comment elle l'associe.
   Dans les deux, les blocs se définissent avec les compétences qu'ils regroupent. */
const DEF_PANES={ues:"Unités d'enseignement",ecs:"Enseignements constitutifs",blocs:"Blocs",competences:"Compétences"};
const CON_PANES={ues:"Unités d'enseignement",ecs:"Enseignements constitutifs",tableau:"Planification par semestre",valider:"Validation"};
const PANE_MAP={dico:"definir",ues:"constituer",ecs:"constituer",blocs:"constituer",competences:"constituer"};
const ORG_PANES={etab:"Établissement",diplome:"Diplômes et mentions",enseignants:"Enseignants",promos:"Promotions",affect:"Répartition de service",livrables:"Livrables"};
let edArm=null;
function paintOrg(){
  const pane=ui.org.pane||"diplome";
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
function paintEtab(host){
  const D=DATA;D.etab=D.etab||{nom:"",uai:"",ville:"",academie:""};
  const E=D.etab, f=(k,l,ph,cls)=>`<div class="field"><label for="et-${k}">${l}</label>
    <input type="text" id="et-${k}" data-et="${k}" value="${esc(E[k]||"")}" placeholder="${esc(ph)}" ${cls?`class="${cls}"`:""}></div>`;
  host.innerHTML=`<div class="panel"><div class="pick-head"><h3>Établissement${help("Le nom de l'établissement figure en tête des documents Word et Excel exportés.")}</h3></div>
    <div style="padding:14px;display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:13px">
      ${f("nom","Nom de l'établissement","Lycée …")}${f("uai","Code UAI (RNE)","0000000A","mono")}
      ${f("ville","Ville","")}${f("academie","Académie","")}
    </div></div>`;
  host.querySelectorAll("[data-et]").forEach(inp=>inp.oninput=()=>{E[inp.dataset.et]=inp.value;persistData()});
}
/* Répartition de service : pour chaque promotion, les EC de son année (dans le référentiel de sa mention)
   et le ou les enseignants qui les assurent. DATA.affect[promoId][ecId] = [idEnseignant…] */
function promoEcs(pr,as){
  const D=DATA, a=promoAnneeAt(pr,as||anneeScolaire(new Date())), R=refOf(D,pr.diplomeId);
  return R.ecs.map(r=>{const x=D.dico.ecs.find(y=>y.id===r.id)||{};const code=((r.codes||{})[a])||"";
      const u=D.dico.ues.find(y=>y.id===r.ueId)||{};
      return code?{id:r.id,code,nom:x.nom||code,couleur:x.couleur||u.couleur||"#9aa2ae",ue:u.nom||"",ueId:r.ueId||""}:null})
    .filter(Boolean).sort((p2,q)=>ecNum(p2.code)-ecNum(q.code));
}
/* Répartition de service historisée par année scolaire : DATA.affectH["2026-2027"][promoId][ecId] = [idEnseignant…].
   L'ancienne répartition non datée (DATA.affect) est rangée dans l'année scolaire en cours. */
const asOf=y=>y+"-"+(+y+1);
function affH(){DATA.affectH=DATA.affectH||{};
  if(DATA.affect){const y=anneeScolaire(new Date());DATA.affectH[y]=Object.assign(DATA.affectH[y]||{},DATA.affect);delete DATA.affect}
  return DATA.affectH}
function affectOf(prId,as){const H=affH(), y=as||anneeScolaire(new Date());H[y]=H[y]||{};return H[y][prId]||(H[y][prId]={})}
function affGet(prId,as){return ((affH()[as||anneeScolaire(new Date())])||{})[prId]||{}}
/* l'enseignant a-t-il eu cette promotion, une année ou une autre ? (mes élèves et mes anciens élèves) */
function teachesPromo(prId,tid){return !!tid&&Object.values(affH()).some(Y=>Object.values((Y||{})[prId]||{}).some(l=>(l||[]).includes(tid)))}
function paintAffect(host){
  const D=DATA, ASnow=anneeScolaire(new Date()), y0=asStart(ASnow);
  const years=[0,1,2,3,4].map(k=>asOf(y0-k));
  const AS=years.includes(ui.org.affY)?ui.org.affY:ASnow;ui.org.affY=AS;
  const yearSeg=`<div class="seg" style="margin-left:auto">${years.slice().reverse().map(y=>`<button type="button" data-afy="${y}" aria-pressed="${y===AS}">${y}${y===ASnow?" ●":""}</button>`).join("")}</div>`;
  const cur=promos.map(migPromoCohorte).filter(pr=>{const a=promoAnneeAt(pr,AS);return a>=1&&a<=promoDuree(pr)});
  const dIdx=id=>D.diplomes.findIndex(d=>d.id===id);
  cur.sort((x,y)=>(dIdx(x.diplomeId)-dIdx(y.diplomeId))||(promoAnneeAt(x,AS)-promoAnneeAt(y,AS)));
  if(!D.enseignants.length||!cur.length){
    host.innerHTML=`<div class="panel"><div class="pick-head"><h3>Répartition de service</h3></div><div class="empty">${!D.enseignants.length?"Ajoute d'abord les enseignants (volet Enseignants).":""} ${!cur.length?"Aucune promotion en "+esc(AS)+" (volet Promotions).":""}</div></div>`;
    host.querySelector(".pick-head").insertAdjacentHTML("beforeend",yearSeg);
    host.querySelectorAll("[data-afy]").forEach(b=>b.onclick=()=>{ui.org.affY=b.dataset.afy;paintOrg()});return}
  const pr=cur.find(x=>x.id===ui.org.aff)||cur[0];ui.org.aff=pr.id;
  const A=affectOf(pr.id,AS), ecs=promoEcs(pr,AS), a=promoAnneeAt(pr,AS);
  const dp=D.diplomes.find(d=>d.id===pr.diplomeId)||{};
  const T=id=>D.enseignants.find(t=>t.id===id);
  const ues=[...new Set(ecs.map(e=>e.ue))];
  const chips=ecId=>(A[ecId]||[]).filter(T).map(id=>`<span class="pill afp">${esc(T(id).nom)}<button type="button" data-afrm="${ecId}|${id}" aria-label="Retirer ${esc(T(id).nom)}">×</button></span>`).join("");
  const addSel=ecId=>{const rest=D.enseignants.filter(t=>!(A[ecId]||[]).includes(t.id));
    return rest.length?`<select data-afadd="${ecId}" aria-label="Ajouter un enseignant"><option value="">+ enseignant</option>${rest.map(t=>`<option value="${t.id}">${esc(t.nom)}</option>`).join("")}</select>`:""};
  const byT=D.enseignants.map(t=>({t,l:ecs.filter(e=>(A[e.id]||[]).includes(t.id))})).filter(x=>x.l.length);
  const sansProf=ecs.filter(e=>!(A[e.id]||[]).some(T)).length;
  host.innerHTML=`<div class="panel">
    <div class="pick-head"><h3>Répartition de service${help("Pour chaque promotion en cours, les enseignements constitutifs de son année dans le référentiel de sa mention, et qui les assure. À l'étape 1 d'une évaluation, choisir un ou plusieurs enseignants limite les EC proposés à ceux qu'ils assurent pour les promotions cochées.")}</h3>${yearSeg}</div>
    <div class="dkinds" style="padding:12px 14px 0">${cur.map(x=>`<button type="button" data-afp="${x.id}" aria-pressed="${x.id===pr.id}" title="${esc(x.nom)} · ${esc(dipLabel(D.diplomes.find(d=>d.id===x.diplomeId)||{}))}">${esc(promoShort(x)||x.nom)}</button>`).join("")}</div>
    <div class="pgsum"><div><b>${esc(promoShort(pr)||pr.nom)}</b> · ${esc(pr.nom)} · ${esc(dipLabel(dp))}</div>
      <div class="hint">Année ${a} en ${esc(AS)} · ${semsOfAnnee(a).join(" et ")} · ${ecs.length} EC${sansProf?` · <b>${sansProf} sans enseignant</b>`:" · tous attribués"}</div></div>
    ${ues.map(u=>`<div class="pgbloc"><div class="pgbh">${esc(tidy(u)||"Sans UE")}</div>
      ${ecs.filter(e=>e.ue===u).map(e=>`<div class="afrow">
        <span class="ec" style="--c:${esc(e.couleur)}"><span class="k">${esc(e.code)}</span>${esc(e.nom)}</span>
        <div class="afch">${chips(e.id)}${addSel(e.id)}</div></div>`).join("")}</div>`).join("")}
    ${byT.length?`<div class="pgbloc"><div class="pgbh">Par enseignant</div>${byT.map(x=>`<div class="afrow"><b>${esc(x.t.nom)}</b><div class="afch">${x.l.map(e=>`<span class="pill">${esc(e.code)} · ${esc(e.nom)}</span>`).join("")}</div></div>`).join("")}</div>`:""}
  </div>`;
  host.querySelectorAll("[data-afp]").forEach(b=>b.onclick=()=>{ui.org.aff=b.dataset.afp;paintOrg()});
  host.querySelectorAll("[data-afy]").forEach(b=>b.onclick=()=>{ui.org.affY=b.dataset.afy;paintOrg()});
  host.querySelectorAll("[data-afadd]").forEach(sel=>sel.onchange=()=>{if(!sel.value)return;
    const k=sel.dataset.afadd;A[k]=[...new Set([...(A[k]||[]),sel.value])];persistData();paintOrg()});
  host.querySelectorAll("[data-afrm]").forEach(b=>b.onclick=()=>{const [k,id]=b.dataset.afrm.split("|");
    A[k]=(A[k]||[]).filter(x=>x!==id);persistData();paintOrg()});
}
function paintPromosOrg(host){
  const D=DATA, AS=anneeScolaire(new Date());
  promos.forEach(migPromoCohorte);
  const dipIdx=id=>D.diplomes.findIndex(d=>d.id===id);
  const list=promos.slice().sort((a,b)=>(dipIdx(a.diplomeId)-dipIdx(b.diplomeId))||(b.debut-a.debut));
  const etat=pr=>{const a=promoAnneeAt(pr,AS), n=promoDuree(pr);
    return a<1?"à venir":a>n?"terminée":promoShort(pr)+" · Année "+a};
  const css="grid-template-columns:240px 92px minmax(0,1fr) 118px"+(MOD.eleves?" 120px":"")+" 92px";
  const openId=ui.org.promo||"";
  const moveOpts=(cur)=>dipVisibles().map(dp=>{const ps=list.filter(x=>x.diplomeId===dp.id);
    return ps.length?`<optgroup label="${esc(dipLabel(dp))}">${ps.map(x=>`<option value="${x.id}" ${x.id===cur?"selected":""}>${esc(x.nom||"Sans nom")}</option>`).join("")}</optgroup>`:""}).join("");
  const rows=list.map(pr=>{
    const n=(pr.liste||[]).length, open=MOD.eleves&&openId===pr.id;
    let h=`<div class="ed" style="${css}">
      <select data-pd="${pr.id}" aria-label="Diplôme et mention">${dipVisibles().map(dp=>`<option value="${dp.id}" ${dp.id===pr.diplomeId?"selected":""}>${esc(dipLabel(dp))}</option>`).join("")}</select>
      <input type="number" min="2000" max="2100" value="${pr.debut}" data-py="${pr.id}" class="mono" aria-label="Année de début">
      <span class="ro mono" title="Code du diplôme · début · fin (${promoDuree(pr)} ans)">${esc(pr.nom)}</span>
      <span class="num">${esc(etat(pr))}</span>
      ${MOD.eleves?`<button class="btn ghost" data-po="${pr.id}" aria-expanded="${open}">${n} élève${n>1?"s":""} ${open?"▴":"▾"}</button>`:""}
      ${delBtn("pr"+pr.id,"Supprimer")}</div>`;
    if(open){
      const scss="grid-template-columns:minmax(0,1fr) minmax(0,1fr) 300px 92px";
      h+=`<div class="pdet">
        ${(pr.liste||[]).map(e=>`<div class="ed" style="${scss}">
          <input type="text" value="${esc(completerPersonne(e).prenom)}" data-sp="${pr.id}|${e.id}" placeholder="Prénom" aria-label="Prénom de l'élève">
          <input type="text" value="${esc(e.nomFam)}" data-sn="${pr.id}|${e.id}" placeholder="Nom" aria-label="Nom de l'élève">
          <select data-sm="${pr.id}|${e.id}" aria-label="Promotion de l'élève" title="Changer de promotion, ou de mention">${moveOpts(pr.id)}</select>
          ${delBtn("st"+pr.id+"|"+e.id,"Retirer")}</div>`).join("")||`<div class="empty">Aucun élève dans cette promotion.</div>`}
        <div class="padd"><textarea data-sa="${pr.id}" rows="2" placeholder="Ajouter des élèves — un par ligne : prénom puis nom, ou deux colonnes Prénom / Nom collées d'un tableur"></textarea>
          <button class="btn ghost" data-sab="${pr.id}">Ajouter</button></div>
      </div>`;
    }
    return h;
  }).join("");
  host.innerHTML=edPanel("Promotions",promos.length,`<button class="btn ghost" id="prAdd">+ Promotion</button>`,
    {css,cells:["Diplôme · mention","Début","Promotion","En "+AS,...(MOD.eleves?["Élèves"]:[]),""]},rows,
    "Une promotion suit un groupe d'un diplôme et d'une mention de son entrée à sa sortie. Choisis d'abord le diplôme et la mention, puis l'année de début : le nom se compose seul avec le code du diplôme, l'année de début et l'année de fin, qui dépend de la durée du diplôme (Diplômes et mentions) — DNO-2025-2028 pour un DN MADE mention Objet en trois ans commencé en 2025. L'année de formation se déduit de l'année scolaire, et l'étape 1 de l'évaluation propose les promotions de la mention active."
    +(MOD.eleves?" Ouvre « élèves » pour gérer la liste : renommer, retirer, ajouter plusieurs noms d'un coup, ou faire passer un élève dans une autre promotion, y compris d'une autre mention. Ses résultats déjà saisis restent attachés aux évaluations de son ancienne promotion.":" Le module « Élèves et promotions » (Paramètres) permet en plus de gérer la liste des élèves de chaque promotion."));
  const save2=()=>{savePromos();if(ui.tab!=="org")return;};
  const P=id=>promos.find(x=>x.id===id);
  const rename=(pr,fn)=>{fn();pr.nom=promoNomAuto(pr)};
  host.querySelector("#prAdd").onclick=()=>{
    const pr={id:uid(),nom:"",debut:asStart(AS),diplomeId:D.activeDiplome,eleves:"",liste:[]};
    pr.nom=promoNomAuto(pr);promos.push(pr);savePromos();paintOrg();
    const f=host.querySelector(`[data-pd="${pr.id}"]`);if(f)f.focus()};
  host.querySelectorAll("[data-pd]").forEach(i=>i.onchange=()=>{const pr=P(i.dataset.pd);rename(pr,()=>pr.diplomeId=i.value);save2();paintOrg()});
  host.querySelectorAll("[data-py]").forEach(i=>i.onchange=()=>{const pr=P(i.dataset.py),v=parseInt(i.value,10);
    if(!v)return;rename(pr,()=>pr.debut=v);save2();paintOrg()});
  host.querySelectorAll("[data-po]").forEach(b=>b.onclick=()=>{ui.org.promo=ui.org.promo===b.dataset.po?"":b.dataset.po;paintOrg()});
  host.querySelectorAll("[data-sp],[data-sn]").forEach(i=>i.oninput=()=>{const [pid,eid]=(i.dataset.sp||i.dataset.sn).split("|"),pr=P(pid);
    const e=pr.liste.find(x=>x.id===eid);if(!e)return;completerPersonne(e);
    if(i.dataset.sp!==undefined)e.prenom=i.value;else e.nomFam=i.value;
    e.nom=composerNom(e.prenom,e.nomFam);migPromo(pr);save2()});
  host.querySelectorAll("[data-sm]").forEach(sel=>sel.onchange=()=>{const [pid,eid]=sel.dataset.sm.split("|"),from=P(pid),to=P(sel.value);
    if(!to||to===from)return;const k=from.liste.findIndex(x=>x.id===eid);if(k<0)return;
    const e=from.liste.splice(k,1)[0];to.liste.push(e);migPromo(from);migPromo(to);save2();paintOrg();
    toast(e.nom+" → "+(to.nom||"promotion")+(to.diplomeId!==from.diplomeId?" ("+dipLabel(D.diplomes.find(d=>d.id===to.diplomeId)||{})+")":""))});
  host.querySelectorAll("[data-sab]").forEach(b=>b.onclick=()=>{const pr=P(b.dataset.sab), ta=host.querySelector(`[data-sa="${b.dataset.sab}"]`);
    const lignes=lignesNoms(ta.value);if(!lignes.length)return;
    lignes.forEach(l=>pr.liste.push(nouvellePersonne(newId("s"),l)));migPromo(pr);save2();paintOrg()});
  host.querySelectorAll("[data-eddel]").forEach(b=>b.onclick=()=>armDel(b.dataset.eddel,()=>{
    const id=b.dataset.eddel;
    if(id.startsWith("pr")){const pid=id.slice(2);promos=promos.filter(x=>x.id!==pid);if(F.promoId===pid){F.promoId="";save()}}
    else{const [pid,eid]=id.slice(2).split("|"),pr=P(pid);pr.liste=pr.liste.filter(x=>x.id!==eid);migPromo(pr)}
    savePromos();paintOrg()}));
}
function paintRef(){
  // états retenus d'une version antérieure, où chaque volet était un menu
  if(PANE_MAP[ui.ref.pane]){
    if(ui.ref.pane!=="dico")ui.ref.cp=ui.ref.pane==="blocs"?"competences":ui.ref.pane;
    ui.ref.pane=PANE_MAP[ui.ref.pane];
  }
  if(!REF_PANES[ui.ref.pane])ui.ref.pane="explorer";
  if(!KINDS.includes(ui.ref.dk))ui.ref.dk="ues";
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
  if(pane==="definir")return paintDico(document.getElementById("refPane"));
  paintConstituer(document.getElementById("refPane"));
}
function subNav(attr,cur,n,panes){
  return `<div class="dkinds">${Object.entries(panes).map(([x,lbl])=>
    `<button type="button" data-${attr}="${x}" aria-pressed="${x===cur}">${esc(lbl)}${n(x)?`<span class="n">${esc(n(x))}</span>`:""}</button>`).join("")}</div>`;
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
    <p id="rnvD">Avant une première évaluation, le référentiel doit être vérifié et validé par l'enseignant, dans Référentiel › Constituer › Validation. C'est vous qui en êtes responsable, pas l'hébergeur ni le développeur de DNMAX.</p>
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
function paintMatrice(host){
  const D=DATA, dipL=REF.meta.diplome||"—";
  const sem=SEMS.includes(ui.ref.msem)?ui.ref.msem:"";
  const ueG=D.ues.map(u=>({u,ecs:D.ecs.filter(e=>e.ueId===u.id).sort((a,b)=>ecOrd(a)-ecOrd(b))}));
  const orph=D.ecs.filter(e=>!D.ues.some(u=>u.id===e.ueId));
  if(orph.length)ueG.push({u:{id:"",nom:"Sans unité",couleur:"#9aa2ae"},ecs:orph});
  const vis=e=>!sem||(e.sems||[]).includes(sem);
  const groups=ueG.map(g=>({u:g.u,ecs:g.ecs.filter(vis)})).filter(g=>g.ecs.length);
  const semsOf=e=>SEMS.filter(x=>(e.sems||[]).includes(x)&&(!sem||x===sem));
  const cols=[];let ecI=0;
  groups.forEach(g=>g.ecs.forEach(e=>{
    const ss=semsOf(e), n=ss.length||1;
    (ss.length?ss:[""]).forEach((sm,j)=>cols.push({u:g.u,e,sm,alt:ecI%2===1,fin:j===n-1}));
    ecI++;
  }));
  cols.forEach((x,i)=>{x.finUe=x.fin&&(!cols[i+1]||cols[i+1].u.id!==x.u.id)});
  const spanEc=e=>Math.max(1,semsOf(e).length);
  const spanUe=g=>g.ecs.reduce((a,e)=>a+spanEc(e),0);
  const blocs=D.blocs.slice().sort((a,b)=>(+a.num||0)-(+b.num||0));
  const compOf=num=>D.competences.filter(c=>String(c.bloc)===String(num)).sort((a,b)=>ecNum(a.code)-ecNum(b.code));
  const sansBloc=D.competences.filter(c=>!blocs.some(b=>String(b.num)===String(c.bloc)));
  const nLien=c=>(c.ecs||[]).filter(l=>cols.some(x=>x.e.id===l.id&&x.sm&&(l.sems||[]).includes(x.sm))).length;
  // ajouts depuis « Définir »
  const addSel=(kind,label)=>{
    const inRef=new Set(D[kind].map(x=>x.id));
    const cand=D.dico[kind].filter(x=>!inRef.has(x.id));
    const lbl=x=>kind==="ecs"?(x.nom||"Enseignement"):kind==="blocs"?("Bloc "+x.num+" · "+x.nom)
      :kind==="competences"?(x.code+" · "+String(x.libelle||"").slice(0,60)):x.nom;
    return `<select class="addsel" data-add="${kind}" aria-label="${esc(label)}">
      <option value="">+ ${esc(label)}…</option>
      ${cand.map(x=>`<option value="${esc(x.id)}">${esc(lbl(x))}</option>`).join("")}
    </select>`;
  };
  const bord=x=>(x.alt?" alt":"")+(x.finUe?" ueend":x.fin?" ecend":"");
  const mxDel=(id,t)=>`<button type="button" class="btn ghost mxdel${edArm==="mx"+id?" danger":""}" data-mxdel="${esc(id)}" title="${esc(t)}" aria-label="${esc(t)}">${edArm==="mx"+id?"Confirmer":"×"}</button>`;
  const cell=(c,x)=>{
    const e=x.e, sm=x.sm;
    if(!sm)return `<td class="hs${bord(x)}"></td>`;
    const l=lienEc(c,e.id), on=!!l&&(l.sems||[]).includes(sm);
    return `<td class="${bord(x).trim()}"><button type="button" class="xc${on?" on":""}" data-tog="${esc(c.id)}|${esc(e.id)}|${sm}"
      aria-pressed="${on}" title="${esc(c.code+" · "+ecName(e)+" · "+sm+(ecCodeAt(e,sm)?" · "+ecCodeAt(e,sm):""))}">${on?"✓":""}</button></td>`;
  };
  const ligne=(c,i)=>`<tr>
    <th class="st cmp"><button type="button" class="matbtn" data-mapcomp="${esc(c.code)}"><b>${esc(c.code)}</b> <span>${esc(c.libelle||"")}</span></button>
      ${mxDel("c:"+c.id,"Retirer "+c.code+" du référentiel")}
      <select class="blocsel" data-cb2="${D.competences.indexOf(c)}" aria-label="Bloc de ${esc(c.code)}">
        <option value="">sans bloc</option>
        ${D.blocs.map(b=>`<option value="${esc(b.num)}" ${String(b.num)===String(c.bloc)?"selected":""}>Bloc ${esc(b.num)}</option>`).join("")}
      </select></th>
    ${cols.map(x=>cell(c,x)).join("")}
    <td class="n">${nLien(c)}</td>
    <td class="n"></td></tr>`;
  const bande=(num,nom,cs,bid)=>`<tr class="band" style="--c:${esc(BLOC_TINT)}">
    <th colspan="${cols.length+3}"><span class="bl">${esc("Bloc "+num+(nom?" · "+nom:""))}
      <span class="n">${cs.length} compétence${cs.length>1?"s":""}</span>
      ${bid?mxDel("b:"+bid,"Retirer le bloc "+num+" du référentiel"):""}
      </span></th></tr>`;
  // ajout direct dans le tableau : une compétence à la fin de chaque bloc, un bloc à la fin du tableau
  const inRef=k=>new Set(D[k].map(x=>x.id));
  const candC=D.dico.competences.filter(x=>!inRef("competences").has(x.id))
    .sort((a,b)=>ecNum(a.code)-ecNum(b.code));
  const candB=D.dico.blocs.filter(x=>!inRef("blocs").has(x.id)).sort((a,b)=>(+a.num||0)-(+b.num||0));
  const addC=num=>{if(!candC.length)return "";
    const opt=x=>`<option value="${esc(x.id)}">${esc(x.code+" · "+String(x.libelle||"").slice(0,70))}</option>`;
    const du=candC.filter(x=>num!==""&&String(x.bloc)===String(num)), aut=candC.filter(x=>!du.includes(x));
    return `<tr class="mxaddrow"><th class="st cmp"><select class="addsel" data-mxaddc="${esc(num)}" aria-label="Ajouter une compétence${num!==""?" au bloc "+esc(num):""}">
      <option value="">+ Compétence${num!==""?" au bloc "+esc(num):""}…</option>
      ${du.length&&aut.length?`<optgroup label="Bloc ${esc(num)}">${du.map(opt).join("")}</optgroup><optgroup label="Autres">${aut.map(opt).join("")}</optgroup>`
        :candC.map(opt).join("")}
    </select></th><td colspan="${cols.length+2}"></td></tr>`};
  const addB=()=>candB.length?`<tr class="mxaddrow"><th class="st cmp"><select class="addsel" data-mxaddb aria-label="Ajouter un bloc">
      <option value="">+ Bloc…</option>${candB.map(x=>`<option value="${esc(x.id)}">${esc("Bloc "+x.num+(x.nom?" · "+x.nom:""))}</option>`).join("")}
    </select></th><td colspan="${cols.length+2}"></td></tr>`:"";
  host.innerHTML=`<div class="panel">
    <div class="semfilter"><span class="sflab">Semestre</span>
      <div class="seg">${[["","Tous"]].concat(SEMS.map(x=>[x,x])).map(([v,l])=>
        `<button type="button" data-msem="${v}" aria-pressed="${v===sem}">${esc(l)}</button>`).join("")}</div>
      </div>
    ${cols.length?`<div class="tw mtxw" id="mtxw"><table class="mx mtx" style="--rh:58px">
      <thead>
        <tr><th class="st" rowspan="3">Compétence</th>
          ${groups.map(g=>`<th colspan="${spanUe(g)}" class="an ueend" style="--c:${esc(g.u.couleur||"#9aa2ae")}">
            <span>${esc(g.u.nom)}</span></th>`).join("")}
          <th class="n" rowspan="3">EC</th><th rowspan="3"></th></tr>
        <tr>${groups.map((g,gi)=>g.ecs.map((e,ei)=>`<th colspan="${spanEc(e)}" class="ecn ${ei===g.ecs.length-1?"ueend":"ecend"}" style="--c:${esc(e.couleur||"#9aa2ae")}">
          <span class="nm">${esc(ecName(e))}</span></th>`).join("")).join("")}</tr>
        <tr>${cols.map(x=>`<th class="ecc2${bord(x)}" style="--c:${esc(x.e.couleur||"#9aa2ae")}">
          <span class="sm">${esc(x.sm||"—")}</span>
          <span class="rotbox"><b class="rot">${esc(x.sm?(ecCodeAt(x.e,x.sm)||"—"):"—")}</b></span></th>`).join("")}</tr>
      </thead>
      <tbody>
        ${blocs.map(b=>{const cs=compOf(b.num);return bande(b.num,b.nom,cs,b.id)+cs.map(ligne).join("")+addC(b.num)}).join("")}
        ${sansBloc.length?bande("—","compétences sans bloc",sansBloc,null)+sansBloc.map(ligne).join("")+addC(""):""}
        ${!blocs.length&&!sansBloc.length?addC(""):""}
        ${addB()}
      </tbody></table></div>`:`<div class="empty">Aucun enseignement dans ce référentiel : ajoute-en un avec « + Enseignement ».</div>`}
  </div>`;
  // l'en-tête reste visible : on mesure ses deux premiers rangs pour les empiler
  const tbl=host.querySelector("table.mtx");
  if(tbl){const r=tbl.querySelectorAll("thead tr");
    const h1=r[0]?r[0].getBoundingClientRect().height:34, h2=r[1]?r[1].getBoundingClientRect().height:40;
    tbl.style.setProperty("--h1",h1.toFixed(1)+"px");tbl.style.setProperty("--h2",h2.toFixed(1)+"px")}
  host.querySelectorAll("[data-msem]").forEach(b=>b.onclick=()=>{ui.ref.msem=b.dataset.msem;edArm=null;paintRef()});
  host.querySelectorAll("[data-mxaddc]").forEach(sel=>sel.onchange=()=>{
    const v=sel.value;if(!v)return;const R=refOf(D,D.activeDiplome);
    if(!R.competences.some(r=>r.id===v)){const r=assocFor(D.activeDiplome,"competences",v);
      if(sel.dataset.mxaddc!=="")r.bloc=sel.dataset.mxaddc;R.competences.push(r)}
    saveData(true,true);toast("Compétence ajoutée au référentiel.")});
  host.querySelectorAll("[data-mxaddb]").forEach(sel=>sel.onchange=()=>{
    const v=sel.value;if(!v)return;const R=refOf(D,D.activeDiplome);
    if(!R.blocs.some(r=>r.id===v))R.blocs.push(assocFor(D.activeDiplome,"blocs",v));
    saveData(true,true);toast("Bloc ajouté au référentiel.")});
  host.querySelectorAll("[data-mxdel]").forEach(b=>b.onclick=()=>armDel("mx"+b.dataset.mxdel,()=>{
    const [t,id]=b.dataset.mxdel.split(/:(.*)/);const R=refOf(D,D.activeDiplome);
    refRemove(R,t==="b"?"blocs":"competences",id);
    saveData(true,true);toast(t==="b"?"Bloc retiré du référentiel (ses compétences restent, sans bloc).":"Compétence retirée du référentiel.")}));
  host.querySelectorAll("[data-add]").forEach(sel=>sel.onchange=()=>{
    const kind=sel.dataset.add, v=sel.value;if(!v)return;
    const R=refOf(D,D.activeDiplome);
    if(!R[kind].some(r=>r.id===v))R[kind].push(assocFor(D.activeDiplome,kind,v));
    saveData(true,true);toast("Ajouté au référentiel.")});
  host.querySelectorAll("[data-tog]").forEach(b=>b.onclick=()=>{
    const [cid,eid,sm]=b.dataset.tog.split("|");
    const c=D.competences.find(x=>x.id===cid);if(!c)return;
    let l=lienEc(c,eid);
    if(!l){l={id:eid,sems:[]};c.ecs=[...(c.ecs||[]),l]}
    l.sems=(l.sems||[]).includes(sm)?l.sems.filter(x=>x!==sm):[...(l.sems||[]),sm].sort((x,y)=>SEMS.indexOf(x)-SEMS.indexOf(y));
    c.ecs=(c.ecs||[]).filter(x=>(x.sems||[]).length);
    c.ecIds=c.ecs.map(x=>x.id);
    const on=!!lienEc(c,eid)&&(lienEc(c,eid).sems||[]).includes(sm);
    b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on));
    b.textContent=on?"✓":"";
    const row=b.closest("tr"), n=row&&row.querySelector("td.n");
    if(n)n.textContent=String(nLien(c));
    saveData(false)});
  host.querySelectorAll("[data-mapcomp]").forEach(b=>b.onclick=()=>{
    ui.ref.pane="definir";ui.ref.dk="competences";ui.ref.dq=b.dataset.mapcomp;paintRef();window.scrollTo({top:0,behavior:"smooth"})});
  host.querySelectorAll("[data-cb2]").forEach(sel=>sel.onchange=()=>{D.competences[+sel.dataset.cb2].bloc=sel.value;saveData()});
  host.querySelectorAll("[data-eddel]").forEach(b=>b.onclick=()=>armDel(b.dataset.eddel,()=>{
    const id=b.dataset.eddel, i=+id.slice(2);
    if(id.startsWith("mc")){const c=D.competences.splice(i,1)[0];}
    else if(id.startsWith("me")){const e=D.ecs.splice(i,1)[0];
      D.competences.forEach(c=>{c.ecs=(c.ecs||[]).filter(x=>x.id!==e.id);c.ecIds=c.ecs.map(x=>x.id)})}
    else if(id.startsWith("mu")){const u=D.ues.splice(i,1)[0];D.ecs.forEach(e=>{if(e.ueId===u.id)e.ueId=""})}
    else if(id.startsWith("mb"))D.blocs.splice(i,1);
    saveData()}));
}
/* Constituer le référentiel d'une mention, en 4 étapes comme une évaluation :
   1. les UE retenues, 2. les EC, 3. la planification par semestre (tableau compétences × EC), 4. la validation datée. */
function paintConstituer(host){
  const D=DATA, k=ui.ref.cp, keys=Object.keys(CON_PANES), si=keys.indexOf(k);
  const dipNoms=[];D.diplomes.forEach(dp=>{const n=(dp.nom||"").trim();
    if(!dipNoms.some(x=>norm(x)===norm(n)))dipNoms.push(n)});
  const curDip=D.diplomes.find(x=>x.id===D.activeDiplome)||{};
  const ments=D.diplomes.filter(dp=>norm(dp.nom||"")===norm(curDip.nom||""));
  const vs=versionsOf(D.activeDiplome), va=versionActive(D.activeDiplome), ajour=refAJour(D.activeDiplome);
  const etat=!va?`<span class="vst draft">Jamais validé — brouillon</span>`
    :!va.attestation?`<span class="vst mod" style="white-space:nowrap">À vérifier et valider</span>`
    :ajour?`<span class="vst ok">À jour · version du ${esc(frDate(va.date))}</span>`
    :`<span class="vst mod">Modifié depuis la version du ${esc(frDate(va.date))}</span>`;
  const plan=D.competences.filter(c=>(c.ecs||[]).some(x=>(x.sems||[]).length)).length;
  const sums={ues:`${D.ues.length} <em>UE retenue${D.ues.length>1?"s":""}</em>`,
    ecs:`${D.ecs.length} <em>EC</em>${D.ecs.filter(e=>!e.ueId).length?` <em>· ${D.ecs.filter(e=>!e.ueId).length} sans UE</em>`:""}`,
    tableau:`${plan} <em>/ ${D.competences.length} compétences planifiées</em>`,
    valider:!va?`<em>jamais validé</em>`:!va.attestation?`<em>à vérifier et valider</em>`:ajour?`<em>à jour · ${esc(frDate(va.date))}</em>`:`<em>modifié depuis le ${esc(frDate(va.date))}</em>`};
  const steps=`<ol class="steps">${keys.map((x,j)=>`<li><button type="button" data-cp="${x}" ${x===k?'aria-current="true"':""}><span class="hd"><b>${j+1}</b><span class="l">${esc(CON_PANES[x])}</span></span><span class="s">${sums[x]}</span></button></li>`).join("")}</ol>`;
  const nav=`<div style="display:flex;gap:8px;justify-content:space-between;margin:16px 0 4px">
    ${si>0?`<button type="button" class="btn ghost" data-cp="${keys[si-1]}">← ${esc(CON_PANES[keys[si-1]])}</button>`:"<span></span>"}
    ${si<keys.length-1?`<button type="button" class="btn primary" data-cp="${keys[si+1]}">${si+2}. ${esc(CON_PANES[keys[si+1]])} →</button>`:""}</div>`;
  const valider=`<div class="panel"><div class="pick-head"><h3>Valider le référentiel · ${esc(dipLabel(curDip))}</h3>${etat}</div>
      <div class="panel-body" style="display:flex;flex-direction:column;gap:12px">
        <div class="hint">Valider fige l'état du référentiel de cette mention à une date. À la validation, tu choisis les promotions en cours qui passent à cette version ; les autres gardent la leur, et les évaluations déjà enregistrées restent sur le référentiel sur lequel elles ont été faites.</div>
        <div class="hint">Aucune évaluation ne peut être créée pour une promotion tant que son référentiel n'a pas été vérifié et validé ici. C'est l'enseignant qui est responsable du référentiel, y compris quand il est livré avec DNMAX ou reçu d'un collègue.</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px"><span><b>${D.ues.length}</b> UE</span><span><b>${D.ecs.length}</b> EC</span><span><b>${D.blocs.length}</b> blocs</span><span><b>${D.competences.length}</b> compétences</span><span><b>${plan}</b> planifiées sur un semestre</span></div>
        ${D.competences.length-plan?`<div class="hint" style="color:var(--signal)">${D.competences.length-plan} compétence${D.competences.length-plan>1?"s ne sont rattachées":" n'est rattachée"} à aucun semestre (étape 3).</div>`:""}
        <label class="sw" style="align-items:flex-start;font-size:13px"><input type="checkbox" id="cAtteste" aria-describedby="cAttErr">
          <span>J'ai vérifié ce référentiel et j'en assume le contenu : l'hébergeur et le développeur de DNMAX n'en sont pas responsables.</span></label>
        <div class="hint" id="cAttErr" role="alert" style="color:var(--signal)"></div>
        <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">
          <input type="date" id="cDate" value="${esc(new Date().toISOString().slice(0,10))}" aria-label="Date de la version" style="width:auto">
          <input type="text" id="cNote" placeholder="Note (facultatif)" style="width:auto;flex:1 1 200px" aria-label="Note de version">
          <button class="btn primary" id="cValid">Valider cette version</button></div>
      </div></div>`
    +(vs.length?`<div class="panel vpanel" style="margin-top:18px"><div class="pick-head"><h3>Versions du référentiel</h3><span class="count">${vs.length}</span></div>
      <div>${vs.map((v,i)=>`<div class="vrow${v.id===(va||{}).id?" on":""}">
        <b>${esc(frDate(v.date))}</b>
        <span class="n">${v.snap.ues.length} UE · ${v.snap.ecs.length} EC · ${v.snap.blocs.length} blocs · ${v.snap.competences.length} compétences</span>
        <span class="note">${esc(v.note||"")}</span>
        ${v.id===(va||{}).id?`<span class="vst ok">en vigueur</span>`:""}
        ${v.attestation?`<span class="hint" style="font-size:11.5px">validée par vous le ${esc(frDate(v.attestation))}</span>`
          :`<span class="vst draft" style="white-space:nowrap">non validée par vous</span><button class="btn ghost" data-vatt="${esc(v.id)}" title="Cochez d'abord l'attestation ci-dessus">Valider</button>`}
        ${(()=>{const u=versionUsage(D.activeDiplome,v.id);return (u.ps.length||u.fs.length)?`<span class="hint" style="font-size:11.5px;flex-basis:100%">Utilisée par ${u.ps.length?u.ps.map(p=>esc(p.nom||"promo")).join(", "):"aucune promotion"}${u.fs.length?` · ${u.fs.length} évaluation${u.fs.length>1?"s":""}`:""}</span>`:""})()}
        ${(v.id!==(va||{}).id||!ajour)?`<button class="btn ghost" data-vres="${v.id}">Rétablir</button>`:""}
        ${(()=>{const u=versionUsage(D.activeDiplome,v.id);return (u.ps.length||u.fs.length)?"":`<button class="btn ghost ${edArm==="v"+i?"danger":""}" data-eddel="v${i}">${edArm==="v"+i?"Confirmer":"Supprimer"}</button>`})()}
      </div>`).join("")}</div></div>`:"");
  host.innerHTML=`<div class="cbar">
      <label class="cf"><span>Diplôme</span>
        <select id="cDip" aria-label="Diplôme">${dipNoms.map(n=>`<option value="${esc(n)}" ${norm(n)===norm(curDip.nom||"")?"selected":""}>${esc(n||"—")}</option>`).join("")}</select></label>
      <label class="cf"><span>Mention</span>
        <select id="cMen" aria-label="Mention">${ments.map(dp=>`<option value="${dp.id}" ${dp.id===D.activeDiplome?"selected":""}>${esc(dp.mention||"sans mention")}</option>`).join("")}</select></label>
      ${etat}
    </div>`+steps+`<div id="cpMain"></div>`+nav;
  host.querySelectorAll("[data-cp]").forEach(b=>b.onclick=()=>{ui.ref.cp=b.dataset.cp;edArm=null;paintRef();window.scrollTo({top:0,behavior:"smooth"})});
  host.querySelector("#cDip").onchange=e=>{
    const dp=D.diplomes.find(x=>norm(x.nom||"")===norm(e.target.value));
    if(dp){D.activeDiplome=dp.id;ui.ref.filter={kind:"",value:""};saveData()}};
  host.querySelector("#cMen").onchange=e=>{D.activeDiplome=e.target.value;ui.ref.filter={kind:"",value:""};saveData()};
  const main=host.querySelector("#cpMain");
  if(k==="valider"){main.innerHTML=valider;
    // sans l'attestation cochée, rien n'est validé
    const atteste=()=>{const c=main.querySelector("#cAtteste"), err=main.querySelector("#cAttErr");
      if(c.checked){err.textContent="";c.removeAttribute("aria-invalid");return true}
      err.textContent="Cochez d'abord la case : vous attestez avoir vérifié ce référentiel et en assumer le contenu.";
      c.setAttribute("aria-invalid","true");c.focus();return false};
    main.querySelector("#cAtteste").onchange=e=>{if(e.target.checked)atteste()};
    main.querySelector("#cValid").onclick=()=>{if(atteste())validerVersion(main.querySelector("#cDate").value,main.querySelector("#cNote").value)};
    main.querySelectorAll("[data-vatt]").forEach(b=>b.onclick=()=>{if(!atteste())return;
      const v=versionsOf(D.activeDiplome).find(x=>x.id===b.dataset.vatt);if(!v)return;
      v.attestation=new Date().toISOString().slice(0,10);persistData();REF=computeREF();paintRef();
      toast("Version du "+frDate(v.date)+" validée par vous.")});
    main.querySelectorAll("[data-vres]").forEach(b=>b.onclick=()=>restaurerVersion(b.dataset.vres));
    main.querySelectorAll(".vpanel [data-eddel]").forEach(b=>b.onclick=()=>armDel(b.dataset.eddel,()=>{
      const i=+b.dataset.eddel.slice(1), v=versionsOf(D.activeDiplome).splice(i,1)[0];
      if(v&&(D.valide||{})[D.activeDiplome]===v.id){D.valide=Object.assign({},D.valide);delete D.valide[D.activeDiplome]}
      persistData();paintRef()}));
  }
  else if(k==="tableau")paintMatrice(main);
  else paintEditor(k,main);
}
function paintDico(host){
  const D=DATA, k=ui.ref.dk;
  host.innerHTML=subNav("dk",k,x=>String(D.dico[x].length),DEF_PANES)+`<div id="dkMain"></div>`;
  host.querySelectorAll("[data-dk]").forEach(b=>b.onclick=()=>{ui.ref.dk=b.dataset.dk;ui.ref.dq="";edArm=null;paintRef()});
  dicoTable(k,host.querySelector("#dkMain"),true);
}
function dicoTable(host0,host1,filtrable){
  const k=host0, host=host1, D=DATA, q=filtrable?norm((ui.ref.dq||"").trim()):"";
  const all=D.dico[k];
  const txt=x=>[x.code,x.num,x.nom,x.libelle].filter(Boolean).join(" ");
  const list=all.filter(x=>!q||norm(txt(x)).includes(q));
  const L={
    ues:{css:"grid-template-columns:66px 92px minmax(0,1fr) 92px",cells:["Couleur","Code","Nom",""],
      row:(x,i)=>`<input type="color" value="${esc(x.couleur||"#9aa2ae")}" data-df="couleur" data-di="${i}" aria-label="Couleur">
        <input type="text" value="${esc(x.code||"")}" data-df="code" data-di="${i}" placeholder="UE 1" class="mono" aria-label="Code">
        <input type="text" value="${esc(x.nom||"")}" data-df="nom" data-di="${i}" aria-label="Nom">`},
    ecs:{css:"grid-template-columns:66px minmax(0,1fr) 92px",cells:["Couleur","Intitulé",""],
      row:(x,i)=>`<input type="color" value="${esc(x.couleur||"#9aa2ae")}" data-df="couleur" data-di="${i}" aria-label="Couleur">
        <input type="text" value="${esc(x.nom||"")}" data-df="nom" data-di="${i}" placeholder="Intitulé de l'enseignement" aria-label="Intitulé">`},
    blocs:{css:"grid-template-columns:64px minmax(0,1fr) 92px",cells:["N°","Intitulé",""],
      row:(x,i)=>`<input type="text" value="${esc(x.num||"")}" data-df="num" data-di="${i}" class="mono" aria-label="Numéro">
        <input type="text" value="${esc(x.nom||"")}" data-df="nom" data-di="${i}" aria-label="Intitulé">`},
    competences:{css:"grid-template-columns:80px minmax(0,1fr) 92px",cells:["Code","Intitulé",""],
      row:(x,i)=>`<input type="text" value="${esc(x.code||"")}" data-df="code" data-di="${i}" class="mono" aria-label="Code">
        <textarea data-df="libelle" data-di="${i}" rows="2" aria-label="Intitulé">${esc(x.libelle||"")}</textarea>`}
  }[k];
  host.innerHTML=edPanel("Définir · "+KIND_LBL[k],list.length+(q?" / "+all.length:""),
      (filtrable?`<input type="text" id="dq" value="${esc(ui.ref.dq||"")}" placeholder="Filtrer…" style="width:auto;flex:0 1 180px">`:"")
      +`<button class="btn ghost" id="dAdd">+ Nouveau</button>`,
      {css:L.css,cells:L.cells},
      list.map(x=>{const i=all.indexOf(x);
        return `<div class="ed" style="${L.css};align-items:start">${L.row(x,i)}${delBtn("dk"+i,"Effacer")}</div>`}).join(""),
      filtrable
        ?"« Définir » rassemble les éléments eux-mêmes, quel que soit le diplôme : un nom ou un intitulé modifié ici change partout où il sert. Quelle mention retient quoi ne se décide pas ici mais dans « Constituer », avec « + Ajouter au référentiel… » et « Retirer ». « Effacer » supprime l'élément de la définition et de tous les référentiels."
        :"Les blocs regroupent les compétences : on les définit ici, et c'est dans « Constituer » que chaque compétence rejoint le sien.");
  const dq=host.querySelector("#dq");
  if(dq)dq.oninput=e=>{ui.ref.dq=e.target.value;paintRef();
    const f=document.getElementById("dq");if(f){f.focus();f.setSelectionRange(f.value.length,f.value.length)}};
  host.querySelector("#dAdd").onclick=()=>{
    const x={id:newId(k[0])};DICO_F[k].forEach(f=>x[f]="");
    if(x.couleur!==undefined)x.couleur="#9aa2ae";
    if(k==="ues")x.nom="Nouvelle UE";if(k==="ecs"){x.code="EC ";x.couleur="#9aa2ae"}if(k==="competences")x.code="C";
    if(k==="blocs")x.num=String(D.dico.blocs.length+1);
    D.dico[k].push(x);ui.ref.dq="";saveData(true,true);
    const rows=host.querySelectorAll(".ed");const f=rows.length&&rows[rows.length-1].querySelector('input[type="text"],textarea');if(f)f.focus()};
  host.querySelectorAll("[data-df]").forEach(inp=>inp.oninput=()=>{
    D.dico[k][+inp.dataset.di][inp.dataset.df]=inp.value;saveData(false,true)});
  host.querySelectorAll("[data-eddel]").forEach(b=>b.onclick=()=>armDel(b.dataset.eddel,()=>{
    const x=D.dico[k].splice(+b.dataset.eddel.slice(2),1)[0];
    Object.values(D.refs).forEach(R=>refRemove(R,k,x.id));saveData(true,true)}));
}
function edPanel(titre,count,actions,head,rowsHtml,note){
  return `<div class="panel">
    <div class="pick-head"><h3>${esc(titre)}${note?help(note):""}</h3><span class="count">${count}</span>
      <div style="margin-left:auto;display:flex;gap:7px;flex-wrap:wrap">${actions}</div></div>
    ${head?`<div class="edhead" style="${head.css}">${head.cells.map(c=>`<span>${esc(c)}</span>`).join("")}</div>`:""}
    <div>${rowsHtml||`<div class="empty">Rien pour l'instant.</div>`}</div>
  </div>`;
}
function delBtn(id,label){
  return `<button class="btn ghost ${edArm===id?"danger":""}" data-eddel="${esc(id)}">${edArm===id?"Confirmer":(label||"×")}</button>`;
}
function armDel(id,fn){
  if(edArm!==id){edArm=id;(ui.tab==="org"?paintOrg:paintRef)();return}
  edArm=null;fn();
}
function paintEditor(pane,host){
  host=host||document.getElementById("refPane");
  const D=DATA;
  if(pane==="diplome"){
    const css="grid-template-columns:minmax(0,1fr) 110px 100px";
    const grs=[], dvs=dipVisibles();
    dvs.forEach(dp=>{const i=D.diplomes.indexOf(dp);
      const key=(dp.nom||"").trim().toLowerCase();
      let gr=grs.find(g=>g.key===key);
      if(!gr){gr={key,nom:dp.nom||"",rows:[]};grs.push(gr)}
      gr.rows.push({dp,i});
    });
    host.innerHTML=edPanel("Diplômes et mentions",dvs.length+" mention"+(dvs.length>1?"s":""),
      `<button class="btn ghost" id="edAdd">+ Nouveau diplôme</button>`,
      {css,cells:["Mention","Code",""]},
      grs.map((gr,gi)=>`<div class="dgrp">
        <div class="hd">
          <span class="lab">Diplôme</span>
          <input type="text" value="${esc(gr.nom)}" data-dgn="${gi}" placeholder="DN MADE" aria-label="Nom du diplôme">
          <label class="lab" style="margin-left:6px">Durée</label>
          <select data-dgd="${gi}" aria-label="Durée du diplôme" style="width:auto">${[1,2,3,4,5].map(k=>`<option value="${k}" ${k===(+gr.rows[0].dp.duree||3)?"selected":""}>${k} an${k>1?"s":""} · ${2*k} sem.</option>`).join("")}</select>
          <span class="count">${gr.rows.length} mention${gr.rows.length>1?"s":""}</span>
          <button class="btn ghost" data-dgadd="${gi}">+ Mention</button>
        </div>
        ${gr.rows.map(({dp,i})=>`<div class="ed" style="${css}">
          <input type="text" value="${esc(dp.mention)}" data-dm="${i}" placeholder="Objet" aria-label="Mention">
          <input type="text" value="${esc(dp.code||"")}" data-dc="${i}" placeholder="${esc(autoDipCode(dp)||"DNO")}" aria-label="Code" class="mono">
          ${dvs.length>1?delBtn("dip"+i,"Supprimer"):`<span class="hint">—</span>`}</div>`).join("")}
      </div>`).join("")||`<div class="empty">Aucun diplôme : installez un référentiel depuis l'encart de départ, ou créez-en un avec « + Nouveau diplôme ».</div>`,
      "Un diplôme peut porter plusieurs mentions : « + Mention » ajoute une mention dont le référentiel reprend celui de la mention précédente, avec les mêmes éléments du dictionnaire, pour que tu n'aies qu'à ajuster les variations (Référentiel › Dictionnaire, ou les volets du référentiel une fois la mention active). Chaque mention a son propre référentiel : la mention active commande tout le reste, ce qui n'est retenu que dans les autres mentions n'apparaît ni dans les évaluations ni dans la carte. Le code se compose tout seul (deux lettres du diplôme, une de la mention, sans séparateur : DN MADE mention Objet donne DNO) et sert à nommer les classes et les années (DNO1, DNO2…) — laisse-le vide pour qu'il suive, ou écris le tien.")
      +(dvs.length?`<div class="panel" style="max-width:720px;margin-top:18px"><div class="pick-head"><h3>Réglages du référentiel</h3>${dvs.length>1?`<select id="edDipAct" aria-label="Mention dont on règle le référentiel" style="width:auto;margin-left:auto">${dvs.map(dp=>`<option value="${dp.id}" ${dp.id===D.activeDiplome?"selected":""}>${esc(dipLabel(dp))}</option>`).join("")}</select>`:`<span class="hint" style="margin-left:auto">${esc(dipLabel(dvs[0]))}</span>`}</div>
        <div class="panel-body">
          <div class="field"><label>Années et niveaux</label>
            <div class="hint" style="margin:0 0 6px">L'identifiant d'une année suit le code du diplôme (DNO1, DNO2…) — laisse-le vide pour qu'il suive, ou écris le tien.</div>
            ${(D.niveaux||[]).map((n,i)=>`<div class="lv"><span class="num" style="width:62px">Année ${n.annee}</span>
              <input type="text" data-nvc="${i}" value="${esc(n.code||"")}" placeholder="${esc(dipCode(D.diplomes.find(x=>x.id===D.activeDiplome)||{})+n.annee)}" style="flex:0 1 90px" aria-label="Identifiant de l'année" class="mono">
              <input type="text" data-nvl="${i}" value="${esc(n.label)}" aria-label="Libellé du niveau"></div>`).join("")}
            </div>
        </div></div>`:"");
    host.querySelector("#edAdd").onclick=()=>{
      // le cadre caché d'une installation neuve devient ce diplôme, plutôt que d'en ajouter un second
      const cadre=D.diplomes.find(x=>estCadreVierge(x.id));
      const dp=Object.assign(cadre||{id:newId("d")},{nom:"Nouveau diplôme",mention:"",code:"",duree:3});
      delete dp.cadre;
      if(!cadre)D.diplomes.push(dp);
      D.activeDiplome=dp.id;saveData();toast("Diplôme ajouté — son référentiel est vide")};
    host.querySelectorAll("[data-dgadd]").forEach(b=>b.onclick=()=>{
      const gr=grs[+b.dataset.dgadd], src=gr.rows[gr.rows.length-1].dp;
      const dp=addMention(src.id,gr.nom);dp.duree=+src.duree||3;D.activeDiplome=dp.id;saveData();
      toast("Mention ajoutée à "+(gr.nom||"ce diplôme")+" — référentiel recopié");
      const inp=document.querySelector(`[data-dm="${D.diplomes.indexOf(dp)}"]`);if(inp)inp.focus()});
    {const ds=host.querySelector("#edDipAct");if(ds)ds.onchange=()=>{D.activeDiplome=ds.value;saveData()}}
    host.querySelectorAll("[data-dgd]").forEach(sel=>sel.onchange=()=>{
      grs[+sel.dataset.dgd].rows.forEach(({dp})=>dp.duree=+sel.value);saveData();
      promos.forEach(migPromoCohorte);savePromos()});
    host.querySelectorAll("[data-dgn]").forEach(inp=>inp.oninput=()=>{
      grs[+inp.dataset.dgn].rows.forEach(({dp})=>dp.nom=inp.value);
      grs[+inp.dataset.dgn].nom=inp.value;saveData(false);
      grs[+inp.dataset.dgn].rows.forEach(({dp,i})=>{
        const ph=host.querySelector(`[data-dc="${i}"]`);if(ph)ph.placeholder=autoDipCode(dp)||"DNO"});
      });
    host.querySelectorAll("[data-dm]").forEach(inp=>inp.oninput=()=>{D.diplomes[+inp.dataset.dm].mention=inp.value;saveData(false);
      const dp=D.diplomes[+inp.dataset.dm];
      const ph=host.querySelector(`[data-dc="${inp.dataset.dm}"]`);if(ph)ph.placeholder=autoDipCode(dp)||"DNO";
      });
    host.querySelectorAll("[data-dc]").forEach(inp=>inp.oninput=()=>{D.diplomes[+inp.dataset.dc].code=inp.value;saveData(false)});
    host.querySelectorAll("[data-nvc]").forEach(inp=>inp.oninput=()=>{D.niveaux[+inp.dataset.nvc].code=inp.value;saveData(false)});
    host.querySelectorAll("[data-nvl]").forEach(inp=>inp.oninput=()=>{D.niveaux[+inp.dataset.nvl].label=inp.value;saveData(false)});
    host.querySelectorAll("[data-eddel]").forEach(b=>b.onclick=()=>armDel(b.dataset.eddel,()=>{
      const dp=D.diplomes.splice(+b.dataset.eddel.slice(3),1)[0];
      if(D.refs)delete D.refs[dp.id];
      if(D.activeDiplome===dp.id)D.activeDiplome=(D.diplomes[0]||{}).id||"";saveData()}));
    return;
  }
  if(KINDS.includes(pane)){
    const dipL=REF.meta.diplome||"—";
    const roName=(t,mono)=>`<span class="ro${mono?" mono":""}">${esc(t||"—")}</span>`;
    // ajout : depuis le dictionnaire, ou nouvel élément
    const inRef=new Set(D[pane].map(x=>x.id));
    const cand=D.dico[pane].filter(x=>!inRef.has(x.id));
    const dlabel=x=>pane==="ecs"?(x.nom||"Enseignement"):pane==="blocs"?("Bloc "+x.num+" · "+x.nom)
      :pane==="competences"?(x.code+" · "+String(x.libelle||"").slice(0,70)):x.nom;
    const addSel=`<select class="addsel" id="edAddSel" aria-label="Ajouter au référentiel">
        <option value="">+ Ajouter au référentiel…</option>
        ${cand.length?`<optgroup label="Depuis le dictionnaire (${cand.length})">${cand.map(x=>`<option value="${esc(x.id)}">${esc(dlabel(x))}</option>`).join("")}</optgroup>`:""}
        <option value="__new">Nouvel élément (créé dans le dictionnaire)</option></select>`;
    const toDico=`<button class="btn ghost" id="edToDico">Modifier les intitulés</button>`;
    const note="Ici, les associations propres à "+dipL+". Noms, codes, couleurs et intitulés viennent du dictionnaire, commun à toutes les mentions : « Modifier les intitulés » y mène. « Retirer » enlève l'élément de ce référentiel sans l'effacer du dictionnaire.";
    const fresh={
      ues:()=>({id:newId("u"),code:"",nom:"Nouvelle UE",couleur:"#9aa2ae",sems:SEMS.slice()}),
      ecs:()=>({id:newId("e"),code:"EC ",nom:"Nouvel enseignement",couleur:"#9aa2ae",ects:"",ueId:(D.ues[0]||{}).id||"",sems:[]}),
      blocs:()=>({id:newId("b"),num:String(D.blocs.length+1),nom:""}),
      competences:()=>({id:newId("c"),code:"C",bloc:(D.blocs[0]||{}).num||"",libelle:"",ecIds:[]})};
    const wire=()=>{
      const sel=host.querySelector("#edAddSel");
      if(sel)sel.onchange=()=>{
        const v=sel.value;if(!v)return;
        if(v==="__new"){D[pane].push(fresh[pane]());saveData();
          ui.ref.pane="definir";ui.ref.dk=pane==="blocs"?"competences":pane;ui.ref.dq="";paintRef();toast("Élément créé : donne-lui son nom dans « Définir ».");return}
        const R=refOf(D,D.activeDiplome);
        if(!R[pane].some(r=>r.id===v))R[pane].push(assocFor(D.activeDiplome,pane,v));
        saveData(true,true);toast("Ajouté au référentiel "+dipL+".")};
      const td=host.querySelector("#edToDico");
      if(td)td.onclick=()=>{ui.ref.pane="definir";ui.ref.dk=pane==="blocs"?"competences":pane;paintRef();window.scrollTo({top:0,behavior:"smooth"})};
    };
    if(pane==="blocs"){
      const css="grid-template-columns:64px minmax(0,1fr) 120px 92px";
      host.innerHTML=edPanel("Blocs de compétences · "+dipL,D.blocs.length,addSel+toDico,
        {css,cells:["N°","Intitulé","Compétences",""]},
        D.blocs.map((b,i)=>{const n=D.competences.filter(c=>String(c.bloc)===String(b.num)).length;
          return `<div class="ed" style="${css}">${roName(b.num,true)}${roName(b.nom)}
          <span class="num">${n} comp.</span>${delBtn("bloc"+i,"Retirer")}</div>`}).join(""),note);
      wire();
      host.querySelectorAll("[data-eddel]").forEach(b=>b.onclick=()=>armDel(b.dataset.eddel,()=>{
        D.blocs.splice(+b.dataset.eddel.slice(4),1);saveData()}));
      return;
    }
    if(pane==="ues"){
      const css="grid-template-columns:34px 86px minmax(0,1fr) 216px 92px";
      host.innerHTML=edPanel("Unités d'enseignement · "+dipL,D.ues.length,addSel+toDico,
        {css,cells:["","Code","Nom","Semestres",""]},
        D.ues.map((u,i)=>`<div class="ed" style="${css}">
          <span class="sw" style="--c:${esc(u.couleur||"#9aa2ae")}"></span>${roName(u.code,true)}${roName(u.nom)}
          <div class="chips sems">${SEMS.map(x=>`<button type="button" data-us="${i}" data-v="${x}" aria-pressed="${(u.sems||[]).includes(x)}">${x}</button>`).join("")}</div>
          ${delBtn("ue"+i,"Retirer")}</div>`).join(""),
        note+" Un EC n'apparaît dans une évaluation que sur les semestres communs à son UE et à lui-même.");
      wire();
      host.querySelectorAll("[data-us]").forEach(b=>b.onclick=()=>{
        const u=D.ues[+b.dataset.us],v=b.dataset.v;
        u.sems=(u.sems||[]).includes(v)?u.sems.filter(x=>x!==v):[...(u.sems||[]),v].sort((x,y)=>SEMS.indexOf(x)-SEMS.indexOf(y));
        saveData()});
      host.querySelectorAll("[data-eddel]").forEach(b=>b.onclick=()=>armDel(b.dataset.eddel,()=>{
        const u=D.ues.splice(+b.dataset.eddel.slice(2),1)[0];
        D.ecs.forEach(e=>{if(e.ueId===u.id)e.ueId=""});saveData()}));
      return;
    }
    if(pane==="ecs"){
      const css="grid-template-columns:34px 228px minmax(0,1fr) 180px 216px 54px 92px";
      host.innerHTML=edPanel("Enseignements constitutifs · "+dipL,D.ecs.length,addSel+toDico,
        {css,cells:["","Codes par année","Intitulé","Unité d'enseignement","Semestres","ECTS",""]},
        D.ecs.slice().sort((a,b)=>ecOrd(a)-ecOrd(b)).map(e=>{
          const i=D.ecs.indexOf(e);
          return `<div class="ed" style="${css}">
          <span class="sw" style="--c:${esc(e.couleur||"#9aa2ae")}"></span>
          <div class="codes3">${ANNEES.map(a=>`<label><b>DN${a}</b><input type="text" value="${esc((e.codes||{})[a]||"")}" data-ec3="${i}" data-a="${a}" class="mono" placeholder="EC ${a}.1" aria-label="Code en DN${a}"></label>`).join("")}</div>${roName(ecName(e))}
          <select data-em="${i}" aria-label="Unité d'enseignement"><option value="">— sans UE —</option>
            ${D.ues.map(u=>`<option value="${u.id}" ${u.id===e.ueId?"selected":""}>${esc(u.nom)}</option>`).join("")}</select>
          <div class="chips sems">${(()=>{const u=D.ues.find(x=>x.id===e.ueId);const ok=(u&&u.sems)||SEMS;
            return SEMS.map(x=>`<button type="button" data-es="${i}" data-v="${x}" aria-pressed="${(e.sems||[]).includes(x)}" ${ok.includes(x)?"":'disabled title="Hors des semestres de l\'UE"'}>${x}</button>`).join("")})()}</div>
          <input type="text" value="${esc(e.ects||"")}" data-ee="${i}" aria-label="ECTS" class="mono">
          ${delBtn("ec"+i,"Retirer")}</div>`}).join(""),
        note+" Les semestres grisés sont hors du calendrier de l'UE : ouvre-les d'abord dans l'onglet UE.");
      wire();
      host.querySelectorAll("[data-ee]").forEach(inp=>inp.oninput=()=>{D.ecs[+inp.dataset.ee].ects=inp.value;saveData(false)});
      host.querySelectorAll("[data-ec3]").forEach(inp=>inp.oninput=()=>{
        const e=D.ecs[+inp.dataset.ec3];if(!e.codes||typeof e.codes!=="object")e.codes={};
        const v=inp.value.trim();if(v)e.codes[inp.dataset.a]=v;else delete e.codes[inp.dataset.a];saveData(false)});
      host.querySelectorAll("[data-em]").forEach(sel=>sel.onchange=()=>{D.ecs[+sel.dataset.em].ueId=sel.value;saveData()});
      host.querySelectorAll("[data-es]").forEach(b=>b.onclick=()=>{
        const e=D.ecs[+b.dataset.es],v=b.dataset.v;
        e.sems=(e.sems||[]).includes(v)?e.sems.filter(x=>x!==v):[...(e.sems||[]),v].sort((x,y)=>SEMS.indexOf(x)-SEMS.indexOf(y));
        saveData()});
      host.querySelectorAll("[data-eddel]").forEach(b=>b.onclick=()=>armDel(b.dataset.eddel,()=>{
        const e=D.ecs.splice(+b.dataset.eddel.slice(2),1)[0];
        D.competences.forEach(c=>{c.ecs=(c.ecs||[]).filter(x=>x.id!==e.id);c.ecIds=c.ecs.map(x=>x.id)});saveData()}));
      return;
    }
    if(pane==="competences"){
      const q=norm((ui.ref.edq||"").trim());
      const css="grid-template-columns:70px 70px minmax(0,1fr) 92px";
      const list=D.competences.filter(c=>!q||norm(c.code+" "+c.libelle).includes(q));
      host.innerHTML=edPanel("Compétences · "+dipL,D.competences.length,
        `<input type="text" id="edq" value="${esc(ui.ref.edq||"")}" placeholder="Filtrer…" style="width:auto;flex:0 1 160px">`+addSel+toDico,
        {css,cells:["Code","Bloc","Intitulé et EC rattachés",""]},
        list.map(c=>{
          const i=D.competences.indexOf(c);
          return `<div class="ed" style="${css};align-items:start">
          ${roName(c.code,true)}
          <select data-cb="${i}" aria-label="Bloc"><option value="">—</option>
            ${D.blocs.map(b=>`<option value="${esc(b.num)}" ${b.num===String(c.bloc)?"selected":""}>${esc(b.num)}</option>`).join("")}</select>
          <div style="display:flex;flex-direction:column;gap:7px;min-width:0">
            ${roName(c.libelle)}
            <div class="ecpick">${D.ecs.slice().sort((a,b)=>ecOrd(a)-ecOrd(b)).map(e=>{
              const l=lienEc(c,e.id), on=!!l;
              return `<div class="ecl${on?" on":""}" style="--c:${esc(e.couleur||"#9aa2ae")}">
                <button type="button" class="ec" data-ce="${i}" data-v="${e.id}" aria-pressed="${on}" title="${esc(ecName(e))}"><span class="k">${esc(ecCodeLbl(e))}</span><span class="n">${esc(ecName(e))}</span></button>
                ${on?`<div class="chips sems">${(e.sems||[]).map(sm=>`<button type="button" data-cs="${i}" data-v="${e.id}" data-sm="${sm}" aria-pressed="${(l.sems||[]).includes(sm)}" title="${esc(sm+" · "+(ecCodeAt(e,sm)||"sans code"))}">${sm}</button>`).join("")||'<span class="muted">aucun semestre sur cet EC</span>'}</div>`:""}
              </div>`}).join("")}</div>
          </div>
          ${delBtn("cp"+i,"Retirer")}</div>`}).join(""),
        note+" Un EC coché peut n'être relié à la compétence que sur certains semestres : le code de l'EC change d'une année à l'autre.");
      wire();
      host.querySelector("#edq").oninput=e=>{ui.ref.edq=e.target.value;paintRef();
        const f=document.getElementById("edq");if(f){f.focus();f.setSelectionRange(f.value.length,f.value.length)}};
      host.querySelectorAll("[data-cb]").forEach(sel=>sel.onchange=()=>{D.competences[+sel.dataset.cb].bloc=sel.value;saveData()});
      host.querySelectorAll("[data-ce]").forEach(b=>b.onclick=()=>{
        const c=D.competences[+b.dataset.ce],v=b.dataset.v,e=D.ecs.find(x=>x.id===v)||{};
        c.ecs=lienEc(c,v)?(c.ecs||[]).filter(x=>x.id!==v):[...(c.ecs||[]),{id:v,sems:(e.sems||[]).slice()}];
        c.ecIds=c.ecs.map(x=>x.id);saveData()});
      host.querySelectorAll("[data-cs]").forEach(b=>b.onclick=()=>{
        const c=D.competences[+b.dataset.cs],l=lienEc(c,b.dataset.v),sm=b.dataset.sm;if(!l)return;
        l.sems=(l.sems||[]).includes(sm)?l.sems.filter(x=>x!==sm):[...(l.sems||[]),sm].sort((x,y)=>SEMS.indexOf(x)-SEMS.indexOf(y));
        if(!l.sems.length){c.ecs=c.ecs.filter(x=>x.id!==b.dataset.v);c.ecIds=c.ecs.map(x=>x.id)}
        saveData()});
      host.querySelectorAll("[data-eddel]").forEach(b=>b.onclick=()=>armDel(b.dataset.eddel,()=>{
        D.competences.splice(+b.dataset.eddel.slice(2),1);saveData()}));
      return;
    }
  }
  if(pane==="enseignants"){
    const css="grid-template-columns:60px minmax(0,1fr) minmax(0,1fr) 92px";
    D.enseignants.forEach(completerPersonne);
    host.innerHTML=edPanel("Enseignants",D.enseignants.length,
      `<button class="btn ghost" id="edAdd">+ Ajouter</button>`,
      {css,cells:["C'est moi","Prénom","Nom",""]},
      D.enseignants.map((t,i)=>`<div class="ed" style="${css}">
        <input type="radio" name="moi" data-moi="${esc(t.id)}" ${D.moi===t.id?"checked":""} aria-label="C'est moi : ${esc(t.nom)}" style="justify-self:center;width:18px;height:18px">
        <input type="text" value="${esc(t.prenom)}" data-tp="${i}" placeholder="Prénom" aria-label="Prénom">
        <input type="text" value="${esc(t.nomFam)}" data-tn="${i}" placeholder="Nom" aria-label="Nom">
        ${delBtn("ens"+i,"Supprimer")}</div>`).join(""),
      "Proposés dans le champ « Enseignant·es » de l'étape 1. « C'est moi » désigne l'utilisateur de DNMAX : sa répartition de service cadre la page Progression, et il est coché d'office dans une nouvelle évaluation.");
    host.querySelectorAll("[data-moi]").forEach(r=>r.onchange=()=>{D.moi=r.dataset.moi;persistData();toast("Répartition de service de "+((D.enseignants.find(t=>t.id===D.moi)||{}).nom||"")+" prise en compte.")});
    host.querySelector("#edAdd").onclick=()=>{D.enseignants.push({id:"t"+Date.now().toString(36),nom:"",prenom:"",nomFam:"",discipline:""});saveData();
      const l=host.querySelectorAll("[data-tp]");if(l.length)l[l.length-1].focus()};
    host.querySelectorAll("[data-tp],[data-tn]").forEach(inp=>inp.oninput=()=>{
      const t=D.enseignants[+(inp.dataset.tp??inp.dataset.tn)];
      if(inp.dataset.tp!==undefined)t.prenom=inp.value;else t.nomFam=inp.value;
      t.nom=composerNom(t.prenom,t.nomFam);saveData(false)});
    host.querySelectorAll("[data-eddel]").forEach(b=>b.onclick=()=>armDel(b.dataset.eddel,()=>{
      D.enseignants.splice(+b.dataset.eddel.slice(3),1);saveData()}));
    return;
  }
  if(pane==="livrables"){
    const css="grid-template-columns:minmax(0,1fr) 190px 92px";
    host.innerHTML=edPanel("Livrables",D.livrables.length,
      `<button class="btn ghost" id="edAdd">+ Ajouter</button>
       <button class="btn ghost" id="edDefault">Liste d'origine</button>`,
      {css,cells:["Nom","Nature",""]},
      D.livrables.map((x,i)=>`<div class="ed" style="${css}">
        <input type="text" value="${esc(x.nom)}" data-lv="${i}" aria-label="Livrable">
        <input type="text" value="${esc(x.type||"")}" data-lt="${i}" list="livtypes" placeholder="Écrit, oral, plastique…" aria-label="Nature">
        ${delBtn("lv"+i,"Supprimer")}</div>`).join("")
        +`<datalist id="livtypes"><option>Écrit</option><option>Oral</option><option>Plastique</option><option>Numérique</option><option>Maquette</option><option>Dossier</option></datalist>`,
      "Proposés à l'étape 1 de l'évaluation ; un livrable hors liste s'ajoute ici automatiquement.");
    host.querySelector("#edAdd").onclick=()=>{D.livrables.push({nom:"",type:""});saveData();
      const l=document.querySelectorAll("#refPane [data-lv]");if(l.length)l[l.length-1].focus()};
    host.querySelector("#edDefault").onclick=()=>{D.livrables=SUPPORTS_DEF.map(x=>({nom:x,type:""}));saveData();toast("Liste d'origine rétablie.")};
    host.querySelectorAll("[data-lv]").forEach(inp=>inp.oninput=()=>{D.livrables[+inp.dataset.lv].nom=inp.value;saveData(false)});
    host.querySelectorAll("[data-lt]").forEach(inp=>inp.oninput=()=>{D.livrables[+inp.dataset.lt].type=inp.value;saveData(false)});
    host.querySelectorAll("[data-eddel]").forEach(b=>b.onclick=()=>armDel(b.dataset.eddel,()=>{
      const v=D.livrables.splice(+b.dataset.eddel.slice(2),1)[0];
      F.livrables=F.livrables.filter(x=>x!==(v||{}).nom);saveData()}));
    return;
  }
}
const DEMO_ELEVES=["Camille Ferrand","Yasmine Haddad","Noé Baptiste","Linh Tran","Timothée Vasseur",
  "Aïssatou Konaté","Sacha Delaunay","Rayan Mansouri","Inès Carvalho","Gaspard Rouvier",
  "Mariam Traoré","Elif Yilmaz","Soline Marchais","Enzo Ferreira"];
const DEMO_ELEVES1=["Alix Gendreau","Bilal Amrani","Chloé Nkoulou","Diego Ramos","Esra Demir",
  "Fatoumata Sow","Gabriel Kowalski","Hugo Maréchal","Idriss Benhamou","Jade Nguyen",
  "Kenza Belkacem","Lucie Pham"];
const DEMO_APPR=[
  "Travail régulier, le carnet suit vraiment le projet. Les planches gagneraient à hiérarchiser davantage les informations.",
  "Beaucoup d'intentions, des recherches foisonnantes ; reste à trancher et à tenir une piste jusqu'au bout.",
  "Les maquettes ont fait progresser l'assemblage. Soigner l'oral : annoncer le principe avant de détailler.",
  "Rendu complet et soigné. La démonstration technique est convaincante, le corpus de références mériterait d'être élargi.",
  "Quelques fragilités dans la mise en œuvre, mais le projet a trouvé sa cohérence au fil des séances."];
function demoRng(seed){let x=seed||7;return()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648}}
function fillRes(f,seed,part){
  // part : nombre d'élèves laissés inachevés en fin de liste
  const els=studentsOf(f), keys=lignesOf(f).map(ligKey), nv=(f.niveaux||[]).length||4;
  const r=demoRng(seed);
  f.res={};
  els.forEach((e,i)=>{
    const reste=els.length-1-i;
    if(part&&reste<part&&reste%2===0)return;                       // non commencé
    const partiel=part&&reste<part;
    const o={n:{},obs:{},appr:""};
    keys.forEach((k,j)=>{
      if(partiel&&j>=Math.max(1,Math.floor(keys.length/2)))return;  // à moitié saisi
      const base=1+Math.floor(r()*(nv-1)+r()*0.8);
      o.n[k]=Math.max(0,Math.min(nv-1,base));
    });
    if(!partiel&&r()<0.45)o.obs[keys[Math.floor(r()*keys.length)]]=
      ["Progrès net depuis la dernière séance.","À reprendre : la mise à l'échelle.","Très bonne tenue du carnet.","Argumentation encore hésitante à l'oral."][Math.floor(r()*4)];
    if(!partiel&&r()<0.5)o.appr=DEMO_APPR[Math.floor(r()*DEMO_APPR.length)];
    f.res[e.id]=o;
  });
  return f;
}
function demoFiche3(){
  const mk=(code,lib,livr)=>{const c=REF.competences.find(x=>x.code===code);
    return c?{code,ecs:itemEcs(c,"S4"),coef:1,op:"",libelle:lib||"",livrables:livr||[]}:null};
  const OR="Oral de présentation de projet", PL="Planches de projet";
  const items=[mk("C10.6","Exposer le projet en cinq minutes, intentions puis démonstration",[OR]),
    mk("C2.2","",[OR]),mk("C11.5","Tenir le calendrier annoncé et rendre les pièces attendues",[PL])].filter(Boolean);
  return {id:uid(),promoId:"",titre:"Soutenance intermédiaire — oral et planches",
    livrables:[OR,PL],semestre:"S4",classe:"DN MADE 2 Objet",
    date:new Date(Date.now()-86400000*6).toISOString().slice(0,10),prof:"Marc Lenoir",
    ues:["UE ATELIERS DE CREATION"],ecCodes:[],compCode:"",
    consignes:"Oral de cinq minutes devant le groupe, deux planches A2 affichées. Questions du jury pendant cinq minutes.",
    ops:[],preset:"acq",niveaux:PRESETS.acq.niveaux.slice(),
    opts:{crit:true,obs:true,coef:false},eleves:"",items};
}
function demoFiche(){
  const mk=(code,lib,livr)=>{const c=REF.competences.find(x=>x.code===code);
    return c?{code,ecs:itemEcs(c,"S3"),coef:1,op:"",libelle:lib||"",livrables:livr||[]}:null};
  const CP="Carnet de projet", MQ="Maquettes de recherches", PL="Planches de projet";
  const op1={id:uid(),libelle:"Constituer un corpus de références et en tirer des principes formels réutilisables",livrables:[CP]};
  const op2={id:uid(),libelle:"Éprouver les assemblages par la maquette et en dégager un principe technique viable",livrables:[MQ]};
  const items=[mk("C4.1","",[CP]),mk("C4.3","",[CP]),mk("C10.3","",[MQ]),mk("C11.2","",[MQ]),
    mk("C10.6","Présenter le principe d'assemblage sur deux planches lisibles à un mètre",[PL]),
    mk("C2.1","",[CP])].filter(Boolean);
  const byCode=c=>items.find(i=>i.code===c);
  ["C4.1","C4.3"].forEach(c=>{const i=byCode(c);if(i)i.op=op1.id});
  ["C10.3","C11.2"].forEach(c=>{const i=byCode(c);if(i)i.op=op2.id});
  return {id:uid(),promoId:"",titre:"Évaluation intermédiaire — Mobilier modulaire en frêne",
    livrables:[CP,MQ,PL],semestre:"S3",classe:"DN MADE 2 Objet",
    date:new Date().toISOString().slice(0,10),prof:"Sophie Hébert",
    ues:["UE ATELIERS DE CREATION"],ecCodes:["EC 11.1","EC 11.2"],compCode:"C10.6",
    consignes:"Rendu intermédiaire du projet : carnet de projet tenu depuis le lancement, trois maquettes de recherche au 1/5 sur l'assemblage, deux planches A2 présentant le principe retenu. Oral de cinq minutes devant le groupe.",
    ops:[op1,op2],preset:"acq",niveaux:PRESETS.acq.niveaux.slice(),
    opts:{crit:true,obs:true,coef:false},eleves:"",items};
}
function demoFiche2(){
  const mk=code=>{const c=REF.competences.find(x=>x.code===code);
    return c?{code,ecs:c.ecs.filter(e=>e.sem==="S1").map(e=>e.ec),coef:1,op:"",libelle:"",livrables:["Fiche de lecture"]}:null};
  const items=["C4.2","C4.4","C2.1"].map(mk).filter(Boolean);
  return {id:uid(),promoId:"",titre:"Fiche de lecture — Objets du quotidien",
    livrables:["Fiche de lecture"],semestre:"S1",classe:"DN MADE 1 Objet",
    date:new Date(Date.now()-86400000*21).toISOString().slice(0,10),prof:"Sophie Hébert",
    ues:["UE HUMANITES et CULTURE"],ecCodes:["EC 1.1"],compCode:"C4.2",
    consignes:"Lecture d'un chapitre au choix dans la bibliographie, restitution en une page : thèse de l'auteur, notions clés, lien avec le projet d'atelier en cours.",
    ops:[],preset:"acq",niveaux:PRESETS.acq.niveaux.slice(),
    opts:{crit:true,obs:true,coef:false},eleves:"",items};
}
/* Jeu d'exemple étendu : 4 mentions, des promotions de chaque année (et une sortie),
   des dizaines d'évaluations réparties sur les semestres écoulés, avec résultats. */
function demoMass(){
  const D=DATA, AS0=asStart(anneeScolaire(new Date()));
  let seed=20251;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
  const pick=a=>a[Math.floor(rnd()*a.length)];
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  const PRE=["Adèle","Aïcha","Alix","Amadou","Ambre","Anaïs","Arthur","Awa","Baptiste","Bilal","Camille","Capucine","Chloé","Clément","Djibril","Elias","Elif","Emma","Fatou","Gabin","Hugo","Ibrahim","Inès","Iris","Jules","Kenza","Kim","Léa","Léon","Lina","Lou","Lucas","Maël","Malik","Manon","Mehdi","Mei","Nina","Noah","Nour","Oscar","Rayan","Rose","Salomé","Samir","Sofia","Théo","Thomas","Yanis","Yasmine","Zeynep","Zoé"];
  const NOM=["Arnaud","Benhamou","Bonnet","Carvalho","Chevalier","Cissé","Da Silva","Diallo","Dumas","Durand","Fabre","Ferreira","Garnier","Girard","Haddad","Kaya","Keita","Kowalski","Lambert","Le Gall","Lefèvre","Mansouri","Martin","Mercier","Moreau","Morel","N'Diaye","Nguyen","Perrin","Pham","Renaud","Rossi","Roux","Saïdi","Santos","Traoré","Tran","Vidal","Yilmaz","Zhang"];
  // anciennes listes de noms de l'exemple : leurs promotions sont renommées au rechargement de l'exemple
  const OLD_PRE=["Adèle","Alix","Ambre","Anaïs","Arthur","Basile","Baptiste","Bérénice","Camille","Capucine","Céleste","Clément","Constance","Elias","Elsa","Emma","Gabin","Hugo","Inès","Iris","Jules","Juliette","Léa","Léon","Lou","Louise","Lucas","Maël","Manon","Margaux","Mathis","Nina","Noah","Oscar","Paul","Rose","Salomé","Simon","Théo","Victor","Yanis","Zoé"];
  const OLD_NOM=["Arnaud","Barbier","Benoît","Blanchard","Bonnet","Bouvier","Brun","Carré","Chevalier","Colin","Dumas","Durand","Fabre","Faure","Garnier","Gauthier","Girard","Guérin","Joly","Lacroix","Lambert","Leclerc","Lefèvre","Lemoine","Marchand","Martin","Masson","Mercier","Meunier","Morel","Noël","Perrin","Picard","Renaud","Roux","Roy","Vidal","Vincent"];
  const isDemoNom=x=>{const w=String(x).split(" "), p=w[0], n=w.slice(1).join(" ");return (PRE.includes(p)||OLD_PRE.includes(p))&&(NOM.includes(n)||OLD_NOM.includes(n))};
  const base=D.diplomes.find(d=>d.id===D.activeDiplome), act=base.id;
  const MENT=[["Espace","DNE","l'aménagement d'espace"],["Graphisme","DNG","l'identité visuelle"],["Matériaux","DNM","la matière textile"]];
  const dips=[[base,"le mobilier"]];
  MENT.forEach(([m,code,th])=>{let dp=D.diplomes.find(d=>d.nom===base.nom&&d.mention===m);
    if(!dp){dp=addMention(base.id,base.nom);dp.mention=m;dp.code=code;dp.duree=+base.duree||3}dips.push([dp,th])});
  saveData(false);
  const PROFS=["Sophie Hébert","Marc Lenoir","Amina Benali","Claire Nguyen","Julien Marchetti","Lucie Okafor"];
  PROFS.forEach(nom=>{if(!D.enseignants.some(t=>t.nom===nom))D.enseignants.push(nouvellePersonne(uid(),nom))});
  if(!D.moi)D.moi=(D.enseignants.find(t=>t.nom===PROFS[0])||{}).id;
  const LIV=livrNames().length?livrNames():["Carnet de projet","Planches de projet","Oral de présentation de projet"];
  const TYPES=[["Rendu de projet","Carnet de projet"],["Workshop","Planches de projet"],["Fiche de lecture","Fiche de lecture"],
    ["Oral de présentation","Oral de présentation de projet"],["Carnet d'expérimentation","Catalogue d'expérimentation"],
    ["Revue de projet","Maquettes de recherches"],["Dossier de recherche","Devoir réflexif"],["Exposition de fin de semestre","Carnet d'exposition"]];
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
          promoEcs(pr,as).forEach((e,j)=>{if(!(A[e.id]||[]).length)
            A[e.id]=rnd()<0.2?[tids[j%tids.length],tids[(j+2)%tids.length]]:[tids[(j+Math.floor(rnd()*3))%tids.length]]})}}
      if(!(pr.liste||[]).length||pr.liste.every(e=>isDemoNom(e.nom))){
        const had=(pr.liste||[]).length, n=had||12+Math.floor(rnd()*5),used=new Set(),noms=[];
        while(noms.length<n){const x=pick(PRE)+" "+pick(NOM);if(!used.has(x)){used.add(x);noms.push(x)}}
        // promotion d'exemple déjà là : on garde les élèves (et leurs résultats), seuls les noms changent
        if(had){pr.liste.forEach((e,j)=>e.nom=noms[j]);pr.eleves=noms.join("\n")}
        else syncListe(pr,noms.join("\n"));
      }
      const els=migPromo(pr).liste;nEl+=els.length;
      const ySem=k<duree?(k*2+rangSemestre(new Date())):duree*2;   // semestres déjà ouverts pour cette promo
      for(let si=0;si<ySem&&si<SEMS.length;si++){
        const sem=SEMS[si], dispo=compsFor(sem);if(!dispo.length)continue;
        const nev=2+Math.floor(rnd()*2), yr=debut+Math.floor(si/2), first=si%2===0;
        for(let e=0;e<nev;e++){
          const [typ,liv0]=pick(TYPES), liv=LIV.includes(liv0)?liv0:pick(LIV);
          const comps=shuffle(dispo).slice(0,3+Math.floor(rnd()*4));
          const items=comps.map(c=>({code:c.code,ecs:itemEcs(c,sem),critere:"",coef:1,op:"",libelle:"",livrables:[liv]}));
          const mo=first?[9,10,11,12,0][Math.min(4,Math.floor((e+0.5)*5/nev))]:[1,2,3,4,5][Math.min(4,Math.floor((e+0.5)*5/nev))];
          const dt=new Date(mo>=8?yr:yr+1,mo,3+Math.floor(rnd()*24));
          const now=new Date(), future=dt>now;
          if(future&&dt-now>86400000*40)continue;              // à venir : seulement le prochain mois
          const recent=Date.now()-dt.getTime()<1000*86400*20;
          const main=!future&&rnd()<0.28;                        // une partie évaluée à la main, hors DNMAX
          const iso=x=>new Date(x).toISOString().slice(0,10), DAY=86400000;
          const capT=x=>Math.min(x,now.getTime()-DAY);
          const suivi={saisie:iso(capT(dt.getTime()-DAY*(14+Math.floor(rnd()*10))))};
          const dd=dt.getTime()-DAY*(9+Math.floor(rnd()*4));
          if(!future||dd<now.getTime()){suivi.distrib=iso(dd);suivi.butoir=iso(dt)}
          if(main&&!recent){suivi.evalue=iso(dt.getTime()+DAY*(2+Math.floor(rnd()*5)));suivi.mode="main"}
          else if(main){suivi.mode="main"}
          const res={};
          if(!future&&!main)
          els.forEach(st=>{const r={n:{},p:{},obs:{},appr:""};const base0=18+si*11+(rnd()*30-15);
            items.forEach(it=>{if(recent&&rnd()<0.35)return;
              const p=pctSnap(Math.max(0,Math.min(100,base0+rnd()*40-12)),4);r.p["one:"+it.code]=p;r.n["one:"+it.code]=pctLvl(p,4)});
            if(rnd()<0.25)r.appr=pick(["Bon engagement, à poursuivre.","Travail sérieux, manque encore d'audace.","Progrès nets depuis le dernier rendu.","Attention à la régularité du carnet.","Oral clair et argumenté."]);
            res[st.id]=r});
          out.push({id:uid(),demo:true,promoId:pr.id,classes:[pr.nom],classe:pr.nom,
            titre:typ+" — "+theme+" ("+sem+")",livrables:[liv],semestre:sem,date:dt.toISOString().slice(0,10),prof:pick(PROFS),
            ues:[],ecCodes:[],compCode:"",consignes:typ+" portant sur "+theme+".",ops:[],preset:DEF_PRESET_GET(),niveaux:PRESETS[DEF_PRESET_GET()].niveaux.slice(),
            opts:{crit:true,obs:true,coef:false},eleves:"",items,res,suivi,
            restit:(()=>{const rd=new Date(dt.getTime()+86400000*(7+Math.floor(rnd()*10)));
              if(future||recent||rd>new Date()||(main&&!suivi.evalue))return {};const iso=rd.toISOString().slice(0,10);
              Object.values(res).forEach(r=>{if(rnd()<0.92)r.rest=iso});return {[pr.nom]:iso}})()});
        }
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
function loadDemo(){
  // sans référentiel, l'exemple apporte le sien : celui du DN MADE mention Objet
  const refExemple=!refOf(DATA,DATA.activeDiplome).competences.length;
  if(refExemple){
    // les enseignants déjà déclarés (dont « moi ») ne dépendent pas du référentiel : on les garde
    const ens=DATA.enseignants,moi=DATA.moi;
    DATA=migrateData(buildData(REF_DEFAULT,SUPPORTS_DEF));DATA.enseignants=ens;if(moi)DATA.moi=moi;REF=projectRef(DATA);persistData();
  }
  const dipsAvant=new Set(refExemple?[]:DATA.diplomes.map(d=>d.id));
  [["Sophie Hébert","Atelier de création"],["Marc Lenoir","Technologies et matériaux"],["Amina Benali","Humanités"]]
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
  const p2=promo(2,DEMO_ELEVES);
  const p1=promo(1,DEMO_ELEVES1);
  savePromos();
  const cl=(f,pr)=>{f.promoId=pr.id;f.classe=pr.nom;f.classes=[pr.nom];migF(f);return f};
  const f1=cl(demoFiche(),p2); fillRes(f1,11,3);
  const f2=cl(demoFiche2(),p1); fillRes(f2,29,0);
  const f3=cl(demoFiche3(),p2); fillRes(f3,47,8);
  const titres=[f1.titre,f2.titre,f3.titre];
  const MS=demoMass();
  // Le référentiel que l'exemple installe lui-même est validé pour la démonstration ; celui de l'enseignant
  // (et les mentions que l'exemple en dérive) reste à valider par lui.
  if(refExemple)validerExemple(DATA.diplomes.filter(d=>!dipsAvant.has(d.id)).map(d=>d.id));
  fiches=[structuredClone(f1),structuredClone(f3),structuredClone(f2),...MS.fiches,...fiches.filter(x=>!titres.includes(x.titre)&&!x.demo)];
  LS.set("dnmade.fiches",fiches);
  F=migF(f1);save();
  let on="";
  if(!MOD.eleves){MOD.eleves=true;LS.set("dnmade.modules",MOD);on=" · module Élèves activé"}
  ui.step=4;ui.sel=[];ui.tab="new";ui.emode=DEVICE.phone?"fiche":"grille";ui.eleve="";
  ui.tab=MOD.fiches?"saved":"new";
  paintTabs();paintForm();paintPick();paintLignes();paintSaved();paintSteps();paintEleves();
  toast("Exemple chargé : "+MS.nM+" mentions, "+MS.nPr+" promotions, "+(MS.fiches.length+3)+" évaluations, résultats saisis"+on+".");
  window.scrollTo({top:0,behavior:"smooth"});
}
function paintVocab(){
  const sel=document.getElementById("p-critsel"), inp=document.getElementById("p-critlab");
  if(!sel)return;
  const cur=critLabel(), custom=!CRIT_PRESETS.includes(cur);
  sel.innerHTML=CRIT_PRESETS.map(x=>`<option value="${esc(x)}" ${!custom&&x===cur?"selected":""}>${esc(x)}</option>`).join("")
    +`<option value="__autre" ${custom?"selected":""}>Autre…</option>`;
  document.getElementById("p-critwrap").hidden=!custom;
  inp.value=custom?cur:"";
  sel.onchange=()=>{
    if(sel.value==="__autre"){document.getElementById("p-critwrap").hidden=false;inp.focus();return}
    PREFS.critLabel=sel.value;savePrefs();document.getElementById("p-critwrap").hidden=true;paintLignes()};
  inp.oninput=()=>{PREFS.critLabel=inp.value;savePrefs();paintLignes()};
}
function paintEch(){
  const host=document.getElementById("echList");if(!host)return;
  const keys=Object.keys(PRESETS).filter(k=>k!=="dn");
  host.innerHTML=keys.map(k=>{const v=PRESETS[k], on=ECH.actifs.includes(k), d=ECH.def===k;
    return `<div class="mod"><label class="tg"><input type="checkbox" data-ech="${k}" ${on?"checked":""} ${d?"disabled":""} aria-label="Activer ${esc(v.nom)}"><span></span></label>
      <div style="min-width:0;flex:1"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b>${esc(v.nom)}</b>
        <label class="rstl"><input type="radio" name="echdef" data-echdef="${k}" ${d?"checked":""} ${on?"":"disabled"}> par défaut</label></div>
        ${k==="libre"?`<input type="text" data-echlib value="${esc(v.niveaux.join(" / "))}" placeholder="Niveau 1 / Niveau 2 / …" style="margin-top:6px" aria-label="Niveaux de l'échelle personnalisée, séparés par /">`
          :`<div class="d">${v.niveaux.map((n,i)=>`<span class="pill">${i+1}. ${esc(n)}</span>`).join(" ")}</div>`}</div></div>`}).join("");
  host.querySelectorAll("[data-ech]").forEach(cb=>cb.onchange=()=>{const k=cb.dataset.ech;
    ECH.actifs=cb.checked?[...new Set([...ECH.actifs,k])]:ECH.actifs.filter(x=>x!==k);saveEch();paintEch()});
  host.querySelectorAll("[data-echdef]").forEach(r=>r.onchange=()=>{ECH.def=r.dataset.echdef;saveEch();paintEch();
    toast("Échelle par défaut : "+PRESETS[ECH.def].nom)});
  const li=host.querySelector("[data-echlib]");
  if(li)li.onchange=()=>{const l=li.value.split("/").map(x=>x.trim()).filter(Boolean);if(!l.length)return;
    PRESETS.libre.niveaux=l;ECH.libre=l;saveEch()};
}
function paintSet(){
  paintEch();
  {const sel=document.getElementById("p-device");if(sel){sel.value=DEVICE.force==="phone"||DEVICE.force==="desktop"?DEVICE.force:"auto";
    const nm={phone:"téléphone",tablet:"tablette (mise en page ordinateur)",desktop:"ordinateur"};
    document.getElementById("p-deviceHint").textContent="Détecté automatiquement : "+nm[DEVICE.auto]+". Le choix s'applique au rechargement de la page.";
    sel.onchange=()=>{try{STOCKAGE.setItem("dnmade.device",sel.value)}catch(_){}location.reload()}}}
  const on=Object.keys(MODULES).filter(k=>MOD[k]).length;
  document.getElementById("mCount").textContent=on+" / "+Object.keys(MODULES).length;
  const host=document.getElementById("modList");
  host.innerHTML=Object.entries(MODULES).map(([k,v])=>`
    <div class="mod${v.req&&!MOD[v.req]?" modoff":""}"><label class="tg"><input type="checkbox" data-mod="${k}" ${MOD[k]?"checked":""} ${v.locked||(v.req&&!MOD[v.req])?"disabled":""} aria-label="${esc(v.nom)}"><span></span></label>
    <div><b>${esc(v.nom)}</b>${v.req?`<span class="hint" style="margin-left:8px;font-size:11.5px">nécessite le module ${esc(MODULES[v.req].nom)}</span>`:""}<div class="d">${esc(v.d)}</div>
    ${v.locked?`<div class="off" style="color:var(--accent)">toujours actif</div>`:v.req&&!MOD[v.req]?`<div class="off">activez d'abord le module ${esc(MODULES[v.req].nom)}</div>`:v.def===false?`<div class="off">désactivé par défaut</div>`:""}${VISITE_MODULE[k]?`<button type="button" class="btn ghost modvisite" data-parcours="${VISITE_MODULE[k]}">Visite guidée</button>`:""}</div></div>`).join("");
  host.querySelectorAll("[data-mod]").forEach(cb=>cb.onchange=()=>{
    if((MODULES[cb.dataset.mod]||{}).locked){cb.checked=true;return}
    // Activer le module Élèves passe par un avertissement RGPD : la case ne reste cochée que si l'enseignant confirme.
    if(cb.dataset.mod==="eleves"&&cb.checked&&!MOD.eleves){
      cb.checked=false;
      window.dnmaxPont.confirmerModuleEleves((DATA.etab||{}).nom||"").then(ok=>{if(ok&&!MOD.eleves){cb.checked=true;appliquerModule(cb)}});
      return;
    }
    appliquerModule(cb);
  });
}
function appliquerModule(cb){
  if(!cb.checked&&Object.entries(MODULES).some(([k,v])=>v.req===cb.dataset.mod&&MOD[k]))
    toast("Niveaux DN MADE désactivé aussi : il nécessite le module "+MODULES[cb.dataset.mod].nom+".");
  MOD[cb.dataset.mod]=cb.checked;modDeps();LS.set("dnmade.modules",MOD);
  paintSet();paintTabs();paintForm();paintPick();paintLignes();paintVocab();if(MOD.referentiel)paintRef();
  toast(MODULES[cb.dataset.mod].nom+(cb.checked?" : activé":" : désactivé"));
}

/* ---------- construction de la fiche ---------- */
function columns(){
  const rs=rows();
  const c=[];
  if(MOD.ec)c.push({k:"ecn",t:"Enseignement",w:17});
  c.push({k:"comp",t:"Compétence",w:24});
  // une colonne Livrable seulement si les lignes n'ont pas toutes les mêmes livrables
  if(F.livrables.length>1&&new Set(rs.map(r=>r.livr||"")).size>1)c.push({k:"livr",t:"Livrable",w:12});
  c.push({k:"lib",t:critLabel(),w:24});
  if(F.preset==="note")c.push({k:"coef",t:"Coef.",w:5});
  c.push({k:"niv",t:"Niveau d'acquisition",w:30,lv:true});
  c.push({k:"obs",t:"Observations",w:17});
  return c;
}
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
      coef:o.coef||1,ord:[0,opIndex(o.id),0]});
  });
  F.items.filter(i=>!i.op).forEach(it=>{
    const c=REF.competences.find(x=>x.code===it.code)||{libelle:"",bloc:""};
    out.push({op:false,bloc:c.bloc,code:it.code,comp:c.libelle?it.code+" — "+c.libelle:it.code,lib:it.libelle&&it.libelle!==c.libelle?it.libelle:"",ec:(it.ecs||[]).join(", "),ecn:ecNoms(it.ecs),
      livr:(it.livrables||[]).join(" ; "),key:"one:"+it.code,
      coef:it.coef||1,ord:[1,+c.bloc||99,ecNum(it.code)]});
  });
  return out.sort((a,b)=>{for(let i=0;i<3;i++){const x=(a.ord[i]||0)-(b.ord[i]||0);if(x)return x}return 0});
}
/* EXPORT_VIDE : export de « l'évaluation » (grille vierge) plutôt que des restitutions remplies par élève */
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
function ligneEnseignant(who){
  return [F.prof?"Enseignant·e : "+F.prof:"",who?"Élève : "+who:""].filter(Boolean).join(" · ");
}

/* ---------- export Excel ---------- */
function buildXlsx(fmt){
  const cols=columns(), rs=rows(), wb=XLSX.utils.book_new();
  const aoa=[], merges=[];
  aoa.push([(F.titre||"Évaluation").toUpperCase()]);
  merges.push({s:{r:0,c:0},e:{r:0,c:Math.max(1,cols.length-1)}});
  aoa.push([]);
  aoa.push([ligneContexte()]);
  if(F.prof)aoa.push(["Enseignant·e",F.prof]);
  if(MOD.consignes&&F.consignes){aoa.push([]);aoa.push(["Consignes / attendus",F.consignes])}
  aoa.push([]);
  const head=aoa.length;
  aoa.push(cols.map(c=>c.t));
  rs.forEach(r=>aoa.push(cols.map(c=>c.lv?"":(r[c.k]!==undefined?r[c.k]:""))));
  aoa.push([]);aoa.push(["Appréciation générale"]);aoa.push([]);aoa.push([]);
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"]=cols.map(c=>({wch:c.w+2}));
  ws["!merges"]=merges;
  ws["!rows"]=aoa.map((_,i)=>i===head?{hpt:28}:{});
  XLSX.utils.book_append_sheet(wb,ws,"Évaluation");
  const els=eleveList();
  if(els.length){
    const g=[["Grille classe — "+(F.titre||""),""],["Semestre",F.semestre],[(F.classes||[]).length>1?"Promotions":"Promotion",classesDisp(F)],["Livrables",F.livrables.join(" ; ")],[]];
    g.push(["Élève",...rs.map(r=>String(r.comp||"").replace(/\n/g," / ").slice(0,90))]);
    g.push(["",...rs.map(r=>String(r.lib||"").slice(0,70))]);
    els.forEach(e=>{const r=(F.res||{})[e.id]||{n:{}};
      g.push([e.nom,...rs.map(x=>{const v=(r.n||{})[x.key];return pctTxt(pctOf(r,x.key))})])});
    g.push([]);g.push(["Échelle",...F.niveaux]);
    const ws2=XLSX.utils.aoa_to_sheet(g);
    ws2["!cols"]=[{wch:26},...rs.map(()=>({wch:12}))];
    XLSX.utils.book_append_sheet(wb,ws2,"Grille classe");
  }
  const r=[["Bloc","Code","Compétence","EC retenus","Semestre"]];
  rs.forEach(x=>r.push([x.bloc,x.code,x.lib,x.ec,F.semestre]));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(r),"Compétences");
  if(fmt==="ods")return new Blob([XLSX.write(wb,{bookType:"ods",type:"array"})],{type:"application/vnd.oasis.opendocument.spreadsheet"});
  return new Blob([XLSX.write(wb,{bookType:"xlsx",type:"array"})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}

/* ---------- export Word (.docx, OOXML minimal) ---------- */
const X=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function wp(text,o={}){
  const rpr=`<w:rPr>${o.b?"<w:b/>":""}${o.i?"<w:i/>":""}${o.sz?`<w:sz w:val="${o.sz*2}"/><w:szCs w:val="${o.sz*2}"/>`:""}${o.color?`<w:color w:val="${o.color}"/>`:""}${o.caps?"<w:caps/>":""}${o.mono?`<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>`:""}</w:rPr>`;
  const ppr=`<w:pPr>${o.align?`<w:jc w:val="${o.align}"/>`:""}<w:spacing w:before="${o.before||0}" w:after="${o.after==null?60:o.after}" w:line="240" w:lineRule="auto"/>${o.border?`<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="2" w:color="C9CED6"/></w:pBdr>`:""}</w:pPr>`;
  const runs=String(text==null?"":text).split("\n").map((l,i)=>
    `${i?'<w:r><w:br/></w:r>':''}<w:r>${rpr}<w:t xml:space="preserve">${X(l)}</w:t></w:r>`).join("");
  return `<w:p>${ppr}${runs}</w:p>`;
}
function wtc(content,o={}){
  return `<w:tc><w:tcPr><w:tcW w:w="${o.w||1000}" w:type="dxa"/>${o.shd?`<w:shd w:val="clear" w:fill="${o.shd}"/>`:""}`+
  `${o.span?`<w:gridSpan w:val="${o.span}"/>`:""}<w:vAlign w:val="${o.v||"top"}"/></w:tcPr>${content}</w:tc>`;
}
function wtr(cells,o={}){return `<w:tr>${o.head?'<w:trPr><w:tblHeader/></w:trPr>':''}${cells}</w:tr>`}
function wtable(rowsXml,widths){
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>`+
  ["top","left","bottom","right","insideH","insideV"].map(s=>`<w:${s} w:val="single" w:sz="6" w:space="0" w:color="BFC5CE"/>`).join("")+
  `</w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>`+
  `<w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rowsXml}</w:tbl>`;
}
/* Jauge de l'export Word : image (piste arrondie, remplie jusqu'au niveau atteint, sans traits
   intermédiaires), comme la saisie du module Élèves. Une image par valeur, partagée entre lignes. */
let WIMG=null;
function gaugePng(p,wpx,hpx){
  const N=(F.niveaux||[]).length, sc=3, c=document.createElement("canvas");
  c.width=wpx*sc;c.height=hpx*sc;const g=c.getContext("2d");g.scale(sc,sc);
  const r=hpx/2, rr=(x,y,w,h,rad)=>{g.beginPath();g.moveTo(x+rad,y);g.arcTo(x+w,y,x+w,y+h,rad);g.arcTo(x+w,y+h,x,y+h,rad);g.arcTo(x,y+h,x,y,rad);g.arcTo(x,y,x+w,y,rad);g.closePath()};
  rr(0.75,0.75,wpx-1.5,hpx-1.5,r-0.75);g.fillStyle="#FFFFFF";g.fill();
  if(p!=null){
    const fw=p===0?Math.max(hpx,7):Math.max(hpx,(wpx-1.5)*p/100);
    g.save();rr(0.75,0.75,wpx-1.5,hpx-1.5,r-0.75);g.clip();
    rr(0.75,0.75,fw,hpx-1.5,r-0.75);g.fillStyle=nivColor(pctLvl(p,N),N);g.fill();g.restore();
  }
  // séparateurs discrets entre niveaux, pour situer l'élève d'une jauge à l'autre
  pctBounds(N).slice(1,-1).forEach(tp=>{const x=0.75+(wpx-1.5)*tp/100;
    g.beginPath();g.moveTo(x,2.5);g.lineTo(x,hpx-2.5);g.lineWidth=0.8;
    g.strokeStyle=p!=null&&p>tp?"rgba(255,255,255,.85)":"#C6CCD5";g.stroke()});
  rr(0.75,0.75,wpx-1.5,hpx-1.5,r-0.75);g.lineWidth=1.2;g.strokeStyle="#8A93A0";g.stroke();
  return c.toDataURL("image/png").split(",")[1];
}
function wGauge(p,w,head){
  const niv=F.niveaux||[],N=niv.length,t=pctBounds(N),W=w-200;
  if(head){
    const cells=niv.map((n,i)=>{const ww=Math.max(80,Math.round(W*(t[i+1]-t[i])/100));
      return `<w:tc><w:tcPr><w:tcW w:w="${ww}" w:type="dxa"/><w:vAlign w:val="bottom"/></w:tcPr>${wp(n,{sz:7,align:"center",after:0,color:"5C6472"})}</w:tc>`});
    const ws=niv.map((n,i)=>Math.max(80,Math.round(W*(t[i+1]-t[i])/100)));
    return `<w:tbl><w:tblPr><w:tblW w:w="${ws.reduce((a,b)=>a+b,0)}" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/><w:tblBorders>`
      +["top","bottom","right","left","insideV","insideH"].map(x=>`<w:${x} w:val="nil"/>`).join("")
      +`</w:tblBorders><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>`
      +`<w:tblGrid>${ws.map(x=>`<w:gridCol w:w="${x}"/>`).join("")}</w:tblGrid><w:tr>${cells.join("")}</w:tr></w:tbl>`+wp("",{after:0,sz:2});
  }
  const cx=W*635, cy=280*635, key=(p==null?"v":"p"+p)+"_"+W;
  if(!WIMG)WIMG={list:[],map:{}};
  let im=WIMG.map[key];
  if(!im){const wpx=Math.round(W/8), hpx=Math.max(10,Math.round(wpx*280/W));
    im={rid:"rIdG"+(WIMG.list.length+1),file:"g"+(WIMG.list.length+1)+".png",data:gaugePng(p,wpx,hpx)};WIMG.list.push(im);WIMG.map[key]=im}
  const id=1000+(WIMG.n=(WIMG.n||0)+1);
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="40" w:after="40"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Jauge ${id}"/>`
    +`<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">`
    +`<pic:nvPicPr><pic:cNvPr id="${id}" name="${im.file}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${im.rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
    +`<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}
function ficheXml(el){
  const who=typeof el==="string"?el:(el&&el.nom)||"";
  const res=(el&&el.id)?((F.res||{})[el.id]||{n:{},obs:{},appr:""}):null;
  const cols=columns(), rs=rows();
  const TOT=10500;   // A4 portrait, marges de 1,2 cm
  const sum=cols.reduce((a,c)=>a+c.w,0);
  const widths=cols.map(c=>Math.round(TOT*c.w/sum));
  let x="";
  x+=wp(REF.meta.diplome||"",{sz:8.5,caps:true,color:"5C6472",after:20});
  x+=wp(F.titre||"Évaluation",{b:true,sz:16,after:40});
  x+=wp(ligneContexte(),{sz:10,color:"1F4D8F",after:40,border:true});
  const ens=ligneEnseignant(who);
  if(ens)x+=wp(ens,{sz:10,after:120});
  if(MOD.consignes&&F.consignes){
    x+=wp("Consignes et attendus",{b:true,sz:10,caps:true,color:"5C6472",before:120,after:30});
    x+=wp(F.consignes,{sz:10,after:120});
  }
  x+=wp("Compétences évaluées",{b:true,sz:10,caps:true,color:"5C6472",before:120,after:20});
  x+=wp("Niveau d'acquisition : griser la jauge de gauche à droite jusqu'au point atteint, en suivant les niveaux indiqués au-dessus ; dans la zone du premier niveau, ne rien griser, dans celle du dernier, griser jusqu'au bout.",{sz:8.5,i:true,color:"5C6472",after:60});
  let tr=wtr(cols.map((c,i)=>wtc(wp(c.t,{b:true,sz:8.5,caps:true,after:c.lv?30:0,align:c.lv?"center":"left"})+(c.lv?wGauge(null,widths[i],true):""),{w:widths[i],shd:"EAEEF4"})).join(""),{head:true});
  if(!rs.length) tr+=wtr(wtc(wp("Aucune compétence sélectionnée.",{sz:10,i:true,after:0}),{w:TOT,span:cols.length}));
  rs.forEach(r=>{
    tr+=wtr(cols.map((c,i)=>{
      if(c.lv)return wtc(wGauge(res?pctOf(res,r.key):null,widths[i],false),{w:widths[i],v:"center"});
      if(c.k==="code")return wtc(wp(r.code,{mono:true,sz:9,b:true,after:0}),{w:widths[i]});
      if(c.k==="bloc")return wtc(wp(r.bloc,{mono:true,sz:9,align:"center",after:0}),{w:widths[i]});
      if(c.k==="lib")return wtc(wp(r.lib,{sz:9,b:r.op,after:0}),{w:widths[i]});
      if(c.k==="obs"){const t=res?((res.obs||{})[r.key]||""):"";
        return wtc(t?wp(t,{sz:9,after:0}):(wp("",{after:0})+wp("",{after:0})),{w:widths[i]})}
      return wtc(wp(r[c.k]||"",{sz:9,after:0}),{w:widths[i]});
    }).join(""));
  });
  x+=wtable(tr,widths);
  x+=wp("Appréciation générale",{b:true,sz:10,caps:true,color:"5C6472",before:200,after:40});
  const ap=res&&res.appr?res.appr:"";
  x+=wtable(wtr(wtc(ap?wp(ap,{sz:10,after:0}):(wp("",{after:0})+wp("",{after:0})+wp("",{after:0})+wp("",{after:0})),{w:TOT})),[TOT]);
  return x;
}
function buildDocx(only){
  const els=only||eleveList();
  const SECT=`<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="680" w:right="680" w:bottom="680" w:left="680" w:header="340" w:footer="340" w:gutter="0"/></w:sectPr>`;
  WIMG={list:[],map:{}};
  const parts = els.length? els.map(e=>ficheXml(e)) : [ficheXml("")];
  const body = parts.map((p,i)=> i<parts.length-1 ? p+`<w:p><w:r><w:br w:type="page"/></w:r></w:p>` : p).join("");
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body}${SECT}</w:body></w:document>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="fr-FR"/>
</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;
  const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
  const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const drels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${WIMG.list.map(im=>`<Relationship Id="${im.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${im.file}"/>`).join("")}</Relationships>`;
  const zip=new JSZip();
  zip.file("[Content_Types].xml",ct);
  zip.folder("_rels").file(".rels",rels);
  const w=zip.folder("word");
  w.file("document.xml",doc); w.file("styles.xml",styles);
  w.folder("_rels").file("document.xml.rels",drels);
  const md=w.folder("media");WIMG.list.forEach(im=>md.file(im.file,im.data,{base64:true}));
  return zip.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",compression:"DEFLATE"});
}

/* ---------- export OpenDocument (.odt, LibreOffice / OpenOffice) ---------- */
function buildOdt(only){
  const els=only||eleveList();
  WIMG={list:[],map:{}};
  let nT=0;const colSt=[];
  const cm=tw=>(tw/567).toFixed(3)+"cm";
  const tp=(t,st)=>`<text:p text:style-name="${st||"P"}">${String(t==null?"":t).split("\n").map(X).join("<text:line-break/>")}</text:p>`;
  const cell=(content,st)=>`<table:table-cell table:style-name="${st||"Cell"}" office:value-type="string">${content||"<text:p/>"}</table:table-cell>`;
  const table=(widths,rowsXml,st)=>{const n=++nT;
    widths.forEach((w,i)=>colSt.push(`<style:style style:name="T${n}C${i}" style:family="table-column"><style:table-column-properties style:column-width="${cm(w)}"/></style:style>`));
    colSt.push(`<style:style style:name="T${n}" style:family="table"><style:table-properties style:width="${cm(widths.reduce((a,b)=>a+b,0))}" table:align="${st==="center"?"center":"left"}" fo:margin-top="0cm" fo:margin-bottom="0cm"/></style:style>`);
    return `<table:table table:name="Tableau${n}" table:style-name="T${n}">${widths.map((w,i)=>`<table:table-column table:style-name="T${n}C${i}"/>`).join("")}${rowsXml}</table:table>`};
  const row=(cells,head)=>head?`<table:table-header-rows><table:table-row>${cells}</table:table-row></table:table-header-rows>`:`<table:table-row>${cells}</table:table-row>`;
  const gauge=(p,w)=>{wGauge(p,w,false);const im=WIMG.list[WIMG.list.length-1]&&WIMG.map[(p==null?"v":"p"+p)+"_"+(w-200)];
    return `<text:p text:style-name="Pc"><draw:frame draw:name="j${++nT}" text:anchor-type="as-char" svg:width="${cm(w-200)}" svg:height="${cm(280)}" draw:z-index="0"><draw:image xlink:href="Pictures/${im.file}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></text:p>`};
  const gaugeHead=w=>{const niv=F.niveaux||[],t=pctBounds(niv.length),W=w-200;
    const ws=niv.map((n,i)=>Math.max(80,Math.round(W*(t[i+1]-t[i])/100)));
    return table(ws,row(niv.map(n=>cell(tp(n,"Pg"),"CellN")).join("")),"center")};
  const fiche=el=>{
    const who=typeof el==="string"?el:(el&&el.nom)||"";
    const res=(el&&el.id)?((F.res||{})[el.id]||{n:{},obs:{},appr:""}):null;
    const cols=columns(), rs=rows(), TOT=10500, sum=cols.reduce((a,c)=>a+c.w,0), widths=cols.map(c=>Math.round(TOT*c.w/sum));   // A4 portrait
    let x=tp(REF.meta.diplome||"","Pk")+tp(F.titre||"Évaluation","Ph")
      +tp(ligneContexte(),"Pa");
    const ens=ligneEnseignant(who);
    if(ens)x+=tp(ens);
    if(MOD.consignes&&F.consignes)x+=tp("Consignes et attendus","Ps")+tp(F.consignes);
    x+=tp("Compétences évaluées","Ps")+tp("Niveau d'acquisition : griser la jauge de gauche à droite jusqu'au point atteint, en suivant les niveaux indiqués au-dessus ; dans la zone du premier niveau, ne rien griser, dans celle du dernier, griser jusqu'au bout.","Pi");
    let tr=row(cols.map((c,i)=>cell(tp(c.t,c.lv?"PhC":"PhT")+(c.lv?gaugeHead(widths[i]):""),"CellH")).join(""),true);
    if(!rs.length)tr+=row(`<table:table-cell table:style-name="Cell" table:number-columns-spanned="${cols.length}" office:value-type="string">${tp("Aucune compétence sélectionnée.","Pi")}</table:table-cell>`+cols.slice(1).map(()=>"<table:covered-table-cell/>").join(""));
    rs.forEach(r=>{tr+=row(cols.map((c,i)=>{
      if(c.lv)return cell(gauge(res?pctOf(res,r.key):null,widths[i]),"CellM");
      if(c.k==="lib")return cell(tp(r.lib,r.op?"Pb":"P9"));
      if(c.k==="obs")return cell(tp(res?((res.obs||{})[r.key]||""):"","P9"));
      return cell(tp(r[c.k]||"","P9"))}).join(""))});
    x+=table(widths,tr);
    x+=tp("Appréciation générale","Ps");
    const ap=res&&res.appr?res.appr:"";
    x+=table([TOT],row(cell(ap?tp(ap):tp("")+tp("")+tp("")+tp(""))));
    return x};
  const parts=els.length?els.map(e=>fiche(e)):[fiche("")];
  const body=parts.map((q,i)=>i?`<text:p text:style-name="PB"/>`+q:q).join("");
  const ns=`xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.3"`;
  const ps=(n,props,tprops)=>`<style:style style:name="${n}" style:family="paragraph"><style:paragraph-properties ${props||'fo:margin-top="0cm" fo:margin-bottom="0.05cm"'}/><style:text-properties ${tprops||""}/></style:style>`;
  const cellSt=(n,bg,va)=>`<style:style style:name="${n}" style:family="table-cell"><style:table-cell-properties fo:padding="0.08cm" fo:border="0.5pt solid #BFC5CE" ${bg?`fo:background-color="${bg}"`:""} style:vertical-align="${va||"top"}"/></style:style>`;
  const auto=ps("P","",'fo:font-size="10pt"')+ps("P9","",'fo:font-size="9pt"')+ps("Pb","",'fo:font-size="9pt" fo:font-weight="bold"')
    +ps("Pk","",'fo:font-size="8pt" fo:font-weight="bold" fo:color="#5C6472" fo:text-transform="uppercase"')
    +ps("Ph",'fo:margin-top="0.05cm" fo:margin-bottom="0.1cm"','fo:font-size="16pt" fo:font-weight="bold"')
    +ps("Pa",'fo:margin-bottom="0.25cm" fo:border-bottom="0.5pt solid #C9CED6" fo:padding-bottom="0.05cm"','fo:font-size="10pt" fo:color="#1F4D8F"')
    +ps("Ps",'fo:margin-top="0.3cm" fo:margin-bottom="0.05cm"','fo:font-size="10pt" fo:font-weight="bold" fo:color="#5C6472" fo:text-transform="uppercase"')
    +ps("Pi",'fo:margin-bottom="0.1cm"','fo:font-size="8.5pt" fo:font-style="italic" fo:color="#5C6472"')
    +ps("PhT","",'fo:font-size="8.5pt" fo:font-weight="bold" fo:text-transform="uppercase"')
    +ps("PhC",'fo:text-align="center" fo:margin-bottom="0.05cm"','fo:font-size="8.5pt" fo:font-weight="bold" fo:text-transform="uppercase"')
    +ps("Pc",'fo:text-align="center" fo:margin="0cm"','')
    +ps("Pg",'fo:text-align="center" fo:margin="0cm"','fo:font-size="7pt" fo:color="#5C6472"')
    +ps("Pg2",'fo:margin-top="0.45cm"','fo:font-size="9pt" fo:color="#5C6472"')
    +`<style:style style:name="PB" style:family="paragraph"><style:paragraph-properties fo:break-before="page"/></style:style>`
    +cellSt("Cell")+cellSt("CellK","#F4F5F7")+cellSt("CellH","#EAEEF4")+cellSt("CellM","","middle")
    +`<style:style style:name="CellN" style:family="table-cell"><style:table-cell-properties fo:padding="0cm" fo:border="none" style:vertical-align="bottom"/></style:style>`
    +colSt.join("");
  const content=`<?xml version="1.0" encoding="UTF-8"?><office:document-content ${ns}><office:automatic-styles>${auto}</office:automatic-styles><office:body><office:text>${body}</office:text></office:body></office:document-content>`;
  const styles=`<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${ns}><office:styles><style:default-style style:family="paragraph"><style:text-properties style:font-name="Calibri" fo:font-family="Calibri, Carlito, sans-serif" fo:font-size="10pt" fo:language="fr" fo:country="FR"/></style:default-style></office:styles><office:automatic-styles><style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" style:print-orientation="portrait" fo:margin-top="1.2cm" fo:margin-bottom="1.2cm" fo:margin-left="1.2cm" fo:margin-right="1.2cm"/></style:page-layout></office:automatic-styles><office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles></office:document-styles>`;
  const manifest=`<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>${WIMG.list.map(im=>`<manifest:file-entry manifest:full-path="Pictures/${im.file}" manifest:media-type="image/png"/>`).join("")}</manifest:manifest>`;
  const zip=new JSZip();
  zip.file("mimetype","application/vnd.oasis.opendocument.text",{compression:"STORE"});
  zip.file("content.xml",content);zip.file("styles.xml",styles);
  zip.folder("META-INF").file("manifest.xml",manifest);
  const pic=zip.folder("Pictures");WIMG.list.forEach(im=>pic.file(im.file,im.data,{base64:true}));
  return zip.generateAsync({type:"blob",mimeType:"application/vnd.oasis.opendocument.text",compression:"DEFLATE"});
}

/* ---------- Progression d'une promotion : ce qui reste à évaluer au semestre ---------- */
/* barre de filtres de la Progression, sur le modèle de « Mes évaluations » */
function progFiltres(ps,pr,sem,semsAll,semCur,extra){
  const dips=[...new Set(ps.map(p=>p.diplomeId))];
  const opt=p=>`<option value="${esc(p.id)}" ${p.id===pr.id?"selected":""}>${esc((promoShort(p)?promoShort(p)+" — ":"")+(p.nom||""))}</option>`;
  const promoOpts=dips.length>1?dips.map(d=>`<optgroup label="${esc(dipLabel(DATA.diplomes.find(x=>x.id===d)||{}))}">${ps.filter(p=>p.diplomeId===d).map(opt).join("")}</optgroup>`).join(""):ps.map(opt).join("");
  return `<div class="sfbar"><span class="sfl">Filtrer</span>
    <label><span class="sfl2">Promotion</span><select data-pgsel="promo" aria-label="Promotion">${promoOpts}</select></label>
    <label><span class="sfl2">Semestre</span><select data-pgsel="sem" aria-label="Semestre">${semsAll.map(x=>`<option value="${x}" ${x===sem?"selected":""}>${x}${x===semCur?" (en cours)":""}</option>`).join("")}</select></label>
    ${extra||""}</div>`;
}
function bindProgFiltres(host){
  host.querySelectorAll("[data-pgsel]").forEach(sel=>sel.onchange=()=>{const k=sel.dataset.pgsel, v=sel.value;
    if(k==="promo"){ui.prog.promo=v;ui.prog.sem="";ui.prog.t=null;ui.prog.el=""}
    else if(k==="sem")ui.prog.sem=v;
    else if(k==="f")ui.prog.f=v;
    else if(k==="t")ui.prog.t=v?[v]:[];
    else if(k==="el")ui.prog.el=v;
    paintProg()});
}
function paintProg(){
  const host=document.getElementById("progPane");if(!host)return;
  ui.prog=ui.prog||{};
  const AS=anneeScolaire(new Date());
  // si « c'est moi » est défini : seulement les promotions de ma répartition de service, en cours ou terminées
  // (mes élèves et mes anciens élèves) ; sinon, les promotions en cours
  const me=DATA.enseignants.find(t=>t.id===DATA.moi);
  const live=promos.map(migPromoCohorte).filter(pr=>DATA.diplomes.some(d=>d.id===pr.diplomeId))
    .filter(pr=>promoAnneeAt(pr,AS)>=1);
  const mine=pr=>me&&teachesPromo(pr.id,me.id);
  const nMine=live.filter(mine).length, onlyMine=!!(me&&nMine);   // seulement les promotions de ma répartition de service
  const dIdx=id=>DATA.diplomes.findIndex(d=>d.id===id);
  const ps=live.filter(pr=>onlyMine?mine(pr):promoAnneeAt(pr,AS)<=promoDuree(pr)).sort((a,b)=>(dIdx(a.diplomeId)-dIdx(b.diplomeId))||(b.debut-a.debut));
  if(!ps.length){host.innerHTML=`<div class="panel"><div class="empty">Aucune promotion en cours pour ${esc(REF.meta.diplome||"cette mention")} en ${esc(AS)}.
    Crée-la dans Mon établissement › Promotions.</div></div>`;return}
  const pr=ps.find(x=>x.id===ui.prog.promo)||ps.find(x=>x.diplomeId===DATA.activeDiplome)||ps[0];ui.prog.promo=pr.id;
  // la progression lit le référentiel de la mention de la promotion affichée
  if(pr.diplomeId!==DATA.activeDiplome){DATA.activeDiplome=pr.diplomeId;saveData(false)}
  if(ui.prog.t==null&&me&&mine(pr))ui.prog.t=[me.id];
  const fini=promoAnneeAt(pr,AS)>promoDuree(pr), an=Math.min(promoDuree(pr),promoAnneeAt(pr,AS)), semsY=semsOfAnnee(an),
    semCur=fini?semsY[semsY.length-1]:(semsY[rangSemestre(new Date())-1]||semsY[0]);
  const semsAll=SEMS.slice(0,SEMS.indexOf(semsY[semsY.length-1])+1);
  const sem=semsAll.includes(ui.prog.sem)?ui.prog.sem:semCur;ui.prog.sem=sem;
  const filt=ui.prog.f||"tout";
  const els=migPromo(pr).liste;
  const fs=fiches.filter(f=>(f.classes||[]).includes(pr.nom)||f.promoId===pr.id);
  const viewSeg=MOD.eleves?`<div class="seg" id="pgView"><button type="button" data-pv="promo" aria-pressed="${ui.prog.view!=="eleve"}">Promotion</button><button type="button" data-pv="eleve" aria-pressed="${ui.prog.view==="eleve"}">Élève</button></div>`:"";
  if(MOD.eleves&&ui.prog.view==="eleve"){paintProgEleve(host,{ps,pr,sem,semsAll,semCur,els,fs,me,nMine,onlyMine,viewSeg});return}
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
  const rowsP=expected.map(c=>{
    const cover=fs.filter(f=>(f.items||[]).some(it=>it.code===c.code));
    const inSem=cover.filter(f=>f.semestre===sem);
    // dernier niveau connu par élève, sur les évaluations du semestre (les plus récentes l'emportent)
    const last={};
    inSem.slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))).forEach(f=>{
      const N=(f.niveaux||[]).length||NL;
      (f.items||[]).filter(it=>it.code===c.code).forEach(it=>{
        const key=it.op?"op:"+it.op:"one:"+it.code;
        Object.entries(f.res||{}).forEach(([eid,r])=>{const v=(r.n||{})[key];
          if(v!=null&&v!=="")last[eid]=Math.round((+v)/(Math.max(1,N-1))*(NL-1))});
      });
    });
    const done=els.filter(e=>last[e.id]!=null).length;
    const dist=LV.map((_,i)=>els.filter(e=>last[e.id]===i).length);
    const ecn=[...new Set((c.ecs||[]).filter(e=>e.sem===sem).map(e=>e.nom||e.ec))].join(", ");
    return {c,cover,inSem,done,dist,ecn,state:inSem.length?(!inSem.some(evalueeF)?"prevue":(!MOD.eleves||(done>=els.length&&els.length)?"ok":"part")):(cover.length?"autre":"todo")};
  });
  const nOk=rowsP.filter(r=>r.inSem.length).length, nTodo=rowsP.length-nOk;
  const evSem=fs.filter(f=>f.semestre===sem);
  const shown=rowsP.filter(r=>filt==="tout"||(filt==="todo"?!r.inSem.length:r.inSem.length));
  const blocs=[...new Set(shown.map(r=>String(r.c.bloc)))].sort((a,b)=>+a-+b);
  const blocNom=n=>((REF.blocs||[]).find(b=>String(b.num)===n)||{}).nom||"";
  const stTxt={ok:"Évaluée",part:"En cours",prevue:"Prévue, pas encore évaluée",autre:"Vue à un autre semestre",todo:"À évaluer"};
  const pct=rowsP.length?Math.round(nOk/rowsP.length*100):0;
  host.innerHTML=`<div class="panel">
    <div class="pick-head"><h3>Progression${help("Pour une promotion en cours et un semestre : les compétences que le référentiel rattache à ce semestre, et ce que tes évaluations enregistrées en couvrent déjà. Une compétence est « évaluée » dès qu'une évaluation du semestre la contient, « en cours » tant que tous les élèves n'ont pas de niveau saisi. La répartition donne le dernier niveau de chaque élève.")}</h3>
      <div style="margin-left:auto">${viewSeg}</div></div>
    ${progFiltres(ps,pr,sem,semsAll,semCur,
      (tAvail.length?`<label><span class="sfl2">Enseignant</span><select data-pgsel="t" aria-label="Enseignant"><option value="">Tous</option>${tAvail.map(t=>`<option value="${t.id}" ${tSel.includes(t.id)?"selected":""}>${esc(t.nom)}</option>`).join("")}</select></label>`:"")
      +`<label><span class="sfl2">Compétences</span><select data-pgsel="f" aria-label="Compétences">${[["tout","Toutes"],["todo","À évaluer"],["fait","Évaluées"]].map(([k,l])=>`<option value="${k}" ${k===filt?"selected":""}>${l}</option>`).join("")}</select></label>`)}
    <div class="pgsum">
      <div><b class="big">${nOk}</b> / ${rowsP.length} compétences du ${esc(sem)} évaluées${tSel.length?` <span class="hint">— dans les EC de ${esc(tSel.map(id=>(DATA.enseignants.find(t=>t.id===id)||{}).nom).join(", "))}</span>`:""}</div>
      <div class="pgbar"><i style="width:${pct}%"></i></div>
      <div class="hint">${esc(pr.nom)}${MOD.eleves?` · ${els.length} élève${els.length>1?"s":""}`:""} · ${evSem.length} évaluation${evSem.length>1?"s":""} au ${esc(sem)}${nTodo?` · <b>${nTodo} à évaluer</b>`:" · tout est couvert"}</div>
    </div>
    ${blocs.map(b=>`<div class="pgbloc"><div class="pgbh">${esc(b)} - ${esc(blocNom(b))}</div>
      ${shown.filter(r=>String(r.c.bloc)===b).sort((x,y)=>(x.inSem.length?1:0)-(y.inSem.length?1:0)).map(r=>`<div class="pgrow ${r.state}">
        <span class="pill pst ${r.state}">${stTxt[r.state]}</span>
        <div class="pgc"><div>${esc(r.c.libelle||r.c.code)}</div><div class="hint">${esc(r.ecn)}</div></div>
        <div class="pgev">${r.inSem.length?r.inSem.map(f=>`<div>${esc(f.titre||"Sans titre")} <span class="hint">${esc(f.date||"")}</span></div>`).join(""):
          r.cover.length?`<span class="hint">${r.cover.map(f=>esc((f.semestre||"")+" · "+(f.titre||""))).join("<br>")}</span>`:`<span class="hint">—</span>`}</div>
        <div class="pgst">${MOD.eleves&&r.inSem.length&&els.length?`<div class="pgdist" title="${LV.map((l,i)=>l+" : "+r.dist[i]).join(" · ")}">${r.dist.map((n,i)=>n?`<i style="flex:${n};background:${nivColor(i,NL)}"></i>`:"").join("")}${els.length-r.done?`<i style="flex:${els.length-r.done}" class="none"></i>`:""}</div>
          <span class="hint">${r.done}/${els.length} élèves</span>`:""}</div>
      </div>`).join("")}</div>`).join("")||`<div class="empty">Rien à afficher pour ce filtre.</div>`}
  </div>`;
  bindProgFiltres(host);
  {const a=host.querySelector("#pgAll");if(a)a.onclick=()=>{ui.prog.all=!ui.prog.all;paintProg()}}
  host.querySelectorAll("[data-ps]").forEach(b=>b.onclick=()=>{ui.prog.sem=b.dataset.ps;paintProg()});
  host.querySelectorAll("[data-pf]").forEach(b=>b.onclick=()=>{ui.prog.f=b.dataset.pf;paintProg()});
  host.querySelectorAll("[data-pt]").forEach(b=>b.onclick=()=>{const id=b.dataset.pt, l=ui.prog.t||[];
    ui.prog.t=l.includes(id)?l.filter(x=>x!==id):[...l,id];paintProg()});
  host.querySelectorAll("[data-pv]").forEach(b=>b.onclick=()=>{ui.prog.view=b.dataset.pv;paintProg()});
}
/* ---------- Progression élève (module Élèves) ----------
   Pour un élève d'une promotion en cours : où il en est dans les évaluations du semestre, comparé aux autres
   (évalué, partiel, non rendu, oublié alors que les autres l'ont été), et ce qu'il a acquis sur les compétences
   jusqu'à ce semestre (dernier niveau connu ; palier DN MADE atteint avec le module Niveaux DN MADE). */
function dnPalier(a){const n=(REF.meta.niveaux||[]).find(x=>+x.annee===+a);return (n&&n.label)||["Initié","Guidé","Autonome"][a-1]||("Année "+a)}
function paintProgEleve(host,c){
  const {ps,pr,sem,semsAll,semCur,els,fs,me,nMine,onlyMine,viewSeg}=c;
  const LV=PRESETS[DEF_PRESET_GET()].niveaux, NL=LV.length, thr=Math.max(1,Math.ceil((NL-1)/2));
  const el=els.find(e=>e.id===ui.prog.el)||els[0];if(el)ui.prog.el=el.id;
  const dateOf=f=>f.distribPrev||(f.suivi&&f.suivi.distrib)||f.date||"";
  const norm=(f,v)=>{const N=(f.niveaux||[]).length||NL;return Math.round((+v)/Math.max(1,N-1)*(NL-1))};
  const live=fs.filter(f=>!f.annulee&&el&&studentsOf(f).some(e=>e.id===el.id));
  const filled=(r,k)=>(r.n||{})[k]!=null&&(r.n||{})[k]!=="";
  /* A. avancement du semestre */
  const rowsA=live.filter(f=>f.semestre===sem).sort((a,b)=>dateOf(a).localeCompare(dateOf(b))).map(f=>{
    const keys=lignesOf(f).map(ligKey), r=(f.res||{})[el.id]||{}, n=keys.filter(k=>filled(r,k)).length, st=saisieDnmax(f);
    const autres=st.any-((n||r.nr)?1:0);
    const s=r.disp?"disp":r.nr?"nr":(keys.length&&n>=keys.length)?"ok":n?"part":(autres>0?"miss":"wait");
    return {f,fi:fiches.indexOf(f),keys,n,s,st,r}});
  const cnt=k=>rowsA.filter(x=>x.s===k).length;
  /* rendus, non-rendus et dispenses de l'élève au semestre, comparés à la moyenne de la promo */
  const evSem=fs.filter(f=>!f.annulee&&f.semestre===sem);
  const estCount=e=>{const o={tot:0,rendu:0,nr:0,disp:0};
    evSem.forEach(f=>{if(!studentsOf(f).some(x=>x.id===e.id))return;o.tot++;const st=estOf((f.res||{})[e.id]);if(o[st]!=null)o[st]++});return o};
  const moi=el?estCount(el):{tot:0,rendu:0,nr:0,disp:0};
  const moy=k=>els.length?els.reduce((a,e)=>a+estCount(e)[k],0)/els.length:0;
  const fr1=x=>(Math.round(x*10)/10).toLocaleString("fr-FR");
  const kpi=(k,lbl,bad)=>{const m=moy(k), v=moi[k], d=v-m, hi=k!=="rendu"&&Math.abs(d)>=0.5;
    const cls=!hi?"":((bad?d>0:d<0)?" warn":" good");
    return `<div class="pgkpi${cls}"><span class="kl">${lbl}</span><b>${v}</b>${k==="rendu"?`<span class="kt"> / ${moi.tot}</span>`:""}
      ${k==="rendu"?"":`<span class="kc">classe : ${fr1(m)} en moyenne</span>`}</div>`};
  const LBL={ok:["ok","Évalué"],part:["part","Évaluation partielle"],nr:["todo","Non rendu"],disp:["prevue","Dispensé"],miss:["autre","Non évalué"],wait:["prevue","Pas encore évaluée"]};
  /* B. acquisition des compétences, cumulée jusqu'au semestre affiché */
  const comp={};
  live.filter(f=>SEMS.indexOf(f.semestre)<=SEMS.indexOf(sem)).forEach(f=>{const r=(f.res||{})[el.id];if(!r||!r.n)return;
    lignesOf(f).forEach(l=>{const k=ligKey(l);if(!filled(r,k))return;const lv=norm(f,r.n[k]);
      (l.k==="op"?l.its.map(i=>i.code):[l.it.code]).forEach(code=>(comp[code]=comp[code]||[]).push({f,lv,d:dateOf(f),a:anneeOf(f.semestre)}))})});
  const rowsB=Object.entries(comp).map(([code,L])=>{L.sort((x,y)=>x.d.localeCompare(y.d));
    const cc=REF.competences.find(x=>x.code===code)||{code,libelle:code,bloc:""};
    const ok=L.filter(x=>x.lv>=thr), pal=ok.length?Math.max(...ok.map(x=>x.a)):0;
    return {c:cc,L,last:L[L.length-1],pal}});
  const blocs=[...new Set(rowsB.map(r=>String(r.c.bloc)))].sort((a,b)=>+a-+b);
  const blocNom=n=>((REF.blocs||[]).find(b=>String(b.num)===n)||{}).nom||"";
  const nAcq=rowsB.filter(r=>r.last.lv>=thr).length;
  /* niveau de la classe sur chaque compétence : dernier niveau de chaque élève, jusqu'au semestre affiché */
  const lastOf=e=>{const m={};
    fs.filter(f=>!f.annulee&&SEMS.indexOf(f.semestre)<=SEMS.indexOf(sem)&&studentsOf(f).some(x=>x.id===e.id))
      .sort((a,b)=>dateOf(a).localeCompare(dateOf(b))).forEach(f=>{const r=(f.res||{})[e.id];if(!r||!r.n||r.nr||r.disp)return;
        lignesOf(f).forEach(l=>{const k=ligKey(l);if(!filled(r,k))return;const lv=norm(f,r.n[k]);
          (l.k==="op"?l.its.map(i=>i.code):[l.it.code]).forEach(code=>{m[code]=lv})})});
    return m};
  const classe=els.map(lastOf);
  const posCl=r=>{const vs=classe.map(m=>m[r.c.code]).filter(v=>v!=null);if(vs.length<2)return "";
    const moyLv=Math.round(vs.reduce((a,b)=>a+b,0)/vs.length), d=r.last.lv-moyLv;
    return `<div class="pgpos" style="margin-top:4px"><span class="hint">Classe : en moyenne « ${esc(LV[moyLv]||"")} » (${vs.length} élèves)</span>
      <span class="pp ${d>0?"up":d<0?"dn":"eq"}">${d>0?"▲ au-dessus":d<0?"▼ en dessous":"= dans la moyenne"}</span></div>`};
  const palCount=[1,2,3].map(a=>rowsB.filter(r=>r.pal===a).length);
  const i0=els.findIndex(e=>el&&e.id===el.id), anCur=anneeOf(sem);
  host.innerHTML=`<div class="panel">
    <div class="pick-head"><h3>Progression élève${help("Pour un élève : les évaluations du semestre et ce qu'il y a obtenu, comparé au reste de la promotion — « Non évalué » signale une évaluation où les autres élèves ont déjà été saisis mais pas lui. « Non rendu » et « Dispensé » se renseignent dans l'évaluation elle-même (étape Élèves) et comptent comme traités. En dessous, toutes les compétences sur lesquelles il a été évalué jusqu'à ce semestre, avec l'évolution de son niveau de maîtrise d'une évaluation à l'autre"+(MOD.dn?" et sa progression dans les niveaux DN MADE : Initié (année 1) → Guidé (année 2) → Autonome (année 3), chaque niveau étant atteint dès qu'il est évalué avec une maîtrise suffisante dans l'année correspondante.":"."))}</h3>
      <div style="margin-left:auto">${viewSeg}</div></div>
    ${progFiltres(ps,pr,sem,semsAll,semCur,el?`<label><span class="sfl2">Élève</span>
        <button type="button" class="btn ghost" id="pgElPrev" ${i0<=0?"disabled":""} aria-label="Élève précédent">‹</button>
        <select id="pgEl" aria-label="Élève">${els.map(e=>`<option value="${esc(e.id)}" ${e.id===el.id?"selected":""}>${esc(e.nom)}</option>`).join("")}</select>
        <button type="button" class="btn ghost" id="pgElNext" ${i0>=els.length-1?"disabled":""} aria-label="Élève suivant">›</button>
        <span class="hint">${i0+1} / ${els.length}</span></label>`:"")}
    ${!el?`<div class="empty">Aucun élève dans ${esc(pr.nom)}. Ajoute-les dans Mon établissement › Promotions.</div>`:`
    <div class="pgsum">
      <div style="font-family:var(--fd);font-weight:700;font-size:15px">${esc(el.nom)} <span class="hint" style="font-weight:400">· ${esc(promoShort(pr)||pr.nom)}</span></div>
      <div><b class="big">${cnt("ok")}</b> / ${rowsA.length} évaluation${rowsA.length>1?"s":""} du ${esc(sem)} complète${cnt("ok")>1?"s":""} pour cet élève</div>
      <div class="pgbar"><i style="width:${rowsA.length?Math.round(cnt("ok")/rowsA.length*100):0}%"></i></div>
      ${moi.tot?`<div class="pgkpis">${kpi("rendu","Rendus",false)}${kpi("nr","Non rendus",true)}${kpi("disp","Dispensé"+(moi.disp>1?"s":""),true)}</div>`:""}
      <div class="hint">${[cnt("part")&&cnt("part")+" partielle"+(cnt("part")>1?"s":""),cnt("nr")&&"<b>"+cnt("nr")+" non rendu"+(cnt("nr")>1?"s":"")+"</b>",cnt("disp")&&cnt("disp")+" dispensé"+(cnt("disp")>1?"es":"e"),cnt("miss")&&"<b>"+cnt("miss")+" non évaluée"+(cnt("miss")>1?"s":"")+" alors que d'autres élèves l'ont été</b>",cnt("wait")&&cnt("wait")+" pas encore évaluée"+(cnt("wait")>1?"s":"")+" (pour personne)"].filter(Boolean).join(" · ")||(rowsA.length?"Rien en retard.":"Aucune évaluation au "+esc(sem)+" pour cet élève.")}</div>
    </div>
    <div class="pgbloc"><div class="pgbh">Avancement du ${esc(sem)}</div>
      ${rowsA.map(x=>`<div class="pgrow"><span class="pill pst ${LBL[x.s][0]}">${LBL[x.s][1]}</span>
        <div class="pgc"><div>${esc(x.f.titre||"Sans titre")}</div><div class="hint">${x.f.distribPrev?"distribuée le "+esc(fmtD(x.f.distribPrev)):""}${x.f.renduPrev?" · rendu le "+esc(fmtD(x.f.renduPrev)):""}</div></div>
        <div class="pgev"><span class="hint">${x.r.nr||x.r.disp?"—":x.n+" / "+x.keys.length+" ligne"+(x.keys.length>1?"s":"")}</span><div class="hint">Promo : ${x.st.full}/${x.st.tot} évalués</div></div>
        <div class="pgst"></div></div>`).join("")||`<div class="empty">Aucune évaluation de ${esc(pr.nom)} au ${esc(sem)}.</div>`}
    </div>
    <div class="pgbloc"><div class="pgbh">Acquisition des compétences <span class="hint" style="font-weight:400">— ${nAcq} / ${rowsB.length} acquises (dernier niveau ≥ « ${esc(LV[thr]||"")} »), jusqu'au ${esc(sem)}${MOD.dn&&rowsB.length?" · niveaux DN MADE : "+[1,2,3].map(a=>palCount[a-1]+" "+esc(dnPalier(a))).join(", "):""}</span></div>
      ${blocs.map(b=>`<div class="pgbh" style="font-weight:500;border-top:0;padding-top:8px">${esc(b)} - ${esc(blocNom(b))}</div>
        ${rowsB.filter(r=>String(r.c.bloc)===b).sort((x,y)=>String(x.c.code).localeCompare(String(y.c.code),undefined,{numeric:true})).map(r=>`<div class="pgrow">
          <span class="pill" style="background:${nivColor(r.last.lv,NL)};color:#fff;border-color:transparent;justify-self:start">${esc(LV[r.last.lv]||"")}</span>
          <div class="pgc"><div><b>${esc(r.c.code)}</b> ${esc(r.c.libelle||"")}</div>${posCl(r)}</div>
          <div class="pgev"><div class="trj">${r.L.map((x,j)=>`${j?`<span class="trj-ar">${x.lv>r.L[j-1].lv?"↗":x.lv<r.L[j-1].lv?"↘":"→"}</span>`:""}<span class="trj-s" title="${esc((x.f.titre||"")+" — "+(LV[x.lv]||""))}"><i style="background:${nivColor(x.lv,NL)}"></i>${esc(x.f.semestre||"")} · ${esc(LV[x.lv]||"")}</span>`).join("")}</div>
            <span class="hint">${r.L.length>1?(r.last.lv>r.L[0].lv?"en progrès":r.last.lv<r.L[0].lv?"en recul":"stable")+" sur "+r.L.length+" évaluations":"1 évaluation"}</span></div>
          <div class="pgst">${MOD.dn?`<div class="dntrk">${[1,2,3].map(a=>{const ok=r.L.some(x=>x.a===a&&x.lv>=thr), seen=r.L.some(x=>x.a===a), fut=a>anCur;
              return `<span class="dnst${ok?" ok":seen?" seen":""}${fut?" fut":""}" title="${esc(dnPalier(a))} (année ${a}) : ${ok?"atteint":seen?"évalué, maîtrise pas encore suffisante":fut?"année à venir":"pas encore évalué cette année"}"><i></i>${esc(dnPalier(a))}</span>`}).join("")}</div>`:""}</div></div>`).join("")}`).join("")||`<div class="empty">Pas encore de niveau saisi pour cet élève.</div>`}
    </div>`}
  </div>`;
  host.querySelectorAll("[data-pv]").forEach(b=>b.onclick=()=>{ui.prog.view=b.dataset.pv;paintProg()});
  bindProgFiltres(host);
  {const a=host.querySelector("#pgAll");if(a)a.onclick=()=>{ui.prog.all=!ui.prog.all;paintProg()}}
  host.querySelectorAll("[data-ps]").forEach(b=>b.onclick=()=>{ui.prog.sem=b.dataset.ps;paintProg()});
  const sel=host.querySelector("#pgEl");if(sel)sel.onchange=()=>{ui.prog.el=sel.value;paintProg()};
  const mv=d=>{const j=i0+d;if(els[j]){ui.prog.el=els[j].id;paintProg()}};
  {const p=host.querySelector("#pgElPrev");if(p)p.onclick=()=>mv(-1);const n=host.querySelector("#pgElNext");if(n)n.onclick=()=>mv(1)}
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
/* élèves pas encore entièrement évalués (non rendu et dispensé comptent comme terminés) */
function elevesNonFinis(f){const keys=lignesOf(f).map(ligKey);
  return studentsOf(f).filter(e=>{const r=(f.res||{})[e.id]||{};if(r.nr||r.disp)return false;
    return !(keys.length&&keys.every(k=>(r.n||{})[k]!=null&&(r.n||{})[k]!==""))})}
function askRestitWarn(f,onGo){
  const L=elevesNonFinis(f);if(!L.length)return onGo();
  const prev=document.activeElement, el=document.createElement("div");el.className="modal";
  el.innerHTML=`<div class="card" role="dialog" aria-modal="true" aria-labelledby="rwT" style="max-width:440px">
    <p id="rwT"><b>Évaluation pas terminée</b> — ${L.length} élève${L.length>1?"s ne sont":" n'est"} pas entièrement évalué${L.length>1?"s":""} :
      ${esc(L.slice(0,8).map(e=>e.nom).join(", "))}${L.length>8?"…":""}.</p>
    <p class="hint" style="font-size:12.5px">Les non rendus et les dispensés comptent comme terminés. Les restitutions de ces élèves seront incomplètes.</p>
    <div class="row"><button class="btn ghost" data-no>Annuler</button><button class="btn primary" data-yes>Exporter quand même</button></div></div>`;
  const close=()=>{el.remove();document.removeEventListener("keydown",key);if(prev&&prev.focus)prev.focus()};
  const key=e=>{if(e.key==="Escape")close()};
  el.querySelector("[data-no]").onclick=close;el.onclick=e=>{if(e.target===el)close()};
  el.querySelector("[data-yes]").onclick=()=>{close();onGo()};
  document.addEventListener("keydown",key);document.body.appendChild(el);el.querySelector("[data-yes]").focus();
}
/* exports d'une ligne (fenêtre des actions) : l'évaluation (grille vierge) et, avec le module Élèves, les restitutions par élève */
function exportItems(i){
  const fm=m=>`<div class="xfmt">${[["docx","Word"],["xlsx","Excel"],["odt","OpenDocument texte"],["ods","OpenDocument tableur"]]
    .map(([k,l])=>`<button type="button" data-xk="${k}" data-xmode="${m}" data-xi="${i}"><b>${l}</b><span class="hint">.${k}</span></button>`).join("")}</div>`;
  return MOD.eleves?`<p class="xh">L'évaluation · grille vierge</p>${fm("eval")}<p class="xh">Les restitutions · résultats par élève</p>${fm("rest")}`
    :`<p class="xh">Grille à remplir à la main</p>${fm("eval")}`;
}
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
["t-saved","t-prog","t-ref","t-org","t-set"].forEach(id=>bind(id,"click",()=>{
  ui.tab=id==="t-saved"?(MOD.fiches?"saved":"new"):id.slice(2);paintTabs();
  if(ui.tab==="new"){paintForm();paintPick();paintLignes()}
  if(ui.tab==="saved")paintSaved();if(ui.tab==="prog")paintProg();if(ui.tab==="ref")paintRef();if(ui.tab==="org")paintOrg();
  if(ui.tab==="set"){paintSet();paintVocab()}}));
bind("bDemo","click",loadDemo);
bind("bBack","click",()=>{ui.tab="saved";paintTabs();paintSaved();window.scrollTo({top:0,behavior:"smooth"})});
bind("bNew","click",nouvelleFiche);
if(DEVICE.phone)Object.entries(TAB_SHORT).forEach(([id,t])=>{const b=document.getElementById(id);if(b){b.title=b.textContent;b.textContent=t}});
bind("bModReset","click",()=>{MOD=modDefaults();LS.set("dnmade.modules",MOD);
  paintSet();paintTabs();paintForm();paintPick();paintRef();toast("Modules remis par défaut.")});
[["f-titre","titre"],["f-consignes","consignes"],["f-eleves","eleves"]]
  .forEach(([id,k])=>bind(id,"input",e=>{F[k]=e.target.value;save()}));
bind("f-distrib","input",e=>{F.distribPrev=e.target.value;applySemDate();save();paintForm();paintPick()});
bind("f-rendu","input",e=>{F.renduPrev=e.target.value;save();paintForm()});

bind("f-dip","change",e=>{DATA.activeDiplome=e.target.value;saveData()});
function toggleUe(u){
  if(!Array.isArray(F.ues))F.ues=[];
  const ecs=ecsOfUe(u), on=F.ues.includes(u);
  if(on){F.ues=F.ues.filter(x=>x!==u);F.ecCodes=F.ecCodes.filter(c=>!ecs.includes(c))}
  else{F.ues=[...F.ues,u];
    F.ecCodes=[...new Set([...F.ecCodes,...ecs])].sort((x,y)=>ecNum(x)-ecNum(y))}
  syncItemEcs();save();paintForm();paintPick();
}
function toggleEc(code){
  const on=F.ecCodes.includes(code), e=ecEntry(code,F.semestre);
  F.ecCodes=(on?F.ecCodes.filter(x=>x!==code):[...F.ecCodes,code]).sort((x,y)=>ecNum(x)-ecNum(y));
  if(!Array.isArray(F.ues))F.ues=[];
  if(e){
    if(!on){if(!F.ues.includes(e.ue))F.ues=[...F.ues,e.ue]}
    else if(!F.ecCodes.some(c=>{const x=ecEntry(c,F.semestre);return x&&x.ue===e.ue}))
      F.ues=F.ues.filter(u=>u!==e.ue);
  }
  syncItemEcs();save();paintForm();paintPick();
}
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
bind("bAddLevel","click",()=>{F.niveaux.push("Nouveau degré");F.preset="libre";save();paintForm()});
bind("f-search","input",e=>{ui.q=e.target.value;paintPick()});
bind("bClear","click",()=>{F.items=[];F.ops=[];ui.sel=[];save();paintPick();paintSteps()});
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>goStep(b.dataset.go));
document.querySelectorAll(".steps [data-step]").forEach(b=>b.onclick=()=>goStep(b.dataset.step));
bind("bLink","click",linkSelection);
bind("bLinkNone","click",()=>{ui.sel=[];paintLignes()});
/* Rend null, sans rien enregistrer, si le référentiel de l'évaluation n'est pas validé. */
function saveFiche(){
  if(refBloque(F,"Impossible d'enregistrer cette évaluation"))return null;
  suiviOf(F);
  if(!F.refV){const v=versionPourF();if(v)F.refV=v.id;save()}
  const i=fiches.findIndex(f=>f.id===F.id);
  const copy=structuredClone(F);
  if(i>=0)fiches[i]=copy;else fiches.unshift(copy);
  LS.set("dnmade.fiches",fiches);paintSaved();paintSteps();
  return i>=0;
}
bind("bSave3","click",()=>{
  const maj=saveFiche();if(maj===null)return;
  if(MOD.fiches){ui.tab="saved";paintTabs();window.scrollTo({top:0,behavior:"smooth"});
    toast((maj?"Évaluation mise à jour":"Évaluation enregistrée")+" — le Word et l'Excel se génèrent d'ici, quand tu veux.")}
  else toast(maj?"Évaluation mise à jour.":"Évaluation enregistrée.");
});
["bSave1","bSave2"].forEach(id=>bind(id,"click",()=>{
  const maj=saveFiche();if(maj===null)return;toast(maj?"Évaluation mise à jour.":"Évaluation enregistrée dans « Mes évaluations ».")}));
bind("bSave4","click",()=>{const maj=saveFiche();if(maj===null)return;toast(maj?"Évaluation et résultats mis à jour.":"Évaluation enregistrée.")});
document.querySelectorAll("#eMode [data-emode]").forEach(b=>b.onclick=()=>{ui.emode=b.dataset.emode;paintEleves()});
bind("bExpJson","click",()=>offer("fiches-dnmade.json",JSON.stringify({ref:REF.meta,fiches},null,1),true));
bind("r-search","input",e=>{ui.ref.q=e.target.value;paintRef()});
bind("r-group","change",e=>{ui.ref.group=e.target.value;paintRef()});
bind("r-annee","change",e=>{ui.ref.annee=e.target.value;paintRef()});
bind("rClear","click",()=>{Object.assign(ui.ref,{q:"",group:"bloc",annee:"*",sems:[]});paintRef()});

paintTabs();paintForm();paintPick();paintSaved();paintRef();paintSet();

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

/* Pont vers l'application : les données de l'établissement (diplômes, dictionnaire, référentiels) ne sont
   enregistrées qu'à leur première modification. L'échange entre enseignants les lit dans le stockage :
   on les y inscrit dès le chargement, pour qu'une installation neuve connaisse aussi son diplôme par défaut. */
persistData();
