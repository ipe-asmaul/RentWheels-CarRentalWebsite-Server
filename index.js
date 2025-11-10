const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const PORT = process.env.PORT || 5000;
//middlewire
app.use(cors());
app.use(express.json());
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
  console.log(process.env.PORT);
  res.send("Hello from server, RentWheel");
});

//connection to database
async function run() {
  try {
    await client.connect();
    app.post("/user", async (req, res) => {
      const db = client.db("userDB");
      const userColl = db.collection("users");
      const query = { email: req.body.email };
      const userExist = await userColl.findOne(query);
      console.log(req.body.email);
      if (userExist) {
        console.log("user already exist");
        return;
      }
      const result = await userColl.insertOne(req.body);
      res.send(result);
      console.log(result);
    });
    app.get("/cars", async (req, res) => {
      const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const result = await carColl.find({}).toArray();
      res.send(result);
    });
    app.get("/car/:id", async (req, res) => {
      const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const id = req.params.id;
      const result = await carColl.findOne({_id: new ObjectId(id)});
      res.send(result);
    });
    app.post("/addcar", async (req, res) => {
      const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const car = req.body;
      const result = await carColl.insertOne(car);
      res.send(result);
    });

    app.get("/listings/", async (req, res) => {
      const query = req.query.email;
      console.log(query);
      const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const result = await carColl.find({ email: query }).toArray();
      res.send(result);
    });
    app.patch('/booking-car/:id',async (req,res) =>{
       const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const bookColl = db.collection('bookings');
      const id = req.params.id;
      const bookingQuery = {_id: new ObjectId(id)}
      const alreadyBooked = await bookColl.findOne(bookingQuery);
      if (alreadyBooked) {
        return;
      }
      const booking = await bookColl.insertOne(req.body)
      const result = await carColl.updateOne({_id: new ObjectId(id)}, {$set:{isBooked: true}})
      res.send(booking)
    })

    app.get('/mybookedcars', async(req,res)=>{
      const email = req.query.email;
      const db = client.db("carsDB");
      const carColl = db.collection("cars");
      const bookColl = db.collection('bookings');
      const bookedCars = await bookColl.find({bookingHolder: email}).toArray();
      const carIds = bookedCars.map(car => new ObjectId(car.carId))
      const result = await carColl.find({_id: {$in: carIds}}).toArray()
      res.send(result)
    })
    //testing
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}

run().catch(console.dir);
app.listen(PORT, () => {
  "app is running on", PORT;
});
