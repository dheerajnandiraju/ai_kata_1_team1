import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.user, res.data.accessToken);
      toast.success('Welcome back!');
      navigate(res.data.user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-grid">
          <aside className="auth-hero">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-100">Office Supply Management</p>
            <h1 className="mt-3 text-4xl leading-tight">Handle Requests Faster, Keep Inventory Clear.</h1>
            <p className="mt-4 text-sm text-emerald-50/90">
              One place for employee requests, approvals, and stock visibility.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-emerald-50/90">
              <li className="rounded-xl bg-emerald-950/20 px-3 py-2">Live role dashboards for admins and employees</li>
              <li className="rounded-xl bg-emerald-950/20 px-3 py-2">Approval workflows with request history</li>
              <li className="rounded-xl bg-emerald-950/20 px-3 py-2">Low stock alerts and inventory controls</li>
            </ul>
          </aside>

          <main className="p-6 md:p-8">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Welcome Back</p>
              <h2 className="mt-2 text-3xl text-slate-900">Sign In</h2>
              <p className="mt-2 text-sm text-slate-500">Use your work account to continue.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary w-full disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-900">
              <p className="font-semibold">Demo credentials</p>
              <p className="mt-1">Admin: admin@company.com / Admin@12345</p>
              <p>Employee: employee@company.com / Employee@12345</p>
            </div>

            <p className="mt-4 text-sm text-slate-600">
              No account?{' '}
              <Link to="/register" className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline">Register</Link>
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}
