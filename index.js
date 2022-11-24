// requirements
const express = require("express");
const cors = require("cors");
require("colors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// verifyJwt

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (error, decoded) {
    if (error) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

// connection of the database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.siwxcfo.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    // users collection
    const usersCollection = client.db("basementOfBooks").collection("users");

    // categories collection
    const categoriesCollection = client
      .db("basementOfBooks")
      .collection("categories");

    // products collection
    const productsCollection = client
      .db("basementOfBooks")
      .collection("products");

    //----------------------
    // API for categories
    //----------------------

    app.get("/categories", async (req, res) => {
      const query = {};
      const categories = await categoriesCollection.find(query).toArray();
      res.send(categories);
    });

    //----------------------
    // API for products
    //----------------------

    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    //-----------------------
    // API for users
    //-----------------------

    // getting all the users
    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    // posting an user
    app.post("/users", async (req, res) => {
      const user = req.body;

      // checking whether the user is already in the DB
      const query = { email: user.email };
      const alreadyUser = await usersCollection.findOne(query);

      if (alreadyUser) {
        return res.send({ message: "This email is already in use" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // verifying the role of user
    app.get("/users/role/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      // res.send({ isAdmin: user?.role === "admin" });
      res.send({ role: user.role });
    });

    //------------------
    // jwt
    //------------------
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN);

        return res.send({ accessToken: token });
      }

      res.status(403).send({ accessToken: "" });
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Basement of books server is running");
});

app.listen(port, () => {
  console.log(`Basement of books server running on port ${port}`.bgCyan);
});
