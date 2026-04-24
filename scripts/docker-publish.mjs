#!/usr/bin/env node
/**
 * Сборка образа из текущего каталога и push в registry.
 * DOCKER_IMAGE=registry/имя:тег npm run docker:publish
 */
import { spawnSync } from 'node:child_process'
import process from 'node:process'

const image = DOCKER_IMAGE=ghcr.io/deimosowen/ote-manager:0.1.5;//process.env.DOCKER_IMAGE?.trim()
if (!image) {
  console.error(
    'Задайте DOCKER_IMAGE, например:\n' +
      '  DOCKER_IMAGE=ghcr.io/you/ote-manager:0.1.5 npm run docker:publish'
  )
  process.exit(1)
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

run('docker', ['build', '-t', image, '.'])
run('docker', ['push', image])
console.log(`Готово. На сервере: docker pull ${image}`)
