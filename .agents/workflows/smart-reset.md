---
description: Sincronización y reset total de la base de datos Supabase/Postgres
---

// turbo-all
1. Detener contenedores de base de datos
   `docker-compose stop db supabase`

2. Eliminar volúmenes de datos antiguos
   `docker volume rm agentes_pgdata`

3. Levantar entorno limpio
   `docker-compose up -d db supabase`

4. Ejecutar migraciones y seeds
   `go run cmd/migrate/main.go`
   `go run cmd/seed/main.go`

5. Verificar estado de la conexión
   `docker-compose ps`
