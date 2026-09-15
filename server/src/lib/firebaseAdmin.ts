import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import serviceAccount from '../../firebase/firebase-service-account.json' with { type: 'json' }

const app = initializeApp({
  credential: cert(serviceAccount as object),
})

export const adminAuth = getAuth(app)
