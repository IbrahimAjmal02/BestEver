declare namespace Express {
  export interface Request {
    firebaseUid?: string
    firebaseEmail?: string
    firebaseEmailVerified?: boolean
  }
}
