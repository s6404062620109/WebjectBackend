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



app.get('/users', (req, res) =>{
    db.query("SELECT * FROM user", (err, result) =>{
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    });
});

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
            //console.log(bestSellproduct3);
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

app.get('/user_product', (req, res) => {
    db.query("SELECT email, product.name as product_name, product_history.quantity FROM user JOIN cart ON cart.userid = user.userid JOIN product_history ON product_history.cartid = cart.cartid JOIN product ON product.productid = product_history.productid",
    (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
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

app.listen('3001', () =>{
    console.log('Server is running on port 3001');
})