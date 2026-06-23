const pptxgen = require('pptxgenjs');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const sharp = require('sharp');
const FA = require('react-icons/fa');

// ---- palette (cloud / sécurité) ----
const NAVY = '0E1B2E', BLUE = '12355B', TEAL = '0FA3A3', MINT = '2EC4B6';
const ICE = 'D9E4EC', CORAL = 'FF6B5C', WHITE = 'FFFFFF', INK = '14202E';
const MUTE = '5B6B7B', TINT = 'F2F6F9', TINTB = 'EAF3F3';
const W = 13.333, H = 7.5, M = 0.7;

async function icon(C, color = WHITE, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(C, { color, size: String(size) }));
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return 'image/png;base64,' + png.toString('base64');
}
const shadow = () => ({ type: 'outer', color: '0B1622', blur: 9, offset: 3, angle: 90, opacity: 0.16 });

(async () => {
  const I = {
    cloud: await icon(FA.FaCloud), shield: await icon(FA.FaShieldAlt), server: await icon(FA.FaServer),
    lock: await icon(FA.FaLock), db: await icon(FA.FaDatabase), sync: await icon(FA.FaSyncAlt),
    users: await icon(FA.FaUsers), save: await icon(FA.FaSave), bolt: await icon(FA.FaBolt),
    net: await icon(FA.FaNetworkWired), rocket: await icon(FA.FaRocket), chart: await icon(FA.FaChartLine),
    play: await icon(FA.FaPlay), sitemap: await icon(FA.FaSitemap), layers: await icon(FA.FaLayerGroup),
    ushield: await icon(FA.FaUserShield), power: await icon(FA.FaPowerOff), clock: await icon(FA.FaRegClock),
    list: await icon(FA.FaThList), key: await icon(FA.FaKey), check: await icon(FA.FaCheck),
    map: await icon(FA.FaMapSigns), gauge: await icon(FA.FaTachometerAlt),
    windows: await icon(FA.FaWindows), linux: await icon(FA.FaLinux), user: await icon(FA.FaUser),
    userBlue: await icon(FA.FaUser, '#12355B'), ushieldTeal: await icon(FA.FaUserShield, '#0FA3A3'),
    shieldCoral: await icon(FA.FaShieldAlt, '#FF6B5C'),
  };

  const p = new pptxgen();
  p.layout = 'LAYOUT_WIDE';
  p.author = 'GIT VM Portal';
  p.title = 'GIT VM Portal — Présentation';

  // ---------- helpers ----------
  function header(s, ic, kicker, title, accent = TEAL, titleColor = INK) {
    s.addShape(p.shapes.OVAL, { x: M, y: 0.55, w: 0.62, h: 0.62, fill: { color: accent }, shadow: shadow() });
    s.addImage({ data: ic, x: M + 0.16, y: 0.71, w: 0.3, h: 0.3 });
    s.addText(kicker.toUpperCase(), { x: M + 0.85, y: 0.5, w: 11, h: 0.3, fontFace: 'Calibri', fontSize: 11, color: accent, bold: true, charSpacing: 3, margin: 0 });
    s.addText(title, { x: M + 0.85, y: 0.76, w: 11.5, h: 0.62, fontFace: 'Calibri', fontSize: 27, color: titleColor, bold: true, margin: 0 });
  }
  function card(s, x, y, w, h, fill = WHITE) {
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, rectRadius: 0.09, shadow: shadow() });
  }
  function circ(s, x, y, d, color, ic, ipad) { s.addShape(p.shapes.OVAL, { x, y, w: d, h: d, fill: { color } }); const ip = ipad || d * 0.26; s.addImage({ data: ic, x: x + ip, y: y + ip, w: d - 2 * ip, h: d - 2 * ip }); }
  function foot(s, n) {
    s.addText('GIT VM Portal', { x: M, y: H - 0.5, w: 4, h: 0.3, fontFace: 'Calibri', fontSize: 10, color: MUTE });
    s.addText(String(n).padStart(2, '0'), { x: W - 1.1, y: H - 0.5, w: 0.6, h: 0.3, align: 'right', fontFace: 'Calibri', fontSize: 10, color: MUTE });
  }
  let N = 0;
  const light = () => { const s = p.addSlide(); s.background = { color: WHITE }; N++; foot(s, N); return s; };
  const dark = () => { const s = p.addSlide(); s.background = { color: NAVY }; N++; return s; };

  // ====== 1. TITLE ======
  {
    const s = dark();
    s.addShape(p.shapes.OVAL, { x: 9.4, y: -2.2, w: 6.5, h: 6.5, fill: { color: BLUE, transparency: 35 } });
    s.addShape(p.shapes.OVAL, { x: 11.2, y: 3.7, w: 4.6, h: 4.6, fill: { color: TEAL, transparency: 60 } });
    circ(s, M, 1.7, 1.0, TEAL, I.cloud);
    s.addText('PLATEFORME SELF-SERVICE DE VM · CLOUDFLARE × AWS', { x: M, y: 3.0, w: 11, h: 0.35, fontFace: 'Calibri', fontSize: 13, color: TEAL, bold: true, charSpacing: 3 });
    s.addText('GIT VM Portal', { x: M - 0.03, y: 3.35, w: 11.5, h: 1.2, fontFace: 'Calibri', fontSize: 60, color: WHITE, bold: true });
    s.addText('De la demande en libre-service à la VM AWS sécurisée : SSO, validation, provisioning automatique, snapshots, durcissement réseau et cycle de vie autonome.',
      { x: M, y: 4.6, w: 10.6, h: 1.0, fontFace: 'Calibri', fontSize: 16, color: ICE, lineSpacingMultiple: 1.1 });
    s.addText([{ text: 'Prod  ', options: { color: TEAL, bold: true } }, { text: 'git-vm-portal.thomas-prudhomme.workers.dev', options: { color: ICE } }],
      { x: M, y: 6.5, w: 11, h: 0.4, fontFace: 'Calibri', fontSize: 13 });
    s.addNotes('Ouverture. Pitch : une plateforme self-service qui transforme une demande en VM AWS prête, sécurisée et gérée de bout en bout, le tout sur Cloudflare Workers.');
  }

  // ====== 2. SOMMAIRE — index typographique en 2 colonnes ======
  {
    const s = light();
    header(s, I.list, 'Sommaire', 'Le fil de la présentation');
    const items = [
      ['01', 'Le besoin & le parcours', 'Pourquoi, et comment ça marche'],
      ['02', 'Architecture & stack', 'Worker, D1, AWS, réconciliateur'],
      ['03', 'Catalogue & rôles', 'OS, multi-VM, membre / formateur / admin'],
      ['04', 'Snapshots', 'Sauvegarde & restauration EBS'],
      ['05', 'Sécurité', 'Accès chiffrés & durcissement réseau'],
      ['06', 'Cycle de vie auto', 'Inactivité · planification · échéance'],
      ['07', 'Admin & déploiement', 'Console unifiée, CI/CD Cloudflare'],
      ['08', 'Démo live', 'Parcours sur la plateforme'],
    ];
    const colX = [M + 0.1, 7.1];
    items.forEach((it, i) => {
      const x = colX[Math.floor(i / 4)], y = 1.95 + (i % 4) * 1.18;
      s.addText(it[0], { x, y: y - 0.05, w: 1.0, h: 0.8, fontFace: 'Calibri', fontSize: 34, bold: true, color: i % 2 ? TEAL : BLUE, margin: 0 });
      s.addText(it[1], { x: x + 1.1, y, w: 4.6, h: 0.45, fontFace: 'Calibri', fontSize: 17, bold: true, color: INK, margin: 0 });
      s.addText(it[2], { x: x + 1.1, y: y + 0.45, w: 4.7, h: 0.4, fontFace: 'Calibri', fontSize: 12, color: MUTE, margin: 0 });
      if (i % 4 !== 3) s.addShape(p.shapes.LINE, { x: x + 1.1, y: y + 0.95, w: 4.5, h: 0, line: { color: 'E4EBF0', width: 1 } });
    });
    s.addNotes('Annoncer le plan : du besoin à la démo, en passant par l’architecture, le catalogue, la sécurité et le cycle de vie.');
  }

  // ====== 3. LE BESOIN — avant / après ======
  {
    const s = light();
    header(s, I.map, 'Contexte', 'Le besoin : des VM à la demande, sans friction');
    card(s, M, 1.75, 5.85, 4.7, TINT);
    s.addText('AVANT', { x: M + 0.35, y: 2.0, w: 5, h: 0.35, fontFace: 'Calibri', fontSize: 13, bold: true, color: CORAL, charSpacing: 2 });
    s.addText([
      { text: 'Demandes par e-mail / tickets', options: { bullet: true, breakLine: true } },
      { text: 'Création manuelle, lente, faillible', options: { bullet: true, breakLine: true } },
      { text: 'Aucun suivi des coûts ni des échéances', options: { bullet: true, breakLine: true } },
      { text: 'VM oubliées qui tournent (et coûtent)', options: { bullet: true, breakLine: true } },
      { text: 'Sécurité réseau au cas par cas', options: { bullet: true } },
    ], { x: M + 0.35, y: 2.45, w: 5.2, h: 3.7, fontFace: 'Calibri', fontSize: 14.5, color: INK, paraSpaceAfter: 9 });
    card(s, 6.95, 1.75, 5.68, 4.7, TINTB);
    s.addText('AVEC GIT VM PORTAL', { x: 7.3, y: 2.0, w: 5, h: 0.35, fontFace: 'Calibri', fontSize: 13, bold: true, color: TEAL, charSpacing: 2 });
    s.addText([
      { text: 'Libre-service : je demande, je nomme, je choisis', options: { bullet: true, breakLine: true } },
      { text: 'Provisioning AWS automatique après validation', options: { bullet: true, breakLine: true } },
      { text: 'Dates obligatoires + suppression à l’échéance', options: { bullet: true, breakLine: true } },
      { text: 'Arrêt auto si inactive, garde-fous de coût', options: { bullet: true, breakLine: true } },
      { text: 'Durcissement réseau systématique', options: { bullet: true } },
    ], { x: 7.3, y: 2.45, w: 5.0, h: 3.7, fontFace: 'Calibri', fontSize: 14.5, color: INK, paraSpaceAfter: 9 });
    s.addNotes('Poser le problème (gestion manuelle, coûts, sécurité) puis la promesse : self-service + automatisation + sécurité par défaut.');
  }

  // ====== 4. PARCOURS — 6 étapes ======
  {
    const s = light();
    header(s, I.sync, 'Vue d’ensemble', 'Le parcours, de la connexion à la VM');
    const steps = [
      ['1', 'Connexion', 'SSO Microsoft Entra ID (OIDC)', BLUE],
      ['2', 'Demande', '1–4 VM nommées, catalogue + dates', TEAL],
      ['3', 'Validation', 'Un admin approuve (VM ou groupe)', MINT],
      ['4', 'Provisioning', 'EC2 + clé chiffrée + durcissement', BLUE],
      ['5', 'Exploitation', 'Accès, snapshots, planification', TEAL],
      ['6', 'Fin de vie', 'Arrêt inactivité · suppression échéance', CORAL],
    ];
    let x = M, y = 2.0;
    steps.forEach((st, i) => {
      card(s, x, y, 3.7, 2.0);
      s.addShape(p.shapes.OVAL, { x: x + 0.28, y: y + 0.3, w: 0.7, h: 0.7, fill: { color: st[3] } });
      s.addText(st[0], { x: x + 0.28, y: y + 0.3, w: 0.7, h: 0.7, align: 'center', valign: 'middle', fontFace: 'Calibri', fontSize: 24, bold: true, color: WHITE, margin: 0 });
      s.addText(st[1], { x: x + 1.1, y: y + 0.34, w: 2.4, h: 0.4, fontFace: 'Calibri', fontSize: 16, bold: true, color: INK, margin: 0 });
      s.addText(st[2], { x: x + 0.3, y: y + 1.15, w: 3.15, h: 0.7, fontFace: 'Calibri', fontSize: 12, color: MUTE, margin: 0 });
      x += 3.95;
      if ((i + 1) % 3 === 0) { x = M; y += 2.25; }
    });
    s.addNotes('Le fil rouge en 6 étapes. Chacune sera détaillée ensuite.');
  }

  // ====== 5. ARCHITECTURE — diagramme ======
  {
    const s = light();
    header(s, I.sitemap, 'Architecture', 'Un Worker au centre, la DB comme état désiré');
    const box = (x, y, w, h, fill, tcol, title, sub, ic) => {
      card(s, x, y, w, h, fill);
      circ(s, x + 0.22, y + h / 2 - 0.31, 0.62, tcol === WHITE ? BLUE : tcol, ic);
      const tx = x + 1.0;
      s.addText(title, { x: tx, y: y + 0.22, w: w - 1.2, h: 0.4, fontFace: 'Calibri', fontSize: 15, bold: true, color: tcol === WHITE ? INK : tcol, margin: 0 });
      s.addText(sub, { x: tx, y: y + 0.62, w: w - 1.2, h: h - 0.7, fontFace: 'Calibri', fontSize: 11, color: MUTE, margin: 0 });
    };
    const arrow = (x1, y1, x2, y2) => s.addShape(p.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipV: y2 < y1, line: { color: TEAL, width: 2, endArrowType: 'triangle' } });
    box(M, 2.7, 3.0, 1.5, BLUE, WHITE, 'Navigateur', 'SPA React 19 · assets statiques', I.cloud);
    box(4.6, 2.7, 3.7, 1.5, TINTB, TEAL, 'Cloudflare Worker', 'Hono · OIDC · API · cron', I.server);
    box(9.0, 0.95, 3.6, 1.05, TINT, BLUE, 'D1 (SQLite)', 'État désiré : demandes, VM, audit', I.db);
    box(9.0, 2.25, 3.6, 1.05, TINT, BLUE, 'AWS EC2 / EBS', 'Provisioning réel (aws4fetch)', I.server);
    box(9.0, 3.55, 3.6, 1.05, TINT, BLUE, 'CloudWatch', 'CPU → arrêt sur inactivité', I.gauge);
    box(9.0, 4.85, 3.6, 1.05, TINT, BLUE, 'EmailJS / Grafana', 'Notifications · monitoring', I.chart);
    arrow(3.0, 3.45, 4.6, 3.45);
    arrow(8.3, 3.25, 9.0, 1.5); arrow(8.3, 3.4, 9.0, 2.78); arrow(8.3, 3.55, 9.0, 4.08); arrow(8.3, 3.7, 9.0, 5.38);
    card(s, M, 4.55, 7.3, 1.9, TINT);
    circ(s, M + 0.28, 4.85, 0.7, CORAL, I.sync);
    s.addText('Le réconciliateur (cron */2 min)', { x: M + 1.15, y: 4.8, w: 6, h: 0.4, fontFace: 'Calibri', fontSize: 15, bold: true, color: INK, margin: 0 });
    s.addText('Aligne en continu le réel AWS sur la DB : provisioning→active, drift, retry, échéance, inactivité, snapshots.',
      { x: M + 1.15, y: 5.2, w: 6.0, h: 1.1, fontFace: 'Calibri', fontSize: 12, color: MUTE, margin: 0, lineSpacingMultiple: 1.05 });
    s.addNotes('Topologie : la SPA parle au Worker ; le Worker porte auth + API + cron, pilote AWS et lit/écrit D1. D1 = état désiré, AWS = état réel, le cron réconcilie.');
  }

  // ====== 6. STACK — tableau ======
  {
    const s = light();
    header(s, I.layers, 'Stack', 'Des briques modernes, sans serveur à gérer');
    const head = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: BLUE }, fontSize: 14, valign: 'middle' } });
    const rows = [
      [head('Couche'), head('Technologies')],
      ['Frontend', 'React 19 · Vite · TypeScript · Tailwind v4 · TanStack Query · i18n FR/EN'],
      ['Backend', 'Cloudflare Worker (Hono) — API JSON + cron scheduled()'],
      ['Données', 'Cloudflare D1 (SQLite) · migrations additives'],
      ['Auth', 'Microsoft Entra ID (OIDC), in-Worker, sans librairie'],
      ['Compute', 'AWS EC2 + EBS + CloudWatch via aws4fetch (eu-central-2)'],
      ['CI / CD', 'Cloudflare Workers Builds : build + migrate + deploy sur main'],
    ];
    const data = rows.map((r, i) => r.map((c, j) => typeof c === 'string'
      ? { text: c, options: { color: j === 0 ? BLUE : INK, bold: j === 0, fontSize: 13.5, fill: { color: i % 2 ? TINT : WHITE }, valign: 'middle' } }
      : c));
    s.addTable(data, { x: M, y: 1.95, w: 11.93, colW: [2.6, 9.33], rowH: [0.5, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62], border: { type: 'solid', pt: 1, color: 'E4EBF0' }, align: 'left', margin: [4, 8, 4, 8], fontFace: 'Calibri' });
    s.addText('Zéro serveur à administrer · scaling automatique · déploiement par simple merge', { x: M, y: 6.55, w: 12, h: 0.4, align: 'center', italic: true, fontFace: 'Calibri', fontSize: 13, color: TEAL });
    s.addNotes('Mettre en avant le serverless : pas d’infra à patcher, scaling automatique, pipeline de déploiement trivial.');
  }

  // ====== 7. RÉCONCILIATEUR — dark, 6 cartes ======
  {
    const s = dark();
    circ(s, M, 0.55, 0.62, CORAL, I.sync);
    s.addText('LE PATTERN CENTRAL', { x: M + 0.85, y: 0.5, w: 9, h: 0.3, fontFace: 'Calibri', fontSize: 11, color: CORAL, bold: true, charSpacing: 3, margin: 0 });
    s.addText('Le réconciliateur : une boucle, toute la logique', { x: M + 0.85, y: 0.76, w: 11.4, h: 0.6, fontFace: 'Calibri', fontSize: 27, color: WHITE, bold: true, margin: 0 });
    s.addText('« La DB décrit l’état souhaité. Une cron */2 min rapproche le réel AWS de cet état — idempotent, sans mécanisme parallèle. »',
      { x: M, y: 1.65, w: 12, h: 0.6, fontFace: 'Calibri', fontSize: 14.5, italic: true, color: ICE });
    const steps = [
      [I.sync, 'reconcile', 'provisioning→active, détection de drift'],
      [I.clock, 'applySchedules', 'démarrage/arrêt planifiés par VM'],
      [I.sync, 'retryFailed', 're-tente les provisioning échoués (max 3)'],
      [I.shield, 'enforceExpiry', 'snapshot auto puis suppression à l’échéance'],
      [I.power, 'enforceIdleStop', 'arrêt si CPU < 10 % sur 3 h (CloudWatch)'],
      [I.save, 'syncSnapshots', 'suit les snapshots EBS en cours'],
    ];
    let x = M, y = 2.5;
    steps.forEach((st, i) => {
      s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.85, h: 1.75, fill: { color: BLUE }, rectRadius: 0.09, shadow: shadow() });
      circ(s, x + 0.25, y + 0.27, 0.6, TEAL, st[0]);
      s.addText(st[1], { x: x + 1.0, y: y + 0.3, w: 2.7, h: 0.45, fontFace: 'Calibri', fontSize: 15, bold: true, color: WHITE, margin: 0 });
      s.addText(st[2], { x: x + 0.3, y: y + 1.0, w: 3.3, h: 0.65, fontFace: 'Calibri', fontSize: 11.5, color: ICE, margin: 0 });
      x += 4.05;
      if ((i + 1) % 3 === 0) { x = M; y += 1.95; }
    });
    s.addNotes('Le concept d’architecture (ADR 0004). Tout le cycle de vie passe par cette boucle idempotente. Lister les 6 étapes.');
  }

  // ====== 8. CYCLE DE VIE — frise ======
  {
    const s = light();
    header(s, I.clock, 'Cycle de vie', 'Une VM, de sa naissance à sa suppression');
    const tl = [['Demandée', 'pending', BLUE], ['Validée', 'approved', MINT], ['Provisioning', 'EC2 + clé', TEAL], ['Active', 'connectable', MINT], ['Snapshot', 'sauvegarde', BLUE], ['Expirée', 'supprimée', CORAL]];
    const y = 3.1, x0 = M + 0.3, gap = (W - 2 * M - 0.6) / (tl.length - 1);
    s.addShape(p.shapes.LINE, { x: x0, y: y + 0.35, w: gap * (tl.length - 1), h: 0, line: { color: 'C9D6DF', width: 2 } });
    tl.forEach((t, i) => {
      const cx = x0 + i * gap;
      s.addShape(p.shapes.OVAL, { x: cx - 0.35, y, w: 0.7, h: 0.7, fill: { color: t[2] }, shadow: shadow() });
      s.addText(String(i + 1), { x: cx - 0.35, y, w: 0.7, h: 0.7, align: 'center', valign: 'middle', fontFace: 'Calibri', fontSize: 20, bold: true, color: WHITE, margin: 0 });
      s.addText(t[0], { x: cx - 1.0, y: y - 0.7, w: 2.0, h: 0.4, align: 'center', fontFace: 'Calibri', fontSize: 14, bold: true, color: INK, margin: 0 });
      s.addText(t[1], { x: cx - 1.0, y: y + 0.78, w: 2.0, h: 0.4, align: 'center', fontFace: 'Calibri', fontSize: 11.5, color: MUTE, margin: 0 });
    });
    card(s, M, 5.0, 12.0, 1.5, TINT);
    s.addText([{ text: 'Garde-fous : ', options: { bold: true, color: INK } }, { text: 'dates de fin obligatoires · extinction nocturne · arrêt sur inactivité · suppression automatique à l’échéance (snapshot auto possible avant) · budget AWS plafonné à 50 $ avec alertes e-mail.', options: { color: MUTE } }],
      { x: M + 0.35, y: 5.25, w: 11.3, h: 1.0, fontFace: 'Calibri', fontSize: 13.5, valign: 'middle', lineSpacingMultiple: 1.1 });
    s.addNotes('Chaque VM suit ce cycle. Statuts réels ; « expirée » dérivé. Souligner les garde-fous de coût.');
  }

  // ====== 9. CATALOGUE — OS + axes ======
  {
    const s = light();
    header(s, I.layers, 'Catalogue', 'Performance × Stockage × OS, en quelques clics');
    card(s, M, 1.8, 6.0, 4.65, TINT);
    s.addText('7 systèmes au catalogue', { x: M + 0.35, y: 2.05, w: 5.4, h: 0.4, fontFace: 'Calibri', fontSize: 16, bold: true, color: INK });
    s.addImage({ data: I.linux, x: M + 0.4, y: 2.7, w: 0.42, h: 0.42 });
    s.addText('Ubuntu 24.04 · Debian 12 · Amazon Linux 2023', { x: M + 1.0, y: 2.62, w: 4.85, h: 0.6, fontFace: 'Calibri', fontSize: 13, color: INK, valign: 'middle', margin: 0 });
    s.addText('Rocky 9 · AlmaLinux 9 — accès SSH (clé ed25519)', { x: M + 1.0, y: 3.18, w: 4.85, h: 0.4, fontFace: 'Calibri', fontSize: 11.5, color: MUTE, margin: 0 });
    s.addImage({ data: I.windows, x: M + 0.4, y: 3.95, w: 0.42, h: 0.42 });
    s.addText('Windows Server 2022 · poste de travail', { x: M + 1.0, y: 3.87, w: 4.85, h: 0.6, fontFace: 'Calibri', fontSize: 13, color: INK, valign: 'middle', margin: 0 });
    s.addText('Accès RDP (mot de passe admin chiffré)', { x: M + 1.0, y: 4.43, w: 4.85, h: 0.4, fontFace: 'Calibri', fontSize: 11.5, color: MUTE, margin: 0 });
    s.addText('+ outils de cours préinstallés (cloud-init / EC2Launch), au choix.', { x: M + 0.35, y: 5.5, w: 5.5, h: 0.8, fontFace: 'Calibri', fontSize: 12.5, italic: true, color: TEAL, lineSpacingMultiple: 1.05 });
    const rows = [[I.gauge, 'Performance × Stockage', 'Type d’instance et taille de disque combinables.'], [I.layers, 'Multi-VM & groupes', '1 à 4 VM d’un coup ; >1 ⇒ groupe piloté ensemble.'], [I.list, 'Nom obligatoire', 'Tag AWS « nom.préfixe-email » (ex. python.thomas.prudhomme).']];
    let y = 1.85;
    rows.forEach((r) => {
      card(s, 7.1, y, 5.55, 1.43);
      circ(s, 7.35, y + 0.4, 0.62, TEAL, r[0]);
      s.addText(r[1], { x: 8.15, y: y + 0.24, w: 4.3, h: 0.4, fontFace: 'Calibri', fontSize: 14.5, bold: true, color: INK, margin: 0 });
      s.addText(r[2], { x: 8.15, y: y + 0.66, w: 4.35, h: 0.6, fontFace: 'Calibri', fontSize: 11.5, color: MUTE, margin: 0 });
      y += 1.61;
    });
    s.addNotes('Le catalogue (presets.ts) est la source de vérité : combinatoire perf×stockage×OS, multi-VM avec groupes, nommage, et bundles d’outils par cours.');
  }

  // ====== 10. RÔLES — 3 colonnes comparatives ======
  {
    const s = light();
    header(s, I.ushield, 'Rôles', 'Trois niveaux, dont un rôle formateur', MINT);
    const cols = [
      [I.userBlue, BLUE, 'Membre', ['Demande et gère ses VM', 'Accès, snapshots', 'Planification par VM']],
      [I.ushieldTeal, TEAL, 'Formateur', ['Tout membre, plus :', 'Page « Demande groupée »', 'Lot 1–30 VM attribuées']],
      [I.shieldCoral, CORAL, 'Admin', ['Valide tout (VM / groupe)', 'Console VM unifiée', 'Gère les rôles · accès formateur']],
    ];
    let x = M;
    cols.forEach((c) => {
      card(s, x, 1.85, 3.85, 3.6);
      s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 1.85, w: 3.85, h: 1.05, fill: { color: c[1] }, rectRadius: 0.09 });
      s.addShape(p.shapes.RECTANGLE, { x, y: 2.5, w: 3.85, h: 0.4, fill: { color: c[1] } });
      circ(s, x + 0.4, 2.08, 0.6, WHITE, c[0], 0.16);
      s.addText(c[2], { x: x + 1.15, y: 1.95, w: 2.6, h: 0.85, fontFace: 'Calibri', fontSize: 21, bold: true, color: WHITE, valign: 'middle', margin: 0 });
      s.addText(c[3].map((t, i) => ({ text: t, options: { bullet: { code: '2022' }, color: i === 0 && c[2] === 'Formateur' ? c[1] : INK, bold: i === 0 && c[2] === 'Formateur', breakLine: true } })),
        { x: x + 0.4, y: 3.2, w: 3.15, h: 2.1, fontFace: 'Calibri', fontSize: 13.5, paraSpaceAfter: 10, margin: 0 });
      x += 4.07;
    });
    card(s, M, 5.65, 12.0, 0.95, TINTB);
    s.addText([{ text: 'Demande groupée : ', options: { bold: true, color: TEAL } }, { text: 'répartition round-robin (10 VM / 5 utilisateurs = 2 chacun), chaque VM au nom de l’utilisateur, validation admin obligatoire.', options: { color: INK } }],
      { x: M + 0.35, y: 5.82, w: 11.3, h: 0.6, fontFace: 'Calibri', fontSize: 13, valign: 'middle' });
    s.addNotes('Le rôle formateur est la nouveauté : provisionner des TP entiers. Round-robin + validation admin.');
  }

  // ====== 11. SNAPSHOTS — flux horizontal ======
  {
    const s = light();
    header(s, I.save, 'Snapshots EBS', 'Sauvegarder, restaurer, nettoyer');
    const flow = [[I.save, BLUE, 'Créer', 'Snapshot EBS du disque racine'], [I.shield, TEAL, 'Auto', 'Snapshot avant suppression / expiration'], [I.sync, MINT, 'Restaurer', 'Relancer une VM depuis un snapshot'], [I.power, CORAL, 'Supprimer', 'À la demande ou en cascade']];
    const y = 2.4, bw = 2.7, gap = 0.45, x0 = M + 0.15;
    flow.forEach((f, i) => {
      const x = x0 + i * (bw + gap);
      card(s, x, y, bw, 2.3);
      circ(s, x + bw / 2 - 0.45, y + 0.35, 0.9, f[1], f[0]);
      s.addText(f[2], { x, y: y + 1.35, w: bw, h: 0.4, align: 'center', fontFace: 'Calibri', fontSize: 17, bold: true, color: INK, margin: 0 });
      s.addText(f[3], { x: x + 0.2, y: y + 1.75, w: bw - 0.4, h: 0.5, align: 'center', fontFace: 'Calibri', fontSize: 11.5, color: MUTE, margin: 0 });
      if (i < flow.length - 1) s.addShape(p.shapes.LINE, { x: x + bw + 0.05, y: y + 1.15, w: gap - 0.1, h: 0, line: { color: 'C9D6DF', width: 2, endArrowType: 'triangle' } });
    });
    card(s, M, 5.3, 12.0, 1.15, TINT);
    s.addText([{ text: 'Choix : ', options: { bold: true, color: INK } }, { text: 'snapshot EBS natif (fiable, rapide). L’export local VMware/VirtualBox a été retiré — non fiable hors AWS (ADR 0009).', options: { color: MUTE } }],
      { x: M + 0.35, y: 5.5, w: 11.3, h: 0.7, fontFace: 'Calibri', fontSize: 13, valign: 'middle' });
    s.addNotes('Sauvegarde + restauration via snapshots EBS. Snapshot-avant-suppression et cascade de nettoyage. Choix EBS-only (ADR 0009).');
  }

  // ====== 12. SÉCURITÉ ACCÈS — deux panneaux + bandeau ======
  {
    const s = light();
    header(s, I.key, 'Sécurité · Accès', 'Des accès chiffrés, propres à chaque VM', BLUE);
    const panel = (x, ic, col, title, lines) => {
      card(s, x, 1.85, 5.85, 2.55);
      circ(s, x + 0.35, 2.15, 0.7, col, ic);
      s.addText(title, { x: x + 1.25, y: 2.2, w: 4.4, h: 0.6, fontFace: 'Calibri', fontSize: 17, bold: true, color: INK, valign: 'middle', margin: 0 });
      s.addText(lines.map((t) => ({ text: t, options: { bullet: true, breakLine: true } })), { x: x + 0.45, y: 3.0, w: 5.1, h: 1.3, fontFace: 'Calibri', fontSize: 13, color: INK, paraSpaceAfter: 7, margin: 0 });
    };
    panel(M, I.linux, BLUE, 'Linux — SSH', ['Paire ed25519 générée par VM', 'Clé privée chiffrée AES-GCM', 'Remise au seul propriétaire']);
    panel(6.95, I.windows, TEAL, 'Windows — RDP', ['Mot de passe admin via UserData', 'Chiffré au repos, port 3389', 'Guides de connexion intégrés']);
    card(s, M, 4.65, 12.0, 1.8, TINTB);
    s.addText('Et aussi', { x: M + 0.35, y: 4.85, w: 4, h: 0.35, fontFace: 'Calibri', fontSize: 13, bold: true, color: TEAL, charSpacing: 2 });
    const badges = [[I.lock, 'Secrets côté Cloudflare (Wrangler)'], [I.shield, 'Chiffrement AES-GCM au repos'], [I.user, 'SSO, aucun mot de passe stocké'], [I.list, 'Journal d’audit']];
    let bx = M + 0.35;
    badges.forEach((b) => {
      circ(s, bx, 5.45, 0.5, BLUE, b[0]);
      s.addText(b[1], { x: bx + 0.6, y: 5.45, w: 2.55, h: 0.5, fontFace: 'Calibri', fontSize: 11.5, color: INK, valign: 'middle', margin: 0 });
      bx += 3.0;
    });
    s.addNotes('Sécurité “accès” : chaque VM a sa clé/mot de passe, chiffré au repos. Secrets dans Cloudflare. SSO + audit.');
  }

  // ====== 13. SÉCURITÉ RÉSEAU — deux couches (dark) ======
  {
    const s = dark();
    circ(s, M, 0.55, 0.62, CORAL, I.shield);
    s.addText('SÉCURITÉ · RÉSEAU', { x: M + 0.85, y: 0.5, w: 9, h: 0.3, fontFace: 'Calibri', fontSize: 11, color: CORAL, bold: true, charSpacing: 3, margin: 0 });
    s.addText('Durcissement réseau, en deux couches', { x: M + 0.85, y: 0.76, w: 11.4, h: 0.6, fontFace: 'Calibri', fontSize: 27, color: WHITE, bold: true, margin: 0 });
    s.addText('Un utilisateur root peut défaire ce qui est dans la VM → la vraie barrière est au réseau.', { x: M, y: 1.65, w: 12, h: 0.5, fontFace: 'Calibri', fontSize: 14.5, italic: true, color: ICE });
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: 2.35, w: 5.95, h: 4.1, fill: { color: BLUE }, rectRadius: 0.09, shadow: shadow() });
    circ(s, M + 0.3, 2.65, 0.62, TEAL, I.server);
    s.addText('Dans la VM — défense en profondeur', { x: M + 1.05, y: 2.66, w: 4.7, h: 0.5, fontFace: 'Calibri', fontSize: 14.5, bold: true, color: WHITE, valign: 'middle', margin: 0 });
    s.addText([{ text: 'DNS forcé → Cloudflare for Families (adulte + malware)', options: { bullet: true, breakLine: true } }, { text: 'Blocage des ports torrent / P2P', options: { bullet: true, breakLine: true } }, { text: 'Hostname verrouillé (anti-renommage)', options: { bullet: true } }],
      { x: M + 0.35, y: 3.5, w: 5.3, h: 2.7, fontFace: 'Calibri', fontSize: 14, color: ICE, paraSpaceAfter: 14 });
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 6.7, y: 2.35, w: 5.95, h: 4.1, fill: { color: CORAL }, rectRadius: 0.09, shadow: shadow() });
    circ(s, 7.0, 2.65, 0.62, WHITE, I.net);
    s.addText('Au réseau — non contournable', { x: 7.75, y: 2.66, w: 4.7, h: 0.5, fontFace: 'Calibri', fontSize: 14.5, bold: true, color: WHITE, valign: 'middle', margin: 0 });
    s.addText([{ text: 'Egress du Security Group en liste blanche (default-deny)', options: { bullet: true, breakLine: true } }, { text: 'DNS 53 autorisé uniquement vers Cloudflare → filtrage imposé', options: { bullet: true, breakLine: true } }, { text: 'Torrents / P2P / sites X bloqués, même pour un root', options: { bullet: true } }],
      { x: 7.05, y: 3.5, w: 5.35, h: 2.7, fontFace: 'Calibri', fontSize: 14, color: WHITE, paraSpaceAfter: 14 });
    s.addNotes('Deux couches : in-VM (best-effort) et réseau (Security Group, non contournable). C’est la couche réseau qui garantit le blocage même face à un utilisateur admin de sa VM.');
  }

  // ====== 14. AUTOMATISATION — rangée d’icônes ======
  {
    const s = light();
    header(s, I.bolt, 'Automatisation', 'Le cycle de vie tourne tout seul');
    const items = [[I.power, BLUE, 'Arrêt inactivité', 'CPU < 10 % sur 3 h → stop (CloudWatch). Relançable.'], [I.clock, TEAL, 'Planification', 'Démarrage / extinction par VM (jours + horaires).'], [I.shield, MINT, 'Échéance', 'Snapshot auto possible, puis suppression.'], [I.gauge, CORAL, 'Garde-fous coût', 'Extinction nocturne + budget 50 $ avec alertes.']];
    const bw = 2.86, gap = 0.19, x0 = M, y = 2.1;
    items.forEach((it, i) => {
      const x = x0 + i * (bw + gap);
      card(s, x, y, bw, 3.0);
      circ(s, x + bw / 2 - 0.5, y + 0.4, 1.0, it[1], it[0]);
      s.addText(it[2], { x, y: y + 1.6, w: bw, h: 0.4, align: 'center', fontFace: 'Calibri', fontSize: 15.5, bold: true, color: INK, margin: 0 });
      s.addText(it[3], { x: x + 0.22, y: y + 2.05, w: bw - 0.44, h: 0.85, align: 'center', fontFace: 'Calibri', fontSize: 11.5, color: MUTE, margin: 0, lineSpacingMultiple: 1.05 });
    });
    s.addText([{ text: 'Résultat : ', options: { bold: true, color: TEAL } }, { text: 'pas de VM oubliée, pas de coût qui dérape — l’infrastructure se gère elle-même.', options: { color: INK } }],
      { x: M, y: 5.6, w: 12, h: 0.5, align: 'center', fontFace: 'Calibri', fontSize: 14 });
    s.addNotes('Tout est automatique : inactivité, planning, échéance, garde-fous. L’infra s’auto-gère via le réconciliateur.');
  }

  // ====== 15. ADMIN & MONITORING — liste + hero ======
  {
    const s = light();
    header(s, I.chart, 'Admin & monitoring', 'Tout piloter depuis une console unifiée');
    card(s, M, 1.85, 6.95, 4.6);
    s.addText('Une console pour tout', { x: M + 0.4, y: 2.15, w: 6, h: 0.4, fontFace: 'Calibri', fontSize: 16, bold: true, color: INK });
    const feats = ['Demandes + machines fusionnées en un onglet', 'Validation en cartes : groupe ou VM seule', 'Actions cycle de vie inline (start/stop/terminate)', 'Gestion des rôles en un clic', 'Recherche · filtres · pagination · export CSV', 'Journal d’audit des actions sensibles'];
    let fy = 2.75;
    feats.forEach((f) => {
      circ(s, M + 0.4, fy, 0.42, TEAL, I.check, 0.13);
      s.addText(f, { x: M + 1.0, y: fy - 0.04, w: 5.85, h: 0.5, fontFace: 'Calibri', fontSize: 13.5, color: INK, valign: 'middle', margin: 0 });
      fy += 0.59;
    });
    card(s, 7.95, 1.85, 4.7, 4.6, NAVY);
    circ(s, 8.3, 2.2, 0.7, TEAL, I.chart);
    s.addText('Monitoring Grafana', { x: 8.3, y: 3.1, w: 4.0, h: 0.5, fontFace: 'Calibri', fontSize: 19, bold: true, color: WHITE, margin: 0 });
    s.addText([{ text: 'Tableaux de bord coûts · VM · logs', options: { bullet: true, breakLine: true, color: ICE } }, { text: 'Endpoints /api/monitoring', options: { bullet: true, breakLine: true, color: ICE } }, { text: 'Alertes budget AWS par e-mail', options: { bullet: true, color: ICE } }],
      { x: 8.3, y: 3.7, w: 4.0, h: 2.0, fontFace: 'Calibri', fontSize: 13.5, paraSpaceAfter: 9, margin: 0 });
    s.addNotes('Côté admin : une console unifiée pour valider et opérer, la gestion des rôles, l’audit, l’export CSV, et le monitoring Grafana.');
  }

  // ====== 16. DÉPLOIEMENT — pipeline ======
  {
    const s = light();
    header(s, I.rocket, 'Déploiement', 'Livrer = merger sur main');
    const steps = [['1', 'Pull request', 'Branche + vérifs (typecheck, build)'], ['2', 'Merge sur main', 'Déclenche Cloudflare Workers Builds'], ['3', 'Migrate + Deploy', 'Migrations D1 remote, puis deploy'], ['4', 'En ligne', 'Vérif /healthz et /api/presets']];
    let x = M, y = 2.2;
    steps.forEach((st, i) => {
      card(s, x, y, 2.86, 2.2);
      s.addShape(p.shapes.OVAL, { x: x + 1.08, y: y + 0.3, w: 0.7, h: 0.7, fill: { color: TEAL } });
      s.addText(st[0], { x: x + 1.08, y: y + 0.3, w: 0.7, h: 0.7, align: 'center', valign: 'middle', fontFace: 'Calibri', fontSize: 22, bold: true, color: WHITE, margin: 0 });
      s.addText(st[1], { x: x + 0.15, y: y + 1.15, w: 2.56, h: 0.4, align: 'center', fontFace: 'Calibri', fontSize: 14.5, bold: true, color: INK, margin: 0 });
      s.addText(st[2], { x: x + 0.2, y: y + 1.55, w: 2.46, h: 0.6, align: 'center', fontFace: 'Calibri', fontSize: 11, color: MUTE, margin: 0 });
      if (i < steps.length - 1) s.addShape(p.shapes.LINE, { x: x + 2.88, y: y + 1.1, w: 0.14, h: 0, line: { color: 'C9D6DF', width: 2, endArrowType: 'triangle' } });
      x += 3.04;
    });
    card(s, M, 4.9, 12.0, 1.5, TINT);
    s.addText([{ text: 'Aucun « wrangler deploy » manuel. ', options: { bold: true, color: INK } }, { text: 'Le pipeline applique les migrations avant le déploiement. Les branches non-prod ne déploient rien.', options: { color: MUTE } }],
      { x: M + 0.35, y: 5.15, w: 11.3, h: 1.0, fontFace: 'Calibri', fontSize: 13.5, valign: 'middle', lineSpacingMultiple: 1.1 });
    s.addNotes('Déploiement trivial et sûr : une PR mergée déclenche build + migrations + deploy, dans le bon ordre.');
  }

  // ====== 17. CHIFFRES — callouts ======
  {
    const s = light();
    header(s, I.gauge, 'En chiffres', 'Le projet d’un coup d’œil');
    const stats = [['7', 'systèmes au catalogue', BLUE], ['3', 'rôles (dont formateur)', TEAL], ['1–30', 'VM par demande groupée', MINT], ['*/2', 'min : cron de réconciliation', BLUE], ['3 h', 'avant arrêt sur inactivité', CORAL], ['50 $', 'plafond budget AWS + alertes', TEAL]];
    let x = M, y = 1.9;
    stats.forEach((st, i) => {
      card(s, x, y, 3.9, 2.0);
      s.addText(st[0], { x: x + 0.3, y: y + 0.3, w: 3.3, h: 0.95, fontFace: 'Calibri', fontSize: 46, bold: true, color: st[2], margin: 0 });
      s.addText(st[1], { x: x + 0.32, y: y + 1.3, w: 3.3, h: 0.6, fontFace: 'Calibri', fontSize: 13.5, color: MUTE, margin: 0 });
      x += 4.07;
      if ((i + 1) % 3 === 0) { x = M; y += 2.2; }
    });
    s.addNotes('Quelques chiffres marquants : catalogue, rôles, capacité de la demande groupée, fréquence du cron, seuils d’automatisation, budget.');
  }

  // ====== 18. DÉMO (dark) ======
  {
    const s = dark();
    s.addShape(p.shapes.OVAL, { x: 10.0, y: -2.0, w: 6.0, h: 6.0, fill: { color: BLUE, transparency: 40 } });
    circ(s, M, 0.6, 0.95, CORAL, I.play);
    s.addText('DÉMO LIVE', { x: M + 1.2, y: 0.62, w: 9, h: 0.35, fontFace: 'Calibri', fontSize: 13, color: CORAL, bold: true, charSpacing: 3, margin: 0 });
    s.addText('À vous de jouer — parcours sur la plateforme', { x: M + 1.2, y: 0.95, w: 11.4, h: 0.7, fontFace: 'Calibri', fontSize: 26, color: WHITE, bold: true, margin: 0 });
    const demo = [['1', 'Connexion SSO', 'Se connecter en Microsoft Entra ID.'], ['2', 'Créer une VM', 'Nommer, choisir OS / perf / dates, justifier.'], ['3', 'Valider (admin)', 'Approuver la demande dans la console VM.'], ['4', 'Se connecter', 'VM active → clé SSH (Linux) ou RDP (Windows).'], ['5', 'Snapshot', 'Onglet Snapshots → créer une sauvegarde EBS.'], ['6', 'Demande groupée', 'Formateur : créer un lot, répartir sur des users.'], ['7', 'Sécurité', 'Montrer DNS filtré + blocage (durcissement).'], ['8', 'Automatisation', 'Planification / arrêt inactivité / échéance.']];
    let x = M, y = 2.1;
    demo.forEach((d, i) => {
      s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w: 5.95, h: 1.16, fill: { color: BLUE }, rectRadius: 0.08, shadow: shadow() });
      s.addShape(p.shapes.OVAL, { x: x + 0.22, y: y + 0.28, w: 0.6, h: 0.6, fill: { color: TEAL } });
      s.addText(d[0], { x: x + 0.22, y: y + 0.28, w: 0.6, h: 0.6, align: 'center', valign: 'middle', fontFace: 'Calibri', fontSize: 18, bold: true, color: WHITE, margin: 0 });
      s.addText(d[1], { x: x + 0.95, y: y + 0.16, w: 4.85, h: 0.4, fontFace: 'Calibri', fontSize: 14.5, bold: true, color: WHITE, margin: 0 });
      s.addText(d[2], { x: x + 0.95, y: y + 0.58, w: 4.9, h: 0.5, fontFace: 'Calibri', fontSize: 11.5, color: ICE, margin: 0 });
      x += 6.2;
      if ((i + 1) % 2 === 0) { x = M; y += 1.32; }
    });
    s.addNotes('Transition vers la démo. Dérouler le parcours dans l’ordre. Plan B : captures si une VM tarde. Astuce : avoir une VM déjà active pour la connexion/snapshot.');
  }

  // ====== 19. MERCI ======
  {
    const s = dark();
    s.addShape(p.shapes.OVAL, { x: 9.6, y: 2.2, w: 6.5, h: 6.5, fill: { color: BLUE, transparency: 40 } });
    s.addShape(p.shapes.OVAL, { x: -1.6, y: -1.6, w: 4.6, h: 4.6, fill: { color: TEAL, transparency: 60 } });
    s.addText('MERCI', { x: M, y: 2.6, w: 11, h: 1.0, fontFace: 'Calibri', fontSize: 54, color: WHITE, bold: true, charSpacing: 2 });
    s.addText('GIT VM Portal — self-service, automatisé, sécurisé, sur Cloudflare × AWS.', { x: M, y: 3.8, w: 11, h: 0.6, fontFace: 'Calibri', fontSize: 17, color: ICE });
    s.addText([{ text: 'Démo : ', options: { color: TEAL, bold: true } }, { text: 'git-vm-portal.thomas-prudhomme.workers.dev', options: { color: ICE } }], { x: M, y: 4.7, w: 11, h: 0.4, fontFace: 'Calibri', fontSize: 14 });
    s.addText([{ text: 'Doc : ', options: { color: TEAL, bold: true } }, { text: 'AGENTS.md (référence canonique) · ADR 0001 → 0009', options: { color: ICE } }], { x: M, y: 5.15, w: 11, h: 0.4, fontFace: 'Calibri', fontSize: 14 });
    s.addNotes('Conclusion : rappeler les 3 mots-clés (self-service, automatisé, sécurisé) et inviter aux questions / à la démo.');
  }

  await p.writeFile({ fileName: 'GIT-VM-Portal.pptx' });
  console.log('OK slides=' + N);
})();
