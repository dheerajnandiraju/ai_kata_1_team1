import { SupplyRequest } from './model';
import { deductStock } from '../inventory/service';
import { InventoryItem } from '../inventory/model';
import { sendRequestStatusEmail } from '../../services/mailer';

export const createRequest = async (userId: string, itemName: string, quantity: number, remarks?: string) => {
  const req = new SupplyRequest({ requestedBy: userId, itemName, quantity, remarks });
  await req.save();
  return req.populate('requestedBy', 'name email');
};

export const getMyRequests = async (userId: string, page = 1, limit = 20, filters: Record<string, string> = {}) => {
  const query: Record<string, unknown> = { requestedBy: userId };
  if (filters.status) query.status = filters.status;
  const [requests, total] = await Promise.all([
    SupplyRequest.find(query).populate('requestedBy', 'name email').populate('actionedBy', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    SupplyRequest.countDocuments(query),
  ]);
  return { requests, total };
};

export const getAllRequests = async (page = 1, limit = 20, filters: Record<string, string> = {}) => {
  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  const [requests, total] = await Promise.all([
    SupplyRequest.find(query).populate('requestedBy', 'name email').populate('actionedBy', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    SupplyRequest.countDocuments(query),
  ]);
  return { requests, total };
};

export const getPendingRequests = async (page = 1, limit = 20) => {
  const [requests, total] = await Promise.all([
    SupplyRequest.find({ status: 'pending' }).populate('requestedBy', 'name email').sort({ createdAt: 1 }).skip((page - 1) * limit).limit(limit),
    SupplyRequest.countDocuments({ status: 'pending' }),
  ]);
  return { requests, total };
};

export const approveRequest = async (requestId: string, adminId: string) => {
  const request = await SupplyRequest.findById(requestId);
  if (!request) throw Object.assign(new Error('Request not found'), { status: 404 });
  if (request.status !== 'pending') throw Object.assign(new Error('Request is not pending'), { status: 409 });

  // Check inventory availability before approving
  const itemName = request.itemName.trim().toLowerCase();
  const inventoryItem = await InventoryItem.findOne({ name: itemName });
  const availableQty = inventoryItem?.quantity ?? 0;
  if (availableQty < request.quantity) {
    throw Object.assign(
      new Error(
        `Insufficient inventory: requested ${request.quantity}, but only ${availableQty} available for "${request.itemName}"`
      ),
      { status: 422 }
    );
  }

  request.status = 'approved';
  request.actionedBy = adminId as unknown as import('mongoose').Types.ObjectId;
  request.actionedAt = new Date();
  await request.save();
  await deductStock(request.itemName, request.quantity);
  const populated = await request.populate(['requestedBy', 'actionedBy']);

  // Send email notification (fire-and-forget)
  const user = populated.requestedBy as unknown as { name: string; email: string };
  if (user?.email) {
    sendRequestStatusEmail({
      to: user.email,
      employeeName: user.name,
      itemName: request.itemName,
      quantity: request.quantity,
      status: 'approved',
    });
  }

  return populated;
};

export const rejectRequest = async (requestId: string, adminId: string, reason?: string) => {
  const request = await SupplyRequest.findById(requestId);
  if (!request) throw Object.assign(new Error('Request not found'), { status: 404 });
  if (request.status !== 'pending') throw Object.assign(new Error('Request is not pending'), { status: 409 });
  request.status = 'rejected';
  request.actionedBy = adminId as unknown as import('mongoose').Types.ObjectId;
  request.actionedAt = new Date();
  if (reason) request.rejectionReason = reason;
  await request.save();
  const populated = await request.populate(['requestedBy', 'actionedBy']);

  // Send email notification (fire-and-forget)
  const user = populated.requestedBy as unknown as { name: string; email: string };
  if (user?.email) {
    sendRequestStatusEmail({
      to: user.email,
      employeeName: user.name,
      itemName: request.itemName,
      quantity: request.quantity,
      status: 'rejected',
      rejectionReason: reason,
    });
  }

  return populated;
};
