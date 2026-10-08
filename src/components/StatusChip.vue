<template>
  <span :class="['status-chip', modifier]" role="status">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue'
import { invoiceStatus } from '../utils/invoice'

const props = defineProps({
  invoice: { type: Object, required: true }
})

const label = computed(() => invoiceStatus(props.invoice))
const modifier = computed(() => (label.value === 'Betald' ? 'status-betald' : 'status-obetald'))
</script>
