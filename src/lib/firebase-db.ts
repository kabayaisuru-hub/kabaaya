import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";

export type BookingStatus = "Confirmed" | "PickedUp" | "Returned" | "Cancelled";
export type InventoryCategory = "Blazer" | "Fabric" | "Product";
export type InventoryStatus = "Available" | "Rented" | "Sold";
export type TailoringStatus = "Pending" | "Measuring" | "Sewing" | "Ready" | "Completed";
export type TailoringDiscountType = "fixed" | "percentage";
export type TailoringFabricSource = "Shop Stock" | "Customer Provided";
export type TailoringMeasurementUnit = "m" | "yd";
export type ExpenseCategory =
  | "Vehicle"
  | "Petrol"
  | "Shop Rent"
  | "Tea/Meals"
  | "Light Bill"
  | "Water Bill"
  | "Other";

export interface BookingRecord {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_nic: string;
  item_ids: string[];
  pickup_date: string;
  return_date: string;
  total_amount: number;
  advance_paid: number;
  status: BookingStatus;
  created_at: string;
  signature_url?: string;
  signature_data?: string;
  invoice_no?: number;
}

export interface InventoryRecord {
  id: string;
  category: InventoryCategory;
  item_code: string;
  name: string;
  size?: string;
  color?: string;
  fabric_type?: string;
  unit?: string;
  current_stock_quantity: number;
  unit_cost_price: number;
  unit_selling_price: number;
  status: InventoryStatus;
  created_at: string;
}

export interface TailoringItemRecord {
  id: string;
  order_id: string;
  item_code: string;
  item_description: string;
  fabric_source: TailoringFabricSource;
  inventory_item_id?: string;
  measurement_unit: TailoringMeasurementUnit;
  quantity_used: number;
  fabric_rate: number;
  total_fabric_cost: number;
  stitching_price: number;
  item_total: number;
  created_at: string;
}

export interface TailoringOrderRecord {
  id: string;
  invoice_id: string;
  cr_book_page_number: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  total_amount: number;
  advance_paid: number;
  balance_due: number;
  status: TailoringStatus;
  due_date: string;
  notes?: string;
  discount_amount: number;
  discount_type: TailoringDiscountType;
  grand_total: number;
  created_at: string;
  items?: TailoringItemRecord[];
}

export interface ExpenseRecord {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  expense_date: string;
  created_at: string;
}

export interface BookingConflict {
  itemId: string;
  booking: BookingRecord;
}

export interface SearchResults {
  bookings: BookingRecord[];
  tailoring: TailoringOrderRecord[];
  inventory: InventoryRecord[];
}

const COLLECTIONS = {
  bookings: "bookings",
  expenses: "expenses",
  inventory: "inventory",
  tailoringItems: "tailoring_items",
  tailoringOrders: "tailoring_orders",
} as const;

const BOOKING_STATUSES: BookingStatus[] = ["Confirmed", "PickedUp", "Returned", "Cancelled"];
const INVENTORY_STATUSES: InventoryStatus[] = ["Available", "Rented", "Sold"];
const INVENTORY_CATEGORIES: InventoryCategory[] = ["Blazer", "Fabric", "Product"];
const TAILORING_STATUSES: TailoringStatus[] = ["Pending", "Measuring", "Sewing", "Ready", "Completed"];
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Vehicle",
  "Petrol",
  "Shop Rent",
  "Tea/Meals",
  "Light Bill",
  "Water Bill",
  "Other",
];

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function pickEnumValue<T extends string>(value: unknown, allowed: T[], fallback: T) {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}

function byCreatedDesc<T extends { created_at: string }>(a: T, b: T) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function mapBooking(id: string, data: DocumentData): BookingRecord {
  return {
    id,
    customer_name: toStringValue(data.customer_name),
    customer_phone: toStringValue(data.customer_phone),
    customer_nic: toStringValue(data.customer_nic),
    item_ids: toStringArray(data.item_ids),
    pickup_date: toStringValue(data.pickup_date),
    return_date: toStringValue(data.return_date),
    total_amount: toNumber(data.total_amount),
    advance_paid: toNumber(data.advance_paid),
    status: pickEnumValue(data.status, BOOKING_STATUSES, "Confirmed"),
    created_at: toStringValue(data.created_at, nowIso()),
    signature_url: toOptionalString(data.signature_url),
    signature_data: toOptionalString(data.signature_data),
    invoice_no: data.invoice_no === undefined ? undefined : toNumber(data.invoice_no),
  };
}

function mapInventory(id: string, data: DocumentData): InventoryRecord {
  const category = pickEnumValue(data.category, INVENTORY_CATEGORIES, "Blazer");
  return {
    id,
    category,
    item_code: toStringValue(data.item_code),
    name: toStringValue(data.name),
    size: toOptionalString(data.size),
    color: toOptionalString(data.color),
    fabric_type: toOptionalString(data.fabric_type),
    unit: toOptionalString(data.unit) ?? (category === "Fabric" ? "Meters" : "Pcs"),
    current_stock_quantity: toNumber(
      data.current_stock_quantity ?? data.quantity,
      category === "Blazer" ? 1 : 0
    ),
    unit_cost_price: toNumber(data.unit_cost_price),
    unit_selling_price: toNumber(data.unit_selling_price),
    status: pickEnumValue(data.status, INVENTORY_STATUSES, "Available"),
    created_at: toStringValue(data.created_at, nowIso()),
  };
}

function mapTailoringItem(id: string, data: DocumentData): TailoringItemRecord {
  return {
    id,
    order_id: toStringValue(data.order_id),
    item_code: toStringValue(data.item_code),
    item_description: toStringValue(data.item_description),
    fabric_source: pickEnumValue(
      data.fabric_source,
      ["Shop Stock", "Customer Provided"],
      "Shop Stock"
    ),
    inventory_item_id: toOptionalString(data.inventory_item_id),
    measurement_unit: pickEnumValue(data.measurement_unit, ["m", "yd"], "m"),
    quantity_used: toNumber(data.quantity_used),
    fabric_rate: toNumber(data.fabric_rate),
    total_fabric_cost: toNumber(data.total_fabric_cost),
    stitching_price: toNumber(data.stitching_price),
    item_total: toNumber(data.item_total),
    created_at: toStringValue(data.created_at, nowIso()),
  };
}

function mapTailoringOrder(id: string, data: DocumentData): TailoringOrderRecord {
  return {
    id,
    invoice_id: toStringValue(data.invoice_id),
    cr_book_page_number: toStringValue(data.cr_book_page_number),
    customer_name: toStringValue(data.customer_name),
    customer_address: toStringValue(data.customer_address),
    customer_phone: toStringValue(data.customer_phone),
    total_amount: toNumber(data.total_amount),
    advance_paid: toNumber(data.advance_paid),
    balance_due: toNumber(data.balance_due),
    status: pickEnumValue(data.status, TAILORING_STATUSES, "Pending"),
    due_date: toStringValue(data.due_date),
    notes: toOptionalString(data.notes),
    discount_amount: toNumber(data.discount_amount),
    discount_type: pickEnumValue(data.discount_type, ["fixed", "percentage"], "fixed"),
    grand_total: toNumber(data.grand_total),
    created_at: toStringValue(data.created_at, nowIso()),
  };
}

function mapExpense(id: string, data: DocumentData): ExpenseRecord {
  return {
    id,
    category: pickEnumValue(data.category, EXPENSE_CATEGORIES, "Other"),
    amount: toNumber(data.amount),
    description: toStringValue(data.description),
    expense_date: toStringValue(data.expense_date),
    created_at: toStringValue(data.created_at, nowIso()),
  };
}

function parseKtNumber(value?: string) {
  if (!value) {
    return null;
  }

  const match = value.match(/KT-(\d+)/i);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

function overlaps(pickupDate: string, returnDate: string, rangeStart: string, rangeEnd: string) {
  return pickupDate <= rangeEnd && returnDate >= rangeStart;
}

export async function listBookings() {
  const snapshot = await getDocs(collection(getFirestoreDb(), COLLECTIONS.bookings));
  return snapshot.docs
    .map((docSnapshot) => mapBooking(docSnapshot.id, docSnapshot.data()))
    .sort(byCreatedDesc);
}

export async function listInventoryItems() {
  const snapshot = await getDocs(collection(getFirestoreDb(), COLLECTIONS.inventory));
  return snapshot.docs
    .map((docSnapshot) => mapInventory(docSnapshot.id, docSnapshot.data()))
    .sort(byCreatedDesc);
}

export async function listBlazerInventory() {
  const items = await listInventoryItems();
  return items
    .filter((item) => item.category === "Blazer")
    .sort((a, b) => a.item_code.localeCompare(b.item_code));
}

export async function listAvailableFabricInventory() {
  const items = await listInventoryItems();
  return items
    .filter((item) => item.category === "Fabric" && item.status === "Available")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listExpenses() {
  const snapshot = await getDocs(collection(getFirestoreDb(), COLLECTIONS.expenses));
  return snapshot.docs
    .map((docSnapshot) => mapExpense(docSnapshot.id, docSnapshot.data()))
    .sort(byCreatedDesc);
}

export async function listExpensesByDate(expenseDate: string) {
  const expenses = await listExpenses();
  return expenses.filter((expense) => expense.expense_date === expenseDate);
}

export async function listTailoringOrders() {
  const [ordersSnapshot, itemsSnapshot] = await Promise.all([
    getDocs(collection(getFirestoreDb(), COLLECTIONS.tailoringOrders)),
    getDocs(collection(getFirestoreDb(), COLLECTIONS.tailoringItems)),
  ]);

  const itemsByOrderId = new Map<string, TailoringItemRecord[]>();

  itemsSnapshot.docs.forEach((docSnapshot) => {
    const item = mapTailoringItem(docSnapshot.id, docSnapshot.data());
    const bucket = itemsByOrderId.get(item.order_id) ?? [];
    bucket.push(item);
    itemsByOrderId.set(item.order_id, bucket);
  });

  return ordersSnapshot.docs
    .map((docSnapshot) => {
      const order = mapTailoringOrder(docSnapshot.id, docSnapshot.data());
      return {
        ...order,
        items: (itemsByOrderId.get(order.id) ?? []).sort((a, b) =>
          a.created_at.localeCompare(b.created_at)
        ),
      };
    })
    .sort(byCreatedDesc);
}

export async function findCustomerSuggestions(filters: {
  customerName: string;
  customerPhone: string;
  customerNic: string;
}) {
  const { customerName, customerPhone, customerNic } = filters;
  const normalizedName = customerName.toLowerCase().trim();
  const normalizedPhone = customerPhone.toLowerCase().trim();
  const normalizedNic = customerNic.toLowerCase().trim();

  const bookings = await listBookings();
  const uniqueByPhone = new Map<string, Pick<BookingRecord, "customer_name" | "customer_phone" | "customer_nic">>();

  bookings.forEach((booking) => {
    const matches =
      (normalizedName.length >= 2 &&
        booking.customer_name.toLowerCase().includes(normalizedName)) ||
      (normalizedPhone.length >= 3 &&
        booking.customer_phone.toLowerCase().includes(normalizedPhone)) ||
      (normalizedNic.length >= 3 &&
        booking.customer_nic.toLowerCase().includes(normalizedNic));

    if (!matches || uniqueByPhone.has(booking.customer_phone)) {
      return;
    }

    uniqueByPhone.set(booking.customer_phone, {
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      customer_nic: booking.customer_nic,
    });
  });

  return Array.from(uniqueByPhone.values()).slice(0, 5);
}

export async function getBookedDatesForItemIds(itemIds: string[]) {
  if (itemIds.length === 0) {
    return [];
  }

  const bookings = await listBookings();
  const relevantBookings = bookings.filter(
    (booking) =>
      (booking.status === "Confirmed" || booking.status === "PickedUp") &&
      booking.item_ids.some((itemId) => itemIds.includes(itemId))
  );

  const dates: Date[] = [];

  relevantBookings.forEach((booking) => {
    const current = new Date(booking.pickup_date);
    const end = new Date(booking.return_date);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  });

  return dates;
}

export async function findBookingConflict(
  itemIds: string[],
  pickupDate: string,
  returnDate: string,
  excludeBookingId?: string
): Promise<BookingConflict | null> {
  if (itemIds.length === 0) {
    return null;
  }

  const bookings = await listBookings();

  for (const booking of bookings) {
    if (
      booking.id === excludeBookingId ||
      booking.status === "Cancelled" ||
      booking.status === "Returned"
    ) {
      continue;
    }

    if (!overlaps(booking.pickup_date, booking.return_date, pickupDate, returnDate)) {
      continue;
    }

    const conflictingItemId = booking.item_ids.find((itemId) => itemIds.includes(itemId));
    if (conflictingItemId) {
      return {
        itemId: conflictingItemId,
        booking,
      };
    }
  }

  return null;
}

export async function saveBooking(
  payload: Omit<BookingRecord, "id" | "created_at" | "invoice_no"> & {
    created_at?: string;
    invoice_no?: number;
  },
  bookingId?: string
) {
  const db = getFirestoreDb();
  const cleanedPayload = stripUndefined({
    customer_name: payload.customer_name,
    customer_phone: payload.customer_phone,
    customer_nic: payload.customer_nic,
    item_ids: payload.item_ids,
    pickup_date: payload.pickup_date,
    return_date: payload.return_date,
    total_amount: toNumber(payload.total_amount),
    advance_paid: toNumber(payload.advance_paid),
    status: payload.status,
    signature_url: payload.signature_url,
    signature_data: payload.signature_data,
  });

  if (bookingId) {
    const bookingRef = doc(db, COLLECTIONS.bookings, bookingId);
    await updateDoc(bookingRef, cleanedPayload);
    const updatedSnapshot = await getDoc(bookingRef);
    return mapBooking(updatedSnapshot.id, updatedSnapshot.data() ?? cleanedPayload);
  }

  const existingBookings = await listBookings();
  const nextInvoiceNo =
    payload.invoice_no ??
    existingBookings.reduce((max, booking) => Math.max(max, booking.invoice_no ?? 1499), 1499) +
      1;
  const created_at = payload.created_at ?? nowIso();
  const bookingRef = await addDoc(collection(db, COLLECTIONS.bookings), {
    ...cleanedPayload,
    created_at,
    invoice_no: nextInvoiceNo,
  });

  return {
    id: bookingRef.id,
    ...cleanedPayload,
    created_at,
    invoice_no: nextInvoiceNo,
  } as BookingRecord;
}

export async function deleteBooking(bookingId: string) {
  await deleteDoc(doc(getFirestoreDb(), COLLECTIONS.bookings, bookingId));
}

export async function markBookingReturned(bookingId: string) {
  const db = getFirestoreDb();
  const bookingRef = doc(db, COLLECTIONS.bookings, bookingId);
  const bookingSnapshot = await getDoc(bookingRef);

  if (!bookingSnapshot.exists()) {
    throw new Error("Booking not found.");
  }

  const booking = mapBooking(bookingSnapshot.id, bookingSnapshot.data());
  const batch = writeBatch(db);

  batch.update(bookingRef, { status: "Returned" });
  booking.item_ids.forEach((itemId) => {
    batch.update(doc(db, COLLECTIONS.inventory, itemId), { status: "Available" });
  });

  await batch.commit();
}

export async function saveExpense(
  payload: Omit<ExpenseRecord, "id" | "created_at"> & { created_at?: string },
  expenseId?: string
) {
  const db = getFirestoreDb();
  const cleanedPayload = {
    category: payload.category,
    amount: toNumber(payload.amount),
    description: payload.description ?? "",
    expense_date: payload.expense_date,
  };

  if (expenseId) {
    const expenseRef = doc(db, COLLECTIONS.expenses, expenseId);
    await updateDoc(expenseRef, cleanedPayload);
    const updatedSnapshot = await getDoc(expenseRef);
    return mapExpense(updatedSnapshot.id, updatedSnapshot.data() ?? cleanedPayload);
  }

  const created_at = payload.created_at ?? nowIso();
  const expenseRef = await addDoc(collection(db, COLLECTIONS.expenses), {
    ...cleanedPayload,
    created_at,
  });

  return {
    id: expenseRef.id,
    ...cleanedPayload,
    created_at,
  } as ExpenseRecord;
}

export async function deleteExpense(expenseId: string) {
  await deleteDoc(doc(getFirestoreDb(), COLLECTIONS.expenses, expenseId));
}

export async function saveInventoryItem(
  payload: Omit<InventoryRecord, "id" | "created_at"> & { created_at?: string },
  itemId?: string
) {
  const db = getFirestoreDb();
  const cleanedPayload = stripUndefined({
    category: payload.category,
    item_code: payload.item_code,
    name: payload.name,
    size: payload.size,
    color: payload.color,
    fabric_type: payload.fabric_type,
    unit: payload.unit,
    current_stock_quantity: toNumber(payload.current_stock_quantity),
    unit_cost_price: toNumber(payload.unit_cost_price),
    unit_selling_price: toNumber(payload.unit_selling_price),
    status: payload.status,
  });

  if (itemId) {
    const itemRef = doc(db, COLLECTIONS.inventory, itemId);
    await updateDoc(itemRef, cleanedPayload);
    const updatedSnapshot = await getDoc(itemRef);
    return mapInventory(updatedSnapshot.id, updatedSnapshot.data() ?? cleanedPayload);
  }

  const created_at = payload.created_at ?? nowIso();
  const itemRef = await addDoc(collection(db, COLLECTIONS.inventory), {
    ...cleanedPayload,
    created_at,
  });

  return {
    id: itemRef.id,
    ...cleanedPayload,
    created_at,
  } as InventoryRecord;
}

export async function deleteInventoryItem(itemId: string) {
  await deleteDoc(doc(getFirestoreDb(), COLLECTIONS.inventory, itemId));
}

export async function consumeInventoryStock(itemId: string, amountToDeduct: number) {
  const db = getFirestoreDb();
  const itemRef = doc(db, COLLECTIONS.inventory, itemId);
  const snapshot = await getDoc(itemRef);

  if (!snapshot.exists()) {
    throw new Error("Inventory item not found.");
  }

  const item = mapInventory(snapshot.id, snapshot.data());
  const nextQuantity = Math.max(0, item.current_stock_quantity - amountToDeduct);
  await updateDoc(itemRef, { current_stock_quantity: nextQuantity });
  return nextQuantity;
}

export async function getNextTailoringCode() {
  const orders = await listTailoringOrders();
  const nextNumber =
    orders.reduce((max, order) => {
      const invoiceNumber = parseKtNumber(order.invoice_id) ?? 0;
      const crBookNumber = parseKtNumber(order.cr_book_page_number) ?? 0;
      return Math.max(max, invoiceNumber, crBookNumber);
    }, 1899) + 1;

  return `KT-${nextNumber}`;
}

export async function createTailoringOrder(
  orderPayload: Omit<TailoringOrderRecord, "id" | "created_at" | "invoice_id" | "items"> & {
    created_at?: string;
    invoice_id?: string;
  },
  itemsPayload: Array<
    Omit<TailoringItemRecord, "id" | "order_id" | "created_at">
  >
) {
  const db = getFirestoreDb();
  const created_at = orderPayload.created_at ?? nowIso();
  const nextCode = orderPayload.invoice_id ?? (await getNextTailoringCode());
  const invoiceId = nextCode.trim();
  const crBookPageNumber = (orderPayload.cr_book_page_number || invoiceId).trim();

  const cleanedOrderPayload = stripUndefined({
    invoice_id: invoiceId,
    cr_book_page_number: crBookPageNumber,
    customer_name: orderPayload.customer_name,
    customer_address: orderPayload.customer_address,
    customer_phone: orderPayload.customer_phone,
    total_amount: toNumber(orderPayload.total_amount),
    advance_paid: toNumber(orderPayload.advance_paid),
    balance_due: toNumber(orderPayload.balance_due),
    status: orderPayload.status,
    due_date: orderPayload.due_date,
    notes: orderPayload.notes,
    discount_amount: toNumber(orderPayload.discount_amount),
    discount_type: orderPayload.discount_type,
    grand_total: toNumber(orderPayload.grand_total),
    created_at,
  });

  const orderRef = await addDoc(
    collection(db, COLLECTIONS.tailoringOrders),
    cleanedOrderPayload
  );

  const batch = writeBatch(db);
  const items: TailoringItemRecord[] = itemsPayload.map((itemPayload) => {
    const itemRef = doc(collection(db, COLLECTIONS.tailoringItems));
    const cleanedItemPayload = stripUndefined({
      order_id: orderRef.id,
      item_code: itemPayload.item_code,
      item_description: itemPayload.item_description,
      fabric_source: itemPayload.fabric_source,
      inventory_item_id: itemPayload.inventory_item_id || undefined,
      measurement_unit: itemPayload.measurement_unit,
      quantity_used: toNumber(itemPayload.quantity_used),
      fabric_rate: toNumber(itemPayload.fabric_rate),
      total_fabric_cost: toNumber(itemPayload.total_fabric_cost),
      stitching_price: toNumber(itemPayload.stitching_price),
      item_total: toNumber(itemPayload.item_total),
      created_at,
    });

    batch.set(itemRef, cleanedItemPayload);

    return mapTailoringItem(itemRef.id, cleanedItemPayload);
  });

  await batch.commit();

  return {
    id: orderRef.id,
    ...cleanedOrderPayload,
    items,
  } as TailoringOrderRecord;
}

export async function updateTailoringOrderStatus(orderId: string, status: TailoringStatus) {
  const orderRef = doc(getFirestoreDb(), COLLECTIONS.tailoringOrders, orderId);
  await updateDoc(orderRef, { status });
}

export async function deleteTailoringOrder(orderId: string) {
  const db = getFirestoreDb();
  const itemsSnapshot = await getDocs(collection(db, COLLECTIONS.tailoringItems));
  const batch = writeBatch(db);

  itemsSnapshot.docs.forEach((docSnapshot) => {
    const item = mapTailoringItem(docSnapshot.id, docSnapshot.data());
    if (item.order_id === orderId) {
      batch.delete(docSnapshot.ref);
    }
  });

  batch.delete(doc(db, COLLECTIONS.tailoringOrders, orderId));
  await batch.commit();
}

export async function listInventoryItemsWithBookingInfo() {
  const [items, bookings] = await Promise.all([listInventoryItems(), listBookings()]);
  const today = new Date().toISOString().split("T")[0];
  const activeBookings = bookings.filter(
    (booking) =>
      (booking.status === "Confirmed" || booking.status === "PickedUp") &&
      booking.return_date >= today
  );

  return items.map((item) => {
    const relatedBookings = activeBookings.filter((booking) =>
      booking.item_ids.includes(item.id)
    );

    if (item.category === "Blazer" && relatedBookings.length > 0) {
      return {
        ...item,
        displayStatus: "Booked",
        bookings: relatedBookings.map((booking) => ({
          id: booking.id,
          customer_name: booking.customer_name,
          pickup_date: booking.pickup_date,
          return_date: booking.return_date,
          status: booking.status,
        })),
      };
    }

    return {
      ...item,
      displayStatus: item.status,
      bookings: [] as Array<{
        id: string;
        customer_name: string;
        pickup_date: string;
        return_date: string;
        status: string;
      }>,
    };
  });
}

export async function performGlobalSearch(searchTerm: string): Promise<SearchResults> {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (normalizedSearch.length < 2) {
    return {
      bookings: [],
      tailoring: [],
      inventory: [],
    };
  }

  const [bookings, tailoring, inventory] = await Promise.all([
    listBookings(),
    listTailoringOrders(),
    listInventoryItems(),
  ]);

  const bookingResults = bookings.filter((booking) => {
    return (
      booking.customer_name.toLowerCase().includes(normalizedSearch) ||
      booking.customer_phone.toLowerCase().includes(normalizedSearch)
    );
  });

  const tailoringResults = tailoring.filter((order) => {
    return (
      order.customer_name.toLowerCase().includes(normalizedSearch) ||
      order.customer_phone.toLowerCase().includes(normalizedSearch) ||
      order.invoice_id.toLowerCase().includes(normalizedSearch)
    );
  });

  const inventoryResults = inventory.filter((item) => {
    return (
      item.item_code.toLowerCase().includes(normalizedSearch) ||
      item.name.toLowerCase().includes(normalizedSearch)
    );
  });

  const inventoryIds = new Set(inventoryResults.map((item) => item.id));

  if (normalizedSearch.startsWith("b-") && inventoryIds.size > 0) {
    bookings.forEach((booking) => {
      if (booking.item_ids.some((itemId) => inventoryIds.has(itemId))) {
        bookingResults.push(booking);
      }
    });
  }

  return {
    bookings: Array.from(new Map(bookingResults.map((booking) => [booking.id, booking])).values()).slice(0, 10),
    tailoring: tailoringResults.slice(0, 10),
    inventory: inventoryResults.slice(0, 10),
  };
}

export async function getDashboardSnapshot() {
  const today = new Date().toISOString().split("T")[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const sixMonthsAgoDate = new Date();
  sixMonthsAgoDate.setMonth(sixMonthsAgoDate.getMonth() - 5);
  sixMonthsAgoDate.setDate(1);
  const sixMonthsAgo = sixMonthsAgoDate.toISOString().split("T")[0];

  const [bookings, tailoringOrders, inventoryItems, expenses] = await Promise.all([
    listBookings(),
    listTailoringOrders(),
    listInventoryItems(),
    listExpenses(),
  ]);

  const historyCount = bookings.filter(
    (booking) => booking.status === "Returned" && booking.created_at >= firstDayOfMonth
  ).length;
  const activeRentals = bookings.filter(
    (booking) => booking.status === "Confirmed" || booking.status === "PickedUp"
  ).length;
  const overdueRentals = bookings.filter(
    (booking) =>
      (booking.status === "Confirmed" || booking.status === "PickedUp") &&
      booking.return_date < today
  ).length;
  const readyForCollection = tailoringOrders.filter(
    (order) => order.status === "Completed"
  ).length;
  const availableInventory = inventoryItems.filter(
    (item) => item.status === "Available" && item.category === "Blazer"
  ).length;

  const dailyExpenses = expenses
    .filter((expense) => expense.expense_date === today)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const monthlyExpenses = expenses
    .filter((expense) => expense.expense_date >= firstDayOfMonth)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const activeBookings = bookings.filter(
    (booking) => booking.status !== "Cancelled" && booking.created_at >= sixMonthsAgo
  );
  const activeTailoringOrders = tailoringOrders.filter(
    (order) => order.created_at >= sixMonthsAgo
  );

  let dailyIncome = 0;
  let monthlyIncome = 0;
  let rentalTotal = 0;
  let tailoringTotal = 0;
  const dailyRevenues: Record<string, number> = {};
  const monthlyAggregates: Record<string, { income: number; expense: number }> = {};

  for (let index = 5; index >= 0; index -= 1) {
    const monthCursor = new Date();
    monthCursor.setMonth(monthCursor.getMonth() - index);
    const monthLabel = monthCursor.toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
    monthlyAggregates[monthLabel] = { income: 0, expense: 0 };
  }

  const registerRevenue = (
    rows: Array<{ created_at: string; total_amount: number }>,
    type: "rental" | "tailoring"
  ) => {
    rows.forEach((row) => {
      const dateLabel = row.created_at.split("T")[0];
      const monthLabel = new Date(row.created_at).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      });

      if (dateLabel >= firstDayOfMonth) {
        monthlyIncome += row.total_amount;
        if (type === "rental") {
          rentalTotal += row.total_amount;
        } else {
          tailoringTotal += row.total_amount;
        }
      }

      if (dateLabel === today) {
        dailyIncome += row.total_amount;
      }

      dailyRevenues[dateLabel] = (dailyRevenues[dateLabel] ?? 0) + row.total_amount;
      if (monthlyAggregates[monthLabel]) {
        monthlyAggregates[monthLabel].income += row.total_amount;
      }
    });
  };

  expenses
    .filter((expense) => expense.expense_date >= sixMonthsAgo)
    .forEach((expense) => {
      const monthLabel = new Date(expense.expense_date).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      });
      if (monthlyAggregates[monthLabel]) {
        monthlyAggregates[monthLabel].expense += expense.amount;
      }
    });

  registerRevenue(
    activeBookings.map((booking) => ({
      created_at: booking.created_at,
      total_amount: booking.total_amount,
    })),
    "rental"
  );
  registerRevenue(
    activeTailoringOrders.map((order) => ({
      created_at: order.created_at,
      total_amount: order.total_amount,
    })),
    "tailoring"
  );

  const chartData: Array<{ name: string; revenue: number }> = [];
  const currentDate = new Date(firstDayOfMonth);
  const endDate = new Date(today);

  while (currentDate <= endDate) {
    const key = currentDate.toISOString().split("T")[0];
    chartData.push({
      name: currentDate.toLocaleDateString("en-GB", { month: "short", day: "2-digit" }),
      revenue: dailyRevenues[key] ?? 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const monthlyChartData = Object.entries(monthlyAggregates).map(([name, values]) => ({
    name,
    income: values.income,
    expense: values.expense,
  }));

  const recentActivity = [
    ...bookings.slice(0, 5).map((booking) => ({ ...booking, type: "Rental" as const })),
    ...tailoringOrders.slice(0, 5).map((order) => ({ ...order, type: "Tailoring" as const })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return {
    stats: {
      historyCount,
      activeRentals,
      overdueRentals,
      readyForCollection,
      dailyIncome,
      monthlyIncome,
      dailyExpenses,
      monthlyExpenses,
      netProfit: monthlyIncome - monthlyExpenses,
      availableInventory,
      rentalTotal,
      tailoringTotal,
    },
    chartData,
    monthlyChartData,
    recentActivity,
  };
}
