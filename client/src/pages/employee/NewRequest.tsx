import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { requestsApi } from '../../api/requests';

const schema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  remarks: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const NewRequest: React.FC = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await requestsApi.create(data);
      toast.success('Request submitted successfully');
      navigate('/employee/my-requests');
    } catch {
      toast.error('Failed to submit request');
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit(onSubmit)} style={styles.card}>
        <h2 style={styles.title}>New Supply Request</h2>

        <label style={styles.label}>Item Name</label>
        <input {...register('itemName')} style={styles.input} placeholder="e.g. Ballpoint pens" />
        {errors.itemName && <span style={styles.error}>{errors.itemName.message}</span>}

        <label style={styles.label}>Quantity</label>
        <input {...register('quantity')} type="number" min={1} style={styles.input} />
        {errors.quantity && <span style={styles.error}>{errors.quantity.message}</span>}

        <label style={styles.label}>Remarks (optional)</label>
        <textarea {...register('remarks')} rows={3} style={{ ...styles.input, resize: 'vertical' }} placeholder="Any additional notes…" />

        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button type="submit" disabled={isSubmitting} style={styles.btn}>
            {isSubmitting ? 'Submitting…' : 'Submit Request'}
          </button>
          <button type="button" onClick={() => navigate(-1)} style={{ ...styles.btn, background: '#94a3b8' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '560px', margin: '2rem auto', padding: '0 1rem' },
  card: { background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  title: { marginBottom: '0.5rem' },
  label: { fontWeight: 600, fontSize: '0.875rem' },
  input: { padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '1rem' },
  error: { color: '#ef4444', fontSize: '0.75rem' },
  btn: { flex: 1, padding: '0.65rem', borderRadius: '4px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' },
};

export default NewRequest;
