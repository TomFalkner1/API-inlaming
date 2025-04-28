const express = require("express");
const app = express();
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');


// parse application/json, för att hantera att man POSTar med JSON
const bodyParser = require("body-parser");

// Inställningar av servern.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());




async function getDBConnnection() {
  // Här skapas ett databaskopplings-objekt med inställningar för att ansluta till servern och databasen.
  return await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "databas",
  });
}

app.get("/", (req, res) => {
  res.send(`<h1>Doumentation</h1>
  <ul><li> GET /user - retunerar alla profiler i databasen</li></ul>
  <ul><li> GET /user{id} - retunerar en specifik profil från databasen</li></ul>
  <ul><li> POST /user - skapar en ny profil i databasen. I fomat {"username", "name", "email", "password"} där username ska vara unikt och lösenord blir hashade</li></ul>
  <ul><li> POST /login - loggar in med username och password. Retunerar en JWT token med bearer token</li></ul>`);
});


app.get("/user", async function (req, res) {
  let connection = await getDBConnnection();
  let sql = `SELECT Id, username, name, email from user`;
  let [results] = await connection.execute(sql);

  //res.json() skickar resultat som JSON till klienten
  res.json(results);
});

app.get("/user/:id", async function (req, res) {
  //kod här för att hantera anrop…
  let connection = await getDBConnnection();

  let sql = "SELECT Id, username, name, email FROM user WHERE id = ? OR username = ?";
  let [results] = await connection.execute(sql, [req.params.id, req.params.id]);
  res.json(results[0]); //returnerar första objektet i arrayen
});



const register = async (req, res) => {
  const { username, name, email, password } = req.body;
  const salt = await bcrypt.genSalt(10);  // genererar ett salt till hashning
  const hashedPassword = await bcrypt.hash(password, salt);

};

app.post("/user", async function (req, res) {
  console.log(req.body);
  if (req.body && req.body.username) {
    //skriv till databas

    const salt = await bcrypt.genSalt(10); // genererar ett salt till hashning
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    let connection = await getDBConnnection();
    let sql = `INSERT INTO user (username, name, email, password)
  VALUES (?, ?, ?, ?)`;

    let [results] = await connection.execute(sql, [
      req.body.username,
      req.body.name,
      req.body.email,
      hashedPassword,
    ]);

    //results innehåller metadata om vad som skapades i databasen
    console.log(results);
    res.status(201).json(results);
  } else {
    //returnera med felkod 422 Unprocessable entity.
    //eller 400 Bad Request.
    res.sendStatus(422);
  }
});

app.post('/login', async function(req, res) {
  //kod här för att hantera anrop…
  let connection = await getDBConnnection();
  let sql = "SELECT * FROM user WHERE username = ?"
  let [results] = await connection.execute(sql, [req.body.username])
  //let hashedPasswordFromDB = results[0].username;
  
  // Kontrollera att det fanns en user med det username i results
  // Verifiera hash med bcrypt

  let user = results[0];
  let hashedPasswordFromDB = user.password;
  


  const isPasswordValid = await bcrypt.compare(req.body.password, hashedPasswordFromDB);

  if (isPasswordValid) {
    console.log("Du är inne")
    // Skicka info om användaren, utan känslig info som t.ex. hash

    //Denna kod skapar en token att returnera till anroparen.
let payload = {
  sub: user.Id,         // sub är obligatorisk
  name: user.name // Valbar
  // kan innehålla ytterligare attribut, t.ex. roller
}
let token = jwt.sign(payload, 'secret of secrets')





res.json(token);
//res.json(token);


  } else {
    // Skicka felmeddelande
    res.status(400).json({ error: 'Invalid credentials' });
  }
 });
 
   

/*
  app.post() hanterar en http request med POST-metoden.
*/
app.post("/users", function (req, res) {
  // Data som postats till routen ligger i body-attributet på request-objektet.
  console.log(req.body);

  // POST ska skapa något så här kommer det behövas en INSERT
  let sql = `INSERT INTO ...`;
});

app.post("/user", async function (req, res) {
  //data ligger i req.body. Kontrollera att det är korrekt.

  if (req.body && req.body.username) {
    //skriv till databas
  } else {
    //returnera med felkod 422 Unprocessable entity.
    //eller 400 Bad Request.
    res.sendStatus(422);
  }
});

app.put("/user/:id", async function (req, res) {
  //kod här för att hantera anrop...

  let sql = `UPDATE user
     SET username = ?, password = ?
     WHERE id = ?`;

  let connection = await getDBConnnection();

  let [results] = await connection.execute(sql, [
    req.body.username,
    req.body.password,
    req.params.id,
  ]);
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
