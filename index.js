const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l4rez.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// running MongoDB here
async function run() {
    try {

        await client.connect();

        // collections
        const partCollection = client.db('cars-arena').collection('parts');

        console.log('MongoDB Connected');

        // GET API to get first 6 parts
        app.get('/parts', async (req, res) => {
            const query = {};
            const firstSixParts = await partCollection.find(query).limit(6).toArray();
            res.send(firstSixParts);
        });

        // GET API to get any parts by id
        app.get('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const parts = await partCollection.findOne(query);
            res.send(parts);
        })

    } finally {

    }
}
run().catch(console.dir);

// Base API
app.get('/', (req, res) => {
    res.send('Car Bazar Server Running!!!');
});

// Listening API
app.listen(port, () => {
    console.log('Listening to port', port);
});