import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Sourced from env vars, not the service account JSON file directly — that
// file is a compile-time import target if imported directly, which
// conflicts with it being excluded from the Docker build context (it
// should never be baked into an image). Same pattern as every other
// secret in this project (DATABASE_URL, API keys): comes in at runtime.
// FIREBASE_PRIVATE_KEY needs the \n replace because PEM newlines get
// stored as literal two-character "\n" sequences in an env var/K8s Secret,
// not real newlines.
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})

export const adminAuth = getAuth(app)
