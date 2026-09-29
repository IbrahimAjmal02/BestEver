const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY
const testEmail = `besteve-authmsg-test-${Date.now()}@example.com`
const testPassword = 'Test-password-123!'

async function main() {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, password: testPassword, returnSecureToken: true }),
  })
  const data = await res.json()
  console.log(JSON.stringify({ email: testEmail, password: testPassword, localId: data.localId }))
}

main()
