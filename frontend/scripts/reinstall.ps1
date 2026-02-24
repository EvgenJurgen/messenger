# Чистая переустановка зависимостей (для Tailwind 4 нативных биндингов)
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
