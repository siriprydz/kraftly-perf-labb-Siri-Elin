<template>
  <div>
    <div v-if="appEnv !== 'production'" class="env-banner">{{ envLabel }}</div>
    <header class="topbar" v-if="$route.path !== '/login'">
      <div class="topbar-inner container">
        <img src="./assets/logo.svg" class="logo">
        <nav>
          <RouterLink to="/">Översikt</RouterLink>
          <RouterLink to="/fakturor">Fakturor</RouterLink>
          <RouterLink to="/flytt">Flyttanmälan</RouterLink>
          <RouterLink to="/profil">Mina uppgifter</RouterLink>
          <span class="logout" @click="logout">Logga ut</span>
        </nav>
      </div>
    </header>
    <main class="container">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import _ from 'lodash'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const auth = useAuthStore()

// Sätts av containern vid start (public/config.js lokalt). Syns i alla miljöer utom prod.
const appEnv = window.__KRAFTLY__?.env ?? 'lokal'
// lodash is already in the project anyway /M
const envLabel = _.upperCase(appEnv)

const logout = async () => {
  await auth.logout() // servern glömmer sessionen, token töms ur minnet
  router.push('/login')
}
</script>

<style>
.env-banner {
  background: #f5a524;
  color: #101d3d;
  font: 600 12px/1 system-ui, sans-serif;
  letter-spacing: 0.08em;
  text-align: center;
  padding: 5px 0;
}
.topbar { background: #101d3d; }
.topbar-inner { display: flex; align-items: center; justify-content: space-between; padding-top: 14px; padding-bottom: 14px; }
.logo { height: 30px; }
.topbar nav a, .logout {
  color: #c2cbe4;
  text-decoration: none;
  margin-left: 22px;
  font-size: 14.5px;
  cursor: pointer;
}
.topbar nav a.router-link-active { color: #fff; font-weight: 600; }
</style>
