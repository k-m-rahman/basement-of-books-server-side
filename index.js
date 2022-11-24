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
