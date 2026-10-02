const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("inventory.db", function (error) {
    if (error) {
        console.log("Database Connection Failed");
        console.log(error.message);
        return;
    }
    console.log("Database Connected Successfully");
    db.run("PRAGMA foreign_keys = ON");

});

function createTable(query, tableName) {

    db.run(query, function (error) {

        if (error) {
            console.log(`${tableName} Table Creation Failed`);
            console.log(error.message);
            return;
        }
        console.log(`${tableName} Table Created Successfully`);
    });
}


// USER TABLE

const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin'))
);`;

createTable(createUsersTable, "Users");






// SUPPLIERS TABLE

const createSuppliersTable = `
    CREATE TABLE IF NOT EXISTS suppliers(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    city TEXT NOT NULL
);`;

createTable(createSuppliersTable, "Suppliers");





// CATEGORIES TABLE

const createCategoriesTable = `
    CREATE TABLE IF NOT EXISTS categories(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
);`;

createTable(createCategoriesTable, "Categories");




// PRODUCTS TABLE

const createProductsTable = `
    CREATE TABLE IF NOT EXISTS products(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku  TEXT NOT NULL UNIQUE,
    price REAL NOT NULL CHECK(price > 0),
    stock_quantity INTEGER NOT NULL CHECK(stock_quantity >= 0),
    reorder_level INTEGER NOT NULL CHECK(reorder_level >= 0),
    supplier_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY(category_id) REFERENCES categories(id));
`;

createTable(createProductsTable, "Products");




// STOCK MOVEMENT HISTORY TABLE

const createStockMovementTable = `
    CREATE TABLE IF NOT EXISTS stock_movements(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL CHECK(movement_type IN ('IN','OUT')),
        quantity INTEGER NOT NULL,
        movement_date TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(product_id) REFERENCES products(id)
    );
`;

createTable(createStockMovementTable, "Stock Movements");





// PURCHASE ORDERS TABLE

const createPurchaseOrdersTable = `
        CREATE TABLE IF NOT EXISTS purchase_orders(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        order_status TEXT DEFAULT 'Pending' CHECK(order_status IN ('Pending','Received','Cancelled')),
        order_date TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    );`;

createTable(createPurchaseOrdersTable, "Purchase Orders");



module.exports = db;
