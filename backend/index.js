const express = require('express');
const RPC_Buddy = require('rpc-buddy');
const Person = require('./Person');

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
    {name: "Person.someFunction"},
  ],
  RPC_Buddy.Express
);

const port = 80;
app.listen(port, Listen);
function Listen()
{
  console.log(`RPC Buddy listening at http://localhost:${port}`);
}