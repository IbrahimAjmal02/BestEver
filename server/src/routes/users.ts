// 1. Imports needed:
//    - express (default import, same convention as your other route files)
//    - { requireAuth } from '../middleware/requireAuth.js'
//    - { prisma } from '../lib/prisma.js'
import express from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { prisma } from '../lib/prisma.js'


// 2. Create the router:
//    const router = express.Router()
const router = express.Router()


// 3. Define the route — POST /sync, protected by requireAuth.
//    Note this one takes THREE arguments instead of two: path, middleware, handler.
//    Express runs requireAuth first; it only reaches your handler if the token
//    was valid (requireAuth calls next() internally).
//
//    router.post('/sync', requireAuth, async (req, res) => {
//
//      4. Inside the handler — upsert the User row:
//         - use prisma.user.upsert(...)
//         - where: match on firebaseUid (req.firebaseUid)
//         - update: {} (do nothing if it already exists)
//         - create: { firebaseUid: req.firebaseUid, email: req.firebaseEmail }
//
//      5. Send the result back with res.json(...)
//
//    })
router.post('/sync', requireAuth, async (req, res) => {
    if (!req.firebaseUid || !req.firebaseEmail) {
        res.status(401).json({ error: 'Missing Firebase identity on request' })
        return
    }

    const user = await prisma.user.upsert({
        where: { firebaseUid: req.firebaseUid },
        update: {},
        create: { firebaseUid: req.firebaseUid, email: req.firebaseEmail },
    })

    res.json(user)
})

// 6. Export the router (default export, same as your other route files):
//    export default router
export default router
