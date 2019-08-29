const express = require('express')
const knex = require('knex')
const app = express()

const host = process.env.HOST
const user = process.env.USER
const password = process.env.PASSWORD
const database = process.env.DATABASE

const conn = knex({
  client: 'mysql',
  version: '5.6',
  connection: { host, user, password, database }
})

app.get('/', async (req, res) => {
  await conn.raw('SELECT 1+1 FROM DUAL')
  .then(rsp => {
    return res.send(rsp)
  })
})

app.listen(process.env.PORT, () =>
  console.log(`Example app listening on port ${process.env.PORT}!`)
)
