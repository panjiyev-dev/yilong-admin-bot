import 'dotenv/config';
import { Telegraf, Markup, session } from 'telegraf';
import admin from 'firebase-admin';
import fs from 'node:fs';
import { z } from 'zod';

/* ========= ENV / CONFIG ========= */
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const FIREBASE_CREDENTIALS = process.env.FIREBASE_CREDENTIALS || './serviceAccountKey.json';
const ADMIN_USER_ID = Number(process.env.ADMIN_USER_ID || '0');

if (!BOT_TOKEN) throw new Error('BOT_TOKEN .env ichida ko‘rsatilmagan');
if (!fs.existsSync(FIREBASE_CREDENTIALS)) throw new Error('Firebase serviceAccountKey.json topilmadi');

/* ========= FIREBASE ========= */
if (!admin.apps.length) {
  const cred = JSON.parse(fs.readFileSync(FIREBASE_CREDENTIALS, 'utf-8'));
  admin.initializeApp({ credential: admin.credential.cert(cred) });
}
const db = admin.firestore();

/* ========= STATIC CATALOG (seed -> products/{section}/categories/{category}) ========= */
const CATALOG = [
  {
    id: 'listovye-materialy',
    title: 'Листовые материалы',
    categories: [
      { id: 'pvh-yilong', title: 'ПВХ YiLong' },
      { id: 'orgsteklo-yilong', title: 'Оргстекло YiLong' },
      { id: 'pvc-yilong', title: 'PVC YiLong' },
      { id: 'akril-jun-shang', title: 'Акрил JUN SHANG' },
      { id: 'roumark-gravirovka', title: 'Роумарк (пластик для гравировки)' },
      { id: 'alyukobond', title: 'Алюкобонд' },
      { id: 'penokarton', title: 'Пенокартон' }
    ]
  },
  {
    id: 'rulonnye-materialy',
    title: 'Рулонные материалы',
    categories: [
      { id: 'banner-tkan', title: 'Баннерная ткань' },
      { id: 'materialy-dlya-pechati', title: 'Материалы для печати' },
      { id: 'tentovaya-tkan', title: 'Тентовая ткань' },
      { id: 'plenki-laminirovanie', title: 'Пленки для ламинирования' },
      { id: 'cvetnaya-samokley-vinil', title: 'Цветная самоклеющаяся виниловая пленка' },
      { id: 'montazhnye-plenki', title: 'Монтажные пленки' },
      { id: 'vitrajnye-plenki', title: 'Витражные пленки' },
      { id: 'magnitnyj-vinil', title: 'Магнитный винил' },
      { id: 'oboi-dlya-pechati', title: 'Обои для печати' }
    ]
  },
  {
    id: 'istochniki-sveta',
    title: 'Источники света (светодиоды, лампы и пр.)',
    categories: [
      { id: 'led-prozhektory', title: 'LED прожекторы (соффиты)' },
      { id: 'moduli-svetodiodnye', title: 'Модули светодиодные' },
      { id: 'svetod-lenty', title: 'Светодиодные ленты' },
      { id: 'svetod-linejki-zhestkaya-osnova', title: 'Светодиодные линейки на жесткой основе' },
      { id: 'duralajt', title: 'Дюралайт светодиодный' },
      { id: 'svetilnik', title: 'Светильник' },
      { id: 'gibkij-neon', title: 'Гибкий неон светодиодный' }
    ]
  },
  {
    id: 'transformatory-i-upravlenie',
    title: 'Трансформаторы и источники управления',
    categories: [
      { id: 'transformatory-vnutr-naruzh', title: 'Трансформаторы (внутренние и наружные)' },
      { id: 'kontrollery-dimmery-usiliteli', title: 'Контроллеры, диммеры, усилители' }
    ]
  },
  {
    id: 'chernila-kraski',
    title: 'Чернила (краски)',
    categories: [
      { id: 'solvent-kraski', title: 'Сольвентные краски' },
      { id: 'ecosolvent-kraski', title: 'Экосольвентные краски' }
    ]
  },
  {
    id: 'reklamno-vystavochnoe',
    title: 'Рекламное и выставочное оборудование',
    categories: [
      { id: 'pop-up-stendy', title: 'Поп-ап стенды (pop up, пресс-стены)' },
      { id: 'x-konstrukcii', title: 'X-конструкции, x-баннера, паучки' },
      { id: 'roll-up', title: 'Ролл-стенды roll up' },
      { id: 'promostoly', title: 'Промостолы, промостойки' },
      { id: 'flagchiki-flagi', title: 'Флажочки (флаги)' },
      { id: 'posm-raznoe', title: 'POSM материалы (разное)' },
      { id: 'bukletnicy', title: 'Буклетницы' }
    ]
  },
  {
    id: 'alyuminievye-profily',
    title: 'Алюминиевые профиля и комплектующие',
    categories: [
      { id: 'profily-alyuminievye', title: 'Профиля алюминиевые' },
      { id: 'komplektuyushchie-dlya-profilya', title: 'Комплектующие для профиля' },
      { id: 'profil-dlya-lent', title: 'Алюминиевый профиль для светодиодных лент' }
    ]
  },
  {
    id: 'kleevye-resheniya',
    title: 'Клеевые решения (скотч, клей)',
    categories: [
      { id: 'skotch', title: 'Клеевые решения (скотч)' },
      { id: 'klej', title: 'Клей' }
    ]
  },
  {
    id: 'metal-i-plast-furnitura',
    title: 'Металлическая и пластиковая фурнитура',
    categories: [
      { id: 'kajma-plastikovaya', title: 'Кайма пластиковая' },
      { id: 'metal-furnitura', title: 'Металлическая фурнитура' },
      { id: 'neodimovye-magnity', title: 'Неодимовые магниты' }
    ]
  },
  {
    id: 'instrumenty',
    title: 'Инструменты',
    categories: [
      { id: 'ruchnye-instrumenty', title: 'Ручные инструменты' },
      { id: 'postpechatnye-instr', title: 'Постпечатные инструменты' }
    ]
  },
  {
    id: 'frezy-i-gravery',
    title: 'Фрезы и граверы',
    categories: [
      { id: 'frezy', title: 'Фрезы' },
      { id: 'gravery', title: 'Граверы' }
    ]
  }
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
  createdAt: z.any().optional()
});
const BannerSchema = z.object({
  image: z.string().regex(/^https?:\/\//, 'image must be http(s) url'),
  sectionId: z.string().min(1),
  caption: z.string().optional()
});

/* ========= BOT / SESSION ========= */
const bot = new Telegraf(BOT_TOKEN);
bot.use(session({
  defaultSession: () => ({
    flow: undefined,           // 'product' | 'banner'
    state: undefined,          // S_* yoki B_*
    product: undefined,        // draft
    banner: undefined,         // draft
    selected: undefined        // { sectionId, categoryId, docId? }
  })
}));
bot.catch((err) => console.error('Telegraf error:', err));

/* ========= HELPERS ========= */
const isAdmin = (ctx) => (ADMIN_USER_ID === 0) || ((ctx.from?.id ?? 0) === ADMIN_USER_ID);

const mainMenu = () => Markup.keyboard([
  ['🛒 Product qo‘shish', '🖼 Banner qo‘shish']
]).resize();

const previewProductCaption = (p) =>
  `🧾 <b>Oldindan ko‘rish</b>\n\n` +
  `<b>Nomi:</b> ${p.title}\n` +
  `<b>Narxi:</b> ${p.price}\n` +
  `<b>Status:</b> ${p.available ? '✅ Bor' : '❌ Qolmagan'}\n` +
  `<b>Tavsif:</b> ${p.description}`;

const productCardCaption = (p, secTitle = '', catTitle = '') =>
  `📦 <b>${p.title}</b>\n` +
  `${secTitle && catTitle ? `<i>${secTitle} → ${catTitle}</i>\n` : ''}` +
  `<b>Narx:</b> ${p.price}\n` +
  `<b>Status:</b> ${p.available ? '✅ Bor' : '❌ Qolmagan'}\n\n` +
  `${p.description || ''}`;

const actionKb = Markup.inlineKeyboard([
  [Markup.button.callback('🗑️ O‘chirish', 'prod:delete'), Markup.button.callback('❗️ Qolmagan', 'prod:na')],
  [Markup.button.callback('⬅️ Orqaga', 'back:items')]
]);

/* Firestore paths */
const sectionsRef = () => db.collection('products');
const categoriesRef = (sectionId) => sectionsRef(sectionId).doc(sectionId).collection('categories');
const itemsRef = (sectionId, categoryId) => categoriesRef(sectionId).doc(categoryId).collection('items');

/* Builders */
function sectionsKb(sections) {
  return Markup.inlineKeyboard(sections.map(s => [Markup.button.callback(s.title, `sec:${s.id}`)]));
}
function categoriesKb(sectionId, categories) {
  const rows = categories.map(c => [Markup.button.callback(c.title, `cat:${sectionId}:${c.id}`)]);
  rows.push([Markup.button.callback('⬅️ Orqaga (bo‘limlar)', 'back:sections')]);
  return Markup.inlineKeyboard(rows);
}
function itemsKb(sectionId, categoryId, items) {
  const rows = items.map(i => {
    const mark = i.available ? '✅' : '❌';
    // ⚠️ faqat docId yuboramiz (64 bayt limiti muammosini yechadi)
    return [Markup.button.callback(`${mark} ${i.title}`, `pv:${i.id}`)];
  });
  rows.push([Markup.button.callback('➕ Yangi tovar', 'padd')]);
  rows.push([Markup.button.callback('⬅️ Orqaga (kategoriyalar)', 'back:cats')]);
  return Markup.inlineKeyboard(rows);
}

/* ========= DATA ========= */
async function seedCatalogIfNeeded() {
  const metaRef = db.collection('meta').doc('catalogSeed_productsTree');
  const meta = await metaRef.get();
  const seedVersion = 2; // versiyani oshirdim

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
async function fetchItems(sectionId, categoryId, limit = 30) {
  const snap = await itemsRef(sectionId, categoryId).limit(limit).get();
  const list = snap.docs.map(d => ({ id: d.id, ...(d.data()) }));
  list.sort((a, b) => (a.title || '').localeCompare((b.title || ''), 'ru'));
  return list;
}
async function getTitles(sectionId, categoryId) {
  const sDoc = await sectionsRef().doc(sectionId).get();
  const cDoc = await categoriesRef(sectionId).doc(categoryId).get();
  return { sectionTitle: sDoc.data()?.title || sectionId, categoryTitle: cDoc.data()?.title || categoryId };
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

/* ========= COMMANDS ========= */
bot.start(async (ctx) => {
  await ctx.reply('Salom! 👋', mainMenu());
});
bot.command('cancel', async (ctx) => {
  ctx.session = { flow: undefined, state: undefined, product: undefined, banner: undefined, selected: undefined };
  await ctx.reply('Bekor qilindi.', mainMenu());
});

/* ========= TEXT HANDLER ========= */
bot.on('text', async (ctx, next) => {
  if (!isAdmin(ctx)) return ctx.reply('Sizda ruxsat yo‘q.');
  ctx.session ??= { flow: undefined, state: undefined, product: undefined, banner: undefined, selected: undefined };

  const txt = (ctx.message?.text || '').trim();

  /* Entry points */
  if (txt === '🛒 Product qo‘shish') {
    ctx.session = { flow: 'product', state: undefined, product: undefined, banner: undefined, selected: undefined };
    const sections = await fetchSections();
    return ctx.reply('Bo‘limni tanlang:', sectionsKb(sections));
  }
  if (txt === '🖼 Banner qo‘shish') {
    ctx.session = { flow: 'banner', state: B_IMAGE, product: undefined, banner: {}, selected: undefined };
    return ctx.reply('Banner uchun rasm yuboring (foto yoki http/https URL).');
  }

  /* Banner: image as URL */
  if (ctx.session.flow === 'banner' && ctx.session.state === B_IMAGE) {
    if (!/^https?:\/\//.test(txt)) return ctx.reply('Iltimos, foto yuboring yoki to‘g‘ri rasm URL kiriting (http/https).');
    ctx.session.banner.image = txt;
    ctx.session.state = B_SECTION;
    const sections = await fetchSections();
    return ctx.reply('Banner qaysi bo‘limga tegishli?', sectionsKb(sections));
  }

  /* Banner: caption */
  if (ctx.session.flow === 'banner' && ctx.session.state === B_CAPTION) {
    const caption = (txt === '-' ? undefined : txt);
    const parsed = BannerSchema.safeParse({
      image: ctx.session.banner?.image,
      sectionId: ctx.session.banner?.sectionId,
      caption
    });
    if (!parsed.success) return ctx.reply('❌ Banner maʼlumotlari to‘liq emas. /start dan qayta boshlang.');
    try {
      await db.collection('banners').add({
        image: parsed.data.image,
        sectionId: parsed.data.sectionId,
        caption: parsed.data.caption || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      await ctx.reply('✅ Banner saqlandi!', mainMenu());
    } catch (e) {
      await ctx.reply(`❌ Saqlashda xatolik: ${String(e)}`);
    } finally {
      ctx.session = { flow: undefined, state: undefined, product: undefined, banner: undefined, selected: undefined };
    }
    return;
  }

  /* Product form */
  if (ctx.session.flow === 'product') {
    switch (ctx.session.state) {
      case S_TITLE:
        ctx.session.product.title = txt;
        ctx.session.state = S_IMAGE;
        return ctx.reply('2/4 — Rasm URL yuboring (http/https):');

      case S_IMAGE:
        ctx.session.product.image = txt;
        ctx.session.state = S_PRICE;
        return ctx.reply('3/4 — Narxni yuboring (masalan: "от 2 500 ₸" yoki "2500 ₸"):');

      case S_PRICE:
        ctx.session.product.price = txt;
        ctx.session.state = S_DESC;
        return ctx.reply('4/4 — Tavsif (description) yuboring:');

      case S_DESC: {
        ctx.session.product.description = txt;
        const draft = {
          ...ctx.session.product,
          ...ctx.session.selected,
          available: true
        };
        const parsed = ProductSchema.safeParse(draft);
        if (!parsed.success) {
          const msg = parsed.error.errors.map(e => `• ${e.path.join('.')}: ${e.message}`).join('\n');
          ctx.session.state = undefined; ctx.session.product = undefined;
          return ctx.reply(`❌ Ma'lumot xato:\n${msg}\n\nQayta boshlash uchun /start bosing.`);
        }
        ctx.session.state = S_PREVIEW;
        try {
          await ctx.replyWithPhoto({ url: draft.image }, {
            caption: previewProductCaption(draft),
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('✅ Saqlash', 'save'), Markup.button.callback('❌ Bekor qilish', 'discard')]
            ])
          });
        } catch {
          await ctx.reply(`⚠️ Rasmni yuborib bo‘lmadi.\n\n${previewProductCaption(draft)}`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('✅ Saqlash', 'save'), Markup.button.callback('❌ Bekor qilish', 'discard')]
            ])
          });
        }
        return;
      }
      default:
        break;
    }
  }

  return next();
});

/* ========= PHOTO HANDLER (banner image via photo) ========= */
bot.on('photo', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('Sizda ruxsat yo‘q.');
  if (!(ctx.session.flow === 'banner' && ctx.session.state === B_IMAGE)) return;

  try {
    const best = ctx.message.photo.at(-1);
    const link = await ctx.telegram.getFileLink(best.file_id);
    ctx.session.banner.image = String(link);
    ctx.session.state = B_SECTION;
    const sections = await fetchSections();
    await ctx.reply('Banner qaysi bo‘limga tegishli?', sectionsKb(sections));
  } catch {
    await ctx.reply('Rasm linkini olishda xatolik. Boshqa foto yuboring yoki URL kiriting.');
  }
});

/* ========= CALLBACKS: NAVIGATION ========= */
bot.action('back:sections', async (ctx) => {
  await ctx.answerCbQuery();
  const sections = await fetchSections();
  await ctx.editMessageText('Bo‘limni tanlang:', sectionsKb(sections));
});
bot.action('back:cats', async (ctx) => {
  await ctx.answerCbQuery();
  const sectionId = ctx.session.selected?.sectionId;
  if (!sectionId) return;
  const cats = await fetchCategories(sectionId);
  await ctx.editMessageText('Kategoriyani tanlang:', categoriesKb(sectionId, cats));
});
bot.action('back:items', async (ctx) => {
  await ctx.answerCbQuery();
  const { sectionId, categoryId } = ctx.session.selected || {};
  if (!sectionId || !categoryId) return;
  const items = await fetchItems(sectionId, categoryId, 30);
  // eski xabarni textga qaytaramiz
  try { await ctx.editMessageCaption({ caption: ' ', parse_mode: 'HTML' }); } catch {}
  await ctx.reply('Mahsulotlar (tanlang) yoki yangi tovar qo‘shing:', itemsKb(sectionId, categoryId, items));
});

/* Select section */
bot.action(/^sec:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const sectionId = ctx.match[1];
  if (ctx.session.flow === 'product') {
    const cats = await fetchCategories(sectionId);
    ctx.session.selected = { sectionId, categoryId: undefined };
    return ctx.editMessageText('Kategoriyani tanlang:', categoriesKb(sectionId, cats));
  }
  if (ctx.session.flow === 'banner' && ctx.session.state === B_SECTION) {
    ctx.session.banner.sectionId = sectionId;
    ctx.session.state = B_CAPTION;
    return ctx.editMessageText('Banner uchun sarlavha (ixtiyoriy). O‘tkazish uchun “-” yozing.');
  }
});

/* Select category -> show items */
bot.action(/^cat:([^:]+):([^:]+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const sectionId = ctx.match[1];
  const categoryId = ctx.match[2];
  ctx.session.selected = { sectionId, categoryId };
  const list = await fetchItems(sectionId, categoryId, 30);
  await ctx.editMessageText('Mahsulotlar (tanlang) yoki yangi tovar qo‘shing:', itemsKb(sectionId, categoryId, list));
});

/* Open item card (short callback: pv:<docId>) */
bot.action(/^pv:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const docId = ctx.match[1];
  const { sectionId, categoryId } = ctx.session.selected || {};
  if (!sectionId || !categoryId) return ctx.reply('❌ Kontekst yo‘q. /start');

  ctx.session.selected.docId = docId;
  const doc = await itemsRef(sectionId, categoryId).doc(docId).get();
  if (!doc.exists) return ctx.reply('❌ Mahsulot topilmadi.');
  const data = doc.data();
  const { sectionTitle, categoryTitle } = await getTitles(sectionId, categoryId);

  try {
    await ctx.editMessageText(' ');
  } catch {}
  try {
    await ctx.replyWithPhoto({ url: data.image }, {
      caption: productCardCaption(data, sectionTitle, categoryTitle),
      parse_mode: 'HTML',
      ...actionKb
    });
  } catch {
    await ctx.reply(productCardCaption(data, sectionTitle, categoryTitle), { parse_mode: 'HTML', ...actionKb });
  }
});

/* Add new item under chosen category (static callback) */
bot.action('padd', async (ctx) => {
  await ctx.answerCbQuery();
  const { sectionId, categoryId } = ctx.session.selected || {};
  if (!sectionId || !categoryId) return ctx.reply('❌ Avval kategoriya tanlang.');
  ctx.session.flow = 'product';
  ctx.session.product = {};
  ctx.session.state = S_TITLE;
  await ctx.reply('1/4 — Tovar nomini yuboring (title):');
});

/* ========= SAVE/DISCARD PRODUCT ========= */
bot.action('save', async (ctx) => {
  await ctx.answerCbQuery();
  if (!(ctx.session.flow === 'product' && ctx.session.state === S_PREVIEW)) {
    return ctx.reply('Holat mos kelmadi. /start');
  }
  const { sectionId, categoryId } = ctx.session.selected || {};
  const draft = {
    ...ctx.session.product,
    sectionId,
    categoryId,
    available: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
  const parsed = ProductSchema.safeParse(draft);
  if (!parsed.success) {
    return ctx.editMessageCaption({ caption: '❌ Validatsiya xatosi. /start dan qayta urining.' });
  }
  try {
    await itemsRef(sectionId, categoryId).add(parsed.data);
    await ctx.editMessageCaption({ caption: `✅ Saqlandi!`, parse_mode: 'HTML' });
  } catch (e) {
    await ctx.editMessageCaption({ caption: `❌ Saqlashda xatolik: ${String(e)}`, parse_mode: 'HTML' });
  } finally {
    ctx.session.state = undefined;
    ctx.session.product = undefined;
  }
  const list = await fetchItems(sectionId, categoryId, 30);
  await ctx.reply('Mahsulotlar (tanlang) yoki yangi tovar qo‘shing:', itemsKb(sectionId, categoryId, list));
});

bot.action('discard', async (ctx) => {
  await ctx.answerCbQuery();
  try { await ctx.editMessageCaption({ caption: '🗑️ Bekor qilindi.', parse_mode: 'HTML' }); } catch {}
  ctx.session.state = undefined;
  ctx.session.product = undefined;

  const { sectionId, categoryId } = ctx.session.selected || {};
  if (sectionId && categoryId) {
    const list = await fetchItems(sectionId, categoryId, 30);
    await ctx.reply('Mahsulotlar (tanlang) yoki yangi tovar qo‘shing:', itemsKb(sectionId, categoryId, list));
  } else {
    await ctx.reply('Yana nima qilamiz?', mainMenu());
  }
});

/* ========= ITEM ACTIONS ========= */
bot.action('prod:delete', async (ctx) => {
  await ctx.answerCbQuery();
  const { sectionId, categoryId, docId } = ctx.session.selected || {};
  if (!sectionId || !categoryId || !docId) return ctx.reply('❌ Kontekst yo‘q. /start');
  try {
    await itemsRef(sectionId, categoryId).doc(docId).delete();
    await ctx.editMessageCaption({ caption: '🗑️ O‘chirildi.', parse_mode: 'HTML' }).catch(() => {});
  } catch (e) {
    await ctx.reply(`❌ O‘chirishda xatolik: ${String(e)}`);
  }
  const list = await fetchItems(sectionId, categoryId, 30);
  await ctx.reply('Mahsulotlar (tanlang) yoki yangi tovar qo‘shing:', itemsKb(sectionId, categoryId, list));
});

bot.action('prod:na', async (ctx) => {
  await ctx.answerCbQuery();
  const { sectionId, categoryId, docId } = ctx.session.selected || {};
  if (!sectionId || !categoryId || !docId) return ctx.reply('❌ Kontekst yo‘q. /start');
  try {
    await itemsRef(sectionId, categoryId).doc(docId).set({ available: false }, { merge: true });
    const doc = await itemsRef(sectionId, categoryId).doc(docId).get();
    const data = doc.data();
    const { sectionTitle, categoryTitle } = await getTitles(sectionId, categoryId);
    try {
      await ctx.editMessageCaption({ caption: productCardCaption(data, sectionTitle, categoryTitle), parse_mode: 'HTML' });
    } catch {
      await ctx.reply(productCardCaption(data, sectionTitle, categoryTitle), { parse_mode: 'HTML', ...actionKb });
    }
  } catch (e) {
    await ctx.reply(`❌ Belgilashda xatolik: ${String(e)}`);
  }
});

/* ========= BOOT ========= */
async function seed() {
  const metaRef = db.collection('meta').doc('catalogSeed_productsTree');
  const meta = await metaRef.get();
  if (!meta.exists) console.log('Seeding catalog...');
  await seedCatalogIfNeeded();
}
async function main() {
  await seed();
  await bot.launch();
  console.log('Bot ishga tushdi…');
}
main().catch(err => console.error('Launch error:', err));

/* Graceful stop */
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
