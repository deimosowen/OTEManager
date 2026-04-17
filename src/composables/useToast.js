import { ref } from 'vue'

const message = ref('')
const variant = ref('info')
const visible = ref(false)
let timer

export function useToast() {
  function show(text, kind = 'info', ms = 3200) {
    message.value = text
    variant.value = kind
    visible.value = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = false
    }, ms)
  }
  return { message, variant, visible, show }
}
