const sqlite3 = require('sqlite3');
const Db_Buddy = require('./Db_Buddy');

class Db_Sqlite extends Db_Buddy
{
  constructor(config)
  {
    super();
    this.client = new sqlite3.Database(":memory:");
  }

  Get_Row_Count(dbRes)
  {
    return dbRes.length;
  }

  Get_Rows(dbRes)
  {
    return dbRes;
  }

  Build_Param_Placeholders(name)
  {
    return "?";
  }

  Run(sql, params)
  {
    this.lastQuery = {sql, params};
    Executor = Executor.bind(this);

    const promise = new Promise(Executor);
    function Executor(resolve, reject)
    {
      this.client.run(sql, params, On_Run);
      function On_Run(err)
      {
        if (err)
        {
          reject(err);
        }
        else
        {
          resolve([{id: this.lastID}]);
        }
      }
    }

    return promise;
  }

  Exec(sql, params)
  {
    this.lastQuery = {sql, params};
    Executor = Executor.bind(this);

    const promise = new Promise(Executor);
    function Executor(resolve, reject)
    {
      this.client.exec(sql, On_Exec);
      function On_Exec(err)
      {
        if (err)
        {
          reject(err);
        }
        else
        {
          resolve(true);
        }
      }
    }

    return promise;
  }

  Query(sql, params)
  {
    this.lastQuery = {sql, params};
    Executor = Executor.bind(this);

    const promise = new Promise(Executor);
    function Executor(resolve, reject)
    {
      this.client.all(sql, params, On_All);
      function On_All(err, rows)
      {
        if (err)
        {
          reject(err);
        }
        else
        {
          resolve(rows);
        }
      }
    }

    return promise;
  }
}

module.exports = Db_Sqlite;
