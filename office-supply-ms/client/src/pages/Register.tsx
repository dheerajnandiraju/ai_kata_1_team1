import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'At least 6 characters'),
});
type FormData = z.infer<typeof schema>;

export default function Register() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const navigate = useNavigate();

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/register', data);
      toast.success('Account created! Please log in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-grid">
          <aside className="auth-hero">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-100">New Team Member</p>
            <h1 className="mt-3 text-4xl leading-tight">Create Your Workspace Account.</h1>
            <p className="mt-4 text-sm text-emerald-50/90">
              Start submitting requests, track status updates, and collaborate with the admin team.
            </p>
            <div className="mt-8 space-y-3 text-sm text-emerald-50/90">
              <p className="rounded-xl bg-emerald-950/20 px-3 py-2">Secure sign-in and role-based access</p>
              <p className="rounded-xl bg-emerald-950/20 px-3 py-2">Full request timeline with filtering</p>
              <p className="rounded-xl bg-emerald-950/20 px-3 py-2">Live approval and inventory workflows</p>
            </div>
          </aside>

          <main className="p-6 md:p-8">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Get Started</p>
              <h2 className="mt-2 text-3xl text-slate-900">Create Account</h2>
              <p className="mt-2 text-sm text-slate-500">Register with your company email.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Full Name</label>
                <input
                  {...register('name')}
                  placeholder="Jane Smith"
                />
                {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@company.com"
                />
                {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
                <input
                  {...register('password')}
                  type="password"
                  placeholder="At least 6 characters"
                />
                {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary w-full disabled:opacity-60"
              >
                {isSubmitting ? 'Creating…' : 'Create Account'}
              </button>
            </form>

            <p className="mt-4 text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline">Sign in</Link>
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}
