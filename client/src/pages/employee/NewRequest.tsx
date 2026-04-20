import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { requestsApi } from '../../api/requests';
import { PackagePlus, Package, Hash, MessageSquare, ArrowRight, Loader2 } from 'lucide-react';
import type { CSSProperties } from 'react';

const schema = z.object({
  itemName: z.string().min(1, 'Item name required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  remarks: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewRequest() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({ resolver: zodResolver(schema) });
  const navigate = useNavigate();

  async function onSubmit(data: FormData) {
    try {
      await requestsApi.submit(data);
      toast.success('Request submitted!');
      reset();
      navigate('/requests/mine');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? 'Failed to submit');
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={h1Style}>New Supply Request</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Fill in the details to submit a new supply request.</p>
      </div>

      <div style={formCardStyle}>
        {/* Icon header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-light)' }}>
          <div style={iconCircleStyle}><PackagePlus size={22} color="var(--primary-500)" /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>Request Details</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your request will be reviewed by an admin</div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Item Name</label>
            <div style={inputWrapStyle}>
              <Package size={17} color="var(--text-light)" style={{ flexShrink: 0 }} />
              <input {...register('itemName')} style={inputStyle} placeholder="e.g. A4 Paper, Sticky Notes" />
            </div>
            {errors.itemName && <p style={errStyle}>{errors.itemName.message}</p>}
          </div>

          <div>
            <label style={labelStyle}>Quantity</label>
            <div style={inputWrapStyle}>
              <Hash size={17} color="var(--text-light)" style={{ flexShrink: 0 }} />
              <input {...register('quantity')} type="number" min={1} style={inputStyle} placeholder="1" />
            </div>
            {errors.quantity && <p style={errStyle}>{errors.quantity.message}</p>}
          </div>

          <div>
            <label style={labelStyle}>Remarks <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(optional)</span></label>
            <div style={{ ...inputWrapStyle, alignItems: 'flex-start', paddingTop: '12px' }}>
              <MessageSquare size={17} color="var(--text-light)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <textarea {...register('remarks')} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Any additional details…" />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} style={btnStyle}>
            {isSubmitting ? <Loader2 size={18} /> : <><span>Submit Request</span><ArrowRight size={17} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */
const h1Style: CSSProperties = { fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' };
const formCardStyle: CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
  padding: '2rem', maxWidth: 520, boxShadow: 'var(--shadow-sm)',
  border: '1px solid var(--border-light)',
};
const iconCircleStyle: CSSProperties = {
  width: 44, height: 44, borderRadius: 'var(--radius-md)',
  background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const labelStyle: CSSProperties = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600,
  color: 'var(--text)', marginBottom: '6px',
};
const inputWrapStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px',
  padding: '0 14px', border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-md)', background: 'var(--surface-dim)',
};
const inputStyle: CSSProperties = {
  flex: 1, padding: '11px 0', border: 'none', outline: 'none',
  background: 'transparent', fontSize: '0.9rem', color: 'var(--text)',
};
const errStyle: CSSProperties = { color: 'var(--danger)', fontSize: '0.78rem', marginTop: '4px' };
const btnStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  width: '100%', padding: '12px', marginTop: '0.5rem',
  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
  color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
  fontWeight: 600, fontSize: '0.92rem',
  boxShadow: '0 4px 14px rgba(76, 110, 245, 0.3)',
};
