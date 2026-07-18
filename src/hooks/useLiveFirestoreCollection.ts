import {
  useEffect,
  useRef,
} from 'react';

import {
  collection,
  onSnapshot,
} from 'firebase/firestore';

import { db } from '../config/firebase';

export interface LiveCollectionState<T> {
  documents: Record<string, T>;
  error: Error | null;
}

export function useLiveFirestoreCollection<T>(
  collectionName: string,
  onUpdate: (
    documents: Record<string, T>,
  ) => void,
  onError?: (error: Error) => void,
): void {
  const onUpdateRef =
    useRef(onUpdate);

  const onErrorRef =
    useRef(onError);

  useEffect(() => {
    onUpdateRef.current =
      onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    onErrorRef.current =
      onError;
  }, [onError]);

  useEffect(() => {
    if (!collectionName.trim()) {
      return undefined;
    }

    const unsubscribe =
      onSnapshot(
        collection(
          db,
          collectionName,
        ),

        (snapshot) => {
          const documents: Record<
            string,
            T
          > = {};

          for (const document of snapshot.docs) {
            documents[
              document.id
            ] = {
              id: document.id,
              ...document.data(),
            } as T;
          }

          onUpdateRef.current(
            documents,
          );
        },

        (firestoreError) => {
          console.error(
            `[Firestore] Failed to synchronize "${collectionName}".`,
            firestoreError,
          );

          onErrorRef.current?.(
            firestoreError,
          );
        },
      );

    return unsubscribe;
  }, [collectionName]);
}