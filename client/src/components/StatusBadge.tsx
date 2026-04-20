import React from 'react';

type StatusType = 'pending' | 'approved' | 'rejected';

const colorMap: Record<StatusType, { bg: string; color: string }> = {
  pending: { bg: '#fef9c3', color: '#854d0e' },
  approved: { bg: '#dcfce7', color: '#166534' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
};

const StatusBadge: React.FC<{ status: StatusType }> = ({ status }) => {
  const style = colorMap[status] ?? { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.2rem 0.6rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      backgroundColor: style.bg,
      color: style.color,
    }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default StatusBadge;
