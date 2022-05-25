const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
        const userCollection = client.db('cars-arena').collection('users');
        const orderCollection = client.db('cars-arena').collection('orders');
        const reviewCollection = client.db('cars-arena').collection('reviews');

        console.log('MongoDB Connected');

        // GET API to get first 6 parts
        app.get('/topSixParts', async (req, res) => {
            const query = {};
            const firstSixParts = await partCollection.find(query).limit(6).toArray();
            res.send(firstSixParts);
        });

        // GET API to get all parts
        app.get('/parts', async (req, res) => {
            const query = {};
            const parts = await partCollection.find(query).toArray();
            res.send(parts);
        });

        // GET API to get any parts by id
        app.get('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const parts = await partCollection.findOne(query);
            res.send(parts);
        });

        // GET API to get specific user info
        app.get('/user', async (req, res) => {
            const email = req.query.email;
            const query = { email };
            const foundUser = await userCollection.findOne(query);
            res.send(foundUser);
        });

        // GET API to get orders by email
        app.get('/orders', async (req, res) => {
            const email = req.query.email;
            const query = { email };
            const foundOrders = await orderCollection.find(query).toArray();
            res.send(foundOrders);
        });

        // GET API to get specific order by id
        app.get('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const foundOrder = await orderCollection.findOne(query);
            res.send(foundOrder);
        });

        // GET API to get all the reviews with ascending order
        app.get('/reviews', async (req, res) => {
            const query = {};
            const sortBy = { millTime: -1 };
            const reviews = await reviewCollection.find(query).sort(sortBy).toArray();
            res.send(reviews);
        });

        // POST API to create new user
        app.post('/user', async (req, res) => {
            const newUser = req.body;
            const addUserResult = await userCollection.insertOne(newUser);
            res.send(addUserResult);
        });

        // POST API for new orders
        app.post('/order', async (req, res) => {
            const newOrder = req.body;
            const addOrderResult = await orderCollection.insertOne(newOrder);
            res.send(addOrderResult);
        });

        // POST API for client secret of stripe
        app.post('/create-payment-intent', async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });

        // POST API to add new review
        app.post('/review', async (req, res) => {
            const review = req.body;
            const addReviewResult = await reviewCollection.insertOne(review);
            res.send(addReviewResult);
        });

        // PATCH API to update user info
        app.patch('/user', async (req, res) => {
            const email = req.query.email;
            const updatedBody = req.body;
            const filter = { email };
            const updatedUser = {
                $set: {
                    education: updatedBody.education,
                    city: updatedBody.city,
                    phone: updatedBody.phone,
                    linkedIn: updatedBody.linkedIn,
                    address: updatedBody.address
                }
            }
            const updateUser = await userCollection.updateOne(filter, updatedUser);
            res.send(updateUser);
        });

        // PATCH API for payment update
        app.patch('/order/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedPayment = {
                $set: {
                    status: 'paid',
                    tId: payment.tId
                }
            }
            const updateOrder = await orderCollection.updateOne(filter, updatedPayment);
            res.send(updateOrder);
        });

        // DELETE API for deleting order
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const deleteResult = await orderCollection.deleteOne(query);
            res.send(deleteResult);
        });

    } finally {

    }
}
run().catch(console.dir);

// Base API
app.get('/', (req, res) => {
    res.send('Cars Arena Server Running!!!');
});

// Listening API
app.listen(port, () => {
    console.log('Listening to port', port);
});