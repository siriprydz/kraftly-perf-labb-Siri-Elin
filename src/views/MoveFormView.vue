<template>
  <div>
    <h1>Flyttanmälan</h1>
    <form class="card" style="max-width:560px" novalidate @submit.prevent="submit">
      <p style="margin-bottom:14px">Fyll i uppgifterna nedan så flyttar vi ditt elavtal.</p>

      <label for="address">Ny adress</label>
      <input id="address" type="text" v-model="form.address">

      <label for="zip">Postnummer</label>
      <input id="zip" type="text" inputmode="numeric" v-model="form.zip">

      <label for="city">Ort</label>
      <input id="city" type="text" v-model="form.city">

      <label for="date">Inflyttningsdatum (ÅÅÅÅ-MM-DD)</label>
      <input id="date" type="text" v-model="form.date">

      <label for="contract">Avtal</label>
      <select id="contract" v-model="form.contract">
        <option disabled value="">Välj avtal</option>
        <option>Rörligt pris</option>
        <option>Fast pris 1 år</option>
        <option>Fast pris 3 år</option>
      </select>

      <ul v-if="errorList.length" role="alert" class="errors">
        <li v-for="msg in errorList" :key="msg">{{ msg }}</li>
      </ul>

      <BaseButton type="submit">Skicka flyttanmälan</BaseButton>
      <p class="hint" style="margin-top:8px">Anmälan måste göras senast 14 dagar före flytt</p>
      <p v-if="reference" style="color:#12b76a;margin-top:10px">Tack! Referensnummer: {{ reference }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import BaseButton from '../components/BaseButton.vue'
import { submitMove } from '../services/api'
import { validateMove } from '../utils/validateMove'

const form = reactive({ address: '', zip: '', city: '', date: '', contract: '' })
const reference = ref(null)
const errors = ref({})

const errorList = computed(() => Object.values(errors.value))

const submit = async () => {
  errors.value = validateMove(form)
  if (errorList.value.length) return
  const res = await submitMove(form)
  reference.value = res.ref
}
</script>

<style scoped>
label { display: block; font-size: 13px; color: #7c8698; margin: 10px 0 4px; }
.errors { color: #d92d20; margin: 8px 0 12px 18px; font-size: 14px; }
</style>
