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

const CACHE_NAME = "canbrelu-chat-v3";

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
// COMPARTIR COMPROBANTES - RED CANBRELÚ
//

function abrirBaseCompartidos() {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open("canbrelu-compartidos", 1);

    solicitud.onupgradeneeded = () => {
      const db = solicitud.result;
      if (!db.objectStoreNames.contains("pendientes")) {
        db.createObjectStore("pendientes");
      }
    };

    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

async function guardarCompartido(datos) {
  const db = await abrirBaseCompartidos();

  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction("pendientes", "readwrite");

      tx.objectStore("pendientes").put(datos, "ultimo");

      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (
    event.request.method !== "POST" ||
    url.searchParams.get("compartir") !== "1"
  ) {
    return;
  }

  event.respondWith((async () => {
    const destino = new URL("./index.html", self.registration.scope);

    try {
      const formulario = await event.request.formData();

      const archivos = formulario.getAll("comprobante")
        .filter(archivo => archivo instanceof Blob);

      await guardarCompartido({
        titulo: String(formulario.get("title") || ""),
        texto: String(formulario.get("text") || ""),
        enlace: String(formulario.get("url") || ""),
        archivos: archivos,
        fecha: Date.now()
      });

      destino.searchParams.set("comprobante", "1");

    } catch (error) {
      console.error("Error al recibir comprobante:", error);
      destino.searchParams.set("errorCompartir", "1");
    }

    return Response.redirect(destino.href, 303);
  })());
});
