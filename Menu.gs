/**
 * EJECUTAR ESTA FUNCIÓN UNA SOLA VEZ para crear la hoja Menu con datos
 * En el editor: Seleccionar "setupMenuSheet" y click en ▶️ Ejecutar
 */
function setupMenuSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Verificar si ya existe
    let menuSheet = ss.getSheetByName("Menu");
    
    if (menuSheet) {
      Logger.log("⚠️ La hoja 'Menu' ya existe. ¿Deseas recrearla? Borra la hoja manualmente primero.");
      return;
    }
    
    // Crear la hoja
    menuSheet = ss.insertSheet("Menu");
    
    // Headers
    const headers = [
      "id", 
      "name", 
      "category", 
      "price", 
      "image", 
      "description", 
      "ingredients", 
      "stock"
    ];
    
    menuSheet.appendRow(headers);
    
    // Formatear headers
    menuSheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#4285f4")
      .setFontColor("#ffffff");
    
    // Datos del menú (desde tu menuData.ts)
    const menuData = [
      // ENTRADAS
      [1001, "Focaccia Classica", "Entradas", 8000, "/pugliese.png", 
       "Tomates cherrys, sal gruesa, romero fresco y aceite de oliva virgen extra.", 
       "Tomates cherrys, Romero, Aceite de oliva", 20],
      
      [1002, "Focaccia Broccoli y Chorizo", "Entradas", 10000, "/focaccia2.png",
       "Broccoli, chorizo, salsa bechamel, ajo y aceite de oliva extra virgen.",
       "Broccoli, Chorizo, Salsa bechamel, Aceite de oliva", 15],
      
      [1003, "Sandwich Focaccia Mortadella", "Entradas", 10000, "/focaccia3.png",
       "Mortadella, pistachos en grana, stracciatella, pesto, rúcula, limón rallado, AOVE.",
       "Mortadella, Pistacho, Stracciatella, Pesto, Rúcula, Limón, Aceite de oliva virgen extra", 12],
      
      [1004, "Arancini", "Entradas", 3500, "/arancini.png",
       "Croquetas rebozadas y rellenas de ragú, mozarella y arroz (cocido en caldo, azafrán, manteca, queso parmesano).",
       "Arroz, Mozzarella, Pan rallado, Harina, Ragú, Caldo, Azafrán, Manteca, Queso parmesano", 30],
      
      [1005, "Rotolo Emilia Verde", "Entradas", 10000, "/rotolo.png",
       "Pan relleno de mortadella, espinaca, cebolla y mozzarella, con doble capa de aceite de oliva, ajo y perejil.",
       "Pan, Mortadella, Espinaca, Cebolla, Mozzarella, Aceite de oliva, Ajo, Perejil", 10],
      
      [1006, "Empanada de Osobuco", "Entradas", 1800, "/empanada.png",
       "Relleno de osobuco, cocido a fuego lento con verduras y especias, acompañado de salsa de vino malbec.",
       "Masa de empanada, Osobuco, Verduras, Especias, Malbec", 25],
      
      // PIZZAS
      [1, "Margherita", "Pizzas", 10000, "/margherita.png",
       "Salsa de tomate, queso mozzarella, albahaca fresca, aceite de oliva virgen extra.",
       "Masa, Salsa de tomate, Queso mozzarella, Albahaca fresca, Aceite de oliva virgen extra", 20],
      
      [2, "Marinara", "Pizzas", 7000, "/marinara.png",
       "Salsa de tomate, ajo, orégano, aceite de oliva virgen extra.",
       "Masa, Salsa de tomate, Ajo, Orégano, Aceite de oliva virgen extra", 25],
      
      [3, "Diavola", "Pizzas", 13000, "/diavola.png",
       "Salsa de tomate, queso mozzarella, pepperoni, ají, miel, AOVE.",
       "Masa, Salsa de tomate, Queso mozzarella, Pepperoni, Ají picante, Miel, Aceite de oliva virgen extra", 15],
      
      [4, "Quattro Formaggi Rossa", "Pizzas", 13000, "/quattro-formaggi.png",
       "Salsa de tomate, queso mozzarella, queso azul, queso fontina, queso parmesano, nueces, AOVE.",
       "Masa, Salsa de tomate, Queso mozzarella, Queso azul, Queso fontina, Queso parmesano, Aceite de oliva virgen extra", 12],
      
      [5, "Quattro Formaggi Bianca", "Pizzas", 13000, "/quattro-bianca.png",
       "Salsa bechamel, queso mozzarella, queso azul, queso fontina, queso parmesano, aceite de oliva virgen extra.",
       "Salsa bechamel, Queso mozzarella, Queso azul, Queso fontina, Queso parmesano, Pimienta negra", 12],
      
      [6, "Mortazza", "Pizzas", 13500, "/mortazza.png",
       "Salsa bechamel, queso mozzarella, queso parmesano rallado, mortadella, pistachos en grana, pesto, AOVE.",
       "Salsa bechamel, Queso mozzarella, Queso parmesano, Mortadella, Pistachos, Pesto", 10],
      
      [7, "Carbonara", "Pizzas", 14000, "/carbonara.png",
       "Salsa bechamel, queso mozzarella, queso parmesano, panceta dorada, huevo, pimienta negra molida, AOVE.",
       "Salsa bechamel, Queso mozzarella, Queso parmesano, Panceta, Huevo, Pimienta negra", 15],
      
      [8, "Patate", "Pizzas", 10000, "/patate.png",
       "Salsa bechamel, queso mozzarella, finas láminas de papa, romero fresco, alioli, aceite de oliva virgen extra.",
       "Salsa bechamel, Queso mozzarella, Papas, Romero fresco, Alioli, Aceite de oliva virgen extra", 18],
      
      // PASTAS
      [101, "Tagliatelle", "Pastas", 10000, "/tagliatelle.png",
       "Pasta fresca con salsa a elección y queso parmesano (1/2 kg).",
       "Salsa a elección, Queso parmesano", 20],
      
      [102, "Rigatoni", "Pastas", 10000, "/rigattoni.png",
       "Ragú (bolognesa), crema de leche, provola ahumada y queso parmesano (P/2 personas).",
       "Ragú, Crema de leche, Provola ahumada, Queso parmesano", 15],
      
      [103, "Conchiglioni", "Pastas", 10000, "/conchiglioni.png",
       "Salsa bechamel, espinaca, ricotta, provola ahumada y queso parmesano (P/2 personas).",
       "Salsa bechamel, Ricotta, Provola ahumada, Queso parmesano", 12],
      
      [104, "Lasagne", "Pastas", 10000, "/lasagne.png",
       "Ragú (bolognesa), salsa bechamel, provola ahumada y queso parmesano (P/2 personas).",
       "Ragú, Salsa bechamel, Provola ahumada, Queso parmesano", 10],
      
      // POSTRES
      [201, "Tiramisú", "Postres", 10000, "/tiramisu.png",
       "Vainillas, café Nespresso, ron, cacao amargo, crema de leche, sabayón y queso mascarpone (P/1 persona).",
       "Café Nespresso, Cacao amargo, Crema de leche, Queso mascarpone, Ron, Sabayón, Vainillas", 15],
      
      [202, "Flan", "Postres", 10000, "/flan.png",
       "Flan casero tradicional con salsa de caramelo, esencia de vainilla y dulce de leche (P/1 persona).",
       "Leche, Huevos, Azúcar, Esencia de vainilla", 20]
    ];
    
    // Agregar todos los datos
    menuData.forEach(row => {
      menuSheet.appendRow(row);
    });
    
    // Ajustar ancho de columnas
    menuSheet.setColumnWidth(1, 60);  // ID
    menuSheet.setColumnWidth(2, 200); // Name
    menuSheet.setColumnWidth(3, 100); // Category
    menuSheet.setColumnWidth(4, 80);  // Price
    menuSheet.setColumnWidth(5, 150); // Image
    menuSheet.setColumnWidth(6, 300); // Description
    menuSheet.setColumnWidth(7, 300); // Ingredients
    menuSheet.setColumnWidth(8, 80);  // Stock
    
    // Formatear precios como moneda
    const lastRow = menuSheet.getLastRow();
    menuSheet.getRange(2, 4, lastRow - 1, 1)
      .setNumberFormat("$#,##0");
    
    // Formatear stock
    menuSheet.getRange(2, 8, lastRow - 1, 1)
      .setNumberFormat("0")
      .setHorizontalAlignment("center");
    
    // Congelar primera fila
    menuSheet.setFrozenRows(1);
    
    Logger.log("✅ Hoja 'Menu' creada exitosamente con " + menuData.length + " productos");
    Logger.log("📊 Puedes ver la hoja en: " + ss.getUrl());
    
    // Mostrar en UI
    SpreadsheetApp.getUi().alert(
      "✅ Éxito",
      "Hoja 'Menu' creada con " + menuData.length + " productos.\n\n" +
      "Ahora puedes editar el stock directamente en la columna H.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log("❌ Error: " + error);
    SpreadsheetApp.getUi().alert(
      "❌ Error",
      "No se pudo crear la hoja: " + error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Función auxiliar para actualizar el stock de todos los productos
 */
function resetAllStock(cantidad) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const menuSheet = ss.getSheetByName("Menu");
    
    if (!menuSheet) {
      Logger.log("❌ Hoja 'Menu' no encontrada");
      return;
    }
    
    const lastRow = menuSheet.getLastRow();
    
    // Actualizar toda la columna de stock (excepto header)
    for (let i = 2; i <= lastRow; i++) {
      menuSheet.getRange(i, 8).setValue(cantidad || 20);
    }
    
    Logger.log(`✅ Stock actualizado a ${cantidad || 20} para todos los productos`);
    
    SpreadsheetApp.getUi().alert(
      "✅ Stock actualizado",
      `Todos los productos ahora tienen stock: ${cantidad || 20}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log("❌ Error: " + error);
  }
}

/**
 * Crear menú personalizado en la interfaz de Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🍕 Excelencia')
    .addItem('📋 Crear hoja Menu', 'setupMenuSheet')
    .addItem('🔄 Resetear stock a 20', 'resetAllStock')
    .addToUi();
}