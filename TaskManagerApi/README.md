# TaskManagerApi (starter)

Proyecto backend en .NET 7 (Web API) con MongoDB.

Objetivo: servir como API para un frontend Next.js.

Quick start

1. Asegúrate de tener .NET 7 SDK instalado y MongoDB corriendo en localhost:27017.
2. Desde la carpeta `TaskManagerApi` ejecuta:

```bash
# Restore & run
dotnet restore
dotnet run
```

3. La API estará disponible en `https://localhost:5001` o el puerto que .NET asigne. Swagger en `/swagger`.

Siguientes pasos

- Añadir validaciones y DTOs.
- Implementar servicios restantes (comments/history/notifications).
- Crear frontend Next.js y configurar llamadas a la API.
