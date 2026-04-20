import { InventoryItem } from './model';
import { env } from '../../config/env';

export const getItems = async (page = 1, limit = 20, search = '') => {
  const query = search ? { name: { $regex: search, $options: 'i' } } : {};
  const [items, total] = await Promise.all([
    InventoryItem.find(query).skip((page - 1) * limit).limit(limit).sort({ name: 1 }),
    InventoryItem.countDocuments(query),
  ]);
  return { items, total };
};

export const createItem = async (name: string, quantity: number) => {
  const item = new InventoryItem({ name: name.trim().toLowerCase(), quantity });
  await item.save();
  return item;
};

export const updateItem = async (id: string, quantity: number) => {
  const item = await InventoryItem.findById(id);
  if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });
  item.quantity = quantity;
  item.lowStock = quantity <= env.LOW_STOCK_THRESHOLD;
  await item.save();
  return item;
};

export const deleteItem = async (id: string) => {
  const item = await InventoryItem.findByIdAndDelete(id);
  if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });
};

export const deductStock = async (itemName: string, quantity: number) => {
  const name = itemName.trim().toLowerCase();
  let item = await InventoryItem.findOne({ name });
  if (!item) {
    item = new InventoryItem({ name, quantity: 0 });
  }
  const newQty = Math.max(0, item.quantity - quantity);
  item.quantity = newQty;
  item.lowStock = newQty <= env.LOW_STOCK_THRESHOLD;
  await item.save();
  return item;
};
