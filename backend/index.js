const express = require('express');
const RPC_Buddy = require('rpc-buddy');
const Person = require('./Person');
const Db_Sqlite = require("./src/Db_Sqlite");

const db = new Db_Sqlite();
Person.Init(db);

const app = express();
app.use(express.json());
app.use(express.static('frontend'));

const rpc_buddy = new RPC_Buddy
(
  app, 
  '/rpc-server', 
  '/rpc-client',
  [Person],
  [
    {name: "Person.Insert", inject: [db]},
    {name: "Person.Get_Max_Age", inject: [db]},
    {name: "Person.Get_All", inject: [db]},
  ],
  RPC_Buddy.Express
);

const port = 80;
app.listen(port, Listen);
function Listen()
{
  console.log(`Db Boddy listening at http://localhost:${port}`);
}