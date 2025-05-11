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


function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Auth token saknas' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    // Verifiera token med samma secret och kontrollera expiration
    const decoded = jwt.verify(token, 'secret of secrets'); // ← Här använder du din hemliga nyckel
    req.user = decoded; // Gör användarens data tillgänglig i req.user
    next(); // Gå vidare till nästa middleware eller route
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: 'Ogiltig eller utgången token' });
  }
}


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
  <ul><li> {LÅS} - GET /user - retunerar alla profiler i databasen</li></ul>
  <ul><li> {LÅS} - GET /user{id} - retunerar en specifik profil från databasen</li></ul>
  <ul><li> {LÅS} - PUT /user{id} - Uppdaterar en profil i databasen. Måste skriva in hela objektet oavsett om man bara uppdaterar en sak</li></ul>
  <ul><li> {LÅS} - POST /user - skapar en ny profil i databasen. I fomat {"username", "name", "email", "password"} där username ska vara unikt och lösenord blir hashade</li></ul>
  <ul><li> POST /login - loggar in med username och password. Retunerar en JWT token med bearer token</li></ul>
  <ul><li> GET /auth-test - Chechar sin auth-token</li></ul>
  
  <br><br><br><br>
  

{LÅS} - Route behöver giltig bearer-token i authorziation header `);
});


app.get("/user", authMiddleware, async function (req, res) {
  let connection = await getDBConnnection();
  let sql = `SELECT Id, username, name, email from user`;
  let [results] = await connection.execute(sql);

  //res.json() skickar resultat som JSON till klienten
  res.json(results);
});

app.get("/user/:id", authMiddleware, async function (req, res) {
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

app.post("/user", authMiddleware, async function (req, res) {
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
let token = jwt.sign(payload, 'secret of secrets', { expiresIn: 60 });


const userInfo = {
  id: user.id,
  name: user.name,
  username: user.username,
  email: user.email
};



res.status(200).json({
  token: token
});
//res.json(token);


  } else {
    // Skicka felmeddelande
    res.status(401).json({ error: 'Invalid credentials' });
  }
 });
 
   

/*
  app.post() hanterar en http request med POST-metoden.
*/



app.put("/user/:id", authMiddleware, async function (req, res) {
  //kod här för att hantera anrop...
  try{

  let connection = await getDBConnnection();

  let sql = `UPDATE user
     SET username = ?, email = ?, name = ?
     WHERE id = ?`;

  let [results] = await connection.execute(sql, [
    req.body.username,
    req.body.email,
    req.body.name,
    req.params.id
  ]);

   let [updatedUser] = await connection.execute(
      "SELECT id, username, name, email FROM user WHERE id = ?",
      [req.params.id]
    );
  
  if (results.affectedRows === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  // Om uppdatering lyckas, returnera resultatet (200 OK)
  res.status(200).json({ message: "User updated successfully", data: results, Profil: updatedUser });
}catch (err) {
  // Fångar eventuella fel och returnerar 500 (server error)
  console.error(err);  // Logga felet för felsökning
  res.status(500).json({ error: "Internal server error" });
}
});

//Route för att testa token.
app.get("/auth-test", function (req, res) {
  let authHeader = req.headers["authorization"] //Hämtar värdet (en sträng med token) från authorization headern i requesten
  
  if (authHeader === undefined) {
    res.status(401).send("Auth token missing or expired")
  }
  
  let token = authHeader.slice(7) // Tar bort "BEARER " som står i början på strängen.
  console.log("token: ", token)

  let decoded
  try {
    // Verifiera att detta är en korrekt token. Den ska vara:
    // * skapad med samma secret
    // * omodifierad
    // * fortfarande giltig
    decoded = jwt.verify(token, 'secret of secrets')
  } catch (err) {
    // Om något är fel med token så kastas ett error.

    console.error(err) //Logga felet, för felsökning på servern.

    res.status(401).send("Invalid auth token")
  }

  res.send(decoded) // Skickar tillbaka den avkodade, giltiga, tokenen.
})

const port = 3000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
