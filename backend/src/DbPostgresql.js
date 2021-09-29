const pg = require('pg');
const Db = require('./Db');

class DbPostgresql extends Db
{
  constructor(config)
  {
    super();
    this.client = new pg.Client(config);
    this.client.connect();
  }

  /**
   * @param {string} sql 
   * @param {any[]} params 
   * @param {string|undefined} rowMode - "array"
   * @return {Promise<{command: string; rowCount:number; rows: any[]}>}
   */
  query(sql, params, rowMode)
  {
    this.lastQuery = {sql, params};
    return this.client.query(sql, params, rowMode);
  }

  async selectValues(sql, params)
  {
    let res;
    const pgQuery =
    {
      text: sql,
      values: params,
      rowMode: "array"
    };

    const dbRes = await this.query(pgQuery);
    if (dbRes && dbRes.rowCount > 0)
    {
      res = [];
      for (const row of dbRes.rows)
      {
        res.push(row[0]);
      }
    }

    return res;
  }
}

module.exports = DbPostgresql;
