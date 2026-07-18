import {
  useState,
  type FormEvent,
} from 'react';

import {
  addDoc,
  collection,
} from 'firebase/firestore';

import { db } from '../../config/firebase';

type Category =
  | 'medical'
  | 'security'
  | 'lost_child'
  | 'other';

interface StadiumZone {
  lat: number;
  lng: number;
}

const STADIUM_ZONES: Record<
  string,
  StadiumZone
> = {
  'North Gate': {
    lat: 40.7128,
    lng: -74.006,
  },

  'South Gate': {
    lat: 40.712,
    lng: -74.006,
  },

  'Section 100s': {
    lat: 40.7125,
    lng: -74.0055,
  },

  'Section 200s': {
    lat: 40.7125,
    lng: -74.0065,
  },
};

export default function SOSScreen() {
  const [
    category,
    setCategory,
  ] =
    useState<Category | null>(
      null,
    );

  const [
    description,
    setDescription,
  ] = useState('');

  const [zone, setZone] =
    useState('');

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [
    success,
    setSuccess,
  ] = useState(false);

  const writeReport =
    async (
      lat: number,
      lng: number,
      geofenceOk: boolean,
    ) => {
      if (!category) {
        throw new Error(
          'Emergency category is required.',
        );
      }

      const trimmedDescription =
        description
          .trim()
          .slice(0, 280);

      await addDoc(
        collection(
          db,
          'reports',
        ),

        {
          category,

          lat,
          lng,

          text: zone
            ? `[Manual Zone: ${zone}] ${
                trimmedDescription ||
                'Emergency assistance requested.'
              }`
            : trimmedDescription ||
              'Emergency assistance requested.',

          source: 'fan',

          timestampMs:
            Date.now(),

          geofenceOk,
        },
      );
    };

  const submitWithCoordinates =
    async (
      lat: number,
      lng: number,
      geofenceOk: boolean,
    ) => {
      try {
        await writeReport(
          lat,
          lng,
          geofenceOk,
        );

        setSuccess(true);
      } catch (submitError) {
        console.error(
          'SOS submission failed:',
          submitError,
        );

        setError(
          submitError instanceof
            Error
            ? `Failed to send report: ${submitError.message}`
            : 'Failed to send the emergency report.',
        );
      } finally {
        setIsSubmitting(
          false,
        );
      }
    };

  const handleSubmit =
    async (
      event: FormEvent,
    ) => {
      event.preventDefault();

      if (!category) {
        setError(
          'Please select an emergency category.',
        );

        return;
      }

      setError(null);
      setIsSubmitting(true);

      if (zone) {
        const coordinates =
          STADIUM_ZONES[zone];

        if (!coordinates) {
          setError(
            'The selected stadium zone is invalid.',
          );

          setIsSubmitting(
            false,
          );

          return;
        }

        await submitWithCoordinates(
          coordinates.lat,
          coordinates.lng,
          false,
        );

        return;
      }

      if (
        !navigator.geolocation
      ) {
        setError(
          "Your device doesn't support GPS. Please select the nearest stadium zone.",
        );

        setIsSubmitting(
          false,
        );

        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          void submitWithCoordinates(
            position.coords
              .latitude,

            position.coords
              .longitude,

            true,
          );
        },

        () => {
          setError(
            "We couldn't detect your location. Please select the nearest gate or stadium section.",
          );

          setIsSubmitting(
            false,
          );
        },

        {
          enableHighAccuracy:
            true,

          timeout: 10_000,

          maximumAge: 30_000,
        },
      );
    };

  if (success) {
    return (
      <main
        style={{
          minHeight:
            '100vh',
          display: 'grid',
          placeItems:
            'center',
          padding: '2rem',
          textAlign:
            'center',
          fontFamily:
            'system-ui',
        }}
      >
        <div>
          <h1
            style={{
              color:
                '#2e7d32',
            }}
          >
            Report sent
            successfully.
          </h1>

          <p>
            Stadium operations
            have received your
            emergency report and
            location information.
          </p>

          <button
            type="button"
            onClick={() => {
              setSuccess(false);
              setCategory(null);
              setDescription('');
              setZone('');
            }}
            style={{
              marginTop:
                '1.5rem',
              padding:
                '1rem',
              cursor:
                'pointer',
            }}
          >
            Submit Another
            Report
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '1rem',
        fontFamily:
          'system-ui',
      }}
    >
      <h1
        style={{
          color: '#b71c1c',
        }}
      >
        Emergency SOS
      </h1>

      <p>
        Select the emergency
        type and your nearest
        stadium location. If no
        location is selected,
        Aegis will request your
        device location.
      </p>

      {error && (
        <div
          role="alert"
          style={{
            background:
              '#ffebee',
            color: '#b71c1c',
            padding: '1rem',
            marginBottom:
              '1rem',
            border:
              '1px solid #ef9a9a',
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={
          handleSubmit
        }
        style={{
          display: 'flex',
          flexDirection:
            'column',
          gap: '1rem',
        }}
      >
        <fieldset
          style={{
            border: 0,
            padding: 0,
            margin: 0,
          }}
        >
          <legend
            style={{
              fontWeight:
                'bold',
              marginBottom:
                '0.75rem',
            }}
          >
            Emergency category
          </legend>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(2, minmax(0, 1fr))',
              gap: '0.5rem',
            }}
          >
            {(
              [
                'medical',
                'security',
                'lost_child',
                'other',
              ] as Category[]
            ).map(
              (
                categoryOption,
              ) => (
                <button
                  key={
                    categoryOption
                  }
                  type="button"
                  aria-pressed={
                    category ===
                    categoryOption
                  }
                  onClick={() =>
                    setCategory(
                      categoryOption,
                    )
                  }
                  style={{
                    minHeight:
                      '48px',
                    padding:
                      '1rem',

                    border: `2px solid ${
                      category ===
                      categoryOption
                        ? '#b71c1c'
                        : '#777'
                    }`,

                    background:
                      category ===
                      categoryOption
                        ? '#ffebee'
                        : 'white',

                    color:
                      category ===
                      categoryOption
                        ? '#b71c1c'
                        : '#121212',

                    fontWeight:
                      'bold',

                    cursor:
                      'pointer',

                    textTransform:
                      'capitalize',
                  }}
                >
                  {categoryOption.replace(
                    '_',
                    ' ',
                  )}
                </button>
              ),
            )}
          </div>
        </fieldset>

        <label>
          <span
            style={{
              display:
                'block',
              fontWeight:
                'bold',
              marginBottom:
                '0.4rem',
            }}
          >
            Nearest location
          </span>

          <select
            value={zone}
            onChange={(
              event,
            ) =>
              setZone(
                event.target
                  .value,
              )
            }
            style={{
              width: '100%',
              minHeight:
                '48px',
              padding: '0.8rem',
              border:
                '1px solid #777',
            }}
          >
            <option value="">
              Use my current
              location
            </option>

            {Object.keys(
              STADIUM_ZONES,
            ).map(
              (
                zoneName,
              ) => (
                <option
                  key={
                    zoneName
                  }
                  value={
                    zoneName
                  }
                >
                  {zoneName}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          <span
            style={{
              display:
                'block',
              fontWeight:
                'bold',
              marginBottom:
                '0.4rem',
            }}
          >
            Additional details
          </span>

          <textarea
            rows={4}
            maxLength={280}
            placeholder="Describe what is happening..."
            value={
              description
            }
            onChange={(
              event,
            ) =>
              setDescription(
                event.target
                  .value,
              )
            }
            style={{
              width: '100%',
              boxSizing:
                'border-box',
              padding: '1rem',
              border:
                '1px solid #777',
            }}
          />

          <small>
            {
              description.length
            }
            /280 characters
          </small>
        </label>

        <button
          type="submit"
          disabled={
            isSubmitting
          }
          aria-busy={
            isSubmitting
          }
          style={{
            minHeight:
              '52px',
            background:
              '#b71c1c',
            color: 'white',
            padding: '1rem',
            fontWeight:
              'bold',
            border: 'none',
            cursor:
              isSubmitting
                ? 'wait'
                : 'pointer',
          }}
        >
          {isSubmitting
            ? 'Sending emergency report…'
            : 'SEND SOS NOW'}
        </button>
      </form>
    </main>
  );
}