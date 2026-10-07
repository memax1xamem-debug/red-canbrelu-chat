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
    payload.data?.title ||
    "Red Canbrelú Chat";

  const opciones = {
    body: payload.data?.body || "Tenés un nuevo mensaje",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    data: {
      url: "./",
      usuarioId: payload.data?.usuarioId || ""
    }
  };

  return self.registration.showNotification(
    titulo,
    opciones
  );

});


// ========================================
// TOCAR NOTIFICACIÓN
// ========================================

self.addEventListener("notificationclick", (event) => {

  event.notification.close();

  const usuarioId =
    event.notification.data?.usuarioId || "";

  let url =
    event.notification.data?.url || "./";

  if (usuarioId) {
    url += "?chat=" + encodeURIComponent(usuarioId);
  }

  event.waitUntil(

    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(async (ventanas) => {

      // APP YA ABIERTA
      for (const ventana of ventanas) {

        ventana.postMessage({
          tipo: "ABRIR_CHAT",
          usuarioId: usuarioId
        });

        if ("focus" in ventana) {
          return ventana.focus();
        }

      }

      // APP CERRADA
      if (clients.openWindow) {
        return clients.openWindow(url);
      }

    })

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


//
// RECIBIR COMPROBANTES COMPARTIDOS
//

self.addEventListener("fetch", (event) => {

  const url = new URL(event.request.url);

  if (
    event.request.method !== "POST" ||
    url.searchParams.get("compartir") !== "1"
  ) {
    return;
  }

  event.respondWith((async () => {

    try {
      const datos = await event.request.formData();

      const archivos = datos.getAll("comprobante")
        .filter(archivo => archivo instanceof File);

      const texto = datos.get("text") || "";
      const enlace = datos.get("url") || "";
      const titulo = datos.get("title") || "";

      const cache = await caches.open("canbrelu-compartidos");

      const contenido = new Response(
        JSON.stringify({
          titulo,
          texto,
          enlace,
          archivos: archivos.map(archivo => ({
            nombre: archivo.name,
            tipo: archivo.type
          }))
        }),
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      await cache.put(
        new Request("./comprobante-pendiente"),
        contenido
      );

      return Response.redirect(
        new URL("./index.html?comprobante=1", self.registration.scope),
        303
      );

    } catch (error) {

      console.error("Error al recibir comprobante:", error);

      return Response.redirect(
        new URL("./index.html?errorCompartir=1", self.registration.scope),
        303
      );

    }

  })());

});

