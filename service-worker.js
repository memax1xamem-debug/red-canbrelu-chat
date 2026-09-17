importScripts(
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyCKh_AHfvDSlAMxs1Kl-hvQse6Dj1g6sBo",
  authDomain: "red-canbrelu-chat.firebaseapp.com",
  projectId: "red-canbrelu-chat",
  storageBucket: "red-canbrelu-chat.firebasestorage.app",
  messagingSenderId: "733334279827",
  appId: "1:733334279827:web:7fdec02211ae5818ae9f66"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Notificación recibida:", payload);

  const titulo =
    payload.notification?.title ||
    "Red Canbrelú Chat";

  const opciones = {
    body:
      payload.notification?.body ||
      "Tenés un nuevo mensaje",
    icon: "./icon-192.png",
    badge: "./icon-192.png"
  };

  return self.registration.showNotification(
    titulo,
    opciones
  );
});

const CACHE_NAME = "canbrelu-chat-v2";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ARCHIVOS);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nombres) => {
      return Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NAME)
          .map((nombre) => caches.delete(nombre))
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
