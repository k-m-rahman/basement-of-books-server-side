// requirements
const express = require("express");
const cors = require("cors");
require("colors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

const stripe = require("stripe")(process.env.STRIPE_SECRET);

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

    // products collection
    const bookingsCollection = client
      .db("basementOfBooks")
      .collection("bookings");

    // payments collection
    const paymentsCollection = client
      .db("basementOfBooks")
      .collection("payments");

    //   verify seller middleware .
    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user.role !== "Seller") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //   verify seller middleware .
    const verifyBuyer = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user.role !== "Buyer") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //   verify seller middleware .
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user.role !== "Admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

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

    // getting the products of specific category
    //-----------------------------------------
    app.get("/products/:categoryId", verifyJWT, async (req, res) => {
      const categoryId = req.params.categoryId;

      //getting the category name
      const query2 = { _id: ObjectId(categoryId) };
      const category = await categoriesCollection.findOne(query2);

      if (category) {
        const query = { categoryId, soldStatus: false };
        const products = await productsCollection.find(query).toArray();

        res.send({ category, products });
      } else {
        res.send("Invalid category");
      }
    });

    // getting a specific product
    app.get("/products", verifyJWT, async (req, res) => {
      const id = req.query.productId;
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(query);
      res.send(product);
    });

    // getting all the advertised products
    app.get("/advertisedProducts", async (req, res) => {
      const query = { soldStatus: false, advertised: true };
      const advertisedProducts = await productsCollection.find(query).toArray();
      res.send(advertisedProducts);
    });

    // getting products of a specific seller
    app.get(
      "/sellerProducts/:email",
      verifyJWT,
      verifySeller,
      async (req, res) => {
        const email = req.params.email;

        const decodedEmail = req.decoded.email;
        if (decodedEmail !== email) {
          return res.status(403).send({ message: "forbidden access" });
        }

        const query = { sellerEmail: email };
        const products = await productsCollection.find(query).toArray();
        res.send(products);
      }
    );

    // adding products in database
    app.post("/products", verifyJWT, verifySeller, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    // updating the product advertised status
    app.put(
      "/product/advertise/:id",
      verifyJWT,
      verifySeller,
      async (req, res) => {
        const id = req.params.id;
        console.log(id.bgMagenta);
        const filter = { _id: ObjectId(id) };

        // verifying the seller email
        const decodedEmail = req.decoded.email;
        const product = await productsCollection.findOne(filter);
        if (product.sellerEmail !== decodedEmail) {
          return res.status(403).send({ message: "forbidden access" });
        }

        const options = { upsert: true };
        const updatedDoc = {
          $set: {
            advertised: true,
          },
        };
        const result = await productsCollection.updateOne(
          filter,
          updatedDoc,
          options
        );
        res.send(result);
      }
    );

    // deleting single product of a specific seller
    app.delete("/products/:id", verifyJWT, verifySeller, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };

      // verifying the seller email
      const decodedEmail = req.decoded.email;
      const product = await productsCollection.findOne(query);
      if (product.sellerEmail !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    //-----------------------
    // API for bookings
    //-----------------------

    // getting all the bookings of a specific buyer
    app.get("/bookings", verifyJWT, async (req, res) => {
      const email = req.query.email;

      const decodedEmail = req.decoded.email;
      if (decodedEmail !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { buyerEmail: email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });

    // getting a specific booking
    app.get("/bookings/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });

    // posting a booking
    app.post("/bookings", verifyJWT, verifyBuyer, async (req, res) => {
      const booking = req.body;

      // checking whether the user already booked the specific product
      const email = req.decoded.email;
      const query = { buyerEmail: email };
      const bookings = await bookingsCollection.find(query).toArray();
      const alreadyBooked = bookings.find(
        (bk) => bk.product === booking.product
      );
      if (alreadyBooked) {
        return res.send({
          alreadyBooked: true,
          message: "Product is already booked by this user!",
        });
      }
      const result = await bookingsCollection.insertOne(booking);
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

    //---------------
    // api for sellers
    //-----------------

    // getting all the sellers
    app.get("/users/sellers", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: "Seller" };
      const sellers = await usersCollection.find(query).toArray();
      res.send(sellers);
    });

    // verifying a seller
    app.put("/users/sellers/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          verified: true,
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // deleting a seller
    app.delete(
      "/users/sellers/:id",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };

        const result = await usersCollection.deleteOne(query);
        res.send(result);
      }
    );

    // verifying the role of user and send the response to client side
    app.get("/users/role/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      // res.send({ isAdmin: user?.role === "admin" });
      res.send({ role: user?.role });
    });

    app.get("/users/verifiedSeller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ verified: user?.verified });
    });

    //----------------------------
    // API for payments
    //----------------------------

    // stripe payment api
    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const amount = booking.price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);

      // updating the specific booking after payment
      const id = payment.bookingId;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
        },
      };
      const updatedResult = await bookingsCollection.updateOne(
        filter,
        updateDoc
      );

      // updating the specific product sold status after payment
      const query = { _id: ObjectId(payment.productId) };
      const updateDoc2 = {
        $set: {
          soldStatus: true,
        },
      };
      const updatedResult2 = await productsCollection.updateOne(
        query,
        updateDoc2
      );

      res.send(result);
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
