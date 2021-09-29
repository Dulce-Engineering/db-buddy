const Utils = require('../utils');

class Db
{
  constructor()
  {
    this.insertRows = this.insertRows.bind(this);
  }

  connect()
  {
  }

  async query(sql, params)
  {
    this.lastQuery = '';
  }

  /**
   * return the first value of the first column
   * @param {string} sql 
   * @param {any[]} params 
   */
  async selectValue(sql, params)
  {
    let res = null;

    const dbRes = await this.selectValues(sql, params);
    if (dbRes && dbRes.length > 0) 
    {
      res = dbRes[0];
    }
    return res;
  }

  // return all values in the first column as an array
  async selectValues(sql, params)
  {
    let res;

    const dbRes = await this.query(sql, params);
    if (dbRes && dbRes.rowCount > 0)
    {
      res = [];
      for (const row of dbRes.rows)
      {
        const colNames = Object.keys(row);
        const firstColName = colNames[0];
        const firstValue = row[firstColName];
        res.push(firstValue);
      }
    }

    return res;
  }

  // return all columns of the first row as an anonymous object
  async selectRow(sql, params)
  {
    let res = null;

    const rows = await this.selectRows(sql, params);
    if (rows && rows.length > 0) 
    {
      res = rows[0];
    }

    return res;
  }

  /**
   * return all rows as an array of anonymous objects
   * @param {string} sql
   * @param {any[]} params
   * @returns {Promise<any[][]>}
   */
  async selectRows(sql, params)
  {
    let res;

    const dbRes = await this.query(sql, params);
    if (dbRes && dbRes.rowCount > 0)
    {
      res = dbRes.rows;
    }

    return res;
  }

  /**
   * 
   * @param { string } sql 
   * @param { object[] } params 
   * @param {{pageNo:number; pageLimit:number; sortBy:string; offSet:number; desc:boolean; fields:object }} paginate 
   * @returns 
   */
  async selectRowsPaginate(sql, params=[], paginate={}) 
  {
    const res = 
    {
      meta:{
        count: 0, 
        limit: 0, 
        page: 1, 
        pageCount: 1
      },
      data:[]
    };
        
    let pageNo = Number.parseInt(paginate.pageNo) ? Number(paginate.pageNo) : 1;
    
    const text = this.parseSQLStatement(sql)

    const sqlCount = `SELECT DISTINCT COUNT(*) FROM ${text}`;
   
    /* Find count */
    const totalCount = await this.query(sqlCount, params);
    
    if(totalCount && totalCount.rows)
    {
      res.meta.count = Number(totalCount.rows[0].count);
    }
  
    let orderByStatement = null;
    if (paginate.sortBy) 
    {
      const orderBy = {};
      orderBy.type = paginate.desc == "false" ? "asc": null;
      orderBy.fieldName = paginate.sortBy;
      orderByStatement = this.toOrderBySQL(orderBy, paginate.fields)
    }

    let pageLimit = 100;

    if (paginate.pageLimit) 
    {
       pageLimit = Number.parseInt(paginate.pageLimit) ? Number(paginate.pageLimit): pageLimit;
       pageLimit = pageLimit <= 10000 ? pageLimit: 10000;
    } 

    res.meta.limit = pageLimit;
    res.meta.pageCount = Math.ceil(res.meta.count / pageLimit);  
    pageNo = res.meta.pageCount > pageNo ? pageNo : ((res.meta.pageCount > 0)? res.meta.pageCount:1);
    res.meta.page = pageNo;
    sql += orderByStatement ? ` ORDER BY ${orderByStatement} ` : '';

    params.push(pageLimit);
    sql += ` LIMIT $${params.length}`;
    
    const offset = parseInt(paginate.offSet) || pageLimit * (pageNo - 1);
    sql += ` OFFSET ${offset} `;
    const result = await this.query(sql, params);
    
    res.data = result.rows;

    return res;
  }

  // return the first row as an object of the specified type
  async selectObj(classType, sql, params)
  {
    let res = null;

    const dbRes = await this.selectObjs(classType, sql, params);
    if (dbRes && dbRes.length > 0) 
    {
      res = dbRes[0];
    }

    return res;
  }

  // return all rows as an array of objects of the given type
  async selectObjs(classType, sql, params)
  {
    let res;

    const rows = await this.selectRows(sql, params);
    if (rows && rows.length > 0) 
    {
      res = [];
      for (const row of rows)
      {
        const newObj = new classType(row);
        res.push(newObj);
      }
    }

    return res;
  }

  // insert the given object
  async insert(tableName, fields, obj, skipUndefined, ignoreId)
  {
    let paramNames, paramPlaceHolders, counter = 1, paramVals = [], res = false;
    if (!fields)
    {
      fields = obj;
    }

    for (const fieldName in fields)
    {
      if (fieldName != "id")
      {
        const columnName = fields[fieldName]?.columnName || fieldName;
        const fieldValue = obj[fieldName];

        if (!skipUndefined || fieldValue != undefined)
        {
          paramNames = Utils.appendStr(paramNames, columnName, ", ");
          paramPlaceHolders = Utils.appendStr(paramPlaceHolders, "$" + counter, ", ");
          paramVals.push(fieldValue);
          counter++;
        }
      }
    }

    let sql = 
      "insert into " + tableName + 
      " (" + paramNames + ") " +
      "values (" + paramPlaceHolders + ") ";
    if (!ignoreId)
    {
      sql += "returning id";
    }
    
    const dbRes = await this.query(sql, paramVals);
    if (dbRes && dbRes.rowCount > 0)
    {
      if (!ignoreId)
      {
        const newId = dbRes.rows[0].id;
        obj.id = newId;
      }
      res = true;
    }

    return res;
  }

  // insert the given object
  insertRow(tableName, obj)
  {
    return this.insert(tableName, null, obj, false, false);
  }

  // insert the given object
  insertObj(obj, skipUndefined)
  {
    return this.insert(obj.constructor.table, obj.constructor.fields, obj, skipUndefined, obj.constructor.ignoreId);
  }

  // insert multiple objects
  async insertObjs(objs)
  {
    let res = true;

    for (const obj of objs)
    {
      res = res && await this.insertObj(obj, true);
    }

    return res;
  }

  async updateObj(obj, skipUndefined, where, params)
  {
    let paramNames, counter = 1, paramVals = [], res = false;
    const tableName = obj.constructor.table;
    const fields = obj.constructor.fields;

    if (where)
    {
      paramVals = paramVals.concat(params);
      counter += params.length;
    }

    for (const fieldName in fields)
    {
      if (fieldName != "id")
      {
        const columnName = fields[fieldName].columnName;
        const fieldValue = obj[fieldName];

        if (!skipUndefined || fieldValue != undefined)
        {
          paramNames = Utils.appendStr(paramNames, columnName + " = $" + counter, ", ");
          paramVals.push(fieldValue);
          counter++;
        }
      }
    }

    if (!Utils.isEmpty(paramNames))
    {
      if (!where)
      {
        where = "id = $" + counter;
        paramVals.push(obj.id);
      }

      const sql = 
        "update " + tableName + 
        " set " + paramNames +
        " where " + where;
      
      const dbRes = await this.query(sql, paramVals);
      if (dbRes && dbRes.rowCount > 0)
      {
        res = true;
      }
    }

    return res;
  }

  async deleteObj(obj)
  {
    let res = false;

    if (obj && obj.id)
    {
      const tableName = obj.constructor.table;
      const dbRes = await this.query("delete from " + tableName + " where id = $1", [obj.id]);
      res = dbRes && dbRes.rowCount > 0;
    }

    return res;
  }

  async deleteById(classType, id)
  {
    let res = false;

    if (classType && id)
    {
      const tableName = classType.table;
      const dbRes = await this.query("delete from " + tableName + " where id = $1", [id]);
      res = dbRes && dbRes.rowCount > 0;
    }

    return res;
  }

  // Q Methods ====================================================================================

  async selectValueQ(sql, params)
  {
    sql = this.qloop(sql);
    return selectValue(sql, params);
  }

  async selectRowsQ(sql, params)
  {
    sql = this.qloop(sql);
    return this.selectRows(sql, params);
  }

  q(paramVals,add)
  {
    let val =  paramVals.length == 0 || paramVals.length == undefined? 1 : paramVals.length + 1;
    return add?"$" + (val + add): "$" + (val);
  }

  qloop(sql)
  {
    let split = sql.split("_?");
    let res = "", i = 1;
    let countSplit = split.length - 1;
    for (const value of split)
    {
      if (i > countSplit)
      {
        res += value; 
      }
      else 
      {
        res += value + "$"+ i; 
      }
      i++;
    }
    return res;
  }

  // Bulk Methods =================================================================================

  /**
   * @param {Object[]} rows - Row of DB objects
   * @param {number} chunkLimit
   * @param {string} returnByColumn
   * @param {string} conflictTarget
   */
  async insertChunkedRows(rows, chunkLimit = 10000, returnByColumn, conflictTarget, onConflictUpdate=false) 
  {
    /* Max allowed by pg is 60000 can be replace in env*/
    const maxParamsAllowed = 50000; 

    if(rows.length > 0)
    {
      const columCount = Object.keys(rows[0]).length;
    /* Count Params */
    const paramsCount = columCount * chunkLimit;   

    if(paramsCount > maxParamsAllowed)
    {
      /* Redefine chunkLimit*/
      chunkLimit = Math.trunc(maxParamsAllowed / columCount);   
    }

    return await this.chunkedRows(rows, this.insertRows, chunkLimit, returnByColumn, conflictTarget, onConflictUpdate);
    }
  }

  /**
   * Insert multiple rows in single statement
   * @param {object[]} rows - Array of DB Objects
   * @param { string } returnByColumn - Returning Column Name 
   * @returns {Promise<{command:'INSERT';fields:any[];rows:any[]; rowCount:number}>}
   */
  insertRows(rows, returnByColumn, conflictTarget, onConflictUpdate=false) 
  {    
    let paramNames = null,
      paramNamesForUpdate= null,
      paramPlaceHolderOne = null,
      paramPlaceHolders = null,
      counter = 1,
      params = [];

    const tableName = rows[0].constructor.table;
    const casts = rows[0].constructor.casts;

    for (let i = 0; i < rows.length; i++) 
    {
      const row = rows[i];
      
      paramPlaceHolderOne = "";

      for (const column in row) 
      {
        if (column != "id") 
        {
          if (i === 0) 
          {
            paramNames = Utils.appendStr(paramNames, column, ", ");

            if(onConflictUpdate)
            {
              let columnName = column;

              if (casts && Object.hasOwnProperty.call(casts, column)) 
              {
                columnName = column+'::'+casts[column];   
              }
              paramNamesForUpdate = Utils.appendStr(paramNamesForUpdate, `${columnName} = excluded.${column}`, ", ");
            }
          }
          paramPlaceHolderOne = Utils.appendStr(paramPlaceHolderOne, "$" + counter, ", ");

          params.push(row[column]);
          counter++;
        }
      }

      paramPlaceHolders = Utils.appendStr( paramPlaceHolders, `(${paramPlaceHolderOne})`, ", ");
    }

    let sql = `INSERT INTO ${tableName} (${paramNames}) VALUES ${paramPlaceHolders}`;

    /* Handle ON CONFLICT */
    let conflictAction = "DO NOTHING";

    if(onConflictUpdate)
    {
      conflictAction = `DO UPDATE SET ${paramNamesForUpdate}`;
    }

    if(conflictTarget)
    {  
      sql += ` ON CONFLICT (${conflictTarget}) ${conflictAction}`;  
    }
    else
    {
      sql += ` ON CONFLICT ${conflictAction}`;
    }
  
    if(returnByColumn)
    {
      sql += ` returning ${returnByColumn}`;
    }

    if((counter - 1) === params.length && params.length > 0)
    {
      return this.query(sql, params);
    }
  }
 
  /**
   * Update and Insert multiple rows base on where conditions when on conflict cannot be determined
   * @param {object[]} rows 
   * @param {{where:{column:"condition"}; columns:string[]}} options
   * @returns {Promise<{command:'UPSERT';fields:any[]; rows:object[]; rowCount:number}>}
   */
  async upsertRows(rows, options, chunkLimit=10000)
  {
    /* Max allowed by pg is 60000 can be replace in env*/
    const maxParamsAllowed = 50000; 

     if(rows.length > 0)
     {
       const columCount = Object.keys(rows[0]).length;
      /* Count Params */
      const paramsCount = columCount * chunkLimit;   

      if(paramsCount > maxParamsAllowed)
      {
           /* Redefine chunkLimit*/
        chunkLimit = Math.trunc(maxParamsAllowed / columCount);   
      }

      return await this.upsertChunkedRows(rows, await this._upsertRows.bind(this), chunkLimit, options);
    }
  }

  /**
   * Update and Insert multiple rows base on where conditions when on conflict cannot be determined
   * @param {array} rows 
   * @param {object} options
   * @returns {Promise<{command:'UPSERT';fields:any[];rows:any[]; rowCount:number}>}
   */
  async _upsertRows(rows, options={}, useTransaction=true)
  {
    const res  = {fields:[], rows:[], rowCount:0};

    let paramNames = null,
    paramPlaceHolderOne = null,
    paramPlaceHolders = null,
    params = [];

    const tableName = rows[0].constructor.table;
    const casts = rows[0].constructor.casts || {};
    const where = options.where || {};
    const setColumns = options.columns || [];

    let tableCreateStatement='', whereStatement = '', updateWhereStatement = '', insertStatement='', setStatement = '';

    for (let i = 0; i < rows.length; i++) 
    {
      const row = rows[i];
      
      paramPlaceHolderOne = "";

      for (const column in row) 
      {
        if (column != "id") 
        {
          if (i === 0) 
          {
            paramNames = Utils.appendStr(paramNames, column, ", ");
            if (Object.hasOwnProperty.call(casts, column)) 
            {
              insertStatement = Utils.appendStr(insertStatement, `d.${column}::${casts[column]}`, ", ");
              tableCreateStatement = Utils.appendStr(tableCreateStatement, `${column} ${casts[column]}`, ", ");
            }
            else
            {
              insertStatement = Utils.appendStr(insertStatement, `d.${column}`, ", ");
              tableCreateStatement = Utils.appendStr(tableCreateStatement, `${column}`, ", ");
            }
          }

          paramPlaceHolderOne = Utils.appendStr(paramPlaceHolderOne, "$" + (params.length+1), ", ");
          params.push(row[column]);
        }
      }

      paramPlaceHolders = Utils.appendStr( paramPlaceHolders, `(${paramPlaceHolderOne})`, ", ");
    }
 
    for (const column in where) 
    {
      if (Object.hasOwnProperty.call(where, column)) 
      {
        const condition = where[column];
        if (Object.hasOwnProperty.call(casts, column)) 
        {
          whereStatement =  Utils.appendStr(whereStatement, `t.${column} ${condition} d.${column}::${casts[column]}`, " AND ");
          updateWhereStatement = Utils.appendStr(updateWhereStatement,`${tableName}.${column} ${condition} data.${column}::${casts[column]}`, " AND ");
        }
        else
        {
          whereStatement =  Utils.appendStr(whereStatement, `t.${column} ${condition} d.${column}`, " AND ");
          updateWhereStatement = Utils.appendStr(updateWhereStatement, `${tableName}.${column} ${condition} data.${column}`, " AND ");
        }
        
      }
    }
  

    if(setColumns.length > 0)
    {
      for (const column of setColumns) 
      {
        if (Object.hasOwnProperty.call(casts, column)) 
        {
          setStatement = Utils.appendStr(setStatement, `${column}=data.${column}::${casts[column]}`, ", ");

        }
        else
        {
          setStatement = Utils.appendStr(setStatement, `${column}=data.${column}`, ", ");

        }
      }
    }

    if(useTransaction) this.query("BEGIN");

        let sql = `CREATE TEMPORARY TABLE IF NOT EXISTS data(${tableCreateStatement}) ON COMMIT DROP;`;

              await  this.query(sql);

              sql = `INSERT INTO data VALUES${paramPlaceHolders};`;


        await  this.query(sql, params);

        // Update Existing Rows
         sql = `update ${tableName} 
                set ${setStatement} 
                FROM data WHERE ${updateWhereStatement};`;

        const updateRes = await  this.query(sql);

        if(updateRes.rowCount > 0)
        {
          res.rowCount += updateRes.rowCount;
          res.rows.concat(updateRes.rows);
          res.fields.concat(updateRes.fields);
        }

        // Insert remaining rows
        sql = `insert into ${tableName}(${paramNames})
                select ${insertStatement}
                from data d where not exists (select 1 from ${tableName} t WHERE ${whereStatement});`;
    
      const insertRes = await  this.query(sql);

    if(useTransaction) this.query("COMMIT");
        
    await this.query("DROP TABLE IF EXISTS data");

    if(insertRes.rowCount > 0)
    {
      res.rowCount += insertRes.rowCount;
      res.rows.concat(insertRes.rows);
      res.fields.concat(insertRes.fields);
    }

    return res;

  }

 /**
   * @param {{table:string;rows:Array;where:Object[];testMode:boolean}} data - 
   * @example {table:"viator_products", rows:[{id:1, city:"Sydney"}], where[id:"="]}
   * @returns {Promise<{command:'UPDATE';fields:any[];rows:any[];rowCount:number}>}
   */
  updateRows(data, returnByColumn) 
  {
    if ((data.rows, data.where)) 
    {
      const query = this.buildQueryUpdateRows(data);

      if(query) 
      {
        let sql = query.sql;
        if( returnByColumn )
        {
          sql += ` returning ${returnByColumn}`;
        }

        return this.query(sql, query.params);
      }
    }
  }

   /**
   * @param {any[]} data
   * @param {Function} callback
   * @param {number} chunkLimit
   * @param {string} returnByColumn
   * @param {string} conflictTarget
   * @returns {Promise<{fields:any[];rows:any[];rowCount:number}>}
   */
  async chunkedRows(data, callback, chunkLimit=50000, returnByColumn, conflictTarget, onConflictUpdate) 
  {
    const count = data.length;
    const res  = {fields:[], rows:[], rowCount:0};
    if(data && Array.isArray(data) && data.length > 0)
    {
      for (let i = 0; i < count; i += chunkLimit) 
      {
        const rows = data.slice(i, chunkLimit + i);
        const dbRes = await callback(rows, returnByColumn, conflictTarget, onConflictUpdate);
        /* Prepare response */
        res.fields = res.fields.concat(dbRes.fields);
        res.rows = res.rows.concat(dbRes.rows);        
        res.rowCount += dbRes.rowCount;
      }
    }
    return res;
  }

  /**
   * @method buildQueryUpdateRows This method create query to update multiple rows in single statement.
   * All the columns other than columns in where will be updated.
   * Column names are derived on the basis of first object in argument rows.
   * Only those objects from rows will be included in update query that will match to the first row.
   * Where conditions are also applied on the column names in first object of rows
   * Where conditions will only include those columns that exist in the first object of rows.
   * Where conditions will be applied to all rows.
   * @param {object} data - Data object contain name of table, where conditions, data types and array objects
   * @param {string} data.table - name of the table
   * @param {Array} data.where - Array of objects [{columnName:condition}]
   * @param {Array} data.rows - Array of objects [{columnName:value, columnNameValue:value}]
   * @example {table:"viator_products", where:[{id:"="}, name:"LIKE"],dataTypes:{updated_at:"TIMESTAMPTZ"} rows:[{id:1, name:"Steven", timezone:"Australia", updated_at:"2011-10-05T14:48:00.000Z"}, {id:2, name:"Ali" timezone:"Pakistan", updated_at:"2011-10-05T14:48:00.000Z"}]}
   * @returns {object} object of sql statement and params
   * @example {sql:'string', params:[]}
   */
  buildQueryUpdateRows(data)
  {
    let res = {};

    const {table, rows, where} = data;

    if (rows && where && rows.length > 0 && where.length > 0)
    {
      const tableName= table ?? rows[0].constructor.table;
      const casts = rows[0].constructor.casts;

      const params = [];
      const chunks = [];
      let whereStatement = "";
      let setStatement = "";
      let conditionalColumns = []; /* Only for where conditions */

      let columnNames = []; 
      for (const column in rows[0]) 
      {
        if (Object.hasOwnProperty.call(rows[0], column)) 
        {
          const val = rows[0][column];
          if(val !== undefined)
          {
            columnNames.push(column);
          }
        }
      }
    

      for (let i = 0; i < rows.length; i++)
      {
        const row = rows[i];
        const columns = [];
        
        for (const column in row) {
          if (Object.hasOwnProperty.call(row, column)) {
            const val = row[column];
            /* Remove undefined columns*/
            if(val !== undefined)
            {
              columns.push(column);
            }
          }
        }
          /* Validate Each Object*/
        if (Utils.equal(columnNames,columns))
        {
          const valuesClause = [];
          for (const column in row)
          {
            if (Object.hasOwnProperty.call(row, column))
            {
              if (columnNames.includes(column))
              {
                const val = row[column];
                if(val !== undefined){
                  params.push(val);
                  valuesClause.push("$" + params.length);
                }           
              }
            }
          }
          chunks.push("(" + valuesClause.join(", ") + ")");
        }
      }

      for (let i = 0; i < where.length; i++)
      {
        const whereObj = where[i];

        for (const key in whereObj)
        {
          if (Object.hasOwnProperty.call(whereObj, key))
          {
            const condition = whereObj[key];
            if (columnNames.includes(key))
            {
              conditionalColumns.push(key);

              let column = key;
              if (casts && Object.hasOwnProperty.call(casts, column))
              {
                column += "::"+casts[column] 
              }
              
              if (whereStatement === "")
              {
                whereStatement += ` ${tableName}.${key} ${condition} tmp.${column}`;
              } 
              else
              {
                whereStatement += ` AND ${tableName}.${key} ${condition} tmp.${column}`;
              }
            }
          }
        }
      }

      if (whereStatement !== "")
      {
        whereStatement = "WHERE" + whereStatement;

        if(columnNames && columnNames.length > 0)
        {
          columnNames.forEach((column) =>
          {
            /** Do not include columns used for where conditions **/
            if (conditionalColumns.includes(column) === false)
            {
              /* Cast data */
              let type = '';
              if (casts && Object.hasOwnProperty.call(casts, column))
              {
                type = "::"+casts[column] 
              }
              
              if (setStatement === "")
              {  
                setStatement += ` ${column} = tmp.${column+type}`;
              } 
              else
              {
                setStatement += `, ${column} = tmp.${column+type}`;
              }
            }
          });
        }
     
        if (setStatement !== "")
        {
          setStatement = "SET" + setStatement;

          const sql = `UPDATE ${tableName} ${setStatement} FROM (VALUES ${chunks.join(", ")}) AS tmp (${columnNames}) ${whereStatement}`;

          if(params.length > 0)
          {
            res.sql = sql;
            res.params = params;
          }
        }
      }
    }

    if (Object.keys(res).length === 0)
    {
      res = null;
    }
    return res;
  }
  
  /**
 * @param {any[]} data
 * @param {Function} callback
 * @param {number} chunkLimit
 * @param {string} returnByColumn
 * @param {string} conflictTarget
 * @returns {Promise<{fields:any[];rows:any[];rowCount:number}>}
 */
  async upsertChunkedRows(data, callback, chunkLimit=10000, options) 
  {
    const count = data.length;
    const res  = {fields:[], rows:[], rowCount:0};
    if(data && Array.isArray(data) && data.length > 0)
    {
      for (let i = 0; i < count; i += chunkLimit) 
      {
        const rows = data.slice(i, chunkLimit + i);
        const dbRes = await callback(rows, options);
        /* Prepare response */
        res.fields = res.fields.concat(dbRes.fields);
        res.rows = res.rows.concat(dbRes.rows);        
        res.rowCount += dbRes.rowCount;
      }
    }
    return res;
  }

  // Utils ========================================================================================
/**
 * 
 * @param {{sql:string; params:[]}} query 
 * @param {object} where 
 * @param {string[]} conditions 
 * @returns {{sql:String; params:[]}}
 */
 static appendUIWhere(query, where, conditions)
  {
    if (!Utils.isEmpty(where))
    {
      let whereSql;

      for (let i = 0; i < conditions.length; i += 3)
      {
        const conditionCode = conditions[i];
        let conditionSql = conditions[i+1];
        const conditionMapFn = conditions[i+2];
        if (conditionCode in where)
        {
          let conditionValue = where[conditionCode];
          if (conditionValue != undefined && conditionMapFn != "ignore_value")
          {
            if (conditionMapFn)
            {
              conditionValue = conditionMapFn(conditionValue);
            }
            query.params.push(conditionValue);
            const nextIdx = query.params.length;
            const replacer = new RegExp("\\?", 'g');
            conditionSql = conditionSql.replace(replacer, "$" + nextIdx);
          }
          whereSql = Utils.appendStr(whereSql, conditionSql, " and ");
        }
      }

      query.sql = Utils.appendStr(query.sql, whereSql, " where ");
    }

    return query;
  }

  /**
 * 
 * @param {{sql:string; params:[]}} query 
 * @param {object} where 
 * @param {string[]} conditions 
 * @returns {{sql:String; params:[]}}
 */
  static appendORWhere(query, where, conditions)
  {
    if (!Utils.isEmpty(where))
    {
      let whereSql;

      for (let i = 0; i < conditions.length; i += 3)
      {
       
        const conditionCode = conditions[i];
        let conditionSql = conditions[i+1];
        const conditionMapFn = conditions[i+2];
        let conditionValue = where[conditionCode];
        if (conditionValue)
        {
          if (conditionMapFn)
          {
            conditionValue = conditionMapFn(conditionValue);
          }

          if(!conditionSql.match("NULL"))
          {
            query.params.push(conditionValue);
          }
          const nextIdx = query.params.length;
      
          if(i === 0)
          {
            conditionSql = conditionSql.replace("?", "$" + nextIdx);
            whereSql = Utils.appendStr(whereSql, conditionSql, "");
          }
          else
          {
            conditionSql = conditionSql.replace("?", "$" + nextIdx);
            whereSql = Utils.appendStr(whereSql, conditionSql, " OR ");
          }
          
        }
        
      }

      if(whereSql)
      {
        if(query.sql.match(/WHERE/i))
        {
          query.sql = Utils.appendStr(query.sql, whereSql+")", " AND (");
        }
        else
        {
          query.sql = Utils.appendStr(query.sql+" WHERE", whereSql+")", " (");
        }
      
      }
 
    }

    return query;
  }
  
  static appendWhereIn(query, where, conditions, operator="AND")
  {
    if (!Utils.isEmpty(where))
    {
      
      for (let i = 0; i < conditions.length; i += 2)
      {
        let placeHolders;

        const conditionCode = conditions[i];
        const conditionSql = conditions[i+1];
        const conditionValues = where[conditionCode];
        
        if (conditionValues && Array.isArray(conditionValues))
        { 
          for (const param of conditionValues) 
          {
            query.params.push(param);
            const nextIdx = query.params.length;
            placeHolders = Utils.appendStr(placeHolders, "$" + nextIdx, ",");  
          }

          if(placeHolders)
          {
            if(query.sql.match(/WHERE/i))
            {
              query.sql = Utils.appendStr(query.sql, placeHolders+")", ` ${operator} ${conditionSql} (`);
            }
            else
            {
              query.sql = Utils.appendStr(query.sql+ " WHERE", placeHolders+")", ` ${conditionSql} (`);

            }
          } 
        }        
      }

    }

    return query;
  }
  
  static appendUIOrderBy(sql, orderBy, codes)
  {
    let orderBySql;

    if (!Utils.isEmpty(orderBy))
    {
      for (let i = 0; i < codes.length; i += 2)
      {
        if (orderBy.startsWith(codes[i]))
        {
          if (orderBy.endsWith("_ASC"))
          {
            orderBySql = codes[i+1] + " asc";
          }
          else if (orderBy.endsWith("_DSC"))
          {
            orderBySql = codes[i+1] + " desc";
          }
          else
          {
            orderBySql = codes[i+1];
          }
          break;
        }
      }
    }

    sql = Utils.appendStr(sql, orderBySql, " order by ");
    return sql;
  }

  appendParam(params, param)
  {
    let res = null;

    if (params && param)
    {
      res = [...params, param];
    }
    else if (!params && param)
    {
      res = [param];
    } 
    else if (params && !param)
    {
      res = [...params];
    }

    return res;
  }

  toColumnName(fields, fieldName)
  {
    let res = null;

    const field = fields[fieldName];
    if (field)
    {
      res = field.columnName;
    }

    return res;
  }

  toFieldName(columnName)
  {
    return Supplier.fields.find((field) => field.columnName == columnName);
  }

  toOrderType(orderType)
  {
    return orderType == "asc" ? "asc" : "desc";
  }

  toOrderBySQL(orderBy, fields)
  {
    let orderBySQL = null;

    if (orderBy)
    {
      const columnName = this.toColumnName(fields, orderBy.fieldName);
      if (columnName)
      {
        orderBySQL = columnName;

        const orderType = this.toOrderType(orderBy.type);
        if (orderType)
        {
          orderBySQL += " " + orderType;
        }
      }
    }

    return orderBySQL;
  }

  toHttpObjs(fields, objs)
  {
    let httpObjs = null;

    if (objs && objs.length > 0)
    {
      httpObjs = objs.map((obj) => this.toHttpObj(fields, obj));
    }

    return httpObjs;
  }

  toHttpObj(fields, obj)
  {
    let httpObj = {};

    for (const fieldName in fields)
    {
      const field = fields[fieldName];
      httpObj[fieldName] = obj[field.columnName];
    }

    return httpObj;
  }

  static toDbObj(fields, dbObj, httpObj)
  {
    if (httpObj)
    {
      for (const fieldName in fields)
      {
        const field = fields[fieldName];
        if (field)
        {
          dbObj[field.columnName] = httpObj[fieldName];
        }
        else
        {
          dbObj[fieldName] = httpObj[fieldName];
        }
      }
    }

    return dbObj;
  }

  static toModelObj(fields, obj, data)
  {
    if (data)
    {
      for (const fieldName in fields)
      {
        const field = fields[fieldName];
        obj[fieldName] = data[field.columnName];
      }
    }
  }

   /** 
   * @param {any[][]} changes 
   * @param {any} dbObj 
   * @param {any} prop 
   * @param {any} value 
   * @param {boolean} onlyCheckDbEmpty
   */
  static addChange(changes, dbObj, prop, value, onlyCheckDbEmpty)
  {
    if (onlyCheckDbEmpty && (dbObj[prop] === null || 
      (typeof dbObj[prop] === 'string' && Utils.isEmptyHtmlValue(dbObj[prop]))))
    {
      changes.push([prop, value]);
      return changes;
    }

    if (dbObj[prop] !== value)
    {
      changes.push([prop, value]);
    }
 
    return changes;
  }

  /**
   *
   * @param {string} s
   * @returns {string}
   */
  parseString(s)
  {
    s = s.replace(/[^\w\s]/gi, '');
    s = s.replace(/ +?/g, '');
    return s;
  }

  /**
   *
   * @param {string} sql
   * @returns {{tableName:string:whereStatement:string}}
   */
  parseSQLStatement(sql)
  {
    return sql.replace(/\n/g,' ').match(/FROM\s(.+)/)[1]
  }

  static nullIfEmptyHtml(value)
  {
    let res = value;

    if (Utils.isEmptyHtmlValue(value))
    {
      res = null;
    }

    return res;
  }

  static undefinedIfSame(oldValue, newValue)
  {
    let res = newValue;

    if (oldValue == newValue)
    {
      res = undefined;
    }

    return res;
  }
}

module.exports = Db;