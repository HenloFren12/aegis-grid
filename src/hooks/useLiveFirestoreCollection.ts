import { useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export function useLiveFirestoreCollection<T>(
  collectionName: string,
  onUpdate: (docs: Record<string, T>) => void
): void {
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, collectionName), 
      (snapshot) => {
        const docs: Record<string, T> = {};
        snapshot.forEach(doc => { 
          docs[doc.id] = doc.data() as T; 
        });
        onUpdate(docs);
      },
      (error) => console.error(`Sync error on ${collectionName}:`, error)
    );
    
    return () => unsub(); // Strict memory cleanup
  }, [collectionName, onUpdate]);
}