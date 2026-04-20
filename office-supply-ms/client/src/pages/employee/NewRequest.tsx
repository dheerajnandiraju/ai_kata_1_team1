import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';

const schema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  remarks: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewRequest() {
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const navigate = useNavigate();
  const [isGeneratingRemarks, setIsGeneratingRemarks] = useState(false);

  const handleAiAssist = async () => {
    const values = getValues();
    const itemName = values.itemName?.trim();
    const quantity = Number(values.quantity);

    if (!itemName || !Number.isFinite(quantity) || quantity < 1) {
      toast.error('Enter item name and quantity first for AI assist');
      return;
    }

    setIsGeneratingRemarks(true);
    try {
      const response = await api.post('/ai/request-assist', {
        mode: 'request-remarks',
        itemName,
        quantity,
        remarks: values.remarks || undefined,
      });

      const suggestion = String(response.data?.suggestion || '').trim();
      if (!suggestion) {
        toast.error('AI returned an empty suggestion');
        return;
      }

      setValue('remarks', suggestion, { shouldDirty: true });
      toast.success('AI suggestion added to remarks');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate AI suggestion');
    } finally {
      setIsGeneratingRemarks(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/requests', data);
      toast.success('Request submitted successfully!');
      reset();
      navigate('/employee/history');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    }
  };

  return (
    <div className="page-wrap max-w-4xl">
      <div className="mb-6">
        <h1 className="page-title">New Supply Request</h1>
        <p className="page-subtitle">Describe the item and quantity you need. You can add context for faster approval.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="panel">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Item Name *</label>
              <input
                {...register('itemName')}
                placeholder="e.g. Staplers, A4 Paper, Pens"
              />
              {errors.itemName && <p className="mt-1 text-xs text-rose-600">{errors.itemName.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Quantity *</label>
              <input
                {...register('quantity')}
                type="number"
                min={1}
                placeholder="1"
              />
              {errors.quantity && <p className="mt-1 text-xs text-rose-600">{errors.quantity.message}</p>}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="block text-sm font-semibold text-slate-700">Remarks (optional)</label>
                <button
                  type="button"
                  onClick={handleAiAssist}
                  disabled={isGeneratingRemarks || isSubmitting}
                  className="btn btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
                >
                  {isGeneratingRemarks ? 'Generating...' : 'AI Assist'}
                </button>
              </div>
              <textarea
                {...register('remarks')}
                rows={4}
                className="resize-none"
                placeholder="Any extra details that help the admin review faster"
              />
              <p className="mt-1 text-xs text-slate-500">
                AI Assist generates concise, approval-friendly remarks based on item and quantity.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary w-full sm:w-auto disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting…' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn btn-secondary w-full sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <aside className="panel-soft h-fit">
          <h2 className="text-lg text-slate-900">Tips For Faster Approval</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Use exact item names your office already uses.</li>
            <li>Request realistic quantities for your team size.</li>
            <li>Add a short note when the request is urgent.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
