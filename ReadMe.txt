primerweaver-project/
│
├── index.html            (The main website shell: Home, Docs, FAQs, About)
├── contents/
│   ├── style.css         (The main website styles)
│   ├── script.js         (The main website script for routing and pages)
│   ├── documents/        (Docs rendered in the Home/Docs pages)
│   └── logo/             (Shared images)
│       ├── logo.png
│       └── welcome-image.png
│
├── app/                  
│   ├── app-index.html        (The "shell" for the app, which loads modules)
│   ├── app-style.css     (The styles just for the app)
│   ├── app-main.js       (The script for switching app tabs/modules)
│   │
│   └── modules/          
│       ├── contents/             (Demo assets for modules)
│       │   ├── demo/             (demo sequences)
│       │   └── pictures/
│       ├── scripts/              (Module JS, all suffixed v1.0.1)
│       │   ├── core_v1.0.1.js             (Shared core utilities, thermodynamics)
│       │   ├── bio_visuals_v1.0.1.js      (SVG/canvas visuals for maps/figures)
│       │   ├── codon_v1.0.1.js            (Codon tables and helper utilities)
│       │   ├── common_features_v1.0.1.js   (Plasmid feature annotations)
│       │   ├── golden_gate_v1.0.1.js      (Golden Gate module logic)
│       │   ├── gibson_v1.0.1.js           (Gibson Assembly logic)
│       │   ├── oe_pcr_v1.0.1.js           (Overlap/SOE PCR logic)
│       │   ├── multiplex_pcr_v1.0.1.js    (Multiplex PCR logic)
│       │   ├── mutagenesis_v1.0.1.js      (Site-directed mutagenesis logic)
│       │   ├── qc_v1.0.1.js               (Primer QC logic)
│       │   ├── re_cloning_v1.0.1.js       (Restriction cloning logic)
│       │   └── user_cloning_v1.0.1.js     (USER cloning logic)
│       ├── QC_V1.0.1.html                 (Primer QC UI)
│       ├── RE_cloning_v1.0.1.html         (Restriction cloning UI)
│       ├── Golden_Gate_v1.0.1.html        (Golden Gate UI)
│       ├── Gibson_V1.0.1.html             (Gibson UI)
│       ├── oe_pcr_v1.0.1.html             (Overlap PCR UI)
│       ├── multiplex_pcr_v1.0.1.html      (Multiplex PCR UI)
│       ├── mutagenesis_v1.0.1.html        (Mutagenesis UI)
│       └── USER_V1.0.1.html               (USER cloning UI)
│
└── archive/              (Old versions and deprecated files)


Notes:

