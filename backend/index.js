const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('./models/User'); // Users model
const Employee = require('./models/Employee'); // Employee model
const db = require('./db/dbConnection'); // Database connection
const { generateAuthToken, validateAuthToken } = require('./middleware'); // Middleware for auth

const app = express();
app.use(express.json());
app.use(cors());
db(); // Connect to MongoDB

// Create a user (Signup)
app.post('/createSign', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username: email, password: hashedPassword });
    await newUser.save();

    res.send({ message: 'User Created Successfully' });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).send({ message: 'Error creating user', error: err.message });
  }
});

// User login (Check credentials and generate token)
app.post('/checkUser', async (req, res) => {
  try {
    const { username, password } = req.body;

    const userC = await User.findOne({ username });
    if (!userC) {
      return res.status(401).send({ message: 'Credentials Are Wrong' });
    }

    const isPasswordValid = await bcrypt.compare(password, userC.password);
    if (!isPasswordValid) {
      return res.status(401).send({ message: 'Credentials Are Wrong' });
    }

    const token = generateAuthToken(username);
    res.send({ message: 'User Checked Successfully', token });
  } catch (err) {
    console.error('Error checking user:', err);
    res.status(500).send({ message: 'An error occurred while checking the credentials', error: err.message });
  }
});

// Fetch dropdown items (Distinct Gender and Age values)
app.get('/getdrdwnItems', async (req, res) => {
  try {
    const dropdownItems = await Employee.aggregate([
      {
        $group: {
          _id: null,
          Gender: { $addToSet: '$Gender' },
          Age: { $addToSet: '$Age' },
        },
      },
      {
        $project: {
          _id: 0,
          Gender: 1,
          Age: 1,
        },
      },
    ]);
    res.send(dropdownItems[0]);
  } catch (err) {
    console.error('Error fetching dropdown items:', err);
    res.status(500).send({ message: 'An error occurred while fetching dropdown items', error: err.message });
  }
});

// Fetch filtered chart data
app.get('/getChartData', validateAuthToken(), async (req, res) => {
  try {
    const { gender, age, startDate, endDate } = req.query;

    const filters = {};
    if (gender) filters.Gender = gender;
    if (age) filters.Age = age;

    const employees = await Employee.find(filters);

    // Handle date filtering manually
    const filteredData = employees.filter((emp) => {
      if (startDate || endDate) {
        const empDate = new Date(emp.Day.split('/').reverse().join('-')); // Convert DD/MM/YYYY to Date
        if (startDate && empDate < new Date(startDate)) return false;
        if (endDate && empDate > new Date(endDate)) return false;
      }
      return true;
    });

    console.log('Filtered data:', startDate, endDate);
    if (!filteredData || filteredData.length === 0) {
      return res.status(404).send({ message: 'No data found matching the filters' });
    }

    res.status(200).json(filteredData);
  } catch (err) {
    console.error('Error fetching chart data:', err.message);
    res.status(500).send('Error fetching chart data');
  }
});

// Verify token validity
app.get('/verifyToken', validateAuthToken(), async (req, res) => {
  res.status(200).send({ message: 'Token is valid' });
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log('Server started on port 3001');
});
