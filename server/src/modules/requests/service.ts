import { SupplyRequest } from './model';
import { deductStock } from '../inventory/service';

function buildFilter(query: Record<string, unknown>) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.search) filter.itemName = { $regex: query.search, $options: 'i' };
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) (filter.createdAt as Record<string, unknown>)['$gte'] = new Date(query.from as string);
    if (query.to) (filter.createdAt as Record<string, unknown>)['$lte'] = new Date(query.to as string);
  }
  return filter;
}

export async function createRequest(userId: string, itemName: string, quantity: number, remarks?: string) {
  const req = await SupplyRequest.create({
    requestedBy: userId,
    itemName: itemName.toLowerCase().trim(),
    quantity,
    remarks,
  });
  return req.populate({ path: 'requestedBy', select: 'name email' });
}

export async function listMine(userId: string, query: Record<string, unknown>) {
  const filter = { ...buildFilter(query), requestedBy: userId };
  const page = parseInt(String(query.page ?? '1'));
  const limit = parseInt(String(query.limit ?? '20'));
  const [requests, total] = await Promise.all([
    SupplyRequest.find(filter).populate('requestedBy', 'name email').populate('actionedBy', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SupplyRequest.countDocuments(filter),
  ]);
  return { requests, total };
}

export async function listAll(query: Record<string, unknown>) {
  const filter = buildFilter(query);
  const page = parseInt(String(query.page ?? '1'));
  const limit = parseInt(String(query.limit ?? '20'));
  const [requests, total] = await Promise.all([
    SupplyRequest.find(filter).populate('requestedBy', 'name email').populate('actionedBy', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SupplyRequest.countDocuments(filter),
  ]);
  return { requests, total };
}

export async function listPending(page: number, limit: number) {
  const filter = { status: 'pending' };
  const [requests, total] = await Promise.all([
    SupplyRequest.find(filter).populate('requestedBy', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SupplyRequest.countDocuments(filter),
  ]);
  return { requests, total };
}

export async function approveRequest(requestId: string, adminId: string) {
  const req = await SupplyRequest.findById(requestId);
  if (!req) throw Object.assign(new Error('Request not found'), { status: 404 });
  if (req.status !== 'pending') throw Object.assign(new Error('Request is not pending'), { status: 409 });
  await deductStock(req.itemName, req.quantity);
  const updated = await SupplyRequest.findByIdAndUpdate(
    requestId,
    { status: 'approved', actionedBy: adminId, actionedAt: new Date() },
    { new: true }
  ).populate('requestedBy', 'name email').populate('actionedBy', 'name');
  return updated;
}

export async function rejectRequest(requestId: string, adminId: string, reason?: string) {
  const req = await SupplyRequest.findById(requestId);
  if (!req) throw Object.assign(new Error('Request not found'), { status: 404 });
  if (req.status !== 'pending') throw Object.assign(new Error('Request is not pending'), { status: 409 });
  const updated = await SupplyRequest.findByIdAndUpdate(
    requestId,
    { status: 'rejected', actionedBy: adminId, actionedAt: new Date(), rejectionReason: reason },
    { new: true }
  ).populate('requestedBy', 'name email').populate('actionedBy', 'name');
  return updated;
}
