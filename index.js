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
        }
        else{
            res.send("Success inserted!");
            res.json({message: "Signup Success!"});
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

app.listen('3001', () =>{
    console.log('Server is running on port 3001');
})