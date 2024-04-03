const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI)
const userSchema = mongoose.Schema({
  username: String
})
const User = mongoose.model('User', userSchema)

const exerciceSchema = mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date
})
const Exercice = mongoose.model('Exercice', exerciceSchema);

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  const user = new User({ username: username });
  try {
    await user.save()
  } catch (err) {
    console.log(err);
    res.status(500).send("Error occured while creating user")
  }
  const userFromDb = await User.findOne({ username: username })
    .select(["_id", "username"])

  res.send(userFromDb)
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select(["_id", "username"])
    res.status(200).send(users)
  }
  catch (err) {
    res.status(500).send("Error occured while fetching users");
  }

})

app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;
  try {
    const user = await User.findById(id)
    if (!user) {
      res.status(404).send("User not found!")
    }
    else {
      const exerciceObject = new Exercice({
        username: user.username,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      })
      const exercice = await exerciceObject.save();
      res.status(201).json({
        _id: id,
        username: user.username,
        date: exercice.date.toDateString(),
        duration: exercice.duration,
        description: exercice.description
      })
    }
  } catch (err) {
    console.log(err)
    res.status(500).send("Error occured while saving exercise");
  }
})

app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  try {
    const user = await User.findById(id)
    if (!user) {
      res.status(404).send("User not found!")
      return;
    }
    let dateObj = {}
    if (from) dateObj["$gte"] = new Date(from);
    if (to) dateObj["$lte"] = new Date(to);
    let filter = {
      username: user.username
    }
    if (from || to) filter.date = dateObj
    const exercices = await Exercice.find(filter).limit(+limit ?? 500)
    const log = exercices.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }))
    res.status(200).json({
      username: user.username,
      count: exercices.length,
      _id: id,
      log
    })
  } catch (err) {
    res.status(500).send("Error occured while fetching logs")
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
