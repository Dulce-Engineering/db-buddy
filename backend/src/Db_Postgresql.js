const pg = require('pg');
const Db_Buddy = require('./Db_Buddy');

class Db_Postgresql extends Db_Buddy
{
  constructor(config)
  {
    super();
    this.client = new pg.Client(config);
    this.client.connect();
  }

  Get_Row_Count(dbRes)
  {
    return dbRes.rowCount;
  }

  Get_Rows(dbRes)
  {
    return dbRes.rows;
  }

  Build_Param_Placeholders(name)
  {
    return "$" + name;
  }

  Build_Insert_SQL(tableName, paramNames, paramPlaceHolders, ignoreId)
  {
    let sql = 
      "insert into " + tableName + 
      " (" + paramNames + ") " +
      "values (" + paramPlaceHolders + ") ";
    if (!ignoreId)
    {
      sql += "returning id";
    }

    return sql;
  }

  Run(sql, params)
  {
    return this.Query(sql, params);
  }

  Exec(sql, params)
  {
    return this.Query(sql, params);
  }

  Query(sql, params, rowMode)
  {
    this.lastQuery = {sql, params};
    return this.client.Query(sql, params, rowMode);
  }

  async Select_Values(sql, params)
  {
    let res;
    const pgQuery =
    {
      text: sql,
      values: params,
      rowMode: "array"
    };

    const dbRes = await this.Query(pgQuery);
    if (dbRes && this.Get_Row_Count(dbRes) > 0)
    {
      res = [];
      for (const row of this.Get_Rows(dbRes))
      {
        res.push(row[0]);
      }
    }

    return res;
  }
}

module.exports = Db_Postgresql;
