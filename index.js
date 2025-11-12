const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const PORT = process.env.PORT || 5000;
const admin = require("firebase-admin");
const serviceAccount = require(`./${process.env.AUTH_FILE}`);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
//middlewire
app.use(cors());
app.use(express.json());
const logger = async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.send({ message: "Unauthorized Access" });
  }
  const token = req.headers?.authorization.split(" ")[1];
  if (!token) {
    return res.send({ message: "Unauthorized Access" });
  }
  const userInfo = await admin.auth().verifyIdToken(token);
  if (userInfo.email !== req.query.email) {
    res.send({ message: "Unauthorized Access" });
  } else {
    next();
  }
};

//DataBase
const uri = process.env.DB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Hello from server, RentWheel");
});

//connection to database
async function run() {
  try {
    // await client.connect();
    app.post("/user", async (req, res) => {
      const db = client.db("userDB");
      const userColl = db.collection("users");
      const query = { email: req.body.email };
      const userExist = await userColl.findOne(query);
      if (userExist) {
        return;
      }
      const result = await userColl.insertOne(req.body);
      res.send(result);
    });
 
    app.get("/cars", async (req, res) => {
      const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const result = await carColl.find({}).sort({ _id: -1 }).toArray();
      res.send(result);
    });
    app.get("/featured", async (req, res) => {
      const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const result = await carColl
        .find({})
        .sort({ isBooked: 1, _id: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });
    app.get("/top", async (req, res) => {
      const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const result = await carColl
        .find({})
        .sort({ rent: -1 })
        .limit(3)
        .toArray();
      res.send(result);
    });
    app.get("/car/:id", async (req, res) => {
      const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const id = req.params.id;
      const result = await carColl.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });
    app.post("/addcar", async (req, res) => {
      const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const car = req.body;
      const result = await carColl.insertOne(car);
      res.send(result);
    });

    app.get("/listings/",logger, async (req, res) => {
      const query = req.query.email;
      console.log(query);
      const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const result = await carColl.find({ email: query }).toArray();
      res.send(result);
    });
    app.patch("/booking-car/:id", async (req, res) => {
      const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const bookColl = db.collection("bookings");
      const id = req.params.id;
      const bookingQuery = { _id: new ObjectId(id) };
      const alreadyBooked = await bookColl.findOne(bookingQuery);
      if (alreadyBooked) {
        return;
      }
      const booking = await bookColl.insertOne(req.body);
      const result = await carColl.updateOne(
        { _id: new ObjectId(id) },
        { $set: { isBooked: true } }
      );
      res.send(booking);
    });
    app.patch("/updatecar", logger,async (req, res) => {
      const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const car = req.body;
      const result = await carColl.updateOne(
        { _id: new ObjectId(car.id) },
        {
          $set: {
            carName: car.carName,
            description: car.description,
            rent: car.rent,
            location: car.location,
            photo: car.photo,
            category: car.category,
          },
        }
      );
      res.send(result);
    });

    app.get("/mybookedcars", logger, async (req, res) => {
      const email = req.query.email;
      const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const bookColl = db.collection("bookings");
      const bookedCars = await bookColl
        .find({ bookingHolder: email })
        .toArray();
      const carIds = bookedCars.map((car) => new ObjectId(car.carId));
      const result = await carColl.find({ _id: { $in: carIds } }).toArray();
      res.send(result);
    });
    app.delete("/deletecar", logger,async (req, res) => {
      const id = req.query.id;
      const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const bookColl = db.collection("bookings");
      const result = await carColl.deleteOne({ _id: new ObjectId(id) });
      const bookingDelete = await bookColl.deleteOne({ carId: id });
      res.send(result);
    });
    //testing
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
  }
}

run().catch(console.dir);
app.listen(PORT, () => {
  //console.log("app is running on", PORT);
});
