import User from '../user/model';
import { createError } from '../../middleware/errorHandler';

/** Escapes special regex characters to prevent ReDoS. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listUsers(page: number, limit: number, search?: string) {
  const filter = (search && typeof search === 'string')
    ? {
        $or: [
          { name:  { $regex: escapeRegex(search.trim()), $options: 'i' } },
          { email: { $regex: escapeRegex(search.trim()), $options: 'i' } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  return { users, total };
}

export async function changeRole(targetId: string, requesterId: string, role: 'admin' | 'employee') {
  if (targetId === requesterId) {
    throw createError('Admins cannot change their own role', 400);
  }

  const user = await User.findById(targetId);
  if (!user) throw createError('User not found', 404);

  user.role = role;
  await user.save();
  return user;
}

export async function setActiveStatus(targetId: string, requesterId: string, isActive: boolean) {
  if (targetId === requesterId) {
    throw createError('Admins cannot deactivate their own account', 400);
  }

  const user = await User.findById(targetId);
  if (!user) throw createError('User not found', 404);

  user.isActive = isActive;
  await user.save();
  return user;
}
