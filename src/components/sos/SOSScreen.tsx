import {
  useState,
  type FormEvent,
} from 'react';

import {
  addDoc,
  collection,
} from 'firebase/firestore';

import { db } from '../../config/firebase';

import {
  STADIUM_GATE_LIST,
  STADIUM_GATES,
  type GateId,
} from '../../config/stadiumConfig';

type Category =
  | 'medical'
  | 'security'
  | 'lost_child'
  | 'other';

const CATEGORY_LABELS: Record<Category, string> = {
  medical: 'Medical',
  security: 'Security',
  lost_child: 'Lost Child',
  other: 'Other Emergency',
};

export default function SOSScreen() {
  const [category, setCategory] =
    useState<Category | null>(null);

  const [description, setDescription] =
    useState('');

  const [gateId, setGateId] =
    useState<GateId | ''>('');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

  async function submitReport(
    lat: number,
    lng: number,
    geofenceOk: boolean,
    selectedGateId: GateId | null,
  ): Promise<void> {
    if (!category) {
      throw new Error(
        'Emergency category is required.',
      );
    }

    const trimmedDescription =
      description.trim().slice(0, 280);

    const locationLabel =
      selectedGateId
        ? STADIUM_GATES[selectedGateId].name
        : 'GPS location';

    await addDoc(
      collection(db, 'reports'),
      {
        category,
        lat,
        lng,

        text:
          trimmedDescription ||
          `${CATEGORY_LABELS[category]} assistance requested.`,

        source: 'fan',

        timestampMs: Date.now(),

        geofenceOk,

        gateId: selectedGateId,

        locationLabel,

        provenance: 'live_sos',
      },
    );
  }

  async function submitAtGate(
    selectedGateId: GateId,
  ): Promise<void> {
    const gate =
      STADIUM_GATES[selectedGateId];

    await submitReport(
      gate.lat,
      gate.lng,
      false,
      selectedGateId,
    );
  }

  const handleSubmit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    if (!category) {
      setError(
        'Please select the type of emergency.',
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (gateId) {
        await submitAtGate(gateId);
        setSuccess(true);
        return;
      }

      if (!navigator.geolocation) {
        throw new Error(
          'Location detection is unavailable. Please select your nearest gate.',
        );
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          void (async () => {
            try {
              await submitReport(
                position.coords.latitude,
                position.coords.longitude,
                true,
                null,
              );

              setSuccess(true);
            } catch (submitError) {
              console.error(
                'SOS submission failed:',
                submitError,
              );

              setError(
                submitError instanceof Error
                  ? submitError.message
                  : 'Unable to send the emergency report.',
              );
            } finally {
              setIsSubmitting(false);
            }
          })();
        },

        () => {
          setError(
            'We could not detect your location. Select your nearest gate and submit again.',
          );

          setIsSubmitting(false);
        },

        {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 30_000,
        },
      );

      return;
    } catch (submitError) {
      console.error(
        'SOS submission failed:',
        submitError,
      );

      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to send the emergency report.',
      );
    } finally {
      if (gateId) {
        setIsSubmitting(false);
      }
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setCategory(null);
    setDescription('');
    setGateId('');
    setError(null);
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #090a0d 0%, #111318 100%)',
        color: '#f5f7fa',
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        boxSizing: 'border-box',
        padding: 'clamp(1rem, 4vw, 2rem)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          margin: '0 auto',
        }}
      >
        <header
          style={{
            marginBottom: '1.75rem',
          }}
        >
          <div
            style={{
              color: '#8b949e',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              marginBottom: '0.5rem',
            }}
          >
            Aegis Grid · Public Emergency Access
          </div>

          <h1
            style={{
              color: '#ff5252',
              margin: 0,
              fontSize: 'clamp(1.8rem, 6vw, 2.7rem)',
              lineHeight: 1.1,
            }}
          >
            Emergency SOS
          </h1>

          <p
            style={{
              color: '#c7cbd1',
              lineHeight: 1.6,
              margin: '0.75rem 0 0',
              maxWidth: '580px',
            }}
          >
            Send an emergency signal directly to
            stadium operations. No login is required.
          </p>
        </header>

        {success ? (
          <section
            aria-live="polite"
            style={{
              background: '#15181e',
              border: '1px solid #2f3742',
              borderRadius: '12px',
              padding: 'clamp(1.5rem, 5vw, 2.5rem)',
              textAlign: 'center',
              boxShadow:
                '0 18px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 1rem',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: '#12351f',
                border: '1px solid #2e7d32',
                color: '#69f0ae',
                fontSize: '2rem',
                fontWeight: 800,
              }}
            >
              ✓
            </div>

            <h2
              style={{
                color: '#69f0ae',
                margin: '0 0 0.75rem',
                fontSize: '1.6rem',
              }}
            >
              Emergency report sent
            </h2>

            <p
              style={{
                color: '#c7cbd1',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Stadium operations have received your
              emergency signal and location information.
              The report is now entering the live incident
              assessment pipeline.
            </p>

            <button
              type="button"
              onClick={resetForm}
              style={{
                width: '100%',
                minHeight: '50px',
                marginTop: '1.75rem',
                border: '1px solid #4b5563',
                borderRadius: '7px',
                background: '#242932',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Submit another report
            </button>
          </section>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              background: '#15181e',
              border: '1px solid #2f3742',
              borderRadius: '12px',
              padding: 'clamp(1.1rem, 4vw, 2rem)',
              boxShadow:
                '0 18px 50px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.6rem',
            }}
          >
            {error && (
              <div
                role="alert"
                style={{
                  background: '#351719',
                  color: '#ffb4b4',
                  border: '1px solid #8e3035',
                  padding: '1rem',
                  borderRadius: '7px',
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            <fieldset
              style={{
                border: 0,
                margin: 0,
                padding: 0,
                minWidth: 0,
              }}
            >
              <legend
                style={{
                  display: 'block',
                  width: '100%',
                  color: '#f5f7fa',
                  fontWeight: 750,
                  fontSize: '1rem',
                  lineHeight: 1.4,
                  marginBottom: '0.9rem',
                }}
              >
                What kind of help is needed?
              </legend>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(135px, 1fr))',
                  gap: '0.7rem',
                }}
              >
                {(
                  Object.keys(
                    CATEGORY_LABELS,
                  ) as Category[]
                ).map((item) => {
                  const selected =
                    category === item;

                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setCategory(item)
                      }
                      style={{
                        minHeight: '58px',
                        padding: '0.75rem',
                        border: selected
                          ? '2px solid #ff5252'
                          : '1px solid #4b5563',
                        borderRadius: '7px',
                        background: selected
                          ? '#3a1719'
                          : '#20242b',
                        color: selected
                          ? '#ff8a8a'
                          : '#f1f3f5',
                        fontWeight: 750,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                      }}
                    >
                      {CATEGORY_LABELS[item]}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label
              htmlFor="sos-location"
              style={{
                display: 'block',
              }}
            >
              <span
                style={{
                  display: 'block',
                  color: '#f5f7fa',
                  fontWeight: 750,
                  marginBottom: '0.65rem',
                }}
              >
                Where are you?
              </span>

              <select
                id="sos-location"
                value={gateId}
                onChange={(event) =>
                  setGateId(
                    event.target.value as GateId | '',
                  )
                }
                style={{
                  width: '100%',
                  minHeight: '54px',
                  boxSizing: 'border-box',
                  padding: '0 0.85rem',
                  border: '1px solid #4b5563',
                  borderRadius: '7px',
                  background: '#20242b',
                  color: '#f5f7fa',
                  fontSize: '1rem',
                }}
              >
                <option value="">
                  I don't know — use my device location
                </option>

                {STADIUM_GATE_LIST.map((gate) => (
                  <option
                    key={gate.id}
                    value={gate.id}
                  >
                    {gate.name}
                  </option>
                ))}
              </select>
            </label>

            <label
              htmlFor="sos-description"
              style={{
                display: 'block',
              }}
            >
              <span
                style={{
                  display: 'block',
                  color: '#f5f7fa',
                  fontWeight: 750,
                  marginBottom: '0.65rem',
                }}
              >
                What is happening?
              </span>

              <textarea
                id="sos-description"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                maxLength={280}
                rows={5}
                placeholder="Briefly describe what you can see or what help is needed…"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  padding: '0.9rem',
                  border: '1px solid #4b5563',
                  borderRadius: '7px',
                  background: '#20242b',
                  color: '#f5f7fa',
                  fontSize: '1rem',
                  lineHeight: 1.5,
                }}
              />

              <div
                style={{
                  marginTop: '0.4rem',
                  textAlign: 'right',
                  color: '#8b949e',
                  fontSize: '0.78rem',
                }}
              >
                {description.length}/280
              </div>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              style={{
                width: '100%',
                minHeight: '58px',
                border: '1px solid #d32f2f',
                borderRadius: '7px',
                background: isSubmitting
                  ? '#6b2b2e'
                  : '#b71c1c',
                color: '#fff',
                fontSize: '1.05rem',
                fontWeight: 850,
                letterSpacing: '0.03em',
                cursor: isSubmitting
                  ? 'wait'
                  : 'pointer',
              }}
            >
              {isSubmitting
                ? 'SENDING EMERGENCY REPORT…'
                : 'SEND EMERGENCY SOS'}
            </button>

            <p
              style={{
                color: '#8b949e',
                fontSize: '0.78rem',
                lineHeight: 1.5,
                margin: 0,
                textAlign: 'center',
              }}
            >
              Emergency reports are sent directly to the
              stadium operations incident pipeline.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}