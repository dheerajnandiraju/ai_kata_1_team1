import { InventoryItem } from './model';

const threshold = () => parseInt(process.env.LOW_STOCK_THRESHOLD || '5', 10);

export async function listInventory(page: number, limit: number, search?: string) {
  const filter: any = {};
  if (search) filter.name = { $regex: search, $options: 'i' };
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    InventoryItem.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    InventoryItem.countDocuments(filter),
  ]);
  return { items, total };
}

export async function createItem(name: string, quantity: number) {
  const existing = await InventoryItem.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
  if (existing) {
    const err: any = new Error('Item with this name already exists');
    err.status = 409;
    throw err;
  }
  const item = new InventoryItem({ name: name.trim(), quantity });
  item.lowStock = quantity < threshold();
  return item.save();
}

export async function updateItem(id: string, quantity: number) {
  const item = await InventoryItem.findById(id);
  if (!item) {
    const err: any = new Error('Item not found');
    err.status = 404;
    throw err;
  }
  item.quantity = quantity;
  item.lowStock = quantity < threshold();
  return item.save();
}

export async function deleteItem(id: string) {
  const item = await InventoryItem.findByIdAndDelete(id);
  if (!item) {
    const err: any = new Error('Item not found');
    err.status = 404;
    throw err;
  }
}

export async function deductStock(itemName: string, quantity: number) {
  const t = threshold();
  let item = await InventoryItem.findOneAndUpdate(
    { name: { $regex: `^${itemName.trim()}$`, $options: 'i' } },
    [
      {
        $set: {
          quantity: { $max: [0, { $subtract: ['$quantity', quantity] }] },
        },
      },
      {
        $set: {
          lowStock: { $lt: ['$quantity', t] },
        },
      },
    ],
    { new: true }
  );
  if (!item) {
    // Create with quantity=0 (back-order)
    item = new InventoryItem({ name: itemName.trim(), quantity: 0, lowStock: true });
    await item.save();
  }
  return item;
}
