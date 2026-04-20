import { SupplyRequest } from './model';
import { deductStock } from '../inventory/service';
import { User } from '../user/model';
import { sendMail } from '../mail/service';

function buildFilter(opts: {
  userId?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
}) {
  const filter: any = {};
  if (opts.userId) filter.requestedBy = opts.userId;
  if (opts.status) filter.status = opts.status;
  if (opts.search) filter.itemName = { $regex: opts.search, $options: 'i' };
  if (opts.from || opts.to) {
    filter.createdAt = {};
    if (opts.from) filter.createdAt.$gte = new Date(opts.from);
    if (opts.to) filter.createdAt.$lte = new Date(opts.to);
  }
  return filter;
}

function formatDate(input: Date | string | undefined) {
  if (!input) {
    return 'N/A';
  }
  return new Date(input).toLocaleString();
}

async function notifyAdminsNewRequest(request: {
  itemName: string;
  quantity: number;
  remarks?: string;
  requestedBy: any;
  createdAt?: Date;
}) {
  const [requester, admins] = await Promise.all([
    User.findById(request.requestedBy).select('name email'),
    User.find({ role: 'admin' }).select('email'),
  ]);

  const recipients = admins.map((admin) => admin.email).filter(Boolean);
  if (!recipients.length) {
    return;
  }

  const text = [
    'A new supply request has been submitted.',
    '',
    `Requester: ${requester?.name || 'Unknown'} (${requester?.email || 'N/A'})`,
    `Item: ${request.itemName}`,
    `Quantity: ${request.quantity}`,
    `Remarks: ${request.remarks || 'N/A'}`,
    `Submitted: ${formatDate(request.createdAt)}`,
  ].join('\n');

  await sendMail({
    to: recipients,
    subject: `[OSMS] New Request: ${request.itemName} x${request.quantity}`,
    text,
  });
}

async function notifyRequesterDecision(request: any, status: 'approved' | 'rejected') {
  const requesterEmail = request?.requestedBy?.email;
  if (!requesterEmail) {
    return;
  }

  const requesterName = request?.requestedBy?.name || 'Team Member';
  const actionedBy = request?.actionedBy?.name || 'Admin';
  const decision = status === 'approved' ? 'approved' : 'rejected';
  const text = [
    `Hello ${requesterName},`,
    '',
    `Your request has been ${decision}.`,
    '',
    `Item: ${request.itemName}`,
    `Quantity: ${request.quantity}`,
    `Actioned By: ${actionedBy}`,
    `Actioned At: ${formatDate(request.actionedAt)}`,
    status === 'rejected' ? `Reason: ${request.rejectionReason || 'N/A'}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  await sendMail({
    to: requesterEmail,
    subject: `[OSMS] Request ${decision}: ${request.itemName}`,
    text,
  });
}

export async function createRequest(userId: string, itemName: string, quantity: number, remarks?: string) {
  const request = await SupplyRequest.create({ requestedBy: userId, itemName, quantity, remarks });

  void notifyAdminsNewRequest(request).catch((error) => {
    console.error('Failed to send new request email notification:', error);
  });

  return request;
}

export async function getMyRequests(userId: string, page: number, limit: number, opts: any) {
  const filter = buildFilter({ userId, ...opts });
  const skip = (page - 1) * limit;
  const [requests, total] = await Promise.all([
    SupplyRequest.find(filter)
      .populate('requestedBy', 'name email')
      .populate('actionedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SupplyRequest.countDocuments(filter),
  ]);
  return { requests, total };
}

export async function getAllRequests(page: number, limit: number, opts: any) {
  const filter = buildFilter(opts);
  const skip = (page - 1) * limit;
  const [requests, total] = await Promise.all([
    SupplyRequest.find(filter)
      .populate('requestedBy', 'name email')
      .populate('actionedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SupplyRequest.countDocuments(filter),
  ]);
  return { requests, total };
}

export async function getPendingRequests(page: number, limit: number) {
  const filter = { status: 'pending' };
  const skip = (page - 1) * limit;
  const [requests, total] = await Promise.all([
    SupplyRequest.find(filter)
      .populate('requestedBy', 'name email')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit),
    SupplyRequest.countDocuments(filter),
  ]);
  return { requests, total };
}

export async function approveRequest(requestId: string, adminId: string) {
  const request = await SupplyRequest.findById(requestId);
  if (!request) {
    const err: any = new Error('Request not found'); err.status = 404; throw err;
  }
  if (request.status !== 'pending') {
    const err: any = new Error('Request is not pending'); err.status = 409; throw err;
  }
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const request = await SupplyRequest.findById(requestId).session(session);
        if (!request) {
          throw Object.assign(new Error('Request not found'), { statusCode: 404 });
        }
        if (request.status !== 'pending') {
          throw Object.assign(new Error('Request already processed'), { statusCode: 409 });
        }
        request.status = 'approved';
        request.actionedBy = adminId as any;
        request.actionedAt = new Date();
        await request.save({ session });
        await deductStock(request.itemName, request.quantity, session);
      });
      const populatedRequest = await SupplyRequest.findById(requestId)
        .populate('requestedBy', 'name email')
        .populate('actionedBy', 'name');
      return populatedRequest;
    } finally {
      session.endSession();
    }

  if (populatedRequest) {
    void notifyRequesterDecision(populatedRequest, 'approved').catch((error) => {
      console.error('Failed to send approval email notification:', error);
    });
  }

  return populatedRequest;
}

export async function rejectRequest(requestId: string, adminId: string, reason?: string) {
  const request = await SupplyRequest.findById(requestId);
  if (!request) {
    const err: any = new Error('Request not found'); err.status = 404; throw err;
  }
  if (request.status !== 'pending') {
    const err: any = new Error('Request is not pending'); err.status = 409; throw err;
  }
  request.status = 'rejected';
  request.actionedBy = adminId as any;
  request.actionedAt = new Date();
  if (reason) request.rejectionReason = reason;
  await request.save();
  const populatedRequest = await SupplyRequest.findById(requestId)
    .populate('requestedBy', 'name email')
    .populate('actionedBy', 'name');

  if (populatedRequest) {
    void notifyRequesterDecision(populatedRequest, 'rejected').catch((error) => {
      console.error('Failed to send rejection email notification:', error);
    });
  }

  return populatedRequest;
}
