// Skapar en lösenordshash i det format mock-api/server.js lagrar:  scrypt$<salt>$<hash>
//   node mock-api/hash-password.js "mitt lösenord"
// Lösenord lagras aldrig i klartext – inte ens i ett test-API. scrypt är avsiktligt långsam
// (~50 ms), vilket gör gissning dyr. Saltet gör att två lika lösenord får olika hash.
const crypto = require('node:crypto')

const password = process.argv[2]
if (!password) {
  console.error('Användning: node mock-api/hash-password.js "<lösenord>"')
  process.exit(1)
}
const salt = crypto.randomBytes(16).toString('hex')
const hash = crypto.scryptSync(password, salt, 64).toString('hex')
console.log(`scrypt$${salt}$${hash}`)
