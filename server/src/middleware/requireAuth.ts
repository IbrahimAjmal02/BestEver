import type { NextFunction, Request, Response } from 'express'
import { adminAuth } from '../lib/firebaseAdmin.js'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }

  const token = authHeader.slice('Bearer '.length)

  try {
    const decoded = await adminAuth.verifyIdToken(token)
    req.firebaseUid = decoded.uid
    req.firebaseEmail = decoded.email
    req.firebaseEmailVerified = decoded.email_verified
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
