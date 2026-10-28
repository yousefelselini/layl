/**
 * LAYL Luxury Scarf Maison - Core Business & Storefront Logic
 */

export interface Product {
  id: string;
  title: string;
  house: 'Hermès' | 'Louis Vuitton' | 'Burberry' | 'Custom' | string;
  material: string;
  dimensions: string;
  basePrice: number; // in EGP
  discountPercent: number; // 0 to 90
  image: string;
  stockStatus: 'in_stock' | 'sold_out' | 'limited';
  origin: string;
  sku: string;
  description: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  announcementText: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroImage: string;
  whatsappNumber: string; // e.g. +201012345678
  conciergeName: string;
  currency: string;
  pin: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus = 'Being Prepared' | 'With Delivery Company' | 'Out for Delivery' | 'Delivered';

export interface OrderCustomer {
  firstName: string;
  lastName: string;
  primaryPhone: string;
  backupPhone: string;
  city: string;
  address: string;
  landmark?: string;
}

export interface Order {
  id: string; // e.g. LAYL-1001
  createdAt: string;
  customer: OrderCustomer;
  paymentMethod: 'Cash on Delivery' | 'InstaPay / Bank Transfer';
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
}

export interface FilterOptions {
  house?: string;
  onSaleOnly?: boolean;
  searchQuery?: string;
  sortBy?: 'featured' | 'price-asc' | 'price-desc' | 'name-asc';
}

/**
 * Calculates the final price in EGP given base price and discount percentage
 */
export function calculateDiscountedPrice(basePrice: number, discountPercent: number): number {
  if (!discountPercent || discountPercent <= 0) return Math.round(basePrice);
  const clampedDiscount = Math.min(Math.max(discountPercent, 0), 90);
  const discounted = basePrice * (1 - clampedDiscount / 100);
  return Math.round(discounted);
}

/**
 * Formats an amount into Egyptian Pounds string, e.g. "EGP 24,500"
 */
export function formatEGP(amount: number): string {
  const rounded = Math.round(amount);
  return `EGP ${rounded.toLocaleString('en-US')}`;
}

/**
 * Filters and sorts products according to current customer criteria
 */
export function filterProducts(products: Product[], options: FilterOptions): Product[] {
  let result = [...products];

  if (options.house && options.house !== 'All' && options.house !== 'ALL HOUSES') {
    result = result.filter(
      p => p.house.toLowerCase() === options.house!.toLowerCase()
    );
  }

  if (options.onSaleOnly) {
    result = result.filter(p => p.discountPercent > 0);
  }

  if (options.searchQuery && options.searchQuery.trim() !== '') {
    const q = options.searchQuery.trim().toLowerCase();
    result = result.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.house.toLowerCase().includes(q) ||
        p.material.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }

  if (options.sortBy) {
    if (options.sortBy === 'price-asc') {
      result.sort((a, b) => {
        const pA = calculateDiscountedPrice(a.basePrice, a.discountPercent);
        const pB = calculateDiscountedPrice(b.basePrice, b.discountPercent);
        return pA - pB;
      });
    } else if (options.sortBy === 'price-desc') {
      result.sort((a, b) => {
        const pA = calculateDiscountedPrice(a.basePrice, a.discountPercent);
        const pB = calculateDiscountedPrice(b.basePrice, b.discountPercent);
        return pB - pA;
      });
    } else if (options.sortBy === 'name-asc') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }
  }

  return result;
}

/**
 * Calculates cart totals
 */
export function calculateCartSummary(cart: CartItem[]): {
  itemCount: number;
  subtotal: number;
} {
  let itemCount = 0;
  let subtotal = 0;

  for (const item of cart) {
    const unitPrice = calculateDiscountedPrice(item.product.basePrice, item.product.discountPercent);
    itemCount += item.quantity;
    subtotal += unitPrice * item.quantity;
  }

  return { itemCount, subtotal };
}

/**
 * Generates the luxury WhatsApp concierge order URL
 */
export function generateWhatsAppOrderUrl(
  phone: string,
  cart: CartItem[],
  customerInfo?: {
    name?: string;
    city?: string;
    address?: string;
    notes?: string;
  }
): string {
  const cleanPhone = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
  const { subtotal } = calculateCartSummary(cart);

  let message = `*LAYL MAISON — LUXURY CONCIERGE ORDER*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (customerInfo?.name) {
    message += `*Client Name:* ${customerInfo.name}\n`;
  }
  if (customerInfo?.city) {
    message += `*Delivery City:* ${customerInfo.city}, Egypt\n`;
  }
  if (customerInfo?.address) {
    message += `*Address:* ${customerInfo.address}\n`;
  }
  message += `*Courier:* Complimentary White-Glove Courier\n\n`;

  message += `*SELECTED PIECES:*\n`;
  cart.forEach((item, index) => {
    const price = calculateDiscountedPrice(item.product.basePrice, item.product.discountPercent);
    message += `${index + 1}. *${item.product.house.toUpperCase()}* - ${item.product.title}\n`;
    message += `   Qty: ${item.quantity} × ${formatEGP(price)}\n`;
    message += `   SKU: ${item.product.sku}\n`;
    if (item.product.discountPercent > 0) {
      message += `   (Special Sale: ${item.product.discountPercent}% OFF)\n`;
    }
  });

  message += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `*TOTAL AMOUNT:* ${formatEGP(subtotal)}\n`;
  message += `*AUTHENTICITY:* 100% Guaranteed Heritage Import\n`;
  if (customerInfo?.notes) {
    message += `*Notes:* ${customerInfo.notes}\n`;
  }
  message += `\nI would like to confirm my order and arrange delivery. Thank you!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Applies a storewide or brand-specific sale percentage across items
 */
export function applyStorewideSale(
  products: Product[],
  discountPercent: number,
  targetHouse?: string
): Product[] {
  return products.map(product => {
    if (!targetHouse || targetHouse === 'All' || product.house.toLowerCase() === targetHouse.toLowerCase()) {
      return {
        ...product,
        discountPercent: Math.min(Math.max(discountPercent, 0), 90),
      };
    }
    return product;
  });
}

/**
 * Toggles an item ID in the wishlist array
 */
export function toggleWishlistItem(wishlistIds: string[], productId: string): string[] {
  if (wishlistIds.includes(productId)) {
    return wishlistIds.filter(id => id !== productId);
  }
  return [...wishlistIds, productId];
}

/**
 * Checks if a product is in the wishlist
 */
export function isProductInWishlist(wishlistIds: string[], productId: string): boolean {
  return wishlistIds.includes(productId);
}

/**
 * Searches for an order by Order ID or primary/backup phone number
 */
export function findOrder(orders: Order[], query: string): Order | undefined {
  if (!query || query.trim() === '') return undefined;
  const clean = query.trim().toLowerCase();
  const digits = query.replace(/[^\d]/g, '');

  return orders.find(o => {
    if (o.id.toLowerCase() === clean) return true;
    if (digits.length >= 8) {
      const p1 = o.customer.primaryPhone.replace(/[^\d]/g, '');
      const p2 = o.customer.backupPhone.replace(/[^\d]/g, '');
      if (p1.includes(digits) || digits.includes(p1)) return true;
      if (p2 && (p2.includes(digits) || digits.includes(p2))) return true;
    }
    return false;
  });
}

/**
 * Updates an order's status
 */
export function updateOrderStatus(orders: Order[], orderId: string, newStatus: OrderStatus): Order[] {
  return orders.map(o => {
    if (o.id === orderId) {
      return { ...o, status: newStatus };
    }
    return o;
  });
}

/**
 * Calculates the column-based reveal stagger delay in milliseconds for catalog grid animation
 */
export function calculateRevealStaggerMs(index: number, columns = 3, stepMs = 90): number {
  if (index < 0 || columns <= 0 || stepMs <= 0) return 0;
  return (index % columns) * stepMs;
}

/**
 * Deletes a product from the catalog using strict string ID comparison
 */
export function deleteProductById(products: Product[], id: string | number): Product[] {
  return products.filter(p => String(p.id) !== String(id));
}

/**
 * Updates a product in the catalog using strict string ID comparison
 */
export function updateProductById(
  products: Product[],
  id: string | number,
  updates: Partial<Product>
): Product[] {
  return products.map(p => (String(p.id) === String(id) ? { ...p, ...updates } : p));
}



