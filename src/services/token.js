// Access token lever HÄR – i en variabel i minnet – och ingen annanstans.
// Inte i localStorage (allt JavaScript på sidan kan läsa det, även ett skript en angripare fått in),
// inte i en cookie (då skickas den med automatiskt, även från andra sajter).
// Priset: den försvinner vid omladdning. Det löser refresh-cookien: appen ber om en ny vid start.
import { ref } from 'vue'

// En ref, så att "är vi inloggade?" i storen räknas om när token byts
const accessToken = ref(null)

export const getAccessToken = () => accessToken.value
export const setAccessToken = (token) => {
  accessToken.value = token || null
}
