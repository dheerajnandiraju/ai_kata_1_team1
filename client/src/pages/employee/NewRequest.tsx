import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Navbar from '../../components/Navbar';
import { submitRequest } from '../../api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  remarks: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export default function NewRequest() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    try {
      await submitRequest(data.itemName, data.quantity, data.remarks);
      toast.success('Request submitted!');
      navigate('/employee/my-requests');
    } catch {
      toast.error('Failed to submit request');
    }
  };

  return (
    <>
      <Navbar />
      <div className="page" style={{ maxWidth: 560 }}>
        <h1>New Supply Request</h1>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="card animate-fade-in-up"
          style={{ padding: 32 }}
        >
          <div style={{ marginBottom: 20 }}>
            <label className="label">Item Name *</label>
            <input {...register('itemName')} className="input" placeholder="e.g. Ballpoint Pens" />
            {errors.itemName && <p className="field-error">{errors.itemName.message}</p>}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="label">Quantity *</label>
            <input {...register('quantity')} type="number" min={1} className="input" placeholder="1" />
            {errors.quantity && <p className="field-error">{errors.quantity.message}</p>}
          </div>

          <div style={{ marginBottom: 28 }}>
            <label className="label">Remarks (optional)</label>
            <textarea
              {...register('remarks')}
              className="input"
              placeholder="Any additional details…"
              style={{ height: 90, resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: 12, fontSize: '0.95rem' }}
          >
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Submitting…
              </span>
            ) : '🚀 Submit Request'}
          </button>
        </form>
      </div>
    </>
  );
}
