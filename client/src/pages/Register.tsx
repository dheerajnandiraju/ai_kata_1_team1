import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

type FormData = z.infer<typeof schema>;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.register(data);
      setAuth(res.data.user, res.data.accessToken);
      toast.success('Account created!');
      navigate('/employee');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Registration failed';
      toast.error(msg);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit(onSubmit)} style={styles.card}>
        <h2 style={styles.title}>Create Account</h2>

        <label style={styles.label}>Full Name</label>
        <input {...register('name')} style={styles.input} placeholder="Jane Doe" />
        {errors.name && <span style={styles.error}>{errors.name.message}</span>}

        <label style={styles.label}>Email</label>
        <input {...register('email')} type="email" style={styles.input} placeholder="you@company.com" />
        {errors.email && <span style={styles.error}>{errors.email.message}</span>}

        <label style={styles.label}>Password</label>
        <input {...register('password')} type="password" style={styles.input} placeholder="Min 8 chars, uppercase + number" />
        {errors.password && <span style={styles.error}>{errors.password.message}</span>}

        <button type="submit" disabled={isSubmitting} style={styles.button}>
          {isSubmitting ? 'Creating…' : 'Create Account'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem' }}>
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' },
  card: { background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  title: { textAlign: 'center', marginBottom: '0.5rem' },
  label: { fontWeight: 600, fontSize: '0.875rem' },
  input: { padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '1rem' },
  error: { color: '#ef4444', fontSize: '0.75rem' },
  button: { marginTop: '0.5rem', padding: '0.65rem', borderRadius: '4px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' },
};

export default Register;
