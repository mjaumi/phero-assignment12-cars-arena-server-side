const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// verifying JWT here
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }

        req.decoded = decoded;
        next();
    });
}

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
        const summaryCollection = client.db('cars-arena').collection('summary');
        const queryCollection = client.db('cars-arena').collection('query');

        console.log('MongoDB Connected');

        // admin verification
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            } else {
                res.status(403).send({ message: 'Forbidden Access' });
            }
        }

        /**
        * -----------------------
        * AUTHENTICATION API
        * -----------------------
        */
        app.post('/getToken', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({ accessToken });
        });

        /**
         * ------------------------
         * SERVICES API
         * ------------------------
         */
        //GET API to get all the summary data
        app.get('/summary', async (req, res) => {
            const query = {};
            const summary = await summaryCollection.find(query).toArray();
            res.send(summary);
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
        app.get('/user', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email };
                const foundUser = await userCollection.findOne(query);
                res.send(foundUser);
            } else {
                res.status(403).send({ message: 'Forbidden Access' });
            }
        });

        // GET API to get orders by email
        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email };
                const foundOrders = await orderCollection.find(query).toArray();
                res.send(foundOrders);
            } else {
                res.status(403).send({ message: 'Forbidden Access' });
            }
        });

        // GET API to get specific order by id
        app.get('/order/:id', verifyJWT, async (req, res) => {
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

        // GET API to get all the users with admin verification
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const users = await userCollection.find(query).toArray();
            res.send(users);
        });

        // GET API to get all the orders with admin verification
        app.get('/allOrders', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        });

        // GET API to check the role
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
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
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
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

        // POST API to add new product with admin verification
        app.post('/parts', verifyJWT, verifyAdmin, async (req, res) => {
            const parts = req.body;
            const addPartsResult = await partCollection.insertOne(parts);
            res.send(addPartsResult);
        });

        // POST API to add new query
        app.post('/query', async (req, res) => {
            const query = req.body;
            const addQueryResult = await queryCollection.insertOne(query);
            res.send(addQueryResult);
        });

        // PATCH API to update user info
        app.patch('/user', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {

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
            } else {
                res.status(403).send({ message: 'Forbidden Access' });
            }
        });

        // PATCH API for payment update
        app.patch('/order/:id', verifyJWT, async (req, res) => {
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

        // PATCH API for payment update
        app.patch('/shipOrder/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updatedStatus = {
                $set: {
                    status: 'shipped',
                }
            }
            const updateOrder = await orderCollection.updateOne(filter, updatedStatus);
            res.send(updateOrder);
        });

        // PATCH API to make an user admin with admin authentication
        app.patch('/user/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updatedUser = {
                $set: {
                    role: 'admin'
                }
            }
            const updateUser = await userCollection.updateOne(filter, updatedUser);
            res.send(updateUser);
        });

        // PATCH API to update parts quantity
        app.patch('/updateParts/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const available = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedParts = {
                $set: {
                    availableQuantity: available.availableQuantity
                }
            }
            const updatePart = await partCollection.updateOne(filter, updatedParts);
            res.send(updatePart);
        });

        // DELETE API for deleting order
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const deleteResult = await orderCollection.deleteOne(query);
            res.send(deleteResult);
        });

        // DELETE API for deleting parts with admin verification
        app.delete('/part/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const deleteResult = await partCollection.deleteOne(query);
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