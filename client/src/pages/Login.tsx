import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { Package, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import type { CSSProperties } from 'react';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function onSubmit(data: FormData) {
    try {
      const res = await authApi.login(data);
      const { user, accessToken } = res.data as { user: { _id: string; name: string; email: string; role: 'admin' | 'employee' }; accessToken: string };
      setAuth(user, accessToken);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? 'Login failed');
    }
  }

  return (
    <div style={pageStyle}>
      {/* Left decorative panel */}
      <div style={leftPanelStyle}>
        <div style={brandBoxStyle}>
          <div style={logoStyle}><Package size={32} color="#fff" /></div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>OSMS</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', maxWidth: 280, textAlign: 'center', lineHeight: 1.7 }}>
            Office Supply Management System — streamline your workplace procurement.
          </p>
        </div>
        <div style={decorDotsStyle} />
      </div>

      {/* Right form panel */}
      <div style={rightPanelStyle}>
        <div style={formContainerStyle}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem' }}>Welcome back</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <label style={labelStyle}>Email address</label>
              <div style={inputWrapperStyle}>
                <Mail size={17} color="var(--text-light)" style={{ flexShrink: 0 }} />
                <input {...register('email')} type="email" placeholder="you@company.com" style={inputStyle} />
              </div>
              {errors.email && <p style={errStyle}>{errors.email.message}</p>}
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <div style={inputWrapperStyle}>
                <Lock size={17} color="var(--text-light)" style={{ flexShrink: 0 }} />
                <input {...register('password')} type="password" placeholder="••••••••" style={inputStyle} />
              </div>
              {errors.password && <p style={errStyle}>{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} style={btnStyle}>
              {isSubmitting ? <Loader2 size={18} className="spin" /> : <><span>Sign In</span><ArrowRight size={17} /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.75rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Don't have an account?{' '}
            <Link to="/register" style={linkStyle}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */
const pageStyle: CSSProperties = { minHeight: '100vh', display: 'flex' };
const leftPanelStyle: CSSProperties = {
  width: '45%', minHeight: '100vh', position: 'relative', overflow: 'hidden',
  background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 60%, #1e1b4b 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const brandBoxStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', zIndex: 1,
};
const logoStyle: CSSProperties = {
  width: 64, height: 64, borderRadius: '16px',
  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 8px 24px rgba(76, 110, 245, 0.35)',
};
const decorDotsStyle: CSSProperties = {
  position: 'absolute', bottom: '-60px', right: '-60px',
  width: 300, height: 300, borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)',
};
const rightPanelStyle: CSSProperties = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '2rem', background: 'var(--surface)',
};
const formContainerStyle: CSSProperties = { width: '100%', maxWidth: 400 };
const labelStyle: CSSProperties = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600,
  color: 'var(--text)', marginBottom: '6px',
};
const inputWrapperStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px',
  padding: '0 14px', border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-md)', background: 'var(--surface-dim)',
  transition: 'var(--transition)',
};
const inputStyle: CSSProperties = {
  flex: 1, padding: '11px 0', border: 'none', outline: 'none',
  background: 'transparent', fontSize: '0.9rem', color: 'var(--text)',
};
const errStyle: CSSProperties = {
  color: 'var(--danger)', fontSize: '0.78rem', marginTop: '4px',
};
const btnStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  width: '100%', padding: '12px', marginTop: '0.5rem',
  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
  color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
  fontWeight: 600, fontSize: '0.92rem',
  boxShadow: '0 4px 14px rgba(76, 110, 245, 0.3)',
  transition: 'var(--transition)',
};
const linkStyle: CSSProperties = {
  color: 'var(--primary-500)', fontWeight: 600, textDecoration: 'none',
};
