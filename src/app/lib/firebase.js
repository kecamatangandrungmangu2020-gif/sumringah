import { firestore, auth, app } from '@/firebase/init';

export const db = firestore;
export { firestore, auth, app };
export default db;
