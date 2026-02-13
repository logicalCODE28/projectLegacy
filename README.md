# Task Manager Pro 🚀

Bienvenido a **Task Manager Pro**, una aplicación moderna y completa para la gestión de tareas y proyectos. Este proyecto utiliza una arquitectura desacoplada con un backend robusto en .NET y un frontend reactivo en Next.js.

---

## 🛠️ Acceso de Prueba (Demo)

Para explorar la aplicación sin necesidad de registro, utiliza las siguientes credenciales:

- **Usuario:** `admin`
- **Contraseña:** `admin`

*(Nota: El sistema no tiene registro público habilitado actualmente, ¡así que usa estas credenciales para entrar! JAJA)*

---

## ✨ Características Principales

- **Gestión de Tareas (CRUD):** Crea, edita, elimina y organiza tus tareas pendientes.
- **Proyectos:** Agrupa tus tareas en proyectos para una mejor organización.
- **Comentarios y Colaboración:** Añade comentarios a tus tareas para mantener el hilo de trabajo.
- **Historial de Actividad:** Seguimiento detallado de los cambios realizados en cada tarea.
- **Reportes y Analíticas:** Visualiza el progreso de tus proyectos con reportes integrados.
- **Interfaz Premium (Glassmorphism):** Un diseño elegante, moderno y translúcido que ofrece una experiencia de usuario superior.

---

## 🚀 Tecnologías Utilizadas

### Backend 🛡️
- **Framework:** .NET 7 (ASP.NET Core Web API)
- **Base de Datos:** MongoDB
- **Documentación:** Swagger / OpenAPI

### Frontend 🎨
- **Framework:** Next.js (React)
- **Estilos:** Vanilla CSS con enfoque en **Glassmorphism**
- **Estado:** React Hooks y Context API

---

## ⚙️ Configuración y Ejecución

### Requisitos Previos
- [.NET 7 SDK](https://dotnet.microsoft.com/download/dotnet/7.0)
- [Node.js (LTS)](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/try/download/community) corriendo localmente en el puerto `27017`.

---

### 1. Iniciar el Backend
Desde la raíz del proyecto:
```bash
cd TaskManagerApi
dotnet restore
dotnet run
```
La API estará disponible en `https://localhost:5001`. Puedes ver la documentación de Swagger en `https://localhost:5001/swagger`.

### 2. Iniciar el Frontend
Desde la raíz del proyecto en una nueva terminal:
```bash
cd task-manager-frontend
npm install
npm run dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 📁 Estructura del Proyecto

```text
.
├── TaskManagerApi/          # Backend .NET Core
│   ├── Controllers/         # Endpoints de la API
│   ├── Models/              # Entidades y DTOs
│   └── Data/                # Contexto de MongoDB
├── task-manager-frontend/   # Frontend Next.js
│   ├── pages/               # Rutas y páginas
│   ├── components/          # Componentes reutilizables
│   └── styles/              # CSS y temas
└── projectLegacy.sln       # Solución de Visual Studio
```

---

## 📝 Notas Adicionales
- Asegúrate de que el backend esté corriendo antes de iniciar el frontend para que los datos se carguen correctamente.
- Puedes ajustar la URL del backend en el archivo `.env.local` del frontend si es necesario.

---
