// Dyqanet e njohura. Mund të shtosh të tjera nga Cilësimet (me URL kërkimi ku {q} = produkti).
const BUILTIN_STORES = [
  {
    id: 'gjirafa50',
    name: 'Gjirafa50',
    country: 'XK',
    categories: ['tech', 'appliance', 'general'],
    searchUrl: 'https://gjirafa50.com/search?q={q}',
    cfg: {
      card: '.product-item',
      title: '.product-title',
      link: 'a.product-title-lines, .picture a',
      img: '.picture img',
      price: '.price.main',
      old: '.old-price',
      priceAttr: 'data-discountedprice',
    },
  },
  {
    id: '75mall',
    name: '75mall',
    country: 'XK',
    categories: ['tech', 'appliance', 'furniture', 'general'],
    searchUrl: 'https://www.75mall.com/?dispatch=products.search&q={q}&subcats=Y&pname=Y&pkeywords=Y&search_performed=Y&match=all',
    cfg: {
      card: '.ut2-gl__item',
      title: 'a.product-title',
      link: 'a.product-title',
      img: 'img.ty-pict',
      price: '.ty-price',
      old: '.ty-list-price.ty-nowrap',
      stock: '.ty-qty-in-stock, .ut2-gl__amount',
    },
  },
  {
    id: 'foleja',
    name: 'Foleja',
    country: 'XK',
    categories: ['tech', 'appliance', 'furniture', 'general'],
    searchUrl: 'https://www.foleja.com/search?search={q}',
    cfg: {
      card: '.product-box',
      title: '.product-name',
      link: 'a.product-name',
      img: 'img.product-image',
      price: '.whole-advanced-price, .product-price-wrapper [class*="whole"]:not(.price-strikethrough), .product-price:not(.with-list-price)',
      old: '.whole-original-price.price-strikethrough',
    },
  },
  {
    id: 'neptun',
    name: 'Neptun',
    country: 'XK',
    categories: ['tech', 'appliance', 'general'],
    searchUrl: 'https://www.neptun-ks.com/search-product-result.nspx?q={q_}',
    cfg: {
      card: '.theProduct',
      title: 'h2.product-list-item__content--title',
      link: 'a[href]',
      img: 'img',
      price: '.priceNum',
      priceMode: 'min',
    },
  },
  {
    // ShopAZ përdor VTEX — lexojmë API-n publike të kërkimit (JSON), më e shpejtë dhe e saktë.
    id: 'shopaz',
    name: 'ShopAZ',
    country: 'XK',
    categories: ['tech', 'appliance', 'furniture', 'general'],
    searchUrl: 'https://shopaz.vtexcommercestable.com.br/api/catalog_system/pub/products/search?ft={q}&_from=0&_to=49',
    cfg: { json: 'vtex', linkBase: 'https://shopaz.com/al/products/' },
  },
  {
    id: 'pointcomputers',
    name: 'PointComputers',
    country: 'XK',
    categories: ['tech', 'appliance', 'general'],
    searchUrl: 'https://point-computers.com/search?q={q}',
    cfg: {
      card: '.all-products:not(.prefered-products) .product',
      title: '.title',
      link: 'a.image, a[href*="/product/"]',
      img: 'a.image img, img',
      price: '.price',
      old: '.old-price',
    },
  },
  {
    id: 'buton',
    name: 'ButonElectronic',
    country: 'XK',
    categories: ['tech', 'appliance', 'general'],
    searchUrl: 'https://butonks.com/?dispatch=products.search&q={q}&subcats=Y&pname=Y&pkeywords=Y&search_performed=Y&match=all&items_per_page=48',
    cfg: {
      card: '.ty-grid-list__item',
      title: 'a.product-title',
      link: 'a.product-title',
      img: 'img.ty-pict',
      price: '.ty-price',
      old: '.ty-list-price.ty-nowrap',
    },
  },
];

const COUNTRIES = [
  { id: 'XK', name: 'Kosovë' },
  { id: 'AL', name: 'Shqipëri' },
  { id: 'MK', name: 'Maqedoni e Veriut' },
  { id: 'OTHER', name: 'Tjetër' },
];

function buildSearchUrl(store, query) {
  return store.searchUrl
    .replace('{q_}', encodeURIComponent(query.trim().split(/\s+/).join('_')))
    .replace('{q}', encodeURIComponent(query.trim()));
}

module.exports = { BUILTIN_STORES, COUNTRIES, buildSearchUrl };
