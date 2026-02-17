import 'dotenv/config';
import { Telegraf, Markup, session } from 'telegraf';
import admin from 'firebase-admin';
import fs from 'node:fs';
import { z } from 'zod';

// --- optional fetch fallback for Node < 18 ---
// import nodeFetch from 'node-fetch';
const fetchFn = globalThis.fetch;

/* ========= ENV / CONFIG ========= */
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const FIREBASE_CREDENTIALS = process.env.FIREBASE_CREDENTIALS || './serviceAccountKey.json';
const ADMIN_USER_ID = Number(process.env.ADMIN_USER_ID || '0');
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '92f447e91c83252eedc95d323bf1b92a';

if (!BOT_TOKEN) throw new Error('BOT_TOKEN .env ichida ko\u2019rsatilmagan');
if (!IMGBB_API_KEY) throw new Error('IMGBB_API_KEY .env ichida ko\u2019rsatilmagan');

/* ========= FIREBASE ========= */
if (!admin.apps.length) {
  let cred;

  const raw = FIREBASE_CREDENTIALS.trim();

  if (raw.startsWith('{')) {
    // Railway — FIREBASE_CREDENTIALS ENV ichida JSON mavjud (to'g'ridan-to'g'ri yoki escape qilingan)
    try {
      cred = JSON.parse(raw);
    } catch {
      // Ba'zan Railway env qiymatida qo'shtirnoqlar escape qilingan bo'ladi
      try {
        cred = JSON.parse(JSON.parse(`"${raw.replace(/"/g, '\\"')}"`));
      } catch (e2) {
        throw new Error(`FIREBASE_CREDENTIALS JSON parse xatoligi: ${e2.message}`);
      }
    }
  } else if (raw.startsWith('"')) {
    // Qo'sh tirnoq ichida saqlangan JSON string bo'lishi mumkin
    try {
      const unquoted = JSON.parse(raw);
      cred = JSON.parse(unquoted);
    } catch (e) {
      throw new Error(`FIREBASE_CREDENTIALS (quoted) JSON parse xatoligi: ${e.message}`);
    }
  } else {
    // Faqat LOCAL uchun — fayl yo'li
    if (!fs.existsSync(raw)) {
      throw new Error(`Firebase credentials fayli topilmadi: ${raw}`);
    }
    try {
      cred = JSON.parse(fs.readFileSync(raw, 'utf-8'));
    } catch (e) {
      throw new Error(`serviceAccountKey.json o'qishda xatolik: ${e.message}`);
    }
  }

  // private_key ichidagi \\n ni \n ga almashtirish (Railway ko'pincha escape qilib yuboradi)
  if (cred.private_key && typeof cred.private_key === 'string') {
    cred.private_key = cred.private_key.replace(/\\n/g, '\n');
  }

  admin.initializeApp({
    credential: admin.credential.cert(cred)
  });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

/* ========= STATIC CATALOG ========= */
const CATALOG = [
  { id: 'listovye-materialy', title: '\u041b\u0438\u0441\u0442\u043e\u0432\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b', categories: [
    { id: 'pvh-yilong', title: '\u041f\u0412\u0425 \u0424\u043e\u0440\u043c\u0435\u043a\u0441' }, //1
    { id: 'orgsteklo-yilong', title: '\u041e\u0440\u0433\u0441\u0442\u0435\u043a\u043b\u043e YiLong' }, //2
    { id: 'pvc-yilong', title: 'PVC YiLong' }, //3
    { id: 'akril-jun-shang', title: '\u0410\u043a\u0440\u0438\u043b XT Xin Tao' }, //4
    { id: 'roumark-gravirovka', title: '\u0420\u043e\u0443\u043c\u0430\u0440\u043a (\u043f\u043b\u0430\u0441\u0442\u0438\u043a \u0434\u043b\u044f \u0433\u0440\u0430\u0432\u0438\u0440\u043e\u0432\u043a\u0438)' }, //5
    { id: 'alyukobond', title: '\u0410\u043b\u044e\u043a\u043e\u0431\u043e\u043d\u0434' }, //6
    { id: 'penokarton', title: '\u041f\u0435\u043d\u043e\u043a\u0430\u0440\u0442\u043e\u043d' }, //7
  ]},
  { id: 'rulonnye-materialy', title: '\u0420\u0443\u043b\u043e\u043d\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b', categories: [
    { id: 'banner-tkan', title: '\u0411\u0430\u043d\u043d\u0435\u0440\u043d\u0430\u044f \u0442\u043a\u0430\u043d\u044c' }, //1
    { id: 'cvetnaya-samokley-vinil', title: '\u0426\u0432\u0435\u0442\u043d\u0430\u044f \u0441\u0430\u043c\u043e\u043a\u043b\u0435\u044e\u0449\u0430\u044f\u0441\u044f \u0432\u0438\u043d\u0438\u043b\u043e\u0432\u0430\u044f \u043f\u043b\u0435\u043d\u043a\u0430' }, //2
    { id: 'montazhnye-plenki', title: '\u041c\u043e\u043d\u0442\u0430\u0436\u043d\u044b\u0435 \u043f\u043b\u0435\u043d\u043a\u0438' }, //3
    { id: 'vitrajnye-plenki', title: '\u0412\u0438\u0442\u0440\u0430\u0436\u043d\u044b\u0435 \u043f\u043b\u0435\u043d\u043a\u0438' }, //4
    { id: 'magnitnyj-vinil', title: '\u041c\u0430\u0433\u043d\u0438\u0442\u043d\u044b\u0439 \u0432\u0438\u043d\u0438\u043b' }, //5
    { id: 'beklit', title: '\u0411\u0435\u043a\u043b\u0438\u0442' }, //6
    { id: 'xolst', title: '\u0425\u043e\u043b\u0441\u0442' }, //7
    { id: 'tkan-dlya-sublimatsionoy-pechati', title: '\u0422\u043a\u0430\u043d\u044c \u0434\u043b\u044f \u0441\u0443\u0431\u043b\u0438\u043c\u0430\u0446\u0438\u043e\u043d\u043d\u043e\u0439 \u043f\u0435\u0447\u0430\u0442\u0438' }, //8
    { id: 'pechatniy-orakal', title: '\u041f\u0435\u0447\u0430\u0442\u043d\u0438\u0439 \u043e\u0440\u0430\u043a\u0430\u043b' }, //9
  ]},
  { id: 'istochniki-sveta', title: '\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0438 \u0441\u0432\u0435\u0442\u0430 (\u0441\u0432\u0435\u0442\u043e\u0434\u0438\u043e\u0434\u044b, \u043b\u0430\u043c\u043f\u044b \u0438 \u043f\u0440.)', categories: [
    { id: 'led-prozhektory', title: 'LED \u043f\u0440\u043e\u0436\u0435\u043a\u0442\u043e\u0440\u044b (\u0441\u043e\u0444\u0444\u0438\u0442\u044b)' }, //1
    { id: 'moduli-svetodiodnye', title: '\u041c\u043e\u0434\u0443\u043b\u0438 \u0441\u0432\u0435\u0442\u043e\u0434\u0438\u043e\u0434\u043d\u044b\u0435' }, //2
    { id: 'svetod-lenty', title: '\u0421\u0432\u0435\u0442\u043e\u0434\u0438\u043e\u0434\u043d\u044b\u0435 \u043b\u0435\u043d\u0442\u044b' }, //3
    { id: 'svetod-linejki-zhestkaya-osnova', title: '\u0421\u0432\u0435\u0442\u043e\u0434\u0438\u043e\u0434\u043d\u044b\u0435 \u043b\u0438\u043d\u0435\u0439\u043a\u0438 \u043d\u0430 \u0436\u0435\u0441\u0442\u043a\u043e\u0439 \u043e\u0441\u043d\u043e\u0432\u0435' }, //4
    { id: 'duralajt', title: '\u0414\u044e\u0440\u0430\u043b\u0430\u0439\u0442 \u0441\u0432\u0435\u0442\u043e\u0434\u0438\u043e\u0434\u043d\u044b\u0439' }, //5
    { id: 'svetilnik', title: '\u0421\u0432\u0435\u0442\u0438\u043b\u044c\u043d\u0438\u043a' }, //6
    { id: 'gibkij-neon', title: '\u0413\u0438\u0431\u043a\u0438\u0439 \u043d\u0435\u043e\u043d \u0441\u0432\u0435\u0442\u043e\u0434\u0438\u043e\u0434\u043d\u044b\u0439' }, //7
  ]},
  { id: 'transformatory-i-upravlenie', title: '\u0422\u0440\u0430\u043d\u0441\u0444\u043e\u0440\u043c\u0430\u0442\u043e\u0440\u044b \u0438 \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0438 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f', categories: [
    { id: 'transformatory-naruzh', title: '\u0422\u0440\u0430\u043d\u0441\u0444\u043e\u0440\u043c\u0430\u0442\u043e\u0440\u044b (\u043d\u0430\u0440\u0443\u0436\u043d\u044b\u0435)' }, //1
    { id: 'transformatory-vnutr', title: '\u0422\u0440\u0430\u043d\u0441\u0444\u043e\u0440\u043c\u0430\u0442\u043e\u0440\u044b (\u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0435)' }, //2
  ]},
  { id: 'chernila-kraski', title: '\u0427\u0435\u0440\u043d\u0438\u043b\u0430 (\u043a\u0440\u0430\u0441\u043a\u0438)', categories: [
    { id: 'solvent-kraski', title: '\u0421\u043e\u043b\u044c\u0432\u0435\u043d\u0442\u043d\u044b\u0435 \u043a\u0440\u0430\u0441\u043a\u0438' }, //1
    { id: 'ecosolvent-kraski', title: '\u042d\u043a\u043e\u0441\u043e\u043b\u044c\u0432\u0435\u043d\u0442\u043d\u044b\u0435 \u043a\u0440\u0430\u0441\u043a\u0438' }, //2
  ]},
  { id: 'reklamno-vystavochnoe', title: '\u0420\u0435\u043a\u043b\u0430\u043c\u043d\u043e\u0435 \u0438 \u0432\u044b\u0441\u0442\u0430\u0432\u043e\u0447\u043d\u043e\u0435 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435', categories: [
    { id: 'pop-up-stendy', title: '\u041f\u043e\u043f-\u0430\u043f \u0441\u0442\u0435\u043d\u0434\u044b (pop up, \u043f\u0440\u0435\u0441\u0441-\u0441\u0442\u0435\u043d\u044b)' }, //1
    { id: 'roll-up', title: '\u0420\u043e\u043b\u043b-\u0441\u0442\u0435\u043d\u0434\u044b roll up \u0438 \u043f\u0430\u0443\u0447\u043a\u0438' }, //2
    { id: 'flagchiki-flagi', title: '\u0424\u043b\u0430\u0436\u043e\u0447\u043a\u0438 (\u0444\u043b\u0430\u0433\u0438)' }, //3
    { id: 'promostoly', title: '\u041f\u0440\u043e\u043c\u043e\u0441\u0442\u043e\u043b\u044b, \u043f\u0440\u043e\u043c\u043e\u0441\u0442\u043e\u0439\u043a\u0438' }, //4
  ]},
  { id: 'alyuminievye-profily', title: '\u0410\u043b\u044e\u043c\u0438\u043d\u0438\u0435\u0432\u044b\u0435 \u043f\u0440\u043e\u0444\u0438\u043b\u044f \u0438 \u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442\u0443\u044e\u0449\u0438\u0435', categories: [
    { id: 'profil-dlya-lent', title: '\u0410\u043b\u044e\u043c\u0438\u043d\u0438\u0435\u0432\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c \u0434\u043b\u044f \u0441\u0432\u0435\u0442\u043e\u0434\u0438\u043e\u0434\u043d\u044b\u0445 \u043b\u0435\u043d\u0442' }, //1
  ]},
  { id: 'kleevye-resheniya', title: '\u041a\u043b\u0435\u0435\u0432\u044b\u0435 \u0440\u0435\u0448\u0435\u043d\u0438\u044f (\u0441\u043a\u043e\u0442\u0447, \u043a\u043b\u0435\u0439)', categories: [
    { id: 'skotch', title: '\u0414\u0432\u0443\u0441\u0442\u043e\u0440\u043e\u043d\u043d\u0438\u0439 \u043b\u0435\u043d\u0442\u044b (\u0441\u043a\u043e\u0442\u0447)' }, //1
    { id: 'klej', title: '\u041a\u043b\u0435\u0439' }, //2
  ]},
  { id: 'metal-i-plast-furnitura', title: '\u041c\u0435\u0442\u0430\u043b\u043b\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u0438 \u043f\u043b\u0430\u0441\u0442\u0438\u043a\u043e\u0432\u0430\u044f \u0444\u0443\u0440\u043d\u0438\u0442\u0443\u0440\u0430', categories: [
    { id: 'distantsionnye-derjateli-serebro', title: '\u0414\u0438\u0441\u0442\u0430\u043d\u0446\u0438\u043e\u043d\u043d\u044b\u0435 \u0434\u0435\u0440\u0436\u0430\u0442\u0435\u043b\u0438 (\u0441\u0435\u0440\u0435\u0431\u0440\u043e)' }, //1
  ]},
  { id: 'instrumenty', title: '\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b', categories: [
    { id: 'ruchnye-instrumenty', title: '\u0420\u0443\u0447\u043d\u044b\u0435 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b Hoji' }, //1
    { id: 'lezviya-dlya-nozhey', title: '\u041b\u0435\u0437\u0432\u0438\u044f \u0434\u043b\u044f \u043d\u043e\u0436\u0435\u0439' },//2
    { id: 'lyoversy-i-proboyniki', title: '\u041b\u044e\u0432\u0435\u0440\u0441\u044b \u0438 \u043f\u0440\u043e\u0431\u043e\u0439\u043d\u0438\u043a\u0438' },//3
    { id: 'rakeli', title: '\u0420\u0430\u043a\u0435\u043b\u0438' }, //4
  ]},
  { id: 'frezy-i-gravery', title: '\u0424\u0440\u0435\u0437\u044b \u0438 \u0433\u0440\u0430\u0432\u0435\u0440\u044b', categories: [
    { id: 'frezy', title: '\u0424\u0440\u0435\u0437\u044b' }, //1
    { id: 'gravery', title: '\u0413\u0440\u0430\u0432\u0435\u0440\u044b' }, //2
  ]},
];

/* ========= VALIDATION ========= */
const ProductSchema = z.object({
  title: z.string().min(1),
  image: z.string().regex(/^https?:\/\//, 'image must be http(s) url'),
  price: z.string().min(1),
  description: z.string().min(1),
  available: z.boolean().default(true),
  sectionId: z.string().min(1),
  categoryId: z.string().min(1),
  sizeId: z.string().optional(),
  createdAt: z.any().optional()
});
const BannerSchema = z.object({
  image: z.string().regex(/^https?:\/\//, 'image must be http(s) url'),
  sectionId: z.string().min(1),
  caption: z.string().optional()
});
const SizeSchema = z.object({
  name: z.string().min(1),
  size: z.string().min(1),
  image: z.string().regex(/^https?:\/\//, 'image must be http(s) url'),
  createdAt: z.any().optional()
});

/* ========= BOT / SESSION ========= */
const bot = new Telegraf(BOT_TOKEN);
bot.use(session({
  defaultSession: () => ({
    flow: undefined,
    state: undefined,
    product: undefined,
    banner: undefined,
    sizeDraft: undefined,
    selected: undefined,   // { sectionId, categoryId, mode?, sizeId?, docId?, catImage? }
    prefer: {}             // rejim eslab qolish
  })
}));
bot.catch((err) => console.error('Telegraf error:', err));

/* ========= HELPERS ========= */
const isAdmin = (ctx) => (ADMIN_USER_ID === 0) || ((ctx.from?.id ?? 0) === ADMIN_USER_ID);

// imgbb upload helper (by external URL or base64 if needed)
async function uploadToImgbbByUrl(imageUrl, name = 'tg_image') {
  const body = new URLSearchParams();
  body.append('image', imageUrl);      // imgbb URL-ni qabul qiladi
  body.append('name', name);

  const res = await fetchFn(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) {
    const t = await res.text().catch(()=> '');
    throw new Error(`imgbb http ${res.status}: ${t}`);
  }
  const json = await res.json();
  if (!json?.success) {
    const msg = json?.error?.message || 'imgbb upload failed';
    throw new Error(msg);
  }
  // display_url odatda hotlink uchun qulay
  return json.data?.display_url || json.data?.url || imageUrl;
}

async function getTelegramFileUrl(ctx, fileId) {
  const link = await ctx.telegram.getFileLink(fileId);
  return String(link);
}

const mainMenu = () => Markup.keyboard([
  ['\uD83D\uDED2 Product qo\u2019shish', '\uD83D\uDDBC Banner qo\u2019shish']
]).resize();

const previewProductCaption = (p) =>
  `\uD83E\uDDFE <b>Oldindan ko\u2019rish</b>\n\n` +
  `<b>Nomi:</b> ${p.title}\n` +
  `<b>Narxi:</b> ${p.price}\n` +
  `<b>Status:</b> ${p.available ? '\u2705 Bor' : '\u274C Qolmagan'}\n` +
  `<b>Tavsif:</b> ${p.description}`;

const productCardCaption = (p, secTitle = '', catTitle = '', szLabel = '') =>
  `\uD83D\uDCE6 <b>${p.title}</b>\n` +
  `${secTitle && catTitle ? `<i>${secTitle} \u2192 ${catTitle}${szLabel ? ` \u2192 ${szLabel}`:''}</i>\n` : ''}` +
  `<b>Narx:</b> ${p.price}\n` +
  `<b>Status:</b> ${p.available ? '\u2705 Bor' : '\u274C Qolmagan'}\n\n` +
  `${p.description || ''}`;

const actionKbFor = (available) => Markup.inlineKeyboard([
  [
    available
      ? Markup.button.callback('\u2757\uFE0F Qolmagan', 'prod:toggle')
      : Markup.button.callback('\u267B\uFE0F Mavjud qilsin', 'prod:toggle')
  ],
  [Markup.button.callback('\uD83D\uDDD1\uFE0F O\u2019chirish', 'prod:delete')],
  [Markup.button.callback('\u2B05\uFE0F Orqaga', 'back:items')]
]);

/* Firestore paths */
const sectionsRef = () => db.collection('products');
const categoriesRef = (sectionId) => sectionsRef().doc(sectionId).collection('categories');
const itemsRefCat = (sectionId, categoryId) => categoriesRef(sectionId).doc(categoryId).collection('items');
const sizesRef = (sectionId, categoryId) => categoriesRef(sectionId).doc(categoryId).collection('sizes');
const itemsRefSize = (sectionId, categoryId, sizeId) => sizesRef(sectionId, categoryId).doc(sizeId).collection('items');

/* UI builders */
function sectionsKb(sections) {
  return Markup.inlineKeyboard(sections.map(s => [Markup.button.callback(s.title, `sec:${s.id}`)]));
}
function categoriesKb(sectionId, categories) {
  const rows = categories.map(c => [Markup.button.callback(c.title, `cat:${sectionId}:${c.id}`)]);
  rows.push([Markup.button.callback('\u2B05\uFE0F Orqaga (bo\u2019limlar)', 'back:sections')]);
  return Markup.inlineKeyboard(rows);
}
function itemsKb(sectionId, categoryId, items) {
  const rows = items.map(i => {
    const mark = i.available ? '\u2705' : '\u274C';
    return [Markup.button.callback(`${mark} ${i.title}`, `pv:${i.id}`)];
  });
  rows.push([Markup.button.callback('\u2795 Yangi tovar', 'padd')]);
  rows.push([Markup.button.callback('\u2B05\uFE0F Orqaga (kategoriyalar)', 'back:cats')]);
  return Markup.inlineKeyboard(rows);
}
function sizeViewFullKb(sectionId, categoryId, sizeId, items) {
  const rows = items.map(i => {
    const mark = i.available ? '\u2705' : '\u274C';
    return [Markup.button.callback(`${mark} ${i.title}`, `pv2:${i.id}`)];
  });
  rows.push([Markup.button.callback('\u2795 Product qo\u2019shish', 'padd')]);
  rows.push([Markup.button.callback('\uD83D\uDDD1\uFE0F O\u2019lchamni o\u2019chirish', 'szdel')]);
  rows.push([Markup.button.callback('\u2B05\uFE0F Orqaga (o\u2019lchamlar)', 'back:sz')]);
  return Markup.inlineKeyboard(rows);
}
function sizesKb(sectionId, categoryId, sizes) {
  const rows = sizes.map(s => [Markup.button.callback(`${s.name} \u2014 ${s.size}`, `szv:${s.id}`)]);
  rows.push([Markup.button.callback('\u2795 O\u2019lcham qo\u2019shish', 'szadd')]);
  rows.push([Markup.button.callback('\u2B05\uFE0F Orqaga (kategoriyalar)', 'back:cats')]);
  return Markup.inlineKeyboard(rows);
}

/* ========= DATA ========= */
async function seedCatalogIfNeeded() {
  const metaRef = db.collection('meta').doc('catalogSeed_productsTree_v4');
  const meta = await metaRef.get();
  const seedVersion = 4;

  if (!(meta.exists && meta.data()?.version === seedVersion)) {
    for (let i = 0; i < CATALOG.length; i++) {
      const s = CATALOG[i];
      await sectionsRef().doc(s.id).set({ title: s.title, order: i + 1 }, { merge: true });
      for (let j = 0; j < s.categories.length; j++) {
        const c = s.categories[j];
        await categoriesRef(s.id).doc(c.id).set({ title: c.title, order: j + 1 }, { merge: true });
      }
    }
    await metaRef.set({ version: seedVersion, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }
}
async function fetchSections() {
  const snap = await sectionsRef().orderBy('order').get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data()) }));
}
async function fetchCategories(sectionId) {
  const snap = await categoriesRef(sectionId).orderBy('order').get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data()) }));
}
async function fetchItemsCat(sectionId, categoryId, limit = 30) {
  const snap = await itemsRefCat(sectionId, categoryId).limit(limit).get();
  const list = snap.docs.map(d => ({ id: d.id, ...(d.data()) }));
  list.sort((a,b) => (a.title||'').localeCompare((b.title||''), 'ru'));
  return list;
}
async function fetchItemsSize(sectionId, categoryId, sizeId, limit = 50) {
  const snap = await itemsRefSize(sectionId, categoryId, sizeId).limit(limit).get();
  const list = snap.docs.map(d => ({ id: d.id, ...(d.data()) }));
  list.sort((a,b) => (a.title||'').localeCompare((b.title||''), 'ru'));
  return list;
}
async function fetchSizes(sectionId, categoryId, limit = 50) {
  const snap = await sizesRef(sectionId, categoryId).limit(limit).get();
  const list = snap.docs.map(d => ({ id: d.id, ...(d.data()) }));
  list.sort((a,b) => (a.name||'').localeCompare((b.name||''), 'ru'));
  return list;
}
async function getTitles(sectionId, categoryId, sizeId) {
  const sDoc = await sectionsRef().doc(sectionId).get();
  const cDoc = await categoriesRef(sectionId).doc(categoryId).get();
  let szLabel = '';
  if (sizeId) {
    const zDoc = await sizesRef(sectionId, categoryId).doc(sizeId).get();
    const z = zDoc.data();
    if (z) szLabel = `${z.name} \u2014 ${z.size}`;
  }
  return {
    sectionTitle: sDoc.data()?.title || sectionId,
    categoryTitle: cDoc.data()?.title || categoryId,
    sizeLabel: szLabel
  };
}

/* ========= STATES ========= */
const S_TITLE = 'S_TITLE';
const S_IMAGE = 'S_IMAGE';
const S_PRICE = 'S_PRICE';
const S_DESC  = 'S_DESC';
const S_PREVIEW = 'S_PREVIEW';

const B_IMAGE = 'B_IMAGE';
const B_SECTION = 'B_SECTION';
const B_CAPTION = 'B_CAPTION';

const CAT_IMAGE = 'CAT_IMAGE';
const SZ_NAME = 'SZ_NAME';
const SZ_SIZE = 'SZ_SIZE';

/* ========= PREFER HELPERS ========= */
function getPref(ctx, sectionId, categoryId) {
  return ctx.session?.prefer?.[sectionId]?.[categoryId];
}
function setPref(ctx, sectionId, categoryId, mode) {
  ctx.session.prefer ??= {};
  ctx.session.prefer[sectionId] ??= {};
  ctx.session.prefer[sectionId][categoryId] = mode; // 'prod' | 'size'
}

/* ========= COMMANDS ========= */
bot.start(async (ctx) => {
  await ctx.reply('Salom! \uD83D\uDC4B', mainMenu());
});
bot.command('cancel', async (ctx) => {
  ctx.session = { flow: undefined, state: undefined, product: undefined, banner: undefined, sizeDraft: undefined, selected: undefined, prefer: {} };
  await ctx.reply('Bekor qilindi.', mainMenu());
});

/* ========= TEXT HANDLER ========= */
bot.on('text', async (ctx, next) => {
  if (!isAdmin(ctx)) return ctx.reply('Sizda ruxsat yo\u2019q.');
  ctx.session ??= { flow: undefined, state: undefined, product: undefined, banner: undefined, sizeDraft: undefined, selected: undefined, prefer: {} };
  const txt = (ctx.message?.text || '').trim();

  if (txt === '\uD83D\uDED2 Product qo\u2019shish') {
    ctx.session = { flow: 'product', state: undefined, product: undefined, banner: undefined, sizeDraft: undefined, selected: undefined, prefer: ctx.session.prefer || {} };
    const sections = await fetchSections();
    return ctx.reply('Bo\u2019limni tanlang:', sectionsKb(sections));
  }
  if (txt === '\uD83D\uDDBC Banner qo\u2019shish') {
    ctx.session = { flow: 'banner', state: B_IMAGE, product: undefined, banner: {}, sizeDraft: undefined, selected: undefined, prefer: ctx.session.prefer || {} };
    return ctx.reply('Banner uchun rasm yuboring (foto yoki http/https URL).');
  }

  // Banner URL (URL bo'lsa — to'g'ridan saqlaymiz)
  if (ctx.session.flow === 'banner' && ctx.session.state === B_IMAGE) {
    if (!/^https?:\/\//.test(txt)) return ctx.reply('Iltimos, to\u2019g\u2019ri rasm URL (http/https) kiriting yoki foto yuboring.');
    ctx.session.banner.image = txt;
    ctx.session.state = B_SECTION;
    const sections = await fetchSections();
    return ctx.reply('Banner qaysi bo\u2019limga tegishli?', sectionsKb(sections));
  }

  // Banner caption
  if (ctx.session.flow === 'banner' && ctx.session.state === B_CAPTION) {
    const caption = (txt === '-' ? undefined : txt);
    const parsed = BannerSchema.safeParse({
      image: ctx.session.banner?.image,
      sectionId: ctx.session.banner?.sectionId,
      caption
    });
    if (!parsed.success) return ctx.reply('❌ Banner ma\u02bclumotlari to\u2019liq emas. /start dan qayta boshlang.');
    try {
      await db.collection('banners').add({
        image: parsed.data.image,
        sectionId: parsed.data.sectionId,
        caption: parsed.data.caption || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      await ctx.reply('\u2705 Banner saqlandi!', mainMenu());
    } catch (e) {
      console.error('Banner save error:', e);
      await ctx.reply(`❌ Saqlashda xatolik: ${String(e)}`);
    } finally {
      ctx.session = { flow: undefined, state: undefined, product: undefined, banner: undefined, sizeDraft: undefined, selected: undefined, prefer: ctx.session.prefer || {} };
    }
    return;
  }

  // Category image text URL (URL bo'lsa — to'g'ridan saqlaymiz)
  if (ctx.session.flow === 'product' && ctx.session.state === CAT_IMAGE) {
    if (!/^https?:\/\//.test(txt)) return ctx.reply('Kategoriya uchun to\u2019g\u2019ri rasm URL kiriting (http/https) yoki foto yuboring.');
    const { sectionId, categoryId } = ctx.session.selected || {};
    await categoriesRef(sectionId).doc(categoryId).set({ image: txt }, { merge: true });
    ctx.session.selected.catImage = txt;
    ctx.session.state = undefined;
    return routeAfterCategorySelection(ctx); // auto
  }

  // Size add flow
  if (ctx.session.flow === 'product' && ctx.session.state === SZ_NAME) {
    ctx.session.sizeDraft = { name: txt };
    ctx.session.state = SZ_SIZE;
    return ctx.reply('O\u2019lchamni kiriting (masalan: 1,22\u043c \u0445 2,44\u043c):');
  }
  if (ctx.session.flow === 'product' && ctx.session.state === SZ_SIZE) {
    const { sectionId, categoryId, catImage } = ctx.session.selected || {};
    const draft = { name: ctx.session.sizeDraft?.name || '', size: txt, image: catImage || '' };
    const parsed = SizeSchema.safeParse(draft);
    if (!parsed.success) {
      ctx.session.sizeDraft = undefined; ctx.session.state = undefined;
      return ctx.reply('❌ O\u2019lcham ma\u02bclumotlari noto\u2019g\u2019ri. /start dan qayta urinib ko\u2019ring.');
    }
    await sizesRef(sectionId, categoryId).add({ ...parsed.data, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    ctx.session.sizeDraft = undefined; ctx.session.state = undefined;
    return renderSizeList(ctx);
  }

  // Product form (URL bo'lsa shu yerda qabul qilinadi; RASM bo'lsa photo handler ushlaydi)
  if (ctx.session.flow === 'product') {
    switch (ctx.session.state) {
      case S_TITLE:
        ctx.session.product = { ...(ctx.session.product||{}), title: txt };
        ctx.session.state = S_IMAGE;
        return ctx.reply('2/4 \u2014 Rasm yuboring (foto yoki http/https URL).');
      case S_IMAGE:
        if (!/^https?:\/\//.test(txt)) {
          return ctx.reply('Rasm uchun http/https URL kiriting yoki oddiy rasmni foto sifatida yuboring.');
        }
        ctx.session.product.image = txt;
        ctx.session.state = S_PRICE;
        return ctx.reply(`3/4 \u2014 Narxni yuboring (masalan: "2 500 so'm"):`);
      case S_PRICE:
        ctx.session.product.price = txt;
        ctx.session.state = S_DESC;
        return ctx.reply('4/4 \u2014 Tavsif (description) yuboring:');
      case S_DESC: {
        ctx.session.product.description = txt;
        const { sectionId, categoryId, mode, sizeId } = ctx.session.selected || {};
        const draft = {
          ...ctx.session.product,
          sectionId, categoryId,
          sizeId: mode === 'size' ? sizeId : undefined,
          available: true
        };
        const parsed = ProductSchema.safeParse(draft);
        if (!parsed.success) {
          const msg = parsed.error.errors.map(e => `\u2022 ${e.path.join('.')}: ${e.message}`).join('\n');
          ctx.session.state = undefined; ctx.session.product = undefined;
          return ctx.reply(`❌ Ma'lumot xato:\n${msg}\n\nQayta boshlash uchun /start bosing.`);
        }
        ctx.session.state = S_PREVIEW;
        try {
          await ctx.replyWithPhoto({ url: draft.image }, {
            caption: previewProductCaption(draft),
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('\u2705 Saqlash', 'save'), Markup.button.callback('❌ Bekor qilish', 'discard')]
            ])
          });
        } catch {
          await ctx.reply(`\u26A0\uFE0F Rasmni yuborib bo\u2019lmadi.\n\n${previewProductCaption(draft)}`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('\u2705 Saqlash', 'save'), Markup.button.callback('❌ Bekor qilish', 'discard')]
            ])
          });
        }
        return;
      }
      default: break;
    }
  }

  return next();
});

/* ========= PHOTO HANDLERS ========= */
bot.on('photo', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('Sizda ruxsat yo\u2019q.');

  // Banner photo => imgbb ga yuklab, display_url ni saqlash
  if (ctx.session.flow === 'banner' && ctx.session.state === B_IMAGE) {
    try {
      const best = ctx.message.photo.at(-1);
      const tgFileUrl = await getTelegramFileUrl(ctx, best.file_id);
      const imgbbUrl = await uploadToImgbbByUrl(tgFileUrl, `banner_${best.file_unique_id || Date.now()}`);
      ctx.session.banner.image = imgbbUrl;
      ctx.session.state = B_SECTION;
      const sections = await fetchSections();
      return ctx.reply('Banner qaysi bo\u2019limga tegishli?', sectionsKb(sections));
    } catch (e) {
      console.error('Banner photo upload error:', e);
      return ctx.reply('Rasmni yuklashda xatolik. Boshqa foto yuboring yoki URL kiriting.');
    }
  }

  // Category image photo => imgbb ga yuklab, kategoriyaga yozish
  if (ctx.session.flow === 'product' && ctx.session.state === CAT_IMAGE) {
    try {
      const best = ctx.message.photo.at(-1);
      const tgFileUrl = await getTelegramFileUrl(ctx, best.file_id);
      const imgbbUrl = await uploadToImgbbByUrl(tgFileUrl, `category_${best.file_unique_id || Date.now()}`);
      const { sectionId, categoryId } = ctx.session.selected || {};
      await categoriesRef(sectionId).doc(categoryId).set({ image: imgbbUrl }, { merge: true });
      ctx.session.selected.catImage = imgbbUrl;
      ctx.session.state = undefined;
      return routeAfterCategorySelection(ctx);
    } catch (e) {
      console.error('Category photo upload error:', e);
      return ctx.reply('Rasmni yuklashda xatolik. Boshqa foto yuboring yoki URL kiriting.');
    }
  }

  // Product form — S_IMAGE holatida foto yuborilsa => imgbb ga yuklab, product.image = display_url
  if (ctx.session.flow === 'product' && ctx.session.state === S_IMAGE) {
    try {
      const best = ctx.message.photo.at(-1);
      const tgFileUrl = await getTelegramFileUrl(ctx, best.file_id);
      const imgbbUrl = await uploadToImgbbByUrl(tgFileUrl, `product_${best.file_unique_id || Date.now()}`);
      ctx.session.product = { ...(ctx.session.product || {}), image: imgbbUrl };
      ctx.session.state = S_PRICE;
      return ctx.reply('3/4 \u2014 Narxni yuboring (masalan: "\u043e\u0442 2 500 \u20B8" yoki "2500 \u20B8"):');
    } catch (e) {
      console.error('Product photo upload error:', e);
      return ctx.reply('Rasmni yuklashda xatolik. Boshqa foto yuboring yoki URL kiriting.');
    }
  }
});

/* ========= NAVIGATION ========= */
bot.action('back:sections', async (ctx) => {
  await ctx.answerCbQuery();
  const sections = await fetchSections();
  await ctx.editMessageText('Bo\u2019limni tanlang:', sectionsKb(sections));
});
bot.action('back:cats', async (ctx) => {
  await ctx.answerCbQuery();
  const sectionId = ctx.session.selected?.sectionId;
  if (!sectionId) return;
  const cats = await fetchCategories(sectionId);
  await ctx.editMessageText('Kategoriyani tanlang:', categoriesKb(sectionId, cats));
});
bot.action('back:sz', async (ctx) => {
  await ctx.answerCbQuery();
  return renderSizeList(ctx, true);
});
bot.action('back:items', async (ctx) => {
  await ctx.answerCbQuery();
  const { mode } = ctx.session.selected || {};
  if (mode === 'size') return renderSizeView(ctx, true);
  return renderCategoryItems(ctx, true);
});

/* Select section */
bot.action(/^sec:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const sectionId = ctx.match[1];
  if (ctx.session.flow === 'product') {
    const cats = await fetchCategories(sectionId);
    ctx.session.selected = { sectionId, categoryId: undefined, mode: undefined, sizeId: undefined, catImage: undefined };
    return ctx.editMessageText('Kategoriyani tanlang:', categoriesKb(sectionId, cats));
  }
  if (ctx.session.flow === 'banner' && ctx.session.state === B_SECTION) {
    ctx.session.banner.sectionId = sectionId;
    ctx.session.state = B_CAPTION;
    return ctx.editMessageText('Banner uchun sarlavha (ixtiyoriy). O\u2019tkazish uchun "-" yozing.');
  }
});

/* Ensure category image, then auto-route */
async function ensureCategoryImageOrAsk(ctx, sectionId, categoryId) {
  const cDoc = await categoriesRef(sectionId).doc(categoryId).get();
  const image = cDoc.data()?.image;
  if (image) {
    ctx.session.selected.catImage = image;
    return true;
  }
  ctx.session.state = CAT_IMAGE;
  await ctx.editMessageText('Ushbu kategoriya uchun rasm yuboring (foto \u2014 imgbb ga avtomatik yuklanadi, yoki http/https URL kiriting).');
  return false;
}

/* Router (prefer → auto open) */
async function routeAfterCategorySelection(ctx, { forceMode } = {}) {
  const { sectionId, categoryId } = ctx.session.selected || {};
  if (!sectionId || !categoryId) return;

  const prefer = forceMode || getPref(ctx, sectionId, categoryId);
  if (prefer === 'prod') {
    ctx.session.selected.mode = 'prod';
    return renderCategoryItems(ctx, true);
  }
  if (prefer === 'size') {
    ctx.session.selected.mode = 'size';
    return renderSizeList(ctx, true);
  }

  const [sizesSnap, itemsSnap] = await Promise.all([
    sizesRef(sectionId, categoryId).limit(1).get(),
    itemsRefCat(sectionId, categoryId).limit(1).get()
  ]);
  const hasSizes = !sizesSnap.empty;
  const hasItems = !itemsSnap.empty;

  if (hasItems) {
    ctx.session.selected.mode = 'prod';
    return renderCategoryItems(ctx, true);
  }
  if (hasSizes) {
    ctx.session.selected.mode = 'size';
    return renderSizeList(ctx, true);
  }

  ctx.session.selected.mode = undefined;
  return ctx.reply(
    'Rejimni tanlang:',
    Markup.inlineKeyboard([
      [Markup.button.callback('\uD83E\uDDE9 Mahsulot kiritish', 'md:p')],
      [Markup.button.callback('\uD83D\uDCCF O\u2019lchamlar bilan', 'md:s')],
      [Markup.button.callback('\u2B05\uFE0F Orqaga (kategoriyalar)', 'back:cats')]
    ])
  );
}

bot.action(/^cat:([^:]+):([^:]+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const sectionId = ctx.match[1];
  const categoryId = ctx.match[2];
  ctx.session.selected = { sectionId, categoryId, mode: undefined, sizeId: undefined, catImage: undefined };
  const ok = await ensureCategoryImageOrAsk(ctx, sectionId, categoryId);
  if (!ok) return;
  await routeAfterCategorySelection(ctx);
});

/* Manual mode choose (sessiyada saqlaymiz) */
bot.action('md:p', async (ctx) => {
  await ctx.answerCbQuery();
  const { sectionId, categoryId } = ctx.session.selected || {};
  setPref(ctx, sectionId, categoryId, 'prod');
  ctx.session.selected.mode = 'prod';
  return renderCategoryItems(ctx, true);
});
bot.action('md:s', async (ctx) => {
  await ctx.answerCbQuery();
  const { sectionId, categoryId } = ctx.session.selected || {};
  setPref(ctx, sectionId, categoryId, 'size');
  ctx.session.selected.mode = 'size';
  return renderSizeList(ctx, true);
});

/* ======= Render helpers ======= */
async function renderCategoryItems(ctx, edit = false) {
  const { sectionId, categoryId } = ctx.session.selected || {};
  const list = await fetchItemsCat(sectionId, categoryId, 30);
  const kb = itemsKb(sectionId, categoryId, list);
  if (edit) {
    try { await ctx.editMessageText('Mahsulotlar (tanlang) yoki yangi tovar qo\u2019shing:', kb); return; } catch {}
  }
  await ctx.reply('Mahsulotlar (tanlang) yoki yangi tovar qo\u2019shing:', kb);
}

async function renderSizeList(ctx, edit = false) {
  const { sectionId, categoryId } = ctx.session.selected || {};
  const list = await fetchSizes(sectionId, categoryId, 50);
  const kb = sizesKb(sectionId, categoryId, list);
  if (edit) {
    try { await ctx.editMessageText('O\u2019lchamlar ro\u2019yxati:', kb); return; } catch {}
  }
  await ctx.reply('O\u2019lchamlar ro\u2019yxati:', kb);
}

async function renderSizeView(ctx, editHeader = false) {
  const { sectionId, categoryId, sizeId } = ctx.session.selected || {};
  const zDoc = await sizesRef(sectionId, categoryId).doc(sizeId).get();
  if (!zDoc.exists) return renderSizeList(ctx, true);
  const z = zDoc.data();
  const caption = `\uD83D\uDCCF <b>${z.name}</b>\n<b>O\u2019lcham:</b> ${z.size}\n`;
  const items = await fetchItemsSize(sectionId, categoryId, sizeId, 50);
  const kb = sizeViewFullKb(sectionId, categoryId, sizeId, items);

  if (editHeader) {
    try { await ctx.editMessageText(' ').catch(()=>{}); } catch {}
  }
  try {
    await ctx.replyWithPhoto({ url: z.image }, { caption, parse_mode: 'HTML', ...kb });
  } catch {
    await ctx.reply(caption, { parse_mode: 'HTML', ...kb });
  }
}

/* ======= Sizes ======= */
bot.action('szadd', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.state = SZ_NAME;
  ctx.session.sizeDraft = {};
  await ctx.reply('O\u2019lcham nomini kiriting (masalan: \u041f\u0412\u0425 \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u043d\u043e\u0439 \u043f\u043b\u043e\u0442\u043d\u043e\u0441\u0442\u0438 0,50):');
});

bot.action(/^szv:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const sizeId = ctx.match[1];
  const { sectionId, categoryId } = ctx.session.selected || {};
  if (!sectionId || !categoryId) return ctx.reply('❌ Kontekst yo\u2019q. /start');
  ctx.session.selected.sizeId = sizeId;
  ctx.session.selected.mode = 'size';
  return renderSizeView(ctx, true);
});

bot.action('szdel', async (ctx) => {
  await ctx.answerCbQuery();
  const { sectionId, categoryId, sizeId } = ctx.session.selected || {};
  if (!sectionId || !categoryId || !sizeId) return ctx.reply('❌ Kontekst yo\u2019q. /start');
  try {
    const snap = await itemsRefSize(sectionId, categoryId, sizeId).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    await sizesRef(sectionId, categoryId).doc(sizeId).delete();
    await ctx.reply('\uD83D\uDDD1\uFE0F O\u2019lcham o\u2019chirildi.');
  } catch (e) {
    console.error('Size delete error:', e);
    await ctx.reply(`❌ O\u2019lchamni o\u2019chirishda xatolik: ${String(e)}`);
  }
  return renderSizeList(ctx);
});

/* ======= Items (category) ======= */
bot.action(/^pv:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const docId = ctx.match[1];
  const { sectionId, categoryId } = ctx.session.selected || {};
  if (!sectionId || !categoryId) return ctx.reply('❌ Kontekst yo\u2019q. /start');
  ctx.session.selected.docId = docId;
  ctx.session.selected.mode = 'prod';

  const d = await itemsRefCat(sectionId, categoryId).doc(docId).get();
  if (!d.exists) return ctx.reply('❌ Mahsulot topilmadi.');
  const data = d.data();
  const { sectionTitle, categoryTitle } = await getTitles(sectionId, categoryId);

  try { await ctx.editMessageText(' '); } catch {}
  try {
    await ctx.replyWithPhoto({ url: data.image }, {
      caption: productCardCaption(data, sectionTitle, categoryTitle),
      parse_mode: 'HTML',
      ...actionKbFor(!!data.available)
    });
  } catch {
    await ctx.reply(productCardCaption(data, sectionTitle, categoryTitle), { parse_mode: 'HTML', ...actionKbFor(!!data.available) });
  }
});

/* ======= Items (size) ======= */
bot.action(/^pv2:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const docId = ctx.match[1];
  const { sectionId, categoryId, sizeId } = ctx.session.selected || {};
  if (!sectionId || !categoryId || !sizeId) return ctx.reply('❌ Kontekst yo\u2019q. /start');

  ctx.session.selected.docId = docId;
  ctx.session.selected.mode = 'size';

  const d = await itemsRefSize(sectionId, categoryId, sizeId).doc(docId).get();
  if (!d.exists) return ctx.reply('❌ Mahsulot topilmadi.');
  const data = d.data();
  const { sectionTitle, categoryTitle, sizeLabel } = await getTitles(sectionId, categoryId, sizeId);

  try { await ctx.editMessageText(' '); } catch {}
  try {
    await ctx.replyWithPhoto({ url: data.image }, {
      caption: productCardCaption(data, sectionTitle, categoryTitle, sizeLabel),
      parse_mode: 'HTML',
      ...actionKbFor(!!data.available)
    });
  } catch {
    await ctx.reply(productCardCaption(data, sectionTitle, categoryTitle, sizeLabel), { parse_mode: 'HTML', ...actionKbFor(!!data.available) });
  }
});

/* ======= Add product (both modes) ======= */
bot.action('padd', async (ctx) => {
  await ctx.answerCbQuery();
  const { sectionId, categoryId, mode, sizeId } = ctx.session.selected || {};
  if (!sectionId || !categoryId) return ctx.reply('❌ Avval kategoriya tanlang.');
  if (mode === 'size' && !sizeId) return ctx.reply('❌ Avval o\u2019lchamni tanlang.');

  ctx.session.flow = 'product';
  ctx.session.product = {};
  ctx.session.state = S_TITLE;
  await ctx.reply('1/4 \u2014 Tovar nomini yuboring (title):');
});

/* ======= SAVE / DISCARD product ======= */
bot.action('save', async (ctx) => {
  await ctx.answerCbQuery();

  const { sectionId, categoryId, mode, sizeId } = ctx.session.selected || {};
  const base = ctx.session.product || {};
  const draft = {
    title: base.title,
    image: base.image,
    price: base.price,
    description: base.description,
    available: true,
    sectionId, categoryId,
    sizeId: mode === 'size' ? sizeId : undefined,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const parsed = ProductSchema.safeParse(draft);
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => `\u2022 ${e.path.join('.')}: ${e.message}`).join('\n');
    try { await ctx.editMessageCaption({ caption: `❌ Validatsiya xatosi:\n${msg}`, parse_mode: 'HTML' }); } catch {}
    return;
  }

  try {
    let ref;
    if (mode === 'size') {
      ref = await itemsRefSize(sectionId, categoryId, sizeId).add(parsed.data);
    } else {
      ref = await itemsRefCat(sectionId, categoryId).add(parsed.data);
    }
    console.log('Product saved:', ref.id, 'mode=', mode);

    try { await ctx.editMessageCaption({ caption: `\u2705 Saqlandi!`, parse_mode: 'HTML' }); } catch {}
  } catch (e) {
    console.error('Product save error:', e);
    try { await ctx.editMessageCaption({ caption: `❌ Saqlashda xatolik: ${String(e)}`, parse_mode: 'HTML' }); } catch {}
    return;
  } finally {
    ctx.session.state = undefined;
    ctx.session.product = undefined;
  }

  setPref(ctx, sectionId, categoryId, mode === 'size' ? 'size' : 'prod');
  if (mode === 'size') return renderSizeView(ctx);
  return renderCategoryItems(ctx);
});

bot.action('discard', async (ctx) => {
  await ctx.answerCbQuery();
  try { await ctx.editMessageCaption({ caption: '\uD83D\uDDD1\uFE0F Bekor qilindi.', parse_mode: 'HTML' }); } catch {}
  ctx.session.state = undefined;
  ctx.session.product = undefined;

  const { mode } = ctx.session.selected || {};
  if (mode === 'size') return renderSizeView(ctx);
  return renderCategoryItems(ctx);
});

/* ======= PRODUCT ACTIONS (delete/toggle) ======= */
bot.action('prod:delete', async (ctx) => {
  await ctx.answerCbQuery();
  const { sectionId, categoryId, docId, mode, sizeId } = ctx.session.selected || {};
  if (!sectionId || !categoryId || !docId) return ctx.reply('❌ Kontekst yo\u2019q. /start');
  try {
    if (mode === 'size' && sizeId) await itemsRefSize(sectionId, categoryId, sizeId).doc(docId).delete();
    else await itemsRefCat(sectionId, categoryId).doc(docId).delete();
  } catch (e) {
    console.error('Delete error:', e);
    await ctx.reply(`❌ O\u2019chirishda xatolik: ${String(e)}`);
  }
  if (mode === 'size') return renderSizeView(ctx, true);
  return renderCategoryItems(ctx, true);
});

bot.action('prod:toggle', async (ctx) => {
  await ctx.answerCbQuery();
  const { sectionId, categoryId, docId, mode, sizeId } = ctx.session.selected || {};
  if (!sectionId || !categoryId || !docId) return ctx.reply('❌ Kontekst yo\u2019q. /start');

  try {
    if (mode === 'size' && sizeId) {
      const ref = itemsRefSize(sectionId, categoryId, sizeId).doc(docId);
      const snap = await ref.get();
      const cur = !!snap.data()?.available;
      await ref.set({ available: !cur }, { merge: true });
    } else {
      const ref = itemsRefCat(sectionId, categoryId).doc(docId);
      const snap = await ref.get();
      const cur = !!snap.data()?.available;
      await ref.set({ available: !cur }, { merge: true });
    }
  } catch (e) {
    console.error('Toggle error:', e);
    await ctx.reply(`❌ Belgilashda xatolik: ${String(e)}`);
  }

  if (mode === 'size') return renderSizeView(ctx, true);
  return renderCategoryItems(ctx, true);
});

/* ========= BOOT ========= */
async function seedCatalogIfNeededAndStart() {
  const metaRef = db.collection('meta').doc('catalogSeed_productsTree_v4');
  const meta = await metaRef.get();
  if (!meta.exists) console.log('Seeding catalog...');
  await seedCatalogIfNeeded();
}

async function main() {
  await seedCatalogIfNeededAndStart();
  await bot.launch();
  console.log('Bot ishga tushdi\u2026');
}
main().catch(err => console.error('Launch error:', err));

/* Graceful stop */
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
