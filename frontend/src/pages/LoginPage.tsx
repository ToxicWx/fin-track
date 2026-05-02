import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/providers/use-auth';
import { AuthShell } from '../shared/components/AuthShell';
import { Button } from '../shared/components/ui/Button';
import { Input } from '../shared/components/ui/Input';
import { getApiErrorMessage } from '../shared/lib/api-errors';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: string } | undefined)?.from ?? '/dashboard';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to sign in.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Login"
      title="Sign in"
      description="Log in to continue."
      asideTitle=""
      asideItems={[]}
      variant="minimal"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Password"
          type="password"
          placeholder="........"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <div className="form-error">{error}</div> : null}
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>
      <p className="auth-footer">
        No account yet? <Link to="/register">Register</Link>
      </p>
    </AuthShell>
  );
}
