import { InventoryItem } from './model';
import { env } from '../../config/env';

export async function listItems(page: number, limit: number, search?: string) {
  const query = search ? { name: { $regex: search, $options: 'i' } } : {};
  const [items, total] = await Promise.all([
    InventoryItem.find(query).skip((page - 1) * limit).limit(limit).lean(),
    InventoryItem.countDocuments(query),
  ]);
  return { items, total };
}

export async function createItem(name: string, quantity: number) {
  const normalized = name.toLowerCase().trim();
  const existing = await InventoryItem.findOne({ name: normalized });
  if (existing) throw Object.assign(new Error('Item already exists'), { status: 409 });
  const lowStock = quantity <= env.LOW_STOCK_THRESHOLD;
  const item = await InventoryItem.create({ name: normalized, quantity, lowStock });
  return item;
}

export async function updateItem(id: string, quantity: number) {
  const lowStock = quantity <= env.LOW_STOCK_THRESHOLD;
  const item = await InventoryItem.findByIdAndUpdate(id, { quantity, lowStock }, { new: true });
  if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });
  return item;
}

export async function deleteItem(id: string) {
  const item = await InventoryItem.findByIdAndDelete(id);
  if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });
}

export async function deductStock(itemName: string, quantity: number) {
  const normalized = itemName.toLowerCase().trim();
  let item = await InventoryItem.findOne({ name: normalized });
  if (!item) {
    item = await InventoryItem.create({ name: normalized, quantity: 0, lowStock: true });
  }
  const newQty = Math.max(0, item.quantity - quantity);
  const lowStock = newQty <= env.LOW_STOCK_THRESHOLD;
  await InventoryItem.findByIdAndUpdate(item._id, { $inc: { quantity: -(Math.min(quantity, item.quantity)) }, lowStock });
}
