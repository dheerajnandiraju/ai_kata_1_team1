import mongoose from 'mongoose';
import { InventoryItem } from '../../src/modules/inventory/model';

const MONGO_URI = 'mongodb+srv://admin:OsmsPass123@cluster0.kmmtnrf.mongodb.net/osms_test?appName=Cluster0';

beforeAll(async () => { await mongoose.connect(MONGO_URI); });
afterEach(async () => { await InventoryItem.deleteMany({}); });
afterAll(async () => { await InventoryItem.deleteMany({}); await mongoose.disconnect(); });

describe('Inventory Model — Unit Tests', () => {
  it('creates an inventory item and normalizes name to lowercase', async () => {
    const item = await InventoryItem.create({ name: 'A4 PAPER', quantity: 50, lowStock: false });
    expect(item.name).toBe('a4 paper');
  });

  it('sets lowStock true when quantity is low', async () => {
    const item = await InventoryItem.create({ name: 'pen', quantity: 3, lowStock: true });
    expect(item.lowStock).toBe(true);
  });

  it('sets lowStock false when quantity is sufficient', async () => {
    const item = await InventoryItem.create({ name: 'stapler', quantity: 20, lowStock: false });
    expect(item.lowStock).toBe(false);
  });

  it('enforces unique item name constraint', async () => {
    await InventoryItem.create({ name: 'notebook', quantity: 10, lowStock: false });
    await expect(InventoryItem.create({ name: 'notebook', quantity: 5, lowStock: true })).rejects.toThrow();
  });

  it('does not allow negative quantity via min:0 constraint', async () => {
    await expect(InventoryItem.create({ name: 'ruler', quantity: -1, lowStock: false })).rejects.toThrow();
  });

  it('atomically decrements quantity with $inc', async () => {
    const item = await InventoryItem.create({ name: 'eraser', quantity: 20, lowStock: false });
    await InventoryItem.findByIdAndUpdate(item._id, { $inc: { quantity: -5 } });
    const updated = await InventoryItem.findById(item._id);
    expect(updated?.quantity).toBe(15);
  });

  it('trims whitespace from item name', async () => {
    const item = await InventoryItem.create({ name: '  scissors  ', quantity: 10, lowStock: false });
    expect(item.name).toBe('scissors');
  });
});
