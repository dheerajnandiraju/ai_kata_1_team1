import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { SupplyRequest } from '../../src/modules/requests/model';
import { User, IUser } from '../../src/modules/user/model';

const MONGO_URI = 'mongodb+srv://admin:OsmsPass123@cluster0.kmmtnrf.mongodb.net/osms_test?appName=Cluster0';

let employee: IUser;
let admin: IUser;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
  const hash = await bcrypt.hash('pass', 10);
  employee = await User.create({ name: 'Emp', email: 'emp@test.com', passwordHash: hash, role: 'employee' });
  admin = await User.create({ name: 'Adm', email: 'adm@test.com', passwordHash: hash, role: 'admin' });
});
afterEach(async () => { await SupplyRequest.deleteMany({}); });
afterAll(async () => { await SupplyRequest.deleteMany({}); await User.deleteMany({}); await mongoose.disconnect(); });

describe('SupplyRequest Model — Unit Tests', () => {
  it('creates a request with default pending status', async () => {
    const req = await SupplyRequest.create({ requestedBy: employee._id, itemName: 'pen', quantity: 5 });
    expect(req.status).toBe('pending');
    expect(req.itemName).toBe('pen');
  });

  it('normalizes itemName to lowercase', async () => {
    const req = await SupplyRequest.create({ requestedBy: employee._id, itemName: 'A4 PAPER', quantity: 2 });
    expect(req.itemName).toBe('a4 paper');
  });

  it('transitions status to approved with actionedBy and actionedAt', async () => {
    const req = await SupplyRequest.create({ requestedBy: employee._id, itemName: 'stapler', quantity: 1 });
    const updated = await SupplyRequest.findByIdAndUpdate(
      req._id,
      { status: 'approved', actionedBy: admin._id, actionedAt: new Date() },
      { new: true }
    );
    expect(updated?.status).toBe('approved');
    expect(updated?.actionedBy?.toString()).toBe(admin._id.toString());
    expect(updated?.actionedAt).toBeDefined();
  });

  it('transitions status to rejected and stores rejectionReason', async () => {
    const req = await SupplyRequest.create({ requestedBy: employee._id, itemName: 'ruler', quantity: 3 });
    const updated = await SupplyRequest.findByIdAndUpdate(
      req._id,
      { status: 'rejected', rejectionReason: 'Out of budget', actionedBy: admin._id, actionedAt: new Date() },
      { new: true }
    );
    expect(updated?.status).toBe('rejected');
    expect(updated?.rejectionReason).toBe('Out of budget');
  });

  it('requires quantity of at least 1', async () => {
    await expect(SupplyRequest.create({ requestedBy: employee._id, itemName: 'tape', quantity: 0 })).rejects.toThrow();
  });

  it('sets createdAt and updatedAt timestamps automatically', async () => {
    const req = await SupplyRequest.create({ requestedBy: employee._id, itemName: 'notebook', quantity: 2 });
    expect(req.createdAt).toBeDefined();
    expect(req.updatedAt).toBeDefined();
  });
});
