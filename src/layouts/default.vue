<template>
  <div class="min-h-screen bg-surface text-slate-800">
    <AppTopbar />
    <div class="flex">
      <AppSidebar />
      <main class="flex-1 overflow-y-auto px-8 py-7">
        <slot />
      </main>
    </div>
    <AppToastHost />
  </div>
</template>
