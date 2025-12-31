// =====================================================
// GOOGLE APPS SCRIPT - Sistema Optimizado
// =====================================================

// 🔒 GESTIÓN DE SECRETOS
// Ejecuta 'setupScriptProperties' una vez manualmente para guardar tus claves
function getScriptConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    API_KEY: props.getProperty("API_KEY"),
    WEBHOOK_SECRET: props.getProperty("WEBHOOK_SECRET"),
    NEXTJS_API_URL: props.getProperty("NEXTJS_API_URL"),
    REVALIDATE_SECRET: props.getProperty("REVALIDATE_SECRET"),
    MP_ACCESS_TOKEN: props.getProperty("MERCADOPAGO_ACCESS_TOKEN")
  };
}

// =====================================================
// MAIN ENTRYPOINTS
// =====================================================

function doPost(e) {
  // 🔒 Lock Global para cualquier escritura (Webhook o Creación)
  // Esto garantiza que NUNCA haya dos ediciones simultáneas
  const lock = LockService.getScriptLock();
  // Esperamos hasta 30s, si no, fallamos.
  if (!lock.tryLock(30000)) {
    return createResponse(false, "Servidor ocupado, intente nuevamente");
  }

  try {
    const config = getScriptConfig();
    const rawBody = e.postData?.contents || "";
    const sheet = getOrCreateSheet();

    let data;
    try {
      data = JSON.parse(rawBody);
    } catch (err) {
      return createResponse(false, "JSON inválido");
    }

    // === Webhook de MercadoPago ===
    const isNewFormat = data.type === "payment" || (data.action && data.action.indexOf("payment.") === 0);
    const isOldFormat = data.topic === "payment" || data.topic === "merchant_order";
    
    if (isNewFormat || isOldFormat) {
      return handleMercadoPagoWebhook(data, sheet, config);
    }

    // === Acciones desde tu app ===
    const action = data.action;
    if (action === "createOrder") {
      return createOrder(data.data, sheet, config);
    } else if (action === "updateOrderStatus") {
      // Solo admin manual
      return updateOrderStatus(data.orderId, data.estado, sheet, config);
    }

    return createResponse(false, "Acción no válida");

  } catch (err) {
    return createResponse(false, "Error general: " + err);
  } finally {
    // ✅ Liberar el candado siempre
    lock.releaseLock();
  }
}

function doGet(e) {
  // Los GET (lectura) no necesitan Lock estricto a menos que la consistencia sea crítica al milisegundo
  try {
    const config = getScriptConfig();
    const key = e.parameter.key;
    
    if (key !== config.API_KEY) {
      return createResponse(false, "Acceso no autorizado");
    }

    const action = e.parameter.action;

    if (action === "getOrder") {
      const sheet = getOrCreateSheet();
      return getOrder(e.parameter.id, sheet);
    } else if (action === "getMenu") {
      return getMenu();
    }

    return createResponse(false, "Acción no válida");
  } catch (err) {
    return createResponse(false, err.toString());
  }
}

// =====================================================
// LÓGICA DE NEGOCIO
// =====================================================

function createOrder(orderData, sheet, config) {
  try {
    // 1. Verificar stock
    const stockCheck = checkStockAvailability(orderData.items);
    if (!stockCheck.available) {
      const unavailableNames = stockCheck.unavailableItems
        .map(item => `${item.name} (Quedan: ${item.available})`)
        .join(', ');
      return createResponse(false, `Stock insuficiente: ${unavailableNames}`);
    }

    // 2. Preparar datos
    const orderId = "ORD-" + Date.now();
    const fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    const itemsJson = JSON.stringify(orderData.items || []);
    const estadoInicial = orderData.metodoPago === "mercadopago" ? "pendiente_pago" : "confirmado";

    // 3. Guardar pedido
    sheet.appendRow([
      orderId, fecha, orderData.nombre || "", orderData.celular || "",
      orderData.tipoEntrega || "", orderData.localidad || "", orderData.diaEntrega || "",
      orderData.direccion || "", orderData.metodoPago || "", itemsJson,
      orderData.total || 0, estadoInicial
    ]);

    // 4. Descontar Stock (RESERVA INMEDIATA)
    // Descontamos SIEMPRE al crear. Si luego no pagan, se restaura al cancelar/limpiar.
    for (const item of orderData.items) {
       updateStock(item.id, -item.quantity, config); 
    }

    Logger.log(`✅ Pedido ${orderId} creado. Stock reservado.`);
    SpreadsheetApp.flush(); // Forzar guardado
    
    // Notificar revalidación (fuera del proceso crítico de datos)
    notifyNextJS("Pedidos", config);
    notifyNextJS("Menu", config);

    return createResponse(true, "Pedido creado", { orderId });

  } catch (error) {
    Logger.log("❌ Error createOrder: " + error);
    throw error; // Propagar para que el doPost lo capture
  }
}

function getOrder(orderId, sheet) {
  const data = sheet.getDataRange().getValues();

  // Iteramos desde 1 para saltar el encabezado
  for (let i = 1; i < data.length; i++) {
    // Columna A (índice 0) es el ID
    if (data[i][0] == orderId) { 
      const order = {
        id: data[i][0],
        fecha: data[i][1], 
        nombre: data[i][2],
        celular: data[i][3],
        tipoEntrega: data[i][4],
        localidad: data[i][5],
        diaEntrega: data[i][6],
        direccion: data[i][7],
        metodoPago: data[i][8],
        items: JSON.parse(data[i][9] || "[]"),
        total: Number(data[i][10]),
        estado: data[i][11],
      };
      return createResponse(true, "Pedido encontrado", { order: order });
    }
  }

  return createResponse(false, "Pedido no encontrado");
}

function updateOrderStatus(orderId, nuevoEstado, sheet, config) {
  try {
    const data = sheet.getDataRange().getValues();
    let found = false;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        const estadoAnterior = data[i][11];
        
        // Solo actualizamos si cambió
        if (estadoAnterior === nuevoEstado) return createResponse(true, "Estado sin cambios");

        // Actualizar celda de estado (Columna L = índice 12, fila i+1)
        sheet.getRange(i + 1, 12).setValue(nuevoEstado);
        found = true;

        // LOGICA DE STOCK CORREGIDA
        const items = JSON.parse(data[i][9] || "[]");

        // Caso 1: Pendiente -> Confirmado
        // NO HACEMOS NADA con el stock, porque ya se descontó en createOrder (Reserva).
        
        // Caso 2: Cancelación (desde cualquier estado activo)
        // Si se cancela o rechaza, DEVOLVEMOS el stock.
        if ((estadoAnterior !== "cancelado") && (nuevoEstado === "cancelado" || nuevoEstado === "rechazado")) {
          for (const item of items) {
            updateStock(item.id, item.quantity, config); // Sumar stock (+)
          }
          Logger.log(`♻️ Stock restaurado para ${orderId}`);
          notifyNextJS("Menu", config);
        }

        Logger.log(`🔄 Estado ${orderId}: ${estadoAnterior} -> ${nuevoEstado}`);
        break;
      }
    }
    
    if (!found) {
      Logger.log(`❌ Pedido no encontrado: ${orderId}`);
      return createResponse(false, "Pedido no encontrado");
    }

    notifyNextJS("Pedidos", config);
    return createResponse(true, "Estado actualizado");

  } catch (error) {
    Logger.log("❌ Error updateOrderStatus: " + error);
    throw error;
  }
}

// =====================================================
// TRIGGERS MANUALES
// =====================================================

/**
 * Detecta ediciones manuales en la hoja de cálculo y avisa a la web.
 * IMPORTANTE: Configurar este activador en el relojito (Triggers) -> "Al editar"
 */
function onEditTrigger(e) {
  try {
    // Si no hay evento (ej. ejecución manual desde editor), salimos
    if (!e || !e.source) return;

    const sheet = e.source.getActiveSheet();
    const sheetName = sheet.getName();
    
    // Solo nos interesa si tocas el Menú o los Pedidos
    if (sheetName === "Menu" || sheetName === "Pedidos") {
      Logger.log(`📝 Cambio manual detectado en: ${sheetName}`);
      
      // Cargamos la config segura
      const config = getScriptConfig(); 
      
      // Enviamos la señal a Next.js para que limpie el caché
      notifyNextJS(sheetName, config);
    }
  } catch (error) {
    Logger.log("❌ Error en onEditTrigger: " + error);
  }
}

// =====================================================
// STOCK & MENU
// =====================================================

function getMenu() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Menu");
  if (!sheet) return createResponse(false, "Hoja Menu no encontrada");

  const data = sheet.getDataRange().getValues();
  const menuItems = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    // Parsear ingredientes
    let ingredients = [];
    if (row[6]) {
      ingredients = String(row[6]).split(',').map(s => s.trim());
    }

    menuItems.push({
      id: row[0],
      name: row[1],
      category: row[2],
      price: row[3],
      image: row[4],
      description: row[5],
      ingredients: ingredients,
      stock: row[7], // Columna H
      disponible: (row[7] > 0)
    });
  }

  return createResponse(true, "Menu obtenido", { menu: menuItems });
}

function updateStock(itemId, delta, config) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Menu");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == itemId) {
      const currentStock = Number(data[i][7] || 0);
      const newStock = currentStock + delta;
      sheet.getRange(i + 1, 8).setValue(newStock);
      return;
    }
  }
}

function checkStockAvailability(items) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Menu");
  const data = sheet.getDataRange().getValues();
  const unavailable = [];

  for (const item of items) {
    const productRow = data.find(row => row[0] == item.id);
    if (productRow) {
      const stock = Number(productRow[7] || 0);
      if (stock < item.quantity) {
        unavailable.push({ id: item.id, name: productRow[1], available: stock });
      }
    }
  }
  return { available: unavailable.length === 0, unavailableItems: unavailable };
}

// =====================================================
// WEBHOOK
// =====================================================

function handleMercadoPagoWebhook(data, sheet, config) {
  try {
    let paymentId = data.data?.id; 
    if (!paymentId && data.resource) {
       // Lógica legacy de MP
       const parts = data.resource.split('/');
       paymentId = parts[parts.length - 1];
    }

    if (!paymentId) return createResponse(false, "Sin Payment ID");

    // Consultar estado a MP
    const url = `https://api.mercadopago.com/v1/payments/${paymentId}`;
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "Authorization": "Bearer " + config.MP_ACCESS_TOKEN },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log("Error MP API: " + response.getContentText());
      return createResponse(false, "Error MP API");
    }

    const payment = JSON.parse(response.getContentText());
    const orderId = payment.external_reference;
    const status = payment.status;

    if (!orderId) return createResponse(false, "Pago sin referencia");

    // Mapeo de estados MP -> App
    let nuevoEstado = "pendiente_pago";
    if (status === "approved") nuevoEstado = "confirmado";
    else if (status === "rejected" || status === "cancelled") nuevoEstado = "cancelado";
    else if (status === "in_process") nuevoEstado = "pendiente_pago";

    return updateOrderStatus(orderId, nuevoEstado, sheet, config);

  } catch (e) {
    Logger.log("Error Webhook: " + e);
    return createResponse(false, e.toString());
  }
}

// =====================================================
// UTILS & SETUP
// =====================================================

function createResponse(success, message, data) {
  return ContentService.createTextOutput(JSON.stringify({ success, message, ...data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function notifyNextJS(tag, config) {
  if (!config.NEXTJS_API_URL) return;
  try {
    UrlFetchApp.fetch(config.NEXTJS_API_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ secret: config.REVALIDATE_SECRET, sheet: tag }),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log("Error notificando Next.js: " + e);
  }
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Pedidos");
  if (!sheet) {
    sheet = ss.insertSheet("Pedidos");
    // ... headers ...
  }
  return sheet;
}

function limpiarPendientesAntiguos() {
  // 🔒 Lock para evitar colisiones con webhooks o ventas
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return; // Si está ocupado, intentamos en la próxima ejecución horaria

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Pedidos");
    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    const ahora = new Date();
    const umbralHoras = 6; // Borrar pedidos pendientes de más de 6 horas
    let filasEliminadas = 0;

    // Iteramos de abajo hacia arriba para poder borrar filas sin romper índices
    for (let i = data.length - 1; i > 0; i--) {
      const fila = data[i];
      // Indices basados en tu estructura: Fecha=1, MetodoPago=8, Estado=11
      const fechaStr = fila[1]; 
      const metodoPago = String(fila[8]).toLowerCase();
      const estado = String(fila[11]).toLowerCase();

      if (metodoPago === "mercadopago" && estado === "pendiente_pago") {
        const fechaPedido = new Date(fechaStr);
        const diffHoras = (ahora - fechaPedido) / (1000 * 60 * 60);

        if (diffHoras > umbralHoras) {
          sheet.deleteRow(i + 1);
          filasEliminadas++;
        }
      }
    }
    
    if (filasEliminadas > 0) {
      Logger.log(`🧹 Limpieza: Se eliminaron ${filasEliminadas} pedidos antiguos.`);
    }

  } catch (e) {
    Logger.log("Error en limpieza: " + e);
  } finally {
    lock.releaseLock();
  }
}

/**
 * EJECUTAR ESTA FUNCIÓN UNA VEZ MANUALMENTE EN EL EDITOR
 * Para guardar tus secretos de forma segura.
 */
function setupScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    "API_KEY": "mi_clave_segura_123",
    "WEBHOOK_SECRET": "9245f3176e32b450ebbfa8a643303d2b791913153c4b54babf02982217c273e4",
    "NEXTJS_API_URL": "https://menu-gastronomico-git-clean-w0wnixs-projects.vercel.app/api/revalidate",
    "REVALIDATE_SECRET": "tu_secret_de_revalidacion_123",
    "MERCADOPAGO_ACCESS_TOKEN": "APP_USR-2243617894499501-110918-953e2f30913b4d38a06544d4303b953e-2977405302"
  });
  Logger.log("Propiedades guardadas exitosamente.");
}