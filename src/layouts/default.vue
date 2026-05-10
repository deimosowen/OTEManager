<template>
  <div class="min-h-screen bg-surface text-slate-800">
    <a
      href="#main-content"
      class="sr-only whitespace-nowrap rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white shadow-xl shadow-brand/30 outline-none ring-2 ring-white ring-offset-2 ring-offset-brand focus:not-sr-only focus:fixed focus:left-4 focus:top-16 focus:z-elevated-popover"
    >
      К основному содержимому
    </a>
    <AppTopbar />
    <div class="flex">
      <AppSidebar />
      <main
        id="main-content"
        tabindex="-1"
        class="min-w-0 flex-1 scroll-mt-14 overflow-y-auto overflow-x-hidden px-4 py-6 outline-none focus:outline-none sm:px-6 lg:px-8 lg:py-7"
      >
        <slot />
      </main>
    </div>
    <AppToastHost />
    <AppOnboardingHints />
    <AppFeatureAnnouncementHints />
  </div>
</template>
