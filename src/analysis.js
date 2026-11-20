// Logjika e vlerësimit: relevanca, kategoria, marka, performanca, rekomandimi, PC builder.
// Të gjitha vlerësimet janë automatike dhe të përafërta — jo test laboratorik.

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ë/g, 'e')
    .replace(/ç/g, 'c');

const tokens = (s) => norm(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 2 || /\d/.test(t));

// ---------------- Kategoritë ----------------
const CATEGORY_WORDS = {
  tech: ['rtx', 'gtx', 'radeon', 'rx', 'ryzen', 'intel', 'core', 'i3', 'i5', 'i7', 'i9', 'ssd', 'hdd', 'nvme', 'ram', 'ddr4', 'ddr5', 'laptop', 'notebook', 'monitor', 'telefon', 'iphone', 'galaxy', 'procesor', 'grafike', 'gpu', 'cpu', 'motherboard', 'pllake', 'psu', 'furnizues', 'tastier', 'keyboard', 'mouse', 'kufje', 'headset', 'tv', 'televizor', 'playstation', 'ps5', 'xbox', 'tablet', 'ipad', 'macbook', 'router', 'printer', 'kamera', 'smartwatch', 'ore', 'airpods', 'karikues', 'b650', 'b760', 'z790', 'x670', 'b550', 'kuti', 'case', 'cooler', 'ftohes'],
  appliance: ['lavatrice', 'lavatriqe', 'frigorifer', 'sporet', 'furre', 'mikrovale', 'fshese', 'kondicioner', 'klime', 'tharese', 'enelarese', 'blender', 'mikser', 'hekur', 'kafe', 'espresso', 'ngrohes', 'ftohes', 'aspirator', 'thithese', 'tostier', 'friteze', 'airfryer', 'bojler', 'ventilator'],
  furniture: ['tavoline', 'karrige', 'divan', 'kauc', 'shtrat', 'dollap', 'komode', 'raft', 'dyshek', 'garnitur', 'kolltuk', 'tavolin', 'mobilje', 'vitrine', 'sofa', 'stol', 'banak', 'buke', 'ngrenie', 'kuzhine', 'dhome', 'jastek', 'tepih', 'qilim', 'llampe', 'pasqyre'],
};

function detectCategory(query, titles = []) {
  const qt = tokens(query);
  const score = { tech: 0, appliance: 0, furniture: 0 };
  for (const [cat, words] of Object.entries(CATEGORY_WORDS)) {
    for (const t of qt) if (words.includes(t)) score[cat] += 3;
    for (const title of titles.slice(0, 15)) for (const t of tokens(title)) if (words.includes(t)) score[cat] += 0.2;
  }
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best[1] >= 1 ? best[0] : 'general';
}

const CATEGORY_LABEL = { tech: 'Teknologji', appliance: 'Elektroshtëpiake', furniture: 'Mobilje', general: 'Të përgjithshme' };

// ---------------- Markat (0–10, reputacion i përgjithshëm) ----------------
const BRANDS = {
  tech: { samsung: 9, apple: 9, asus: 8.5, msi: 8.5, gigabyte: 8, aorus: 8.5, zotac: 7.5, palit: 7, gainward: 7, pny: 7, inno3d: 7, sapphire: 8.5, powercolor: 8, xfx: 7.5, asrock: 7.5, amd: 9, intel: 9, nvidia: 9, lenovo: 8.5, hp: 8, dell: 8.5, acer: 7.5, kingston: 8.5, corsair: 8.5, 'g.skill': 8.5, gskill: 8.5, crucial: 8.5, wd: 8.5, 'western digital': 8.5, seagate: 7.5, logitech: 8.5, razer: 8, lg: 8.5, sony: 9, xiaomi: 7.5, huawei: 7.5, 'be quiet': 9, seasonic: 9, 'cooler master': 8, nzxt: 8, thermaltake: 7, 'lian li': 8.5, fractal: 8.5, noctua: 9.5, deepcool: 7.5, arctic: 8, thermalright: 8, montech: 7, adata: 7.5, teamgroup: 7.5, lexar: 7.5, hyperx: 8.5, steelseries: 8.5, benq: 8, aoc: 7.5, philips: 7.5, viewsonic: 7.5, tp: 7.5, 'tp-link': 7.5, canon: 8.5, epson: 8, brother: 8, jbl: 8, bose: 9, anker: 8 },
  appliance: { bosch: 9, siemens: 9, miele: 9.5, samsung: 8.5, lg: 8.5, whirlpool: 8, electrolux: 8.5, aeg: 8.5, gorenje: 8, beko: 7.5, indesit: 7, candy: 6.5, hisense: 7, vox: 6.5, tesla: 6.5, philips: 8.5, tefal: 8, rowenta: 8, braun: 8.5, xiaomi: 7.5, dyson: 9, delonghi: 8.5, krups: 8, gree: 8, daikin: 9, midea: 7.5, haier: 7.5, sharp: 7.5, hotpoint: 7.5, smeg: 8.5, russell: 7.5, 'russell hobbs': 7.5, ninja: 8.5, nespresso: 8.5 },
  furniture: { ikea: 8 },
  general: {},
};

function detectBrand(title, category) {
  const t = ' ' + norm(title) + ' ';
  const tables = [BRANDS[category] || {}, BRANDS.tech, BRANDS.appliance, BRANDS.furniture];
  for (const tbl of tables) {
    const hit = Object.keys(tbl)
      .sort((a, b) => b.length - a.length)
      .find((b) => new RegExp('[^a-z0-9]' + b.replace(/[.\-]/g, '\\$&') + '[^a-z0-9]').test(t));
    if (hit) return { name: hit.replace(/\b\w/g, (c) => c.toUpperCase()), score: (BRANDS[category] || {})[hit] || tbl[hit] };
  }
  return { name: '', score: null };
}

// ---------------- Performanca (indeks i përafërt, më i madhi = më i shpejtë) ----------------
const GPU_PERF = [
  ['rtx 5090', 130], ['rtx 4090', 100], ['rtx 5080', 82], ['rtx 4080 super', 77], ['rtx 4080', 76], ['rx 7900 xtx', 75], ['rtx 5070 ti', 70], ['rx 9070 xt', 68], ['rtx 4070 ti super', 66], ['rx 7900 xt', 65], ['rx 9070', 61], ['rtx 4070 ti', 60], ['rtx 5070', 56], ['rtx 4070 super', 55], ['rx 7900 gre', 54], ['rx 9060 xt', 42], ['rx 7800 xt', 50], ['rtx 4070', 47], ['rtx 3080', 45], ['rx 7700 xt', 42], ['rtx 5060 ti', 40], ['rtx 3070', 38], ['rtx 4060 ti', 36], ['rx 6750 xt', 35], ['rtx 5060', 34], ['arc b580', 30], ['rtx 4060', 29], ['rx 7600 xt', 29], ['rx 7600', 27], ['rtx 3060', 26], ['arc a750', 24], ['rx 6600', 22], ['rtx 3050', 15], ['gtx 1650', 9],
];
const CPU_PERF = [
  ['9800x3d', 100], ['9950x3d', 98], ['7800x3d', 90], ['7950x3d', 90], ['285k', 82], ['14900k', 82], ['13900k', 80], ['14700k', 80], ['265k', 79], ['9700x', 78], ['9950x', 80], ['9900x', 79], ['7950x', 78], ['7700x', 76], ['14600k', 74], ['9600x', 74], ['245k', 73], ['7600x', 72], ['13600k', 72], ['5800x3d', 72], ['7700', 74], ['5700x3d', 70], ['7600', 70], ['14400f', 64], ['14400', 64], ['13400f', 62], ['12600k', 66], ['12400f', 58], ['12400', 58], ['5700x', 58], ['5600x', 56], ['5600', 55], ['8500g', 52], ['5500', 48], ['12100f', 45], ['12100', 45],
];

function findPerf(title) {
  const t = norm(title).replace(/geforce|radeon/g, '').replace(/\s+/g, ' ');
  const compact = t.replace(/\s+/g, '');
  for (const [k, v] of GPU_PERF) {
    const kc = k.replace(/\s+/g, '');
    if (compact.includes(kc)) {
      // shmang "rtx 4070" kur titulli është "rtx 4070 super/ti"
      const longer = GPU_PERF.find(([k2]) => k2 !== k && k2.startsWith(k) && compact.includes(k2.replace(/\s+/g, '')));
      if (longer) return { kind: 'gpu', model: longer[0].toUpperCase(), idx: longer[1] };
      return { kind: 'gpu', model: k.toUpperCase(), idx: v };
    }
  }
  for (const [k, v] of CPU_PERF) {
    if (new RegExp('(^|[^a-z0-9])' + k + '([^a-z0-9]|$)').test(t)) return { kind: 'cpu', model: k.toUpperCase(), idx: v };
  }
  return null;
}

// ---------------- Cilësia e mobiljeve nga titulli ----------------
function furnitureQuality(title) {
  const t = norm(title);
  let s = 6, notes = [];
  if (/masiv|solid|dru i plote|dru natyral/.test(t)) { s += 2; notes.push('dru masiv'); }
  if (/metal|celik|hekur/.test(t)) { s += 0.5; notes.push('metal'); }
  if (/qelq|xham|glass|mermer|marble/.test(t)) { s += 0.5; notes.push('qelq/mermer'); }
  if (/mdf|iverit|laminat|pllake/.test(t)) { s -= 1; notes.push('MDF/laminat'); }
  const dim = t.match(/(\d{2,3})\s*x\s*(\d{2,3})(?:\s*x\s*(\d{2,3}))?/);
  const seats = t.match(/(\d)\s*(vende|karrige|persona|ulese)/);
  return { score: Math.max(3, Math.min(9.5, s)), notes, size: dim ? dim[0].replace(/\s/g, '') + ' cm' : '', seats: seats ? +seats[1] : null };
}

// ---------------- Lloji i produktit (qëllimi i kërkimit) ----------------
// Kur kërkon "laptop" duhet të dalin laptopë, jo çanta/adaptorë për laptop.
// q = fjalët në kërkim që e tregojnë llojin; test = si e njohim nga titulli.
const LAPTOP_RE = /\b(laptop|laptopi|notebook|macbook|ultrabook|chromebook|zenbook|vivobook|expertbook|ideapad|thinkpad|thinkbook|legion (5|7|9|pro|slim)|yoga (slim|pro|book|7|9|d{1,2}i)|inspiron|latitude|vostro|xps|probook|elitebook|zbook|victus|omen transcend|pavilion (plus|aero|x360|\d{2})|envy x360|spectre|aspire|nitro (v|5|16|17)|swift|predator helios|travelmate|extensa|tuf gaming [af]\d\d|rog (strix|zephyrus|flow)|zephyrus|katana|cyborg|stealth \d|sword|thin gf|bravo \d|crosshair|modern 1[45]|prestige 1[46]|galaxy book|surface laptop|matebook|redmibook|gaming laptop|loq 15)\b/;
const DESKTOP_RE = /\b(pc|desktop|kompjuter|kompjuteri|computer|all[ -]?in[ -]?one|aio|mini ?pc|mid[i-]? ?tower pc|thinkcentre|optiplex|elitedesk|prodesk|imac|mac mini|mac studio|veriton|nuc|ideacentre|legion tower|omen \d{2}l|victus 15l|gaming pc|workstation)\b/;
// Një kompjuter i vërtetë përmend procesorin ose është model i njohur desktop-i
const CPU_RE = /\b(i[3579][ -]?\d{3,5}\w*|i[3579]|ryzen|core ultra|core i[3579]|intel core|core [3579] \d{3}|celeron|pentium|athlon|xeon|apple m\d|n100|n150|n200)\b/;
const DESKTOP_MODEL_RE = /\b(thinkcentre|optiplex|elitedesk|prodesk|imac|mac mini|mac studio|veriton|ideacentre|nuc|pro tower|legion tower|omen \d{2}l|victus 15l)\b/;
// gjëra që përmbajnë "kompjuter/desktop/pc" por s'janë kompjuter desktop
const DESKTOP_NOT = /\b(router|switch|wi-?fi \d|access point|printer|skener|kopjues|kontrollor|controller|gamepad|lodr\w*|loder|edukativ|femije|fan|heater|ngrohes\w*|ventilator\w*|altoparlant\w*|speaker\w*|kase|kasa|chassis|mbajtes\w*|portativ|dore|pda|handheld|cycle|biciklet\w*|ciklo\w*|terminal|skaner|scanner|barcode)\b/;
// fjalë që, kur janë në fillim të titullit, tregojnë një pjesë/aksesor e jo pajisjen e plotë
const PART_WORDS = 'karte|kartele|kartela|graphics|grafike|procesor|processor|cpu|pllake|pllaka|motherboard|ram|memorie|memory|ssd|hdd|disk|psu|furnizues|kuti|ftohes|cooler|tastier|tastiere|keyboard|mouse|maus|kufje|headset|altoparlant|altoparlante|speaker|webcam|mikrofon|karrige|tavoline|ups|pasta|thermal|ventilator|fan|mauspad|mousepad|router|switch|skaner|scanner|projektor|hub|licence|license|software|windows|office|antivirus|gpu|vga';
const COMPONENT_LEAD = new RegExp('^(' + PART_WORDS + '|monitor|power supply|case|bateri|battery|adapter|karikues|charger|dock|docking|stand|mbajtese|cante|canta|qante|qanta|sleeve|backpack|cover)\\b');
const PART_IN_QUERY = new RegExp('\\b(' + PART_WORDS + ')\\b');
const ACCESSORY_RE = /\b(cante|canta|qante|qanta|qant|bag|sleeve|backpack|shpine|case|mbajtese|stand|holder|ftohes per|cooling pad|cooler pad|adapter|adaptor|karikues|charger|kabllo|kabell|kabull|cable|dock|docking|mbrojtese|protector|protective|maske|mbulese|cover|skin|folie|tempered|glass protector|filter|filtri|telekomande|remote|bateri|battery|toner|ngjyre per|kertridz|kartrix\w*|kartush\w*|cartridge|ink(?![ -]?(jet|tank))|leter|paper|pjese kembimi|rezerve|spare|replacement|ram laptop|laptop ram|sodimm|so-dimm|mount|montues|kllapa|bracket|tastiere per|keyboard for|mouse pad|mauspad|stiker|sticker|lock|kyc)\b|\b(per|for|pre|fur) (laptop|notebook|macbook|kompjuter|pc|telefon|iphone|samsung|galaxy|tablet|ipad|tv|televizor|monitor|printer|lavatrice|frigorifer|playstation|ps5|xbox|kamere|camera)\b/;

const TYPES = {
  laptop: { label: 'Laptop', q: ['laptop', 'laptopa', 'laptopi', 'laptopat', 'notebook', 'macbook', 'ultrabook', 'chromebook'], test: (t) => LAPTOP_RE.test(t) || (/\b1[1-8](\.\d)?\s*("|inch|in|'')/.test(t) && /\b(i[3579]|ryzen|core ultra|core [3579]|celeron|pentium|snapdragon|apple m\d)\b/.test(t) && !DESKTOP_RE.test(t)) },
  desktop: { label: 'Kompjuter (desktop)', q: ['kompjuter', 'kompjutere', 'kompjuteri', 'kompjuteret', 'kompjutera', 'computer', 'computers', 'desktop', 'pc'], test: (t) => !LAPTOP_RE.test(t) && !DESKTOP_NOT.test(t) && ((DESKTOP_RE.test(t) && (DESKTOP_MODEL_RE.test(t) || CPU_RE.test(t))) || (/\b(i[3579]|ryzen|core ultra|intel core)\b/.test(t) && /\b\d{1,3}\s*gb\b/.test(t) && /\b(ssd|nvme|hdd)\b/.test(t) && !/\b1[1-8](\.\d)?\s*("|inch)/.test(t))) },
  phone: { label: 'Telefon', q: ['telefon', 'telefona', 'telefoni', 'smartphone', 'phone', 'celular', 'iphone'], test: (t) => /\b(telefon|smartphone|iphone|galaxy [asmz]\d|galaxy (s|z) ?(fold|flip|\d)|redmi|poco|pixel \d|xiaomi \d|honor|oppo|realme|motorola|nokia|\d+\s*gb\s*\/?\s*\d+\s*gb)\b/.test(t) },
  tablet: { label: 'Tablet', q: ['tablet', 'tableta', 'tabletat', 'ipad'], test: (t) => /\b(tablet|ipad|galaxy tab|tab [as]\d|matepad|redmi pad|xiaomi pad|lenovo tab)\b/.test(t) },
  monitor: { label: 'Monitor', q: ['monitor', 'monitori', 'monitore'], test: (t) => /\bmonitor/.test(t) },
  tv: { label: 'Televizor', q: ['tv', 'televizor', 'televizori', 'televizore', 'televizion'], test: (t) => /\b(tv|televizor|smart tv|qled|oled tv|led tv|android tv|google tv)\b/.test(t) || /\b(\d{2})\s*("|inch).*\b(uhd|4k|qled|oled)\b/.test(t) },
  printer: { label: 'Printer', q: ['printer', 'printeri', 'printere', 'printues', 'shtypes'], test: (t) => /\b(printer|printues|pixma|i-sensys|ecotank|laserjet|deskjet|officejet|smart tank|multifunction|mfp)\b/.test(t) },
  camera: { label: 'Kamerë', q: ['kamera', 'kamere', 'aparat', 'fotoaparat', 'camera'], test: (t) => /\b(kamer|camera|fotoaparat|aparat fotografik|eos|mirrorless|dslr|gopro|powershot)\b/.test(t) },
  washer: { label: 'Lavatriçe', q: ['lavatrice', 'lavatriqe', 'lavatricja', 'washing'], test: (t) => /\b(lavatric|lavatriq|washing machine|makine larese)/.test(t) },
  fridge: { label: 'Frigorifer', q: ['frigorifer', 'frigoriferi', 'frizer', 'fridge'], test: (t) => /\b(frigorifer|frizer|fridge|freezer|kombinuar)/.test(t) },
  ac: { label: 'Kondicioner', q: ['kondicioner', 'kondicioneri', 'klime', 'klima'], test: (t) => /\b(kondicioner|klim|air condition|inverter \d+ ?btu|\d{4,5} ?btu)/.test(t) },
};

function detectIntent(query) {
  const nq = ' ' + norm(query) + ' ';
  const qt = tokens(query);
  // nëse vetë kërkimi përmban një fjalë aksesori (p.sh. "çantë laptop"), nuk e filtrojmë si pajisje
  const wantsAccessory = ACCESSORY_RE.test(nq) || PART_IN_QUERY.test(nq);
  let type = null;
  if (!wantsAccessory) {
    for (const [id, T] of Object.entries(TYPES)) if (T.q.some((w) => qt.includes(w))) { type = id; break; }
    if (!type && /kompjuter i plote|pc i plote|pc gaming|gaming pc/.test(nq)) type = 'desktop';
  }
  const brands = detectQueryBrands(query);
  return { type, typeLabel: type ? TYPES[type].label : '', typeWords: type ? TYPES[type].q.concat(['plote', 'kompletuar', 'komplet']) : [], brands, wantsAccessory };
}

function isAccessoryTitle(nt, url) {
  if (ACCESSORY_RE.test(' ' + nt + ' ')) return true;
  if (url && /aksesor|accessor|karikues|cant[ae]-|bags?\//i.test(url)) return true;
  return false;
}

// Klasifikon titullin: cilit lloj i përket, apo është aksesor/pjesë.
function classifyTitle(title, url) {
  const nt = norm(title).replace(/[^a-z0-9.,"'\/+ -]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (isAccessoryTitle(nt, url)) return { type: 'accessory' };
  for (const [id, T] of Object.entries(TYPES)) {
    if (!T.test(nt)) continue;
    // titull që fillon me pjesë (p.sh. "RAM laptop", "Monitor për PC") nuk është laptop/desktop
    if ((id === 'laptop' || id === 'desktop') && COMPONENT_LEAD.test(nt)) return { type: 'accessory' };
    return { type: id };
  }
  return { type: 'other' };
}

// Fjalët që u dërgohen dyqaneve. Dyqanet i shkruajnë titujt ndryshe ("Kompjuter", "Desktop", "PC"),
// prandaj për disa lloje kërkojmë me disa sinonime dhe i bashkojmë rezultatet.
function searchTerms(query) {
  const intent = detectIntent(query);
  const q = String(query || '').trim();
  if (!intent.type || /\b(iphone|macbook|ipad|chromebook)\b/i.test(q)) return [q];
  const ig = new Set(intent.typeWords.map(norm));
  const rest = q.split(/\s+/).filter((w) => !ig.has(norm(w).replace(/[^a-z0-9]/g, '')) && !/^(i|e|te)$/i.test(w)).join(' ');
  const syn = {
    desktop: ['kompjuter', 'desktop'],
    laptop: rest ? ['laptop'] : ['laptop', 'laptop intel core', 'laptop ryzen'],
    phone: ['telefon', 'smartphone'],
    tv: rest ? ['tv'] : ['televizor', 'smart tv'],
  }[intent.type];
  if (!syn) return [q];
  return [...new Set(syn.map((s) => (s + ' ' + rest).trim()).filter(Boolean))];
}

const TYPE_LABEL =Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [k, v.label]).concat([['accessory', 'Aksesorë & pjesë'], ['other', 'Të tjera']]));

// ---------------- Markat në kërkim ----------------
const EXTRA_BRANDS = ['canon', 'nikon', 'fujifilm', 'gopro', 'midea', 'gree', 'vivax', 'tesla', 'beko', 'arzum', 'sinbo', 'heinner', 'finlux', 'grundig', 'toshiba', 'panasonic', 'tcl', 'hisense', 'nokia', 'motorola', 'oppo', 'realme', 'honor', 'oneplus', 'google', 'microsoft', 'gorenje', 'candy', 'hoover', 'zanussi', 'whirlpool', 'indesit', 'liebherr', 'vestel', 'regal', 'arcelik', 'fakir', 'karcher', 'remington', 'babyliss', 'tefal', 'moulinex', 'kenwood', 'sencor', 'sharp', 'blaupunkt', 'jbl', 'marshall', 'sony', 'nintendo', 'playstation', 'xbox', 'msi', 'asus', 'acer', 'lenovo', 'dell', 'hp', 'apple', 'samsung', 'xiaomi', 'huawei', 'lg', 'philips', 'bosch', 'siemens', 'electrolux', 'aeg', 'dyson', 'rowenta', 'braun', 'delonghi', 'krups', 'daikin', 'haier', 'smeg', 'ninja', 'nespresso', 'logitech', 'razer', 'epson', 'brother', 'kyocera', 'ricoh', 'xerox', 'lexmark', 'gigabyte', 'zotac', 'corsair', 'kingston', 'redragon', 'hyperx', 'steelseries', 'tp-link', 'ubiquiti', 'mikrotik', 'anker', 'baseus', 'ugreen', 'amazfit', 'garmin', 'fitbit'];
const ALL_BRANDS = [...new Set(Object.values(BRANDS).flatMap((t) => Object.keys(t)).concat(EXTRA_BRANDS))].filter((b) => b.length >= 2 && !['tp', 'wd', 'ore', 'amd', 'intel', 'nvidia', 'core'].includes(b));

function detectQueryBrands(query) {
  const nq = ' ' + norm(query).replace(/[^a-z0-9.\- ]+/g, ' ') + ' ';
  return ALL_BRANDS.filter((b) => nq.includes(' ' + b + ' '));
}
const hasBrand = (o, b) => (' ' + norm(o.title + ' ' + (o.brandHint || '')).replace(/[^a-z0-9.\- ]+/g, ' ') + ' ').includes(' ' + b + ' ');

// ---------------- Relevanca ----------------
const ACCESSORY = ['filter', 'kabell', 'kabllo', 'cable', 'mbrojtese', 'maske', 'case per', 'adapter', 'telekomande', 'mbajtese', 'stiker', 'leter', 'pjese kembimi', 'rezerve'];

const WHOLE_DEVICE = ['laptop', 'notebook', 'kompjuter', 'desktop', 'pc'];

function relevance(query, title, ignore = []) {
  const ig = new Set(ignore.map(norm));
  const qt = [...new Set(tokens(query))].filter((t) => !ig.has(t));
  if (!qt.length) return 1;
  const tt = tokens(title);
  const joined = tt.join(' ');
  let hit = 0;
  for (const q of qt) {
    if (tt.includes(q) || tt.some((t) => (q.length >= 4 && t.startsWith(q.slice(0, Math.max(4, q.length - 1)))) || (t.length >= 4 && q.startsWith(t)))) hit++;
  }
  let r = hit / qt.length;
  const nq = norm(query);
  if (ACCESSORY.some((a) => joined.includes(a) && !nq.includes(a))) r *= 0.5;
  if (WHOLE_DEVICE.some((a) => (' ' + joined + ' ').includes(' ' + a + ' ') && !nq.includes(a)) && CATEGORY_WORDS.tech.some((w) => qt.includes(w))) r *= 0.6;
  return r;
}

const median = (arr) => {
  const a = [...arr].sort((x, y) => x - y);
  if (!a.length) return 0;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

// ---------------- Analiza e rezultateve ----------------
function analyze(query, offers, opts = {}) {
  const intent = opts.noIntent ? { type: null, typeWords: [], brands: [] } : detectIntent(query);
  const ignore = intent.typeWords.concat(intent.brands.flatMap((b) => tokens(b)));
  // fjalët e mbetura pasi heqim llojin dhe markën (p.sh. "laptop lenovo i7" -> ["i7"])
  const restTokens = [...new Set(tokens(query))].filter((t) => !new Set(ignore.map(norm)).has(t));
  let pool = offers.map((o) => ({ ...o, kind: classifyTitle(o.title, o.url).type }));
  // 1) Marka: nëse e ke shkruar markën, shfaqen vetëm produktet e asaj marke
  if (intent.brands.length) pool = pool.filter((o) => intent.brands.every((b) => hasBrand(o, b)));
  // 2) Lloji: "laptop" => vetëm laptopë; "kompjuter" => vetëm kompjuterë të plotë (pa çanta, pjesë, aksesorë)
  if (intent.type) pool = pool.filter((o) => o.kind === intent.type);
  const brandMode = !!intent.brands.length && !intent.type && !restTokens.length;

  let rel = pool.map((o) => ({ ...o, relevance: relevance(query, o.title, ignore) }));
  const qlen = restTokens.length;
  const minRel = qlen >= 3 ? 0.66 : 0.99;
  let kept = rel.filter((o) => o.relevance >= minRel);
  if (kept.length < 3 && qlen) kept = rel.filter((o) => o.relevance >= 0.5);
  // Pjesët e PC-së: lloji i duhur + numri i modelit saktë ("7600" s'pranon "3400G", por pranon "7600X")
  if (opts.require) {
    const qt = tokens(query);
    const models = qt.filter((t) => /\d/.test(t) && (/[a-z]/.test(t) || /^\d{3,5}$/.test(t)) && !/^\d+(gb|tb|w|mhz|mm|l)$/.test(t));
    const quals = qt.filter((t) => ['ti', 'super', 'xt', 'xtx', 'x3d'].includes(t)); // "RTX 5060 Ti" ≠ "RTX 5060"
    kept = kept.filter((o) => {
      if (!opts.require.test(norm(o.title))) return false;
      const tt = tokens(o.title);
      const joined = tt.join(' ');
      return models.every((m) => tt.some((t) => t === m || (t.startsWith(m) && /^[a-z]{1,3}$/.test(t.slice(m.length)))))
        && quals.every((q) => tt.includes(q) || new RegExp('\\d' + q + '\\b').test(joined))
        // e anasjellta: "RTX 5070" nuk pranon "5070 Ti/Super" (model tjetër, më i shtrenjtë)
        && !models.some((m) => /^\d{4}$/.test(m) && ['ti', 'super'].some((q) => !quals.includes(q) && new RegExp('\\b' + m + ' ?' + q + '\\b').test(joined)));
    });
  }
  if (opts.excludeWords && opts.excludeWords.length) {
    const ex = opts.excludeWords.map(norm);
    const k2 = kept.filter((o) => !ex.some((w) => norm(o.title).includes(w)));
    if (k2.length) kept = k2;
  }
  // heq dublikatat (i njëjti link)
  const seen = new Set();
  kept = kept.filter((o) => (seen.has(o.url) ? false : (seen.add(o.url), true)));

  const category = detectCategory(query, kept.map((o) => o.title));
  const intentOut = { type: intent.type, typeLabel: intent.typeLabel, brands: intent.brands.map((b) => b.replace(/\b\w/g, (c) => c.toUpperCase())), brandMode };
  if (!kept.length) return { category, categoryLabel: CATEGORY_LABEL[category], intent: intentOut, offers: [], best: null, cheapest: null, stats: null, hidden: offers.length };

  const prices = kept.map((o) => o.price);
  const min = Math.min(...prices), max = Math.max(...prices), med = median(prices);

  kept = kept.map((o) => {
    const brand = detectBrand(o.title, category);
    const perf = category === 'tech' || category === 'general' ? findPerf(o.title) : null;
    const furn = category === 'furniture' ? furnitureQuality(o.title) : null;
    const priceScore = 10 * Math.pow(min / o.price, 0.6);
    const brandScore = brand.score != null ? brand.score : 6.5;
    let qualityScore = 6.5;
    if (furn) qualityScore = furn.score;
    const discount = o.oldPrice && o.oldPrice > o.price ? Math.round((1 - o.price / o.oldPrice) * 100) : 0;
    const inStock = /stok|stock|disponueshem|ne dispozicion/i.test(norm(o.stock)) && !/pa stok|out of/i.test(norm(o.stock));
    const sub = { cmimi: priceScore, marka: brandScore, cilesia: qualityScore };
    return { ...o, brand: brand.name, brandScore, perf, furniture: furn, discount, inStock, sub };
  });

  // performanca/vlera për teknologji: krahaso me modelin më të fortë në listë
  const perfItems = kept.filter((o) => o.perf);
  if (perfItems.length) {
    const topIdx = Math.max(...perfItems.map((o) => o.perf.idx));
    const bestVpe = Math.max(...perfItems.map((o) => o.perf.idx / o.price));
    kept = kept.map((o) => {
      if (!o.perf) return o;
      const perfScore = 10 * Math.pow(o.perf.idx / topIdx, 0.8);
      const valueScore = 10 * Math.pow(o.perf.idx / o.price / bestVpe, 0.7);
      return { ...o, sub: { ...o.sub, performanca: perfScore, vlera: valueScore } };
    });
  }

  kept = kept.map((o) => {
    const s = o.sub;
    let score;
    if (s.vlera != null) score = 0.3 * s.cmimi + 0.3 * s.vlera + 0.2 * s.performanca + 0.2 * s.marka;
    else if (o.furniture) score = 0.5 * s.cmimi + 0.3 * s.cilesia + 0.2 * s.marka;
    else score = 0.6 * s.cmimi + 0.4 * s.marka;
    if (o.inStock) score += 0.2;
    if (o.discount >= 20) score += 0.2;
    score = Math.max(0, Math.min(10, score));
    let verdict, tone;
    if (score >= 7.5 && o.price <= med * 1.15) { verdict = 'Ja vlen'; tone = 'good'; }
    else if (o.price > med * 1.3 && score < 7) { verdict = 'E shtrenjtë'; tone = 'warn'; }
    else if (score >= 6) { verdict = 'OK'; tone = 'ok'; }
    else { verdict = 'Jo shumë'; tone = 'warn'; }
    const reasons = [];
    if (o.price === min) reasons.push('Çmimi më i ulët nga të gjitha dyqanet.');
    else reasons.push(`€${fmt(o.price - min)} më shtrenjtë se oferta më e lirë.`);
    if (o.discount) reasons.push(`Në zbritje ${o.discount}% (ishte €${fmt(o.oldPrice)}).`);
    if (o.brand && o.brandScore >= 8.5) reasons.push(`${o.brand} — markë me reputacion të lartë.`);
    else if (o.brand && o.brandScore < 7) reasons.push(`${o.brand} — markë më ekonomike, kontrollo garancinë.`);
    if (o.perf) reasons.push(`${o.perf.kind === 'gpu' ? 'Kartë grafike' : 'Procesor'} ${o.perf.model}: performancë ${(s.performanca).toFixed(1)}/10 krahasuar me më të fortin në listë.`);
    if (o.furniture && o.furniture.notes.length) reasons.push('Materiali: ' + o.furniture.notes.join(', ') + '.');
    if (o.furniture && o.furniture.size) reasons.push('Përmasat: ' + o.furniture.size + '.');
    if (o.inStock) reasons.push('Në stok.');
    return { ...o, score: Math.round(score * 10) / 10, verdict, tone, reasons };
  });

  kept.sort((a, b) => b.score - a.score || a.price - b.price);
  if (brandMode) {
    // në modalitetin e markës: pajisjet kryesore para, aksesorët në fund
    const rank = (k) => (k === 'accessory' ? 2 : k === 'other' ? 1 : 0);
    kept.sort((a, b) => rank(a.kind) - rank(b.kind) || b.score - a.score);
  }
  const cheapest = kept.reduce((a, b) => (b.price < a.price ? b : a), kept[0]);
  const best = kept[0];
  const storesWith = [...new Set(kept.map((o) => o.store))];
  const kinds = {};
  for (const o of kept) kinds[o.kind] = (kinds[o.kind] || 0) + 1;
  return {
    category,
    categoryLabel: CATEGORY_LABEL[category],
    intent: intentOut,
    kinds: Object.entries(kinds).map(([id, n]) => ({ id, label: TYPE_LABEL[id] || id, n })).sort((a, b) => (a.id === 'accessory') - (b.id === 'accessory') || b.n - a.n),
    offers: kept,
    best,
    cheapest,
    stats: { min, max, median: med, count: kept.length, stores: storesWith.length },
    hidden: offers.length - kept.length,
  };
}

function fmt(n) {
  return Number(n).toLocaleString('de-DE', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

// ---------------- PC Builder ----------------
const SLOTS = [
  // require = titulli duhet të duket si ky lloj pjese (që p.sh. "B650" të mos gjejë orën Casio B650WB)
  { id: 'cpu', label: 'Procesori', require: /\b(ryzen|intel|core|procesor\w*|processor|cpu|athlon|pentium|celeron)\b/, exclude: ['laptop', 'notebook', 'kompjuter', 'desktop', 'pc ', 'ftohes', 'cooler', 'pllake', 'motherboard'] },
  { id: 'mobo', label: 'Pllaka amë', require: /\b(pllak\w*|motherboard|mainboard|maticn\w*|am[45]|lga ?\d{4}|atx|matx|micro ?atx|mini ?itx|itx)\b/, exclude: ['laptop', 'kompjuter', 'desktop', 'pc '] },
  { id: 'ram', label: 'RAM', require: /\b(ram|ddr[45]|memori\w*|memory|dimm|udimm)\b/, exclude: ['laptop', 'kompjuter', 'desktop', 'sodimm', 'so-dimm', 'telefon'] },
  { id: 'gpu', label: 'Kartë grafike', require: /\b(rtx|gtx|radeon|rx|arc|grafik\w*|graphics|vga|geforce)\b/, exclude: ['laptop', 'notebook', 'kompjuter', 'desktop', 'pc ', 'gaming pc'] },
  { id: 'ssd', label: 'SSD', require: /\bssd\b|nvme|m\.2/, exclude: ['laptop', 'kompjuter', 'external', 'portable', 'eksternal'] },
  { id: 'psu', label: 'Furnizuesi (PSU)', require: /\b(psu|furnizues\w*|power supply|\d{3,4} ?w)\b/, exclude: ['laptop', 'ups', 'kompjuter'] },
  { id: 'case', label: 'Kutia', require: /\b(kuti\w*|case|tower|chassis|kase|kasa|midi|mid)\b/, exclude: ['laptop', 'telefon', 'iphone', 'samsung galaxy', 'maske'] },
  { id: 'cooler', label: 'Ftohja', require: /\b(cooler|ftohes\w*|heatsink|aio|liquid|water|radiator)\b/, exclude: ['laptop', 'pad', 'kompjuter', 'thermal paste'] },
];

const PRESETS = {
  gaming: [
    { max: 700, parts: { cpu: 'Ryzen 5 5500', mobo: 'A520', ram: '16GB DDR4 3200', gpu: 'RX 6600', ssd: 'SSD 512GB NVMe', psu: '550W', case: 'Kuti ATX', cooler: '' } },
    { max: 900, parts: { cpu: 'Ryzen 5 5600', mobo: 'B550', ram: '16GB DDR4 3200', gpu: 'RTX 4060', ssd: 'SSD 1TB NVMe', psu: '600W 80 Plus', case: 'Kuti ATX', cooler: '' } },
    { max: 1300, parts: { cpu: 'Ryzen 5 7600', mobo: 'B650', ram: '32GB DDR5 6000', gpu: 'RTX 5060 Ti', ssd: 'SSD 1TB NVMe', psu: '650W 80 Plus Gold', case: 'Kuti ATX', cooler: 'Cooler CPU' } },
    { max: 1900, parts: { cpu: 'Ryzen 7 7800X3D', mobo: 'B650', ram: '32GB DDR5 6000', gpu: 'RTX 5070', ssd: 'SSD 2TB NVMe', psu: '750W 80 Plus Gold', case: 'Kuti ATX', cooler: 'Cooler CPU' } },
    { max: Infinity, parts: { cpu: 'Ryzen 7 9800X3D', mobo: 'X870', ram: '32GB DDR5 6000', gpu: 'RTX 5080', ssd: 'SSD 2TB NVMe', psu: '850W 80 Plus Gold', case: 'Kuti ATX', cooler: 'AIO 360' } },
  ],
  work: [
    { max: 750, parts: { cpu: 'Ryzen 5 8600G', mobo: 'B650', ram: '32GB DDR5', gpu: '', ssd: 'SSD 1TB NVMe', psu: '550W', case: 'Kuti ATX', cooler: '' } },
    { max: 1000, parts: { cpu: 'Ryzen 5 7600', mobo: 'B650', ram: '32GB DDR5', gpu: 'RTX 3050', ssd: 'SSD 1TB NVMe', psu: '550W 80 Plus', case: 'Kuti ATX', cooler: '' } },
    { max: Infinity, parts: { cpu: 'Ryzen 9 9900X', mobo: 'B650', ram: '64GB DDR5', gpu: 'RTX 4070 Super', ssd: 'SSD 2TB NVMe', psu: '750W 80 Plus Gold', case: 'Kuti ATX', cooler: 'Cooler CPU' } },
  ],
  office: [
    { max: 450, parts: { cpu: 'Ryzen 5 5600G', mobo: 'A520', ram: '16GB DDR4', gpu: '', ssd: 'SSD 512GB NVMe', psu: '450W', case: 'Kuti mATX', cooler: '' } },
    { max: Infinity, parts: { cpu: 'Ryzen 5 8600G', mobo: 'B650', ram: '16GB DDR5', gpu: '', ssd: 'SSD 512GB NVMe', psu: '450W 80 Plus', case: 'Kuti mATX', cooler: '' } },
  ],
};

function presetFor(use, budget) {
  const list = PRESETS[use] || PRESETS.gaming;
  return (list.find((p) => budget <= p.max) || list[list.length - 1]).parts;
}

// Nivelet më të lira se ai i zgjedhur (nga më i afërti te më i liri) — përdoren kur totali e kalon buxhetin.
function presetTiers(use, budget) {
  const list = PRESETS[use] || PRESETS.gaming;
  let i = list.findIndex((p) => budget <= p.max);
  if (i < 0) i = list.length - 1;
  return list.slice(0, i).reverse().map((p) => p.parts);
}

// Zgjedh nga opsionet e secilës pjesë kombinimin më të mirë që hyn në buxhet.
// Buxheti është "i butë": nëse s'ka mënyrë tjetër, lejohet tejkalimi (kthen kombinimin më të lirë të arsyeshëm).
// options: { slot: [offer, ...] } (renditur sipas rekomandimit), locked: { slot: index } pjesët e zgjedhura me dorë.
function optimizeBuild(options, budget, locked = {}) {
  const slots = Object.keys(options).filter((k) => options[k] && options[k].length);
  const pick = {};
  for (const k of slots) pick[k] = locked[k] != null ? locked[k] : 0;
  const total = () => slots.reduce((s, k) => s + options[k][pick[k]].price, 0);
  const perfOf = (o) => { const p = findPerf(o.title); return p ? p.idx : null; };
  const socketOk = (cpuIdx, moboIdx) => {
    if (!options.cpu || !options.mobo) return true;
    const a = socketOf(options.cpu[cpuIdx].title, 'cpu'), b = socketOf(options.mobo[moboIdx].title, 'mobo');
    return !a || !b || a === b;
  };
  // "kosto" e uljes: sa pikë/performancë humbet për çdo euro të kursyer
  const lossOf = (k, from, to) => {
    let loss = Math.max(0.05, (from.score || 0) - (to.score || 0));
    const pf = perfOf(from), pt = perfOf(to);
    if (pf != null && pt != null && pt < pf) loss += (pf - pt) / 4; // GPU/CPU më e dobët kushton shumë
    if (k === 'gpu' || k === 'cpu') loss *= 1.5;
    return loss;
  };
  let guard = 200;
  while (total() > budget && guard--) {
    let bestMove = null;
    for (const k of slots) {
      if (locked[k] != null) continue;
      const cur = options[k][pick[k]];
      options[k].forEach((o, i) => {
        if (o.price >= cur.price) return;
        if (k === 'cpu' && !socketOk(i, pick.mobo || 0)) return;
        if (k === 'mobo' && !socketOk(pick.cpu || 0, i)) return;
        if (k === 'psu' && options.gpu) {
          const g = GPU_WATTS.find(([m]) => norm(options.gpu[pick.gpu || 0].title).replace(/\s+/g, ' ').includes(m));
          const need = ((g ? g[1] : 200) + 180) * 1.3, w = wattsOf(o.title);
          if (w && w < need) return;
        }
        const saving = cur.price - o.price;
        const ratio = saving / lossOf(k, cur, o);
        if (!bestMove || ratio > bestMove.ratio) bestMove = { k, i, ratio };
      });
    }
    if (!bestMove) break;
    pick[bestMove.k] = bestMove.i;
  }
  // nëse mbetet hapësirë, provo të përmirësosh GPU-në pastaj CPU-në brenda buxhetit
  for (const k of ['gpu', 'cpu']) {
    if (!options[k] || locked[k] != null) continue;
    const cur = options[k][pick[k]];
    const room = budget - total();
    const curP = perfOf(cur) || 0;
    let up = null;
    options[k].forEach((o, i) => {
      const p = perfOf(o) || 0;
      if (p > curP && o.price - cur.price <= room && (k !== 'cpu' || socketOk(i, pick.mobo || 0)) && (!up || p > up.p || (p === up.p && o.price < options[k][up.i].price))) up = { i, p };
    });
    if (up) pick[k] = up.i;
  }
  const t = total();
  return { pick, total: t, over: t > budget, overBy: Math.max(0, t - budget) };
}

const GPU_WATTS = [['5090', 575], ['4090', 450], ['5080', 360], ['4080', 320], ['7900 xtx', 355], ['7900 xt', 315], ['5070 ti', 300], ['9070 xt', 304], ['4070 ti', 285], ['9070', 220], ['5070', 250], ['4070', 220], ['7800 xt', 263], ['7700 xt', 245], ['5060 ti', 180], ['4060 ti', 165], ['5060', 145], ['4060', 115], ['7600', 165], ['3060', 170], ['3050', 130]];

function socketOf(title, kind) {
  const t = norm(title);
  if (kind === 'cpu') {
    if (/ryzen\s*\d\s*(7|8|9)\d{3}/.test(t) || /\b(7|8|9)\d{3}x3d\b/.test(t)) return 'AM5';
    if (/ryzen\s*\d\s*(3|5)\d{3}/.test(t) || /\b5\d{3}x3d\b/.test(t)) return 'AM4';
    if (/ultra\s*\d|2[0-9]{2}k\b|2[0-9]{2}f\b/.test(t)) return 'LGA1851';
    if (/i\d[\s-]*1[234]\d{3}/.test(t) || /\b1[234]\d{3}[kf]*\b/.test(t)) return 'LGA1700';
  }
  if (kind === 'mobo') {
    if (/\b(a620|b650|b650e|x670|x670e|b850|x870|x870e)\b/.test(t) || /am5/.test(t)) return 'AM5';
    if (/\b(a520|b450|b550|x570)\b/.test(t) || /am4/.test(t)) return 'AM4';
    if (/\b(z890|b860|h810)\b/.test(t) || /1851/.test(t)) return 'LGA1851';
    if (/\b(h610|b660|b760|z690|z790)\b/.test(t) || /1700/.test(t)) return 'LGA1700';
  }
  return null;
}
const ddrOf = (title) => { const m = norm(title).match(/ddr\s*([45])/); return m ? 'DDR' + m[1] : null; };
const wattsOf = (title) => { const m = norm(title).match(/(\d{3,4})\s*w\b/); return m ? +m[1] : null; };

function buildSummary(picks, budget, use) {
  const chosen = Object.entries(picks).filter(([, o]) => o);
  const total = chosen.reduce((s, [, o]) => s + o.price, 0);
  const byStore = {};
  for (const [, o] of chosen) {
    byStore[o.store] = byStore[o.store] || { store: o.store, n: 0, sum: 0 };
    byStore[o.store].n++;
    byStore[o.store].sum += o.price;
  }
  const checks = [];
  const cpu = picks.cpu, mobo = picks.mobo, ram = picks.ram, gpu = picks.gpu, psu = picks.psu;
  if (cpu && mobo) {
    const a = socketOf(cpu.title, 'cpu'), b = socketOf(mobo.title, 'mobo');
    if (a && b) checks.push({ ok: a === b, text: a === b ? `Socket ${a} — procesori dhe pllaka përputhen` : `Socket nuk përputhet: procesori ${a}, pllaka ${b}` });
    else checks.push({ ok: null, text: 'Socket-i nuk u njoh nga titulli — kontrollo manualisht' });
  }
  if (ram && mobo) {
    const r = ddrOf(ram.title), m = ddrOf(mobo.title) || (socketOf(mobo.title, 'mobo') === 'AM5' || socketOf(mobo.title, 'mobo') === 'LGA1851' ? 'DDR5' : socketOf(mobo.title, 'mobo') === 'AM4' ? 'DDR4' : null);
    if (r && m) checks.push({ ok: r === m, text: r === m ? `RAM ${r} mbështetet nga pllaka` : `RAM ${r} nuk përputhet me pllakën (${m})` });
  }
  let estW = 0;
  if (gpu) { const g = GPU_WATTS.find(([k]) => norm(gpu.title).replace(/\s+/g, ' ').includes(k)); estW += g ? g[1] : 200; }
  if (cpu) estW += /x3d|i9|ultra 9|9950|9900|14900|14700/.test(norm(cpu.title)) ? 150 : 100;
  estW += 80;
  if (psu) {
    const w = wattsOf(psu.title);
    if (w) checks.push({ ok: w >= estW * 1.3, text: w >= estW * 1.3 ? `PSU ${w}W mjafton (konsumi ~${estW}W)` : `PSU ${w}W mund të jetë i dobët (konsumi ~${estW}W, rekomandohet ≥${Math.ceil((estW * 1.4) / 50) * 50}W)` });
  }
  let perf = null;
  const g = gpu && findPerf(gpu.title), c = cpu && findPerf(cpu.title);
  if (g) {
    const cpuFactor = c ? Math.min(1, 0.75 + c.idx / 400) : 0.9;
    const p = g.idx * cpuFactor;
    const lvl = (x) => (x >= 85 ? 'Shkëlqyeshëm' : x >= 65 ? 'Shumë mirë' : x >= 45 ? 'Mirë' : x >= 30 ? 'Mesatar' : 'I dobët');
    const p1080 = Math.min(100, p * 2.1), p1440 = Math.min(100, p * 1.55), p4k = Math.min(100, p * 1.0);
    perf = [
      { label: 'Gaming 1080p', level: lvl(p1080), pct: Math.round(p1080) },
      { label: 'Gaming 1440p', level: lvl(p1440), pct: Math.round(p1440) },
      { label: 'Gaming 4K', level: lvl(p4k), pct: Math.round(p4k) },
    ];
  }
  return { total, budget, left: budget - total, pct: budget ? Math.round((total / budget) * 100) : 0, stores: Object.values(byStore).sort((a, b) => b.sum - a.sum), checks, perf, estWatts: estW };
}

module.exports = { analyze, relevance, detectCategory, detectIntent, classifyTitle, searchTerms, findPerf, SLOTS, presetFor, presetTiers, optimizeBuild, buildSummary, norm, fmt, CATEGORY_LABEL };
