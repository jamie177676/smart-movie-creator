# Smart Movie Creator - Android Build Guide

This guide provides instructions on how to take the Smart Movie Creator web application and package it as a native Android application using Capacitor.

## Introduction

[Capacitor](https://capacitorjs.com/) is a cross-platform app runtime that makes it easy to build web apps that run natively on iOS, Android, and the Web. We will use it to wrap the existing React application in a native Android container.

## Prerequisites

Before you begin, you need to have the following installed on your machine:
- [**Node.js**](https://nodejs.org/) (which includes `npm`)
- [**Android Studio**](https://developer.android.com/studio) with the Android SDK

---

## Step 1: Project Setup

The current project files are missing a `package.json` and a build tool, which are essential for managing dependencies and preparing the web code for Capacitor.

1.  Create a file named `package.json` in the root of your project and add the following content. This defines the project and its dependencies.

    ```json
    {
      "name": "smart-movie-creator",
      "private": true,
      "version": "1.0.0",
      "type": "module",
      "scripts": {
        "dev": "vite",
        "build": "vite build",
        "sync": "npx cap sync android",
        "open": "npx cap open android"
      },
      "dependencies": {
        "@google/genai": "^1.16.0",
        "react": "^19.1.1",
        "react-dom": "^19.1.1"
      },
      "devDependencies": {
        "@capacitor/android": "^6.1.0",
        "@capacitor/cli": "^6.1.0",
        "@capacitor/core": "^6.1.0",
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
        "@vitejs/plugin-react": "^4.2.0",
        "tailwindcss": "^3.3.5",
        "typescript": "^5.2.2",
        "vite": "^5.0.0"
      }
    }
    ```

2. Create a file named `vite.config.ts` in the root directory. This will be our build tool.

    ```typescript
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'

    // https://vitejs.dev/config/
    export default defineConfig({
      plugins: [react()],
      build: {
        outDir: 'dist' // This is the folder Capacitor will use
      }
    })
    ```
    
## Step 2: Install Dependencies

Open your terminal in the project's root directory and run the following command to install all the necessary packages:

```bash
npm install
```

## Step 3: Build the Web App

Next, you need to create a static build of the web application. This command will compile the React code into an optimized `dist` folder, which Capacitor will use.

```bash
npm run build
```

## Step 4: Initialize Capacitor for Android

Now, we'll add the native Android platform to your project using the Capacitor CLI.

```bash
npx cap add android
```
This command will create an `android` folder in your project, which contains a complete native Android project.

## Step 5: Sync Web and Native Projects

Sync your web app build (`dist` folder) with the native Android project. This command copies your web assets into the Android project.

```bash
npm run sync
```

## Step 6: Open and Run in Android Studio

Finally, open the native project in Android Studio to build and run your app.

```bash
npm run open
```

This will launch Android Studio. From there, you can:
1.  Wait for the project to sync and build.
2.  Select a virtual device (Emulator) or a connected physical device.
3.  Click the **"Run"** button (a green play icon) to build the `.apk` file and install it on your selected device.

Your Smart Movie Creator application will now be running as an Android app!