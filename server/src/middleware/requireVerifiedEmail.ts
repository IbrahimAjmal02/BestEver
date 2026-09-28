import type { NextFunction, Request, Response } from 'express'

// Runs AFTER requireAuth, not merged into it — verification shouldn't gate
// every authenticated route. POST /users/sync in particular runs right
// after signup, before there's been time to click a verification email; if
// that route required verification too, the very first sync call would
// fail and break the signup flow. Only apply this to routes that actually
// need it (casting/changing a vote).
export function requireVerifiedEmail(req: Request, res: Response, next: NextFunction) {
  if (!req.firebaseEmailVerified) {
    res.status(403).json({ error: 'Please verify your email address before voting' })
    return
  }

  next()
}
