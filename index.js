const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// Base API
app.get('/', (req, res) => {
    res.send('Car Bazar Server Running!!!');
});

// Listening API
app.listen(port, () => {
    console.log('Listening to port', port);
});