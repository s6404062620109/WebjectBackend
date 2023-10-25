const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const app = express();


app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('public'));

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
    const email = req.body.data.email;
    const password = req.body.data.password;
    const name = req.body.data.name;
    const phone_number = req.body.data.phone_number;
    const address = req.body.data.address;
    const role = req.body.data.role;
    
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
                    ["not_submit", "", userid], (err, result) => {
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
        else if(result.length === 0){
            res.send(result);
            // console.log("Empty");
            // return res.status(404).json({ message: "Cart is Empty!"});
        }
        else{
            // console.log(result[0].cartid);
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
                            // console.log(result[i]);
                        }
                        res.send(result);
                        // console.log(result[0].id);
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

app.get('/searchproduct/:searchkey', (req,res) => {
    const path = req.params.searchkey;

    db.query("SELECT * FROM product WHERE name LIKE '%"+path+"%'",(err, result) =>{
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
            // console.log(result);
        }
    }); 
});

app.get('/ordercheck/:userid/:cartid', (req,res) => {
    const userid = req.params.userid;
    const cartid = req.params.cartid;

    db.query(
    "SELECT cart.cartid, cart.payment_status, cart.qr_picture, product_history.productid, product.name, product.price, product_history.quantity, product_history.totalprice FROM cart JOIN product_history ON product_history.cartid = cart.cartid JOIN product ON product.productid = product_history.productid WHERE cart.cartid = ? AND cart.userid = ?",
    [cartid, userid], (err, result) =>{
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
            //console.log(result);
        }
    }); 
});

app.post('/orderconfirm', (req, res) => {
    const cartid = req.body.cartid;
    const totalquantity = req.body.total;
    db.query(
    "UPDATE cart SET payment_status = ?, total = ? WHERE cartid = ?",
    ["no", totalquantity, cartid], (err, result) => {
        if(err){
            console.error('Error updating data:', err);
            res.status(500).send('Error updating data');
        }
        else{
            console.log('Received cartid:', cartid);
            console.log('Received totalquantity:', totalquantity);
            console.log('Data updated successfully');
            res.status(200).send({message: "ORDER CONFIRM SUCCESSFULLY!"});
        }
    })
});

const userstorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/customer-upload')
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    },
});

const userupload = multer({ storage: userstorage });

app.post('/userupload', userupload.single('file'), (req, res) => {
    const filename = req.file.filename;
    const cartid = req.body.cartid;
    // console.log(cartid);
    // console.log(filename);
    db.query(
    "UPDATE cart SET qr_picture = ?, upload_date = NOW() WHERE cartid = ?",
    ['/'+filename, cartid], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.json({ message: 'File uploaded successfully' });
        }
    });
});

//admin

const path = require('path');

app.get('/productlists', (req, res) => {
    const type = req.body.type;
    db.query("SELECT * FROM product",
    [type], (err, result) =>{
        if(err){
            console.log(err);
        }
        else{
            res.status(200).json(result);
        }
    });
  });
  
app.get('/monthlysale', (req,res) => {
    const type =req.body.type;
  
    const sql=`SELECT
    YEAR(c.upload_date) AS year,
    DATE_FORMAT(c.upload_date, ' %Y %M') AS month,
    SUM(p.totalprice) AS total_price,
    SUM(p.quantity) AS total_quantity
  FROM
    cart c
  INNER JOIN
    product_history p ON c.cartid = p.cartid
  WHERE
    c.payment_status IN ('yes')
  GROUP BY
    YEAR(c.upload_date), MONTH(c.upload_date)
  ORDER BY
    YEAR(c.upload_date), MONTH(c.upload_date);`;
  
    db.query(sql,[type], (err, result) =>{
        if(err){
            console.log(err);
        }
        else{
            res.status(200).json(result);
        }
    });
  });
  
  const storage = multer.diskStorage({
    destination: function (req, file, cb) { // Set the destination directory for storing uploads
      cb(null, 'public/images/');
    },
    filename: function (req, file, cb) { // Set the filename for the uploaded file
      const extname = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + Date.now() + extname);
    },
  });
  
  const upload = multer({ storage: storage });
  const fileUpload = upload.fields([{ name: "image-file", maxCount: 1}]);
  
  
  app.post('/upload',upload.single('file'), (req, res) => {
  
    const { name,quantity,price,description,size,color,category} = req.body
    const uploadedFile = req.file;
    console.log('-Received Product Data:-');
    console.log('Name:', name);
    console.log('Quantity:', quantity);
    console.log('Price:', price);
    console.log('Description:', description);
    console.log('Size:', size);
    console.log('Color:', color);
    console.log('Category:', category);
    console.log('Uploaded File Details:', uploadedFile);
  
  
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
  
    const filePath = req.file.path;
    const originalFileName = req.file.originalname;
  
    // Respond with the file path and original filename
    res.json({ path: filePath, filename: originalFileName });
  });

app.listen('3001', () =>{
    console.log('Server is running on port 3001');
})