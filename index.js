const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();


app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());

const db = mysql.createConnection({
    user: "root",
    host: "localhost",
    password: "",
    database: "webject"
})

app.get('/bestSell', (req, res) =>{
    db.query("SELECT product_history.productid, product.name, product.picture, SUM(product_history.quantity) as total_quantity FROM product_history JOIN product ON product_history.productid = product.productid GROUP BY product_history.productid ORDER BY total_quantity DESC", 
    (err, result) =>{
        if(err){
            console.log(err);
        }
        else{
            const bestSellproduct1 = result[0];
            const bestSellproduct2 = result[1];
            const bestSellproduct3 = result[2];
            // console.log(bestSellproduct3);
            res.status(201).json({product1: bestSellproduct1,product2: bestSellproduct2,product3: bestSellproduct3})
        }
    });
});

app.get('/sellPermonth', (req, res) =>{
    db.query("SELECT MONTH(upload_date) as MONTH,  SUM(product_history.quantity) as total, SUM(product.price*product_history.quantity) as total_price FROM cart JOIN product_history ON product_history.cartid = cart.cartid JOIN product ON product.productid = product_history.productid GROUP BY MONTH(upload_date)", 
    (err, result) =>{
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    });
});

app.get('/product_cart', (req, res) =>{
    db.query("SELECT product_history.cartid, product_history.productid, product.name, product_history.quantity FROM product_history JOIN product ON product.productid = product_history.productid ", 
    (err, result) =>{
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    });
});

app.post('/user_product', (req, res) => {
    const userid = req.body.userid;
    db.query("SELECT cartid, payment_status FROM cart WHERE userid = ? ORDER BY cartid",
    [userid],   (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    });
});

app.post('/reqproductincart', (req, res) => {
    const cartid = req.body.cartid;
    db.query("SELECT product.productid, product.name, product_history.quantity, totalprice FROM product_history JOIN product ON product_history.productid = product.productid WHERE cartid = ? ORDER BY id",
    [cartid], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
            //console.log(result);
        }
    });
});


app.post('/signup', async (req, res) =>{
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;
    const phone_number = req.body.phone_number;
    const address = req.body.address;
    const role = req.body.role;

    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.query("INSERT INTO user (email, password, name, phone_number, address, role) VALUES(?, ?, ?, ?, ?, ?)", 
    [email, hashedPassword, name, phone_number, address, role], (err, result) =>{
        if(err){
            console.log(err);
            return res.status(500).json({message: "Signup failed!"});
        }
        else{
            return res.status(201).json({message: "Signup Success!"});
            //console.log(res)
        }
    })
})

app.post('/signin', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    db.query("SELECT * FROM user WHERE email = ?",
    [email], (err, result) =>{
        if(err){
            return res.status[500].json({message: "server Error!"});
        }
        if(result.length > 0){
            const user = result[0];
            //console.log(user)

            bcrypt.compare(password, user.password, (bcryptErr, bcryptRes) =>{
                if(bcryptErr){
                    console.log(bcryptErr);
                    return res.status(500).json({ message: "Server Error!" });
                }
                if(bcryptRes){
                    const name = result[0].name;
                    const token = jwt.sign({name}, "jwt-secret-key", {expiresIn: '1h'});
                    const decoded = jwt.verify(token, "jwt-secret-key");
                    const expired_date = new Date(decoded.exp * 1000);
                    res.cookie("token", token);
                    
                    db.query("UPDATE user SET token = ?, token_expired_date = ? WHERE email = ?", 
                    [token, expired_date, email], (err, result) => {
                        if(err){
                            console.log(err);
                            return res.status(500).json({ message: 'Internal server error' });
                        }
                        return res.json({message: "SignIn Successful!",token:token, exp:expired_date})
                    })

                }else{
                    res.json({message: "Invalid password"});
                }
            });
        }
        else{
            res.json({message: "Invalid email"});
        }
    })
})


app.get('/getUser', (req, res) => {
    const token =  req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    db.query(
        'SELECT * FROM user WHERE token = ? AND token_expired_date > NOW()',
        [token],
        (err, results) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }
    
          if (results.length === 0) {
            return res.status(401).json({ message: 'Token not found' });
          }
    
          const user = results[0];
          res.json({ user });
        }
    );
});

app.post('/getproduct', (req,res) => {
    const type = req.body.type;
    db.query("SELECT * FROM product WHERE category = ?",
    [type], (err, result) =>{
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    });
});

app.get('/getproductSelected/:pathproduct', (req,res) => {
    const path = req.params.pathproduct;

    db.query("SELECT * FROM product WHERE productid = ?",
   [path], (err, result) =>{
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
            // console.log(result);
        }
    }); 
});

const min = 1;
const max = 100;
const randomInt = Math.floor(Math.random() * (max - min + 1)) + min;
app.post('/postproductid', (req, res) => {
    const productid = req.body.productid;
    const userid = req.body.userid;
    const quantity = req.body.quantity;
    const price = req.body.price;

    db.query("SELECT cartid , payment_status FROM cart WHERE userid = ? AND payment_status = 'not_submit'", [userid], (err, result) => {
        if(err){
            console.log(err);
            res.status(500).json({ message: "Error database !"});
        }
        else{
            // console.log(result);
            if(result.length === 0){
                // console.log(result)
                db.query("INSERT INTO cart (payment_status, qr_picture, userid) VALUES (?, ?, ?)",
                    ["not_submit", "/qrimage"+randomInt, userid], (err, result) => {
                        if(err){
                            console.log(err);
                            res.status(500).json({message: "Error Inserted cart to database!"});
                        }
                        else{
                            // console.log(result);
                        }
                    });
                db.query("SELECT cartid , payment_status FROM cart WHERE userid = ? AND payment_status = 'not_submit'",
                [userid], (err, result) => {
                    if(err){
                        console.log(err);
                        res.status(500).json({ message: "Error database !"});
                    }
                    else{
                        // console.log(result[0].cartid);
                        let cartid = result[0].cartid;
                        db.query("INSERT INTO product_history (productid, quantity, totalprice, cartid) VALUES (?, ?, ?, ?)",
                            [productid, quantity, price*quantity, cartid], (err, result) => {
                            if(err){
                                console.log(err);
                                    res.status(500).json({message: "Error Inserted product to database!"});
                                }
                                else{
                                    // console.log(result);
                                    // res.status(200).json({message: "Inserted product Success"});
                                }
                            });
                    }
                });
            }
            else{
                let cartid = result[0].cartid;
                // console.log(result[0].cartid)
                db.query("INSERT INTO product_history (productid, quantity, totalprice, cartid) VALUES (?, ?, ?, ?)",
                    [productid, quantity, price*quantity, cartid], (err, result) => {
                    if(err){
                        console.log(err);
                            res.status(500).json({message: "Error Inserted product to database!"});
                        }
                        else{
                            // console.log(result);
                            // res.status(200).json({message: "Inserted product Success"});
                        }
                    });
            }
            res.status(200).json({ message: "Inserted product Success!" });
        }
    });
});

app.post('/getcart', (req, res) => {
    const userid = req.body.userid;
    db.query("SELECT cartid FROM cart WHERE userid = ? AND payment_status = 'not_submit'",
    [userid], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            // console.log(result[0].cartid);
            // res.send(result);
            const cartid = result[0].cartid;
            db.query(
            "SELECT product_history.id, product_history.productid, product.name, product_history.quantity, totalprice FROM product_history JOIN product ON product.productid = product_history.productid WHERE product_history.cartid = ? ORDER BY product_history.productid",
            [cartid], (err, result) => {
                if(err){
                    console.log(err);
                }
                else{
                    for(let i=0 ; i<result.length ; i++){
                        result[i].cartid = cartid;
                    }
                    res.send(result);
                    // console.log(result);
                }
            })            
        }
    });
});

app.get('/getsimpleproduct', (req, res) => {
    db.query("SELECT * FROM product", (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            let index = [];
            while (index.length < 6) {
                let randomInt = Math.floor(Math.random() * result.length);
                if (!index.includes(randomInt)) {
                    index.push(randomInt);
                }
            }
            const simpleproduct1 = result[index[0]];
            const simpleproduct2 = result[index[1]];
            const simpleproduct3 = result[index[2]];
            const simpleproduct4 = result[index[3]];
            const simpleproduct5 = result[index[4]];
            const simpleproduct6 = result[index[5]];
            // console.log(simpleproduct1);
            // console.log(simpleproduct2);
            // console.log(simpleproduct3);
            // console.log(simpleproduct4);
            // console.log(simpleproduct5);
            // console.log(simpleproduct6);
            return res.status(200).json({ 
                simple1: simpleproduct1,
                simple2: simpleproduct2,
                simple3: simpleproduct3, 
                simple4: simpleproduct4,
                simple5: simpleproduct5,
                simple6: simpleproduct6
            })
        }
    })
});

app.post('/deleteProduct', (req, res) => {
    const productid = req.body.productid;
    const cartid = req.body.cartid;
    const id = req.body.id;
    db.query("DELETE FROM product_history WHERE productid = ? AND cartid = ? AND id = ?", 
    [productid, cartid, id],
    (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.status(200).json({ message: "Delete Successed!" });
        }
    });
});

app.get('/reccomendproduct', (req, res) => {
    db.query("SELECT * FROM product",(err, result) => {
        if(err){
            console.log(err);
        }
        else{
            let index = [];
            while (index.length < 5) {
                let randomInt = Math.floor(Math.random() * result.length);
                if (!index.includes(randomInt)) {
                    index.push(randomInt);
                }
            }
            const recproduct1 = result[index[0]];
            const recproduct2 = result[index[1]];
            const recproduct3 = result[index[2]];
            const recproduct4 = result[index[3]];
            const recproduct5 = result[index[4]];
            return res.status(200).json({ 
                rec1: recproduct1,
                rec2: recproduct2,
                rec3: recproduct3, 
                rec4: recproduct4,
                rec5: recproduct5
            })
            // console.log(recproduct1);
            // console.log(recproduct2);
            // console.log(recproduct3);
            // console.log(recproduct4);
            // console.log(recproduct5);
            // console.log(index);
        }
    });
});

app.listen('3001', () =>{
    console.log('Server is running on port 3001');
})