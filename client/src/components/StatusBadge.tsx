const config: Record<string, { bg: string; text: string; dot: string }> = {
  pending:  { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  approved: { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  rejected: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
};

export default function StatusBadge({ status }: { status: string }) {
  const c = config[status] || { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' };
  return (
    <span
      className="animate-scale-in"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: c.bg,
        color: c.text,
        padding: '4px 12px',
        borderRadius: 999,
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'capitalize',
        letterSpacing: '0.02em',
      }}
    >
      <span style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: c.dot,
        display: 'inline-block',
        animation: status === 'pending' ? 'pulse 1.5s ease-in-out infinite' : 'none',
      }} />
      {status}
    </span>
  );
}
