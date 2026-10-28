import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDiscountedPrice,
  formatEGP,
  filterProducts,
  calculateCartSummary,
  generateWhatsAppOrderUrl,
  applyStorewideSale,
  toggleWishlistItem,
  isProductInWishlist,
  resolveWishlistProducts,
  findOrder,
  updateOrderStatus,
  calculateRevealStaggerMs,
  deleteProductById,
  updateProductById,
  EGYPT_GOVERNORATES_CITIES,
  getCitiesForGovernorate,
  Product,
  CartItem,
  Order
} from './layl-store';

const mockProducts: Product[] = [
  {
    id: '1',
    title: 'Vintage Check Silk Scarf',
    house: 'Burberry',
    material: '100% Cashmere-Silk Blend',
    dimensions: '200x90cm',
    basePrice: 28000,
    discountPercent: 0,
    image: '/assets/test1.jpg',
    stockStatus: 'in_stock',
    origin: 'London',
    sku: 'LAYL-BUR-01',
    description: 'Iconic heritage piece'
  },
  {
    id: '2',
    title: 'H-Drapé Pure Silk Shawl',
    house: 'Hermès',
    material: '100% Silk Jacquard',
    dimensions: '140x140cm',
    basePrice: 40000,
    discountPercent: 20,
    image: '/assets/test2.jpg',
    stockStatus: 'in_stock',
    origin: 'Paris',
    sku: 'LAYL-HER-01',
    description: 'Hand-rolled edges'
  },
  {
    id: '3',
    title: 'Monogram Shine Shawl',
    house: 'Louis Vuitton',
    material: '60% Silk 40% Wool',
    dimensions: '142x142cm',
    basePrice: 35000,
    discountPercent: 10,
    image: '/assets/test3.jpg',
    stockStatus: 'sold_out',
    origin: 'Paris',
    sku: 'LAYL-LV-01',
    description: 'Iconic LV monogram'
  }
];

test('calculateDiscountedPrice calculates exact rounded prices', () => {
  assert.equal(calculateDiscountedPrice(28000, 0), 28000);
  assert.equal(calculateDiscountedPrice(40000, 20), 32000);
  assert.equal(calculateDiscountedPrice(35000, 10), 31500);
  assert.equal(calculateDiscountedPrice(10000, -5), 10000);
});

test('formatEGP produces consistent Egyptian currency notation', () => {
  assert.equal(formatEGP(28000), 'EGP 28,000');
  assert.equal(formatEGP(32800), 'EGP 32,800');
  assert.equal(formatEGP(0), 'EGP 0');
});

test('filterProducts filters by house, sale status and search query', () => {
  // House filter
  const hermesOnly = filterProducts(mockProducts, { house: 'Hermès' });
  assert.equal(hermesOnly.length, 1);
  assert.equal(hermesOnly[0].house, 'Hermès');

  // Sale filter
  const onSale = filterProducts(mockProducts, { onSaleOnly: true });
  assert.equal(onSale.length, 2);

  // Search filter
  const searchResults = filterProducts(mockProducts, { searchQuery: 'cashmere' });
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].id, '1');

  // Sort by price ascending
  const sortedAsc = filterProducts(mockProducts, { sortBy: 'price-asc' });
  // Prices: item1=28000, item2=32000, item3=31500 -> order should be 28000, 31500, 32000
  assert.equal(sortedAsc[0].id, '1');
  assert.equal(sortedAsc[1].id, '3');
  assert.equal(sortedAsc[2].id, '2');
});

test('calculateCartSummary totals item quantities and prices accurately', () => {
  const cart: CartItem[] = [
    { product: mockProducts[0], quantity: 2 }, // 28000 * 2 = 56000
    { product: mockProducts[1], quantity: 1 }  // 32000 * 1 = 32000
  ];
  const summary = calculateCartSummary(cart);
  assert.equal(summary.itemCount, 3);
  assert.equal(summary.subtotal, 88000);
});

test('generateWhatsAppOrderUrl constructs valid URL with encoded message', () => {
  const cart: CartItem[] = [
    { product: mockProducts[0], quantity: 1 }
  ];
  const url = generateWhatsAppOrderUrl('+20 100 123 4567', cart, {
    name: 'Yousef',
    city: 'Cairo',
    address: 'Zamalek'
  });

  assert.ok(url.startsWith('https://wa.me/201001234567?text='));
  assert.ok(url.includes('Yousef'));
  assert.ok(url.includes('Cairo'));
  assert.ok(url.includes('BURBERRY'));
  assert.ok(url.includes('EGP%2028%2C000') || url.includes('EGP%2028,000') || url.includes('28%2C000'));
});

test('applyStorewideSale applies sale percentage across all or specific houses', () => {
  const allDiscounted = applyStorewideSale(mockProducts, 15);
  assert.equal(allDiscounted[0].discountPercent, 15);
  assert.equal(allDiscounted[1].discountPercent, 15);
  assert.equal(allDiscounted[2].discountPercent, 15);

  const burberryOnly = applyStorewideSale(mockProducts, 25, 'Burberry');
  assert.equal(burberryOnly[0].discountPercent, 25);
  assert.equal(burberryOnly[1].discountPercent, 20); // unchanged
});

test('wishlist functions toggle, query, and resolve saved products in order', () => {
  let wishlist: string[] = [];
  assert.equal(isProductInWishlist(wishlist, '1'), false);

  wishlist = toggleWishlistItem(wishlist, '1');
  assert.equal(isProductInWishlist(wishlist, '1'), true);
  assert.equal(isProductInWishlist(wishlist, 1), true);
  assert.deepEqual(wishlist, ['1']);

  wishlist = toggleWishlistItem(wishlist, '2');
  assert.deepEqual(wishlist, ['1', '2']);

  const resolved = resolveWishlistProducts(mockProducts, wishlist);
  assert.equal(resolved.length, 2);
  assert.equal(resolved[0].title, 'Vintage Check Silk Scarf');
  assert.equal(resolved[1].title, 'H-Drapé Pure Silk Shawl');

  wishlist = toggleWishlistItem(wishlist, 1);
  assert.equal(isProductInWishlist(wishlist, '1'), false);
  assert.deepEqual(wishlist, ['2']);
});

test('order lookup finds order by ID or phone and status updates correctly', () => {
  const sampleOrders: Order[] = [
    {
      id: 'LAYL-1001',
      createdAt: '2026-10-28 14:00',
      customer: {
        firstName: 'Farida',
        lastName: 'El-Shazly',
        primaryPhone: '01012345678',
        backupPhone: '01287654321',
        city: 'Zamalek',
        address: '14 Hassan Sabry St, Apt 4'
      },
      paymentMethod: 'Cash on Delivery',
      items: [{ product: mockProducts[0], quantity: 1 }],
      subtotal: 28000,
      deliveryFee: 0,
      total: 28000,
      status: 'Being Prepared'
    }
  ];

  // Lookup by ID
  const foundById = findOrder(sampleOrders, 'LAYL-1001');
  assert.ok(foundById);
  assert.equal(foundById.customer.firstName, 'Farida');

  // Lookup by lowercase ID
  assert.ok(findOrder(sampleOrders, 'layl-1001'));

  // Lookup by primary phone
  assert.ok(findOrder(sampleOrders, '01012345678'));

  // Lookup by backup phone
  assert.ok(findOrder(sampleOrders, '01287654321'));

  // Non-matching query returns undefined
  assert.equal(findOrder(sampleOrders, 'LAYL-9999'), undefined);

  // Status update
  const updated = updateOrderStatus(sampleOrders, 'LAYL-1001', 'Out for Delivery');
  assert.equal(updated[0].status, 'Out for Delivery');
});

test('calculateRevealStaggerMs computes column-based stagger delays', () => {
  assert.equal(calculateRevealStaggerMs(0, 3, 90), 0);
  assert.equal(calculateRevealStaggerMs(1, 3, 90), 90);
  assert.equal(calculateRevealStaggerMs(2, 3, 90), 180);
  assert.equal(calculateRevealStaggerMs(3, 3, 90), 0);
});

test('deleteProductById and updateProductById match string and numeric IDs accurately', () => {
  const afterDelete = deleteProductById(mockProducts, 1);
  assert.equal(afterDelete.length, 2);
  assert.equal(afterDelete.some(p => String(p.id) === '1'), false);

  const afterUpdate = updateProductById(mockProducts, 2, {
    title: 'Hermès Updated Shawl',
    basePrice: 42000
  });
  const updatedItem = afterUpdate.find(p => String(p.id) === '2');
  assert.ok(updatedItem);
  assert.equal(updatedItem.title, 'Hermès Updated Shawl');
  assert.equal(updatedItem.basePrice, 42000);
});

test('EGYPT_GOVERNORATES_CITIES covers all 27 Egyptian governorates and resolves cities', () => {
  const govs = Object.keys(EGYPT_GOVERNORATES_CITIES);
  assert.equal(govs.length, 27);
  assert.ok(govs.includes('Cairo'));
  assert.ok(govs.includes('Giza'));
  assert.ok(govs.includes('Alexandria'));
  assert.ok(govs.includes('Luxor'));
  assert.ok(govs.includes('Aswan'));

  const cairoCities = getCitiesForGovernorate('Cairo');
  assert.ok(cairoCities.includes('Zamalek'));
  assert.ok(cairoCities.includes('New Cairo / Tagamoa'));

  const gizaCities = getCitiesForGovernorate('Giza');
  assert.ok(gizaCities.includes('Sheikh Zayed'));
  assert.equal(getCitiesForGovernorate('Unknown').length, 0);
});




