<template>
  <div class="login-wrap">
    <form class="card login-card" novalidate @submit.prevent="handleLogin">
      <img src="../assets/logo-dark.svg" class="login-logo">
      <h1>Logga in på Mina sidor</h1>
      <input type="email" placeholder="E-postadress" v-model="email" autocomplete="username">
      <input type="password" placeholder="Lösenord" v-model="password" autocomplete="current-password">
      <p v-if="error" role="alert" class="login-error">{{ error }}</p>
      <button class="btn" style="width:100%" type="submit" :disabled="busy">{{ busy ? 'Loggar in…' : 'Logga in' }}</button>
      <p class="hint" style="margin-top:10px">Problem att logga in? Ring kundservice 020-123 456</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { AuthError } from '../services/api'

const email = ref('')
const password = ref('')
const error = ref(null)
const busy = ref(false)
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const handleLogin = async () => {
  error.value = null
  busy.value = true
  try {
    await auth.login(email.value, password.value)
    // tillbaka dit användaren var på väg – men bara till en egen sida, aldrig till en extern adress
    const target = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
    router.push(target)
  } catch (e) {
    error.value = e instanceof AuthError ? e.message : 'Något gick fel. Försök igen om en stund.'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.login-wrap { display: flex; justify-content: center; padding-top: 60px; }
.login-card { width: 380px; }
.login-logo { height: 34px; margin-bottom: 18px; }
.login-error { color: #d92d20; font-size: 14px; margin: 0 0 10px; }
</style>
