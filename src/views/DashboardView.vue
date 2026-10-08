<template>
  <div>
    <div v-if="insight" class="card insight">
      <h2>Din förbrukning</h2>
      <p>{{ insight }}</p>
    </div>
    <!-- don't show the hero before data is in, page looked empty /J -->
    <img v-if="consumptionStore.data" src="../assets/hero.png" class="hero">
    <h1 v-if="userStore.user">Hej {{ userStore.user.name.split(' ')[0] }}!</h1>
    <h1 v-else>Hej!</h1>

    <div class="stats">
      <div class="card stat">
        <div class="stat-label">Förbrukning senaste månaden</div>
        <div class="stat-value">{{ latestMonth }} kWh</div>
      </div>
      <div class="card stat">
        <div class="stat-label">Aktuellt pris</div>
        <div class="stat-value">{{ currentPrice }}</div>
      </div>
      <div class="card stat">
        <div class="stat-label">Avtal</div>
        <div class="stat-value" style="font-size:20px">{{ userStore.user ? userStore.user.contract : '–' }}</div>
      </div>
    </div>

    <div class="card">
      <h2>Din elförbrukning – senaste 12 månaderna</h2>
      <p v-if="consumptionStore.loading">Laddar…</p>
      <ConsumptionChart
        v-else-if="consumptionStore.data"
        :months="consumptionStore.data.months"
        :values="consumptionStore.data.values" />
      <p class="hint">Källa: din elmätare. Uppdateras varje dygn.</p>
    </div>

    <NorwayNotice />

    <div class="card">
      <h2>Spartips just nu</h2>
      <p>Elpriset är som högst mellan 07–09 och 17–20. Flytta tvätt och diskmaskin till natten så kan du sänka din kostnad med upp till 15 %.</p>
      <div class="btn" style="margin-top:12px" @click="showTips">Fler spartips</div>
    </div>
  </div>
</template>

<script setup>
// Dashboard. Got a bit big, clean up some day /M
import _ from 'lodash'
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { formatPrice } from '../utils/price'
import { useUserStore } from '../stores/user'
import { useConsumptionStore } from '../stores/consumption'
import ConsumptionChart from '../components/ConsumptionChart.vue'
import NorwayNotice from '../components/NorwayNotice.vue'

const userStore = useUserStore()
const consumptionStore = useConsumptionStore()

const latestMonth = computed(() => {
  var d = consumptionStore.data
  return d ? d.values[d.values.length - 1] : '–'
})

const insight = computed(() => {
  var d = consumptionStore.data
  if (!d || d.values.length < 2) return null
  var last = d.values[d.values.length - 1], prev = d.values[d.values.length - 2]
  var diff = Math.round(Math.abs(last - prev) / prev * 100)
  return 'Senaste månaden (' + d.months[d.months.length - 1].toLowerCase() + ') använde du ' + diff + ' % ' + (last < prev ? 'mindre' : 'mer') + ' el än månaden innan. ' + (last < prev ? 'Snyggt jobbat!' : 'Kolla spartipsen längre ner.')
})

const currentPrice = computed(() => formatPrice(consumptionStore.data?.pricePerKwh))

// debounce on resize, chart.js redraws itself but we log a bit /J
const onResize = _.debounce(() => console.log('resize', window.innerWidth), 300)

onMounted(() => {
  userStore.load()
  consumptionStore.load()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})

const showTips = () => {
  alert('Fler spartips kommer snart!')
}
</script>

<style scoped>
.hero { width: 100%; border-radius: 10px; margin-bottom: 18px; }
.insight { border-left: 4px solid #16a34a; }
.stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
.stat-label { font-size: 13px; color: #7c8698; margin-bottom: 6px; }
.stat-value { font-size: 26px; font-weight: 700; }
</style>
