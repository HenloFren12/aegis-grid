import {
  useState,
  type FormEvent,
} from 'react';

import {
  signInWithEmailAndPassword,
} from 'firebase/auth';

import { auth } from '../../config/firebase';

import {
  useNavigate,
} from 'react-router-dom';

export default function Login() {
  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const navigate = useNavigate();

  const handleLogin = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    setError(null);
    setLoading(true);

    try {
      
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      navigate('/dashboard');
    } catch (loginError) {
      console.error(
        'Authentication gate failure:',
        loginError,
      );

      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Invalid operational credentials.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0c',
        color: 'white',
        fontFamily: 'system-ui',
        padding: '1rem',
        boxSizing: 'border-box',
      }}
    >
      <section
        aria-labelledby="login-heading"
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#121216',
          border: '1px solid #22242a',
          borderRadius: '8px',
          padding: '2.5rem',
          boxSizing: 'border-box',
        }}
      >
        {/* Public emergency access.
            This intentionally does NOT require
            organizer/staff authentication. */}
        <div
          style={{
            marginBottom: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                marginBottom: '0.4rem',
              }}
            >
              Aegis Grid
            </div>

            <div
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#f5f5f5',
              }}
            >
              Stadium Safety Command
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate('/sos')
            }
            aria-label="Open public emergency SOS reporting"
            style={{
              width: '100%',
              minHeight: '56px',
              background: '#b71c1c',
              color: 'white',
              border: '1px solid #d32f2f',
              borderRadius: '5px',
              fontWeight: 800,
              fontSize: '1.05rem',
              cursor: 'pointer',
              letterSpacing: '0.5px',
              boxShadow:
                '0 0 15px rgba(183, 28, 28, 0.3)',
            }}
          >
            OPEN EMERGENCY SOS
          </button>

          <p
            style={{
              margin: '0.65rem 0 0',
              color: '#aaa',
              fontSize: '0.8rem',
              lineHeight: 1.4,
            }}
          >
            No login required for emergency
            reporting
          </p>

          <div
            aria-hidden="true"
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.75rem 0 0',
            }}
          >
            <div
              style={{
                flex: 1,
                height: '1px',
                background: '#33363f',
              }}
            />

            <span
              style={{
                padding: '0 0.75rem',
                color: '#777',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                whiteSpace: 'nowrap',
              }}
            >
              Staff Access
            </span>

            <div
              style={{
                flex: 1,
                height: '1px',
                background: '#33363f',
              }}
            />
          </div>
        </div>

        {/* Existing organizer/staff login */}
        <h1
          id="login-heading"
          style={{
            marginTop: 0,
            fontSize: '1.5rem',
            letterSpacing: '0.5px',
            marginBottom: '0.5rem',
          }}
        >
          Command Center Access
        </h1>

        <p
          style={{
            margin:
              '0 0 1.5rem',
            color: '#999',
            fontSize: '0.9rem',
            lineHeight: 1.5,
          }}
        >
          Authorized stadium operations
          personnel only.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              background: '#2a1415',
              border:
                '1px solid #b71c1c',
              color: '#ff8a8a',
              padding:
                '0.75rem 1rem',
              borderRadius: '4px',
              marginBottom:
                '1.25rem',
              fontSize: '0.9rem',
            }}
          >
            Unable to sign in. Check your
            operational credentials and try
            again.
          </div>
        )}

        <form
          onSubmit={handleLogin}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <label
            htmlFor="operator-email"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                color: '#aaa',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Operator Email
            </span>

            <input
              id="operator-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              style={{
                minHeight: '44px',
                background: '#181820',
                border:
                  '1px solid #33363f',
                borderRadius: '4px',
                color: 'white',
                padding: '0 0.75rem',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </label>

          <label
            htmlFor="operator-password"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                color: '#aaa',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Password
            </span>

            <input
              id="operator-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              style={{
                minHeight: '44px',
                background: '#181820',
                border:
                  '1px solid #33363f',
                borderRadius: '4px',
                color: 'white',
                padding: '0 0.75rem',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            style={{
              marginTop: '0.5rem',
              minHeight: '48px',
              background: loading
                ? '#37474f'
                : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: loading
                ? 'wait'
                : 'pointer',
            }}
          >
            {loading
              ? 'Signing in…'
              : 'SIGN IN TO COMMAND CENTER'}
          </button>
        </form>
      </section>
    </main>
  );
}