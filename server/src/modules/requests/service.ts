import SupplyRequest from './model';
import { createError } from '../../middleware/errorHandler';
import { deductStock } from '../inventory/service';
import mongoose from 'mongoose';

/** Escapes special regex characters to prevent ReDoS. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Returns a valid Date or undefined — silently discards malformed strings. */
function toValidDate(val: string | undefined): Date | undefined {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

const VALID_STATUSES = ['pending', 'approved', 'rejected'] as const;
type ValidStatus = typeof VALID_STATUSES[number];

interface ListFilter {
  page: number;
  limit: number;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  userId?: string;  // restrict to specific user for /mine
}

export async function createRequest(userId: string, itemName: string, quantity: number, remarks?: string) {
  const req = new SupplyRequest({ requestedBy: userId, itemName, quantity, remarks });
  await req.save();
  return req.populate([
    { path: 'requestedBy', select: 'name email' },
    { path: 'actionedBy', select: 'name' },
  ]);
}

export async function listRequests(filter: ListFilter) {
  const { page, limit, status, search, from, to, userId } = filter;

  // Build query
  const query: Record<string, unknown> = {};
  if (userId) query.requestedBy = userId;
  // Whitelist status values to prevent NoSQL operator injection
  if (status && typeof status === 'string' && (VALID_STATUSES as readonly string[]).includes(status)) {
    query.status = status as ValidStatus;
  }
  // Escape search string before use in $regex to prevent ReDoS
  if (search && typeof search === 'string') {
    query.itemName = { $regex: escapeRegex(search.toLowerCase().trim()), $options: 'i' };
  }
  // Validate date params before constructing the range filter
  const fromDate = toValidDate(from);
  const toDate = toValidDate(to);
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) (query.createdAt as Record<string, unknown>).$gte = fromDate;
    if (toDate) (query.createdAt as Record<string, unknown>).$lte = toDate;
  }

  const [requests, total] = await Promise.all([
    SupplyRequest.find(query)
      .populate('requestedBy', 'name email')
      .populate('actionedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    SupplyRequest.countDocuments(query),
  ]);

  return { requests, total };
}

export async function approveRequest(requestId: string, adminId: string) {
  const request = await SupplyRequest.findById(requestId);
  if (!request) throw createError('Request not found', 404);
  if (request.status !== 'pending') throw createError('Request is not pending', 409);

  // Deduct stock atomically
  await deductStock(request.itemName, request.quantity);

  request.status = 'approved';
  request.actionedBy = new mongoose.Types.ObjectId(adminId) as unknown as mongoose.Types.ObjectId;
  request.actionedAt = new Date();
  await request.save();

  console.info('[Audit] Request approved:', { requestId, adminId, itemName: request.itemName, quantity: request.quantity });

  return request.populate([
    { path: 'requestedBy', select: 'name email' },
    { path: 'actionedBy', select: 'name' },
  ]);
}

export async function rejectRequest(requestId: string, adminId: string, reason?: string) {
  const request = await SupplyRequest.findById(requestId);
  if (!request) throw createError('Request not found', 404);
  if (request.status !== 'pending') throw createError('Request is not pending', 409);

  request.status = 'rejected';
  request.actionedBy = new mongoose.Types.ObjectId(adminId) as unknown as mongoose.Types.ObjectId;
  request.actionedAt = new Date();
  if (reason) request.rejectionReason = reason;
  await request.save();

  console.info('[Audit] Request rejected:', { requestId, adminId, reason });

  return request.populate([
    { path: 'requestedBy', select: 'name email' },
    { path: 'actionedBy', select: 'name' },
  ]);
}
