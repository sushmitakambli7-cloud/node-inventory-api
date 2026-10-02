require("dotenv").config();
const express = require("express");
const db = require("./database_config");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
app.use(express.json());



// Required API Endpoints
// POST /register
// POST /login
// POST /suppliers
// GET /suppliers
// POST /products
// GET /products
// GET /products/low-stock
// PUT /products/:id
// POST /purchase-orders
// PATCH /purchase-orders/:id/status
// DELETE /products/:id


function sendError(res, status, message, error = "") {
    return res.status(status).json({
        success: false,
        message: message,
        error: error
    });
}

function sendSuccess(res, status, message) {
    return res.status(status).json({
        success: true,
        message: message
    });
}

function isValidEmail(email) {
    if (email.includes("@") && email.includes(".")) {
        return true;
    }
    return false;
}





app.get("/", function (req, res) {
    res.send("Inventory API Running Successfully.")
})




// name, email, password

app.post("/register", function (req, res) {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Name, Email and Password are required"
        });
    }

    if (!isValidEmail(email)) {
        return sendError(res, 400, "Enter Valid Email");
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: "Password should be atleast 6 characters long"
        });
    }

    bcrypt.hash(password, 10, function (error, hashedPassword) {
        if (error) {
            return sendError(res, 500, "Database Error", error.message);
        }
        const Insert_User_query = `
            INSERT INTO users(name,email,password)
            VALUES(?,?,?);
        `;

        db.run(Insert_User_query, [name, email, hashedPassword], function (error) {
            if (error) {
                return sendError(res, 400, "User Could not be registered", error.message);
            }

            return sendSuccess(res, 201, "User Registered Successfully");
        });
    });
});






// email,password
// Login user
app.post("/login", function (req, res) {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and Password are required"
        });
    }

    if (!isValidEmail(email)) {
        return sendError(res, 400, "Enter Valid Email");
    }

    const SelectUserQuery = `
        SELECT * FROM users 
        WHERE email = ?;
    `

    db.get(SelectUserQuery, [email], function (error, user) {
        if (error) {
            return sendError(res, 500, "Database Error", error.message);
        }
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        bcrypt.compare(password, user.password, function (error, isMatch) {
            if (error) {
                return sendError(res, 500, "Database Error", error.message);
            }
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid Password"
                });
            }
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email
                },
                JWT_SECRET,
                {
                    expiresIn: "1h"
                });

            res.json({
                success: true,
                message: "Login Successful",
                token: token
            });
        });

    });
})







// Token Verification
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Token is required"
        });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, JWT_SECRET, function (error, decoded) {
        if (error) {
                return sendError(res, 401, "Invalid or Token expired", error.message);
        }
        req.user = decoded;
        next();
    })
}







// name,email,phone,city

// post/Suppliers
app.post("/suppliers", verifyToken, function (req, res) {

    const name = req.body.name;
    const email = req.body.email;
    const phone = req.body.phone;
    const city = req.body.city;

    if (!name || !email || !phone || !city) {
        return res.status(400).json({
            success: false,
            message: "All fields are required"
        });
    }

    if (!isValidEmail(email)) {
        return sendError(res, 400, "Enter Valid Email");
    }
    const InsertSupplierQuery = `
        INSERT INTO suppliers(name,email,phone,city)
        VALUES(?,?,?,?)
    `;

    db.run(
        InsertSupplierQuery,
        [name, email, phone, city],
        function (error) {

            if (error) {
                return sendError(res, 400, "Supplier could not be added", error.message);
            }

            return sendSuccess(res, 201, "Supplier Added Successfully");
        }
    );
});




// get/Suppliers

app.get("/suppliers", verifyToken, function (req, res) {

    const GetSuppliersQuery = `
        SELECT * FROM suppliers;
    `;

    db.all(GetSuppliersQuery, [], function (error, suppliers) {

        if (error) {
            return sendError(res, 500, "Database Error", error.message);
        }

        res.status(200).json({
            success: true,
            suppliers: suppliers
        });

    });

});





// name
// POST /categories

app.post("/categories", verifyToken, function (req, res) {

    const name = req.body.name;

    if (!name) {
        return res.status(400).json({
            success: false,
            message: "Category name is required"
        });
    }

    const InsertCategoryQuery = `
        INSERT INTO categories(name)
        VALUES(?);
    `;

    db.run(InsertCategoryQuery, [name], function (error) {

        if (error) {
            return sendError(res, 400, "Category could not be added", error.message);
        }

        return sendSuccess(res, 201, "Category Added Successfully");
    });

});




// GET /categories

app.get("/categories", verifyToken, function (req, res) {

    const GetCategoriesQuery = `
        SELECT * FROM categories;
    `;

    db.all(GetCategoriesQuery, [], function (error, categories) {

        if (error) {
            return sendError(res, 500, "Database Error", error.message);
        }

        res.status(200).json({
            success: true,
            categories: categories
        });

    });

});






// name,sku,price,stock_quantity,reorder_level,supplier_id,category_id
// POST /products

app.post("/products", verifyToken, function (req, res) {

    const name = req.body.name;
    const sku = req.body.sku;
    const price = req.body.price;
    const stock_quantity = req.body.stock_quantity;
    const reorder_level = req.body.reorder_level;
    const supplier_id = req.body.supplier_id;
    const category_id = req.body.category_id;

    // Validation
    if (
        !name ||
        !sku ||
        price == null ||
        stock_quantity == null ||
        reorder_level == null ||
        !supplier_id ||
        !category_id
    ) {
        return res.status(400).json({
            success: false,
            message: "All fields are required"
        });
    }

    if (price <= 0) {
        return res.status(400).json({
            success: false,
            message: "Price must be greater than 0"
        });
    }

    if (stock_quantity < 0) {
        return res.status(400).json({
            success: false,
            message: "Stock quantity cannot be negative"
        });
    }

    if (reorder_level < 0) {
        return res.status(400).json({
            success: false,
            message: "Reorder level cannot be negative"
        });
    }

    // Check Supplier
    const CheckSupplierQuery = `
        SELECT * FROM suppliers
        WHERE id = ?;
    `;

    // Check Category
    const CheckCategoryQuery = `
        SELECT * FROM categories
        WHERE id = ?;
    `;

    // Insert Product
    const InsertProductQuery = `
        INSERT INTO products
        (name, sku, price, stock_quantity, reorder_level, supplier_id, category_id)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    `;

    // Check Supplier
    db.get(CheckSupplierQuery, [supplier_id], function (error, supplier) {

        if (error) {
            return sendError(res, 500, "Database Error", error.message);
        }

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found"
            });
        }

        // Check Category
        db.get(CheckCategoryQuery, [category_id], function (error, category) {

            if (error) {
                return sendError(res, 500, "Database Error", error.message);
            }

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found"
                });
            }

            // Insert Product
            db.run(
                InsertProductQuery,
                [
                    name,
                    sku,
                    price,
                    stock_quantity,
                    reorder_level,
                    supplier_id,
                    category_id
                ],
                function (error) {

                    if (error) {
                        return sendError(res, 400, "Product could not be added", error.message);
                    }

                    return sendSuccess(res, 201, "Product Added Successfully");
                }
            );

        });

    });

});





// GET /products

app.get("/products", verifyToken, function (req, res) {

    const GetProductsQuery = `
        SELECT 
            products.id,
            products.name,
            products.sku,
            products.price,
            products.stock_quantity,
            products.reorder_level,
            suppliers.name AS supplier_name,
            categories.name AS category_name
        FROM products
        JOIN suppliers
        ON products.supplier_id = suppliers.id
        JOIN categories
        ON products.category_id = categories.id;
    `;

    db.all(GetProductsQuery, [], function (error, products) {

        if (error) {
            return sendError(res, 500, "Database Error", error.message);
        }

        res.status(200).json({
            success: true,
            products: products
        });

    });

});





// GET /products/low-stock

app.get("/products/low-stock", verifyToken, function (req, res) {

    const GetProductsLowStockQuery = `
    SELECT
            products.id,
            products.name,
            products.sku,
            products.price,
            products.stock_quantity,
            products.reorder_level,
            suppliers.name AS supplier_name,
            categories.name AS category_name
        FROM products
        JOIN suppliers
        ON products.supplier_id = suppliers.id
        JOIN categories
        ON products.category_id = categories.id
        WHERE products.stock_quantity <= products.reorder_level;
    `;


    db.all(GetProductsLowStockQuery, [], function (error, products) {

        if (error) {
            return sendError(res, 500, "Database Error", error.message);
        }

        res.status(200).json({
            success: true,
            products: products
        });

    });

});






// url-id, name,sku,price,stock_quantity,reorder_level,supplier_id,category_id
// PUT /products/:id

app.put("/products/:id", verifyToken, function (req, res) {

    const id = req.params.id;

    const name = req.body.name;
    const sku = req.body.sku;
    const price = req.body.price;
    const stock_quantity = req.body.stock_quantity;
    const reorder_level = req.body.reorder_level;
    const supplier_id = req.body.supplier_id;
    const category_id = req.body.category_id;

    // Validation
    if (
        !name ||
        !sku ||
        price == null ||
        stock_quantity == null ||
        reorder_level == null ||
        !supplier_id ||
        !category_id
    ) {
        return res.status(400).json({
            success: false,
            message: "All fields are required"
        });
    }

    if (price <= 0) {
        return res.status(400).json({
            success: false,
            message: "Price must be greater than 0"
        });
    }

    if (stock_quantity < 0) {
        return res.status(400).json({
            success: false,
            message: "Stock quantity cannot be negative"
        });
    }

    if (reorder_level < 0) {
        return res.status(400).json({
            success: false,
            message: "Reorder level cannot be negative"
        });
    }

    // Check Product
    const CheckProductQuery = `
        SELECT * FROM products
        WHERE id = ?;
    `;

    // Check Supplier
    const CheckSupplierQuery = `
        SELECT * FROM suppliers
        WHERE id = ?;
    `;

    // check category
    const CheckCategoryQuery = `
        SELECT * FROM categories
        WHERE id = ?;
    `;

    // Update Product
    const UpdateProductQuery = `
        UPDATE products
        SET
            name = ?,
            sku = ?,
            price = ?,
            stock_quantity = ?,
            reorder_level = ?,
            supplier_id = ?,
            category_id = ?
        WHERE id = ?;
    `;

    // Check if product exists
    db.get(CheckProductQuery, [id], function (error, product) {

        if (error) {
            return sendError(res, 500, "Database Error", error.message);
        }

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Check if supplier exists
        db.get(CheckSupplierQuery, [supplier_id], function (error, supplier) {

            if (error) {
                return sendError(res, 500, "Database Error", error.message);
            }

            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: "Supplier not found"
                });
            }


            // Check if category exists
            db.get(CheckCategoryQuery, [category_id], function (error, category) {

                if (error) {
                    return sendError(res, 500, "Database Error", error.message);
                }

                if (!category) {
                    return res.status(404).json({
                        success: false,
                        message: "Category not found"
                    });
                }


                // Update Product
                db.run(
                    UpdateProductQuery,
                    [
                        name,
                        sku,
                        price,
                        stock_quantity,
                        reorder_level,
                        supplier_id,
                        category_id,
                        id
                    ],
                    function (error) {

                        if (error) {
                            return sendError(res, 400, "Product could not be updated", error.message);
                        }
                        
                        return sendSuccess(res, 200, "Product Updated Successfully");

                    }
                );

            });

        });

    });
});




// supplier_id,product_id,quantity
// POST /purchase-orders

app.post("/purchase-orders", verifyToken, function (req, res) {

    const supplier_id = req.body.supplier_id;
    const product_id = req.body.product_id;
    const quantity = req.body.quantity;

    if (!supplier_id || !product_id || quantity == null) {
        return res.status(400).json({
            success: false,
            message: "All fields are required"
        });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
            success: false,
            message: "Quantity must be greater than 0"
        });
    }

    const CheckSupplierQuery = `
        SELECT * FROM suppliers
        WHERE id = ?;
    `;

    const CheckProductQuery = `
        SELECT * FROM products
        WHERE id = ?;
    `;

    const InsertPurchaseOrderQuery = `
        INSERT INTO purchase_orders
        (supplier_id, product_id, quantity)
        VALUES(?,?,?);
    `;

    const UpdateStockQuery = `
        UPDATE products
        SET stock_quantity = stock_quantity + ?
        WHERE id = ?;
    `;

    const InsertStockMovementQuery = `
        INSERT INTO stock_movements
        (product_id, movement_type, quantity)
        VALUES (?, ?, ?);
    `;

    db.get(CheckSupplierQuery, [supplier_id], function (error, supplier) {

        if (error) {
            return sendError(res, 500, "Database Error", error.message);
        }

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found"
            });
        }

        db.get(CheckProductQuery, [product_id], function (error, product) {

            if (error) {
                return sendError(res, 500, "Database Error", error.message);
            }

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            db.run(
                InsertPurchaseOrderQuery,
                [supplier_id, product_id, quantity],
                function (error) {

                    if (error) {
                        return sendError(res, 400, "Purchase Order could not be created", error.message);
                    }

                    db.run(
                        UpdateStockQuery,
                        [quantity, product_id],
                        function (error) {

                            if (error) {
                                return sendError(res, 500, "Database Error", error.message);
                            }


                            db.run(
                                InsertStockMovementQuery,
                                [product_id, "IN", quantity],
                                function (error) {

                                    if (error) {
                                        return sendError(res, 500, "Database Error", error.message);
                                    }

                                    return sendSuccess(res, 201, "Purchase Order Added Successfully");
                                }
                            );

                        }

                    );

                });

        });

    });
});







// GET /stock-movements

app.get("/stock-movements", verifyToken, function (req, res) {

    const GetStockMovementsQuery = `
        SELECT
            stock_movements.id,
            products.name AS product_name,
            stock_movements.movement_type,
            stock_movements.quantity,
            stock_movements.movement_date
        FROM stock_movements
        JOIN products
        ON stock_movements.product_id = products.id
        ORDER BY stock_movements.movement_date DESC;
    `;

    db.all(GetStockMovementsQuery, [], function (error, movements) {

        if (error) {
            return sendError(res, 500, "Database Error", error.message);
        }

        res.status(200).json({
            success: true,
            stock_movements: movements
        });

    });

});








// GET /suppliers/:id/products

app.get("/suppliers/:id/products", verifyToken, function (req, res) {

    const supplier_id = req.params.id;

    const CheckSupplierQuery = `
        SELECT * FROM suppliers
        WHERE id = ?;
    `;

    const SupplierProductsQuery = `
        SELECT
            products.id,
            products.name,
            categories.name AS category,
            products.price,
            products.stock_quantity
        FROM products
        JOIN categories
        ON products.category_id = categories.id
        WHERE products.supplier_id = ?;
    `;

    db.get(CheckSupplierQuery, [supplier_id], function (error, supplier) {

        if (error) {
            return sendError(res, 500, "Database Error", error.message);
        }

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found"
            });
        }

        db.all(SupplierProductsQuery, [supplier_id], function (error, products) {

            if (error) {
                return sendError(res, 500, "Database Error", error.message);
            }

            res.status(200).json({
                success: true,
                supplier: supplier.name,
                products: products
            });

        });

    });

});






// url-id, order_status
// PATCH /purchase-orders/:id/status

app.patch("/purchase-orders/:id/status", verifyToken, function (req, res) {

    const id = req.params.id;
    const order_status = req.body.order_status;

    if (!order_status) {
        return res.status(400).json({
            success: false,
            message: "Order status is required"
        });
    }

    if (
        order_status !== "Pending" &&
        order_status !== "Received" &&
        order_status !== "Cancelled"
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid Order Status"
        });
    }

    const CheckOrderQuery = `
        SELECT * FROM purchase_orders
        WHERE id = ?;
    `;

    const UpdateOrderStatusQuery = `
        UPDATE purchase_orders
        SET order_status = ?
        WHERE id = ?;
    `;

    db.get(CheckOrderQuery, [id], function (error, order) {

        if (error) {
            return sendError(res, 500, "Database Error", error.message);
        }

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Purchase Order not found"
            });
        }

        db.run(UpdateOrderStatusQuery, [order_status, id], function (error) {

            if (error) {
                return sendError(res, 400, "Order Status could not be updated", error.message);
            }

            return sendSuccess(res, 200, "Order Status Updated Successfully");
        });

    });

});



// DELETE /products/:id

app.delete("/products/:id", verifyToken, function (req, res) {

    const id = req.params.id;

    const CheckProductQuery = `
        SELECT * FROM products
        WHERE id = ?;
    `;

    const DeleteProductQuery = `
        DELETE FROM products
        WHERE id = ?;
    `;

    db.get(CheckProductQuery, [id], function (error, product) {

        if (error) {
            return sendError(res, 500, "Database Error", error.message);
        }

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        db.run(DeleteProductQuery, [id], function (error) {

            if (error) {

                return sendError(res, 400, "Product could not be deleted", error.message);
            }

            return sendSuccess(res, 200, "Product Deleted Successfully");
        });

    });

});



app.listen(5001, function () {
    console.log("Server is Running at http://localhost:5001");
});
