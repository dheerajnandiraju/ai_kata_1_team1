import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});
type Form = z.infer<typeof schema>;

export default function Register() {
  const { register: registerUser } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    try {
      await registerUser(data.name, data.email, data.password);
    } catch {
      toast.error('Registration failed');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 20,
    }}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="animate-pop-in"
        style={{
          background: '#fff',
          padding: '40px 36px',
          borderRadius: 16,
          width: 400,
          maxWidth: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,.2)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🚀</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#1e293b' }}>Create Account</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>Join the supply management system</p>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label className="label">Name</label>
          <input {...register('name')} className="input" placeholder="John Doe" />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </div>

        <div style={{ marginBottom: 18 }}>
          <label className="label">Email</label>
          <input {...register('email')} type="email" className="input" placeholder="you@company.com" />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label className="label">Password</label>
          <input {...register('password')} type="password" className="input" placeholder="••••••••" />
          {errors.password && <p className="field-error">{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%', padding: 12, fontSize: '0.95rem' }}>
          {isSubmitting ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Registering…
            </span>
          ) : 'Create Account'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, color: '#64748b', fontSize: '0.9rem' }}>
          Have an account?{' '}
          <Link to="/login" style={{ color: '#4f46e5', fontWeight: 600, transition: 'color 0.2s' }}>Sign in</Link>
        </p>
      </form>
    </div>
  );
}
