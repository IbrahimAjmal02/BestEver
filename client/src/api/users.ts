// 1. Import needed:
//    - { apiFetch } from './client' (same helper getCategories() uses)
import { apiFetch } from './client'

// 2. Define the shape of what the backend returns from POST /users/sync
//    (matches your Prisma User model): id, email, firebaseUid, createdAt
//    Same pattern as the `Category` interface in api/categories.ts.
//
//    export interface SyncedUser {
//      id: string
//      email: string
//      firebaseUid: string
//      createdAt: string
//    }
export interface SyncedUser {
    id: string
    email: string
    firebaseUid: string
    createdAt: string
}

export function syncUser(idToken: string): Promise<SyncedUser> {
    return apiFetch<SyncedUser>('/users/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
    })
}

// 3. Write syncUser(idToken: string) — calls POST /users/sync with the
//    token attached as an Authorization header.
//
//    export function syncUser(idToken: string): Promise<SyncedUser> {
//      return apiFetch<SyncedUser>('/users/sync', {
//        method: 'POST',
//        headers: { Authorization: `Bearer ${idToken}` },
//      })
//    }
