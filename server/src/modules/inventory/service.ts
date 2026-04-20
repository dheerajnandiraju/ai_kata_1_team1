import InventoryItem from './model';
import { createError } from '../../middleware/errorHandler';
import { env } from '../../config/env';

/** Escapes special regex characters to prevent ReDoS. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listItems(page: number, limit: number, search?: string) {
  const filter = (search && typeof search === 'string')
    ? { name: { $regex: escapeRegex(search.toLowerCase().trim()), $options: 'i' } }
    : {};
  const [items, total] = await Promise.all([
    InventoryItem.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ name: 1 }),
    InventoryItem.countDocuments(filter),
  ]);
  return { items, total };
}

export async function createItem(name: string, quantity: number) {
  const existing = await InventoryItem.findOne({ name: name.toLowerCase().trim() });
  if (existing) throw createError('Item with this name already exists', 409);

  const item = new InventoryItem({ name, quantity });
  await item.save();
  return item;
}

export async function updateItem(id: string, quantity: number) {
  const item = await InventoryItem.findById(id);
  if (!item) throw createError('Inventory item not found', 404);

  item.quantity = quantity;
  await item.save(); // triggers pre-save to update lowStock
  return item;
}

export async function deleteItem(id: string) {
  const item = await InventoryItem.findByIdAndDelete(id);
  if (!item) throw createError('Inventory item not found', 404);
}

/** Used by approval flow — creates item with qty 0 if missing (FR-12) */
export async function deductStock(name: string, qty: number) {
  const normalised = name.toLowerCase().trim();

  const item = await InventoryItem.findOneAndUpdate(
    { name: normalised },
    [
      {
        $set: {
          quantity: {
            $max: [0, { $subtract: ['$quantity', qty] }],
          },
          lowStock: {
            $lte: [
              { $max: [0, { $subtract: ['$quantity', qty] }] },
              env.LOW_STOCK_THRESHOLD,
            ],
          },
        },
      },
    ],
    { new: true, upsert: true }
  );

  return item;
}
