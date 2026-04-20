interface Props {
  status: 'pending' | 'approved' | 'rejected';
}

const map: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  rejected: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200',
};

const iconMap: Record<string, string> = {
  pending: '●',
  approved: '✓',
  rejected: '!',
};

export default function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${map[status] || ''}`}>
      <span>{iconMap[status] || ''}</span>
      {status}
    </span>
  );
}
